import { Op, QueryTypes } from 'sequelize';
import { Message } from '../models/Message.model';
import { User } from '../models/User.model';
import { sequelize } from '../config/database';

export interface CreateMessageData {
  senderId: string;
  receiverId: string;
  content: string;
}

/** Shared user attributes included on sender / receiver associations. */
const userAttrs = ['id', 'firstName', 'lastName', 'role'];

const messageIncludes = [
  { model: User, as: 'sender', attributes: userAttrs },
  { model: User, as: 'receiver', attributes: userAttrs },
];

/** Shape returned by the conversation-list raw SQL query. */
export interface ConversationRow {
  partnerId: string;
  firstName: string;
  lastName: string;
  role: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

class MessageRepository {
  async create(data: CreateMessageData): Promise<Message> {
    const msg = await Message.create(data as Message['_creationAttributes']);
    // Re-fetch with associations so the caller always gets a fully-hydrated record.
    return Message.findByPk(msg.id, { include: messageIncludes }) as Promise<Message>;
  }

  async findReceiverActive(receiverId: string): Promise<{ id: string; isActive: boolean } | null> {
    return User.findByPk(receiverId, { attributes: ['id', 'isActive'] }) as Promise<{
      id: string;
      isActive: boolean;
    } | null>;
  }

  async findConversation(
    userId: string,
    otherUserId: string,
    page = 1,
    limit = 50
  ): Promise<{ messages: Message[]; total: number }> {
    const offset = (page - 1) * limit;

    const { count, rows } = await Message.findAndCountAll({
      where: {
        [Op.or]: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      include: messageIncludes,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return { messages: rows.reverse(), total: count };
  }

  async markConversationAsRead(senderId: string, receiverId: string): Promise<void> {
    await Message.update(
      { isRead: true, readAt: new Date() },
      { where: { senderId, receiverId, isRead: false } }
    );
  }

  /**
   * Get all conversation partners with last message and unread count.
   * Uses SQL GROUP BY + subqueries to avoid loading all messages into memory.
   * This replaces the old findAllForUser() which was an O(n) memory bomb.
   */
  async findConversationList(userId: string): Promise<ConversationRow[]> {
    // Compute the "partner" id per message, then group by partner.
    const results = await sequelize.query<ConversationRow>(
      `
      SELECT
        partner_id AS partnerId,
        u.first_name AS firstName,
        u.last_name AS lastName,
        u.role,
        sub.content AS lastMessage,
        sub.last_message_at AS lastMessageAt,
        COALESCE(unread.cnt, 0) AS unreadCount
      FROM (
        SELECT
          CASE WHEN sender_id = :userId THEN receiver_id ELSE sender_id END AS partner_id,
          MAX(created_at) AS last_message_at
        FROM messages
        WHERE sender_id = :userId OR receiver_id = :userId
        GROUP BY partner_id
      ) grouped
      -- Get the actual last message content via a correlated subquery join
      JOIN LATERAL (
        SELECT content, created_at AS last_message_at
        FROM messages
        WHERE (
          (sender_id = :userId AND receiver_id = grouped.partner_id) OR
          (sender_id = grouped.partner_id AND receiver_id = :userId)
        )
        ORDER BY created_at DESC
        LIMIT 1
      ) sub ON TRUE
      JOIN users u ON u.id = grouped.partner_id
      -- Count unread messages from partner -> current user
      LEFT JOIN (
        SELECT sender_id, COUNT(*) AS cnt
        FROM messages
        WHERE receiver_id = :userId AND is_read = false
        GROUP BY sender_id
      ) unread ON unread.sender_id = grouped.partner_id
      ORDER BY sub.last_message_at DESC
      `,
      {
        replacements: { userId },
        type: QueryTypes.SELECT,
      }
    );

    return results;
  }

  async countUnread(userId: string): Promise<number> {
    return Message.count({ where: { receiverId: userId, isRead: false } });
  }

  async markAsRead(receiverId: string, senderId: string): Promise<void> {
    await Message.update(
      { isRead: true, readAt: new Date() },
      { where: { senderId, receiverId, isRead: false } }
    );
  }

  async findActiveUsers(currentUserId: string, page = 1, limit = 50): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;
    const { count, rows } = await User.findAndCountAll({
      where: {
        id: { [Op.ne]: currentUserId },
        isActive: true,
      },
      attributes: ['id', 'firstName', 'lastName', 'role', 'email'],
      order: [
        ['role', 'ASC'],
        ['firstName', 'ASC'],
      ],
      limit,
      offset,
    });
    return { users: rows, total: count };
  }
}

export const messageRepository = new MessageRepository();
