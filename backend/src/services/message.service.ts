import { Message } from '../models/Message.model';
import { User } from '../models/User.model';
import { messageRepository } from '../repositories/message.repository';

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
   * Get all conversation partners for a user (inbox view)
   */
  async getConversationList(userId: string): Promise<ConversationPartner[]> {
    const messages = await messageRepository.findAllForUser(userId);

    const conversationMap = new Map<string, ConversationPartner>();

    for (const msg of messages) {
      const msgJson = msg.toJSON() as any;
      const partnerId = msgJson.senderId === userId ? msgJson.receiverId : msgJson.senderId;
      const partner = msgJson.senderId === userId ? msgJson.receiver : msgJson.sender;

      if (!partner) continue;

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          userId: partnerId,
          firstName: partner.firstName,
          lastName: partner.lastName,
          role: partner.role,
          lastMessage: msgJson.content,
          lastMessageAt: msgJson.createdAt,
          unreadCount: 0,
        });
      }

      if (msgJson.receiverId === userId && !msgJson.isRead) {
        const entry = conversationMap.get(partnerId)!;
        entry.unreadCount += 1;
        conversationMap.set(partnerId, entry);
      }
    }

    return Array.from(conversationMap.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
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
   * Get list of users that the current user can message
   */
  async getUsers(currentUserId: string): Promise<User[]> {
    return messageRepository.findActiveUsers(currentUserId);
  }
}

export const messageService = new MessageService();
