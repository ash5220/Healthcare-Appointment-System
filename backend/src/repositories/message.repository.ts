import { Op } from 'sequelize';
import { Message } from '../models/Message.model';
import { User } from '../models/User.model';

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

  async findAllForUser(userId: string): Promise<Message[]> {
    return Message.findAll({
      where: {
        [Op.or]: [{ senderId: userId }, { receiverId: userId }],
      },
      include: messageIncludes,
      order: [['createdAt', 'DESC']],
    });
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

  async findActiveUsers(currentUserId: string): Promise<User[]> {
    return User.findAll({
      where: {
        id: { [Op.ne]: currentUserId },
        isActive: true,
      },
      attributes: ['id', 'firstName', 'lastName', 'role', 'email'],
      order: [
        ['role', 'ASC'],
        ['firstName', 'ASC'],
      ],
    });
  }
}

export const messageRepository = new MessageRepository();
