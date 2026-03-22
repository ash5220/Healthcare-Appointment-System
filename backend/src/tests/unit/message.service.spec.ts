jest.mock('../../repositories/message.repository', () => ({
  messageRepository: {
    create: jest.fn(),
    findReceiverActive: jest.fn(),
    findConversation: jest.fn(),
    findConversationList: jest.fn(),
    markConversationAsRead: jest.fn(),
    countUnread: jest.fn(),
    markAsRead: jest.fn(),
    findActiveUsers: jest.fn(),
  },
}));

import { messageService } from '../../services/message.service';
import { messageRepository } from '../../repositories/message.repository';

const makeMsg = (overrides: Record<string, unknown> = {}) => ({
  id: 'm1',
  senderId: 'u1',
  receiverId: 'u2',
  content: 'Hello',
  isRead: false,
  createdAt: new Date(),
  toJSON: jest.fn().mockReturnValue({
    id: 'm1',
    senderId: 'u1',
    receiverId: 'u2',
    content: 'Hello',
    isRead: false,
    createdAt: new Date(),
    sender: { id: 'u1', firstName: 'Alice', lastName: 'A', role: 'patient' },
    receiver: { id: 'u2', firstName: 'Bob', lastName: 'B', role: 'doctor' },
  }),
  ...overrides,
});

describe('MessageService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── sendMessage ───────────────────────────────────────────────────────────

  describe('sendMessage', () => {
    it('happy path — sends a message', async () => {
      const mockMsg = makeMsg();
      (messageRepository.findReceiverActive as jest.Mock).mockResolvedValue({
        id: 'u2',
        isActive: true,
      });
      (messageRepository.create as jest.Mock).mockResolvedValue(mockMsg);

      const result = await messageService.sendMessage({
        senderId: 'u1',
        receiverId: 'u2',
        content: 'Hello',
      });

      expect(messageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ senderId: 'u1', receiverId: 'u2', content: 'Hello' })
      );
      expect(result).toBe(mockMsg);
    });

    it('trims whitespace from message content', async () => {
      (messageRepository.findReceiverActive as jest.Mock).mockResolvedValue({
        id: 'u2',
        isActive: true,
      });
      (messageRepository.create as jest.Mock).mockResolvedValue(makeMsg());

      await messageService.sendMessage({ senderId: 'u1', receiverId: 'u2', content: '  Hi!  ' });

      expect(messageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Hi!' })
      );
    });

    it('throws when receiver not found', async () => {
      (messageRepository.findReceiverActive as jest.Mock).mockResolvedValue(null);
      await expect(
        messageService.sendMessage({ senderId: 'u1', receiverId: 'ghost', content: 'Hi' })
      ).rejects.toThrow('Receiver not found');
    });

    it('throws when receiver account is deactivated', async () => {
      (messageRepository.findReceiverActive as jest.Mock).mockResolvedValue({
        id: 'u2',
        isActive: false,
      });
      await expect(
        messageService.sendMessage({ senderId: 'u1', receiverId: 'u2', content: 'Hi' })
      ).rejects.toThrow('deactivated');
    });

    it('throws when sender and receiver are the same user', async () => {
      (messageRepository.findReceiverActive as jest.Mock).mockResolvedValue({
        id: 'u1',
        isActive: true,
      });
      await expect(
        messageService.sendMessage({ senderId: 'u1', receiverId: 'u1', content: 'Hi' })
      ).rejects.toThrow('Cannot send a message to yourself');
    });
  });

  // ── getConversation ───────────────────────────────────────────────────────

  describe('getConversation', () => {
    it('returns paginated messages and marks read', async () => {
      (messageRepository.findConversation as jest.Mock).mockResolvedValue({
        messages: [makeMsg()],
        total: 1,
      });
      (messageRepository.markConversationAsRead as jest.Mock).mockResolvedValue(undefined);

      const result = await messageService.getConversation('u1', 'u2', 1, 50);

      expect(result.total).toBe(1);
      expect(messageRepository.markConversationAsRead).toHaveBeenCalledWith('u2', 'u1');
    });

    it('forwards page and limit to repository', async () => {
      (messageRepository.findConversation as jest.Mock).mockResolvedValue({
        messages: [],
        total: 0,
      });
      (messageRepository.markConversationAsRead as jest.Mock).mockResolvedValue(undefined);

      await messageService.getConversation('u1', 'u2', 3, 10);

      expect(messageRepository.findConversation).toHaveBeenCalledWith('u1', 'u2', 3, 10);
    });
  });

  // ── getConversationList ───────────────────────────────────────────────────

  describe('getConversationList', () => {
    it('returns sorted conversation list with unread counts', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 60_000);

      const rows = [
        {
          partnerId: 'u2',
          firstName: 'Bob',
          lastName: 'B',
          role: 'doctor',
          lastMessage: 'Hi',
          lastMessageAt: now,
          unreadCount: 1,
        },
        {
          partnerId: 'u3',
          firstName: 'Carol',
          lastName: 'C',
          role: 'patient',
          lastMessage: 'Hey',
          lastMessageAt: earlier,
          unreadCount: 0,
        },
      ];

      (messageRepository.findConversationList as jest.Mock).mockResolvedValue(rows);

      const result = await messageService.getConversationList('u1');

      // 2 distinct partners
      expect(result).toHaveLength(2);
      // Most recent first (returned in order from SQL)
      expect(result[0].userId).toBe('u2');
      // Unread count for message from u2 to u1 that is not read
      expect(result[0].unreadCount).toBe(1);
    });

    it('returns empty array when no messages', async () => {
      (messageRepository.findConversationList as jest.Mock).mockResolvedValue([]);
      const result = await messageService.getConversationList('u1');
      expect(result).toHaveLength(0);
    });

    it('maps conversation rows to ConversationPartner format', async () => {
      const row = {
        partnerId: 'u2',
        firstName: 'Bob',
        lastName: 'B',
        role: 'doctor',
        lastMessage: 'Hi',
        lastMessageAt: new Date(),
        unreadCount: '3', // SQL returns string numbers
      };
      (messageRepository.findConversationList as jest.Mock).mockResolvedValue([row]);
      const result = await messageService.getConversationList('u1');
      expect(result).toHaveLength(1);
      expect(result[0].unreadCount).toBe(3); // converted to number
    });
  });

  // ── getUnreadCount ────────────────────────────────────────────────────────

  describe('getUnreadCount', () => {
    it('returns unread count from repository', async () => {
      (messageRepository.countUnread as jest.Mock).mockResolvedValue(3);
      const count = await messageService.getUnreadCount('u1');
      expect(count).toBe(3);
    });
  });

  // ── markAsRead ────────────────────────────────────────────────────────────

  describe('markAsRead', () => {
    it('delegates to repository', async () => {
      (messageRepository.markAsRead as jest.Mock).mockResolvedValue(undefined);
      await messageService.markAsRead('u1', 'u2');
      expect(messageRepository.markAsRead).toHaveBeenCalledWith('u1', 'u2');
    });
  });

  // ── getUsers ──────────────────────────────────────────────────────────────

  describe('getUsers', () => {
    it('returns active users from repository', async () => {
      const users = [
        { id: 'u2', firstName: 'Bob' },
        { id: 'u3', firstName: 'Carol' },
      ];
      (messageRepository.findActiveUsers as jest.Mock).mockResolvedValue(users);

      const result = await messageService.getUsers('u1');

      expect(result).toBe(users);
      expect(messageRepository.findActiveUsers).toHaveBeenCalledWith('u1', 1, 50);
    });
  });
});
