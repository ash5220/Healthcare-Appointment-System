import { Message } from '../models/Message.model';
import { User } from '../models/User.model';
import { messageRepository, ConversationRow } from '../repositories/message.repository';

export interface ConversationPartner {
  userId: string;
  firstName: string;
  lastName: string;
  role: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
}

export interface SendMessageData {
  senderId: string;
  receiverId: string;
  content: string;
}

class MessageService {
  /**
   * Send a new message from sender to receiver
   */
  async sendMessage(data: SendMessageData): Promise<Message> {
    // Verify receiver exists and is active
    const receiver = await messageRepository.findReceiverActive(data.receiverId);
    if (!receiver) throw new Error('Receiver not found');
    if (!receiver.isActive) throw new Error('Receiver account is deactivated');
    if (data.senderId === data.receiverId) throw new Error('Cannot send a message to yourself');

    return messageRepository.create({
      senderId: data.senderId,
      receiverId: data.receiverId,
      content: data.content.trim(),
    });
  }

  /**
   * Get conversation between two users (paginated)
   */
  async getConversation(
    userId: string,
    otherUserId: string,
    page = 1,
    limit = 50
  ): Promise<{ messages: Message[]; total: number }> {
    const result = await messageRepository.findConversation(userId, otherUserId, page, limit);

    // Mark messages as read (messages sent to current user)
    await messageRepository.markConversationAsRead(otherUserId, userId);

    return result;
  }

  /**
   * Get all conversation partners for a user (inbox view).
   *
   * Previous implementation loaded ALL messages into JS memory and
   * aggregated with a Map — a textbook DoS vector for users with many
   * messages.  Now delegates to a SQL GROUP BY query in the repository.
   */
  async getConversationList(userId: string): Promise<ConversationPartner[]> {
    const rows: ConversationRow[] = await messageRepository.findConversationList(userId);

    return rows.map(r => ({
      userId: r.partnerId,
      firstName: r.firstName,
      lastName: r.lastName,
      role: r.role,
      lastMessage: r.lastMessage,
      lastMessageAt: r.lastMessageAt,
      unreadCount: Number(r.unreadCount),
    }));
  }

  /**
   * Get total unread message count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return messageRepository.countUnread(userId);
  }

  /**
   * Mark all messages from a sender as read
   */
  async markAsRead(userId: string, senderId: string): Promise<void> {
    await messageRepository.markAsRead(userId, senderId);
  }

  /**
   * Get list of users that the current user can message (paginated)
   */
  async getUsers(currentUserId: string, page = 1, limit = 50): Promise<{ users: User[]; total: number }> {
    return messageRepository.findActiveUsers(currentUserId, page, limit);
  }
}

export const messageService = new MessageService();
