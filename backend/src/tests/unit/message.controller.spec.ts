// ─── Mocks must be hoisted before any imports ─────────────────────────────────

jest.mock('../../services/message.service', () => ({
  messageService: {
    sendMessage: jest.fn(),
    getConversation: jest.fn(),
    getConversationList: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    getUsers: jest.fn(),
  },
}));

jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ─── Now safe to import tested code ───────────────────────────────────────────

import { Response } from 'express';
import { AuthenticatedRequest } from '../../types/express-augment';
import * as messageController from '../../controllers/message.controller';
import { messageService } from '../../services/message.service';
import { UserRole } from '../../types/constants';

// ──────────────────────────────────────────────────────────────────────────────

const mockRes = (): Response => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockReq = (overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest =>
  ({
    user: { userId: 'user-uuid', email: 'test@test.com', role: UserRole.PATIENT },
    params: {},
    query: {},
    body: {},
    ...overrides,
  }) as unknown as AuthenticatedRequest;

const mockNext = jest.fn();

const makeMessage = (overrides = {}) => ({
  id: 'msg-uuid',
  senderId: 'user-uuid',
  receiverId: 'other-uuid',
  content: 'Hello doctor',
  isRead: false,
  createdAt: new Date(),
  ...overrides,
});

// ──────────────────────────────────────────────────────────────────────────────

describe('Message Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── sendMessage ───────────────────────────────────────────────────────

  describe('sendMessage', () => {
    const body = { receiverId: 'doctor-uuid', content: 'Hello doctor' };

    it('happy path — sends message and returns 201', async () => {
      const message = makeMessage();
      (messageService.sendMessage as jest.Mock).mockResolvedValue(message);
      const req = mockReq({ body });
      const res = mockRes();

      await messageController.sendMessage(req, res, mockNext);

      expect(messageService.sendMessage).toHaveBeenCalledWith({
        senderId: 'user-uuid',
        receiverId: 'doctor-uuid',
        content: 'Hello doctor',
        senderRole: UserRole.PATIENT,
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('returns 400 when receiverId is missing', async () => {
      const req = mockReq({ body: { receiverId: '', content: 'Hello' } });
      const res = mockRes();

      await messageController.sendMessage(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(messageService.sendMessage).not.toHaveBeenCalled();
    });

    it('returns 400 when content is empty/whitespace', async () => {
      const req = mockReq({ body: { receiverId: 'doctor-uuid', content: '   ' } });
      const res = mockRes();

      await messageController.sendMessage(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(messageService.sendMessage).not.toHaveBeenCalled();
    });

    it('forwards service ForbiddenError to next()', async () => {
      const err = new Error('no completed appointment');
      (messageService.sendMessage as jest.Mock).mockRejectedValue(err);
      const req = mockReq({ body });
      const res = mockRes();

      await messageController.sendMessage(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });

  // ── getConversation ───────────────────────────────────────────────────

  describe('getConversation', () => {
    it('happy path — returns messages and total with 200', async () => {
      const result = { messages: [makeMessage()], total: 1 };
      (messageService.getConversation as jest.Mock).mockResolvedValue(result);
      const req = mockReq({
        params: { userId: 'doctor-uuid' },
        query: { page: '1', limit: '20' } as Record<string, string>,
      });
      const res = mockRes();

      await messageController.getConversation(req, res, mockNext);

      expect(messageService.getConversation).toHaveBeenCalledWith(
        'user-uuid',
        'doctor-uuid',
        '1',
        '20'
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('works without page/limit query params', async () => {
      (messageService.getConversation as jest.Mock).mockResolvedValue({ messages: [], total: 0 });
      const req = mockReq({ params: { userId: 'doctor-uuid' }, query: {} });
      const res = mockRes();

      await messageController.getConversation(req, res, mockNext);

      expect(messageService.getConversation).toHaveBeenCalledWith(
        'user-uuid',
        'doctor-uuid',
        undefined,
        undefined
      );
    });

    it('forwards errors to next()', async () => {
      const err = new Error('not found');
      (messageService.getConversation as jest.Mock).mockRejectedValue(err);
      const req = mockReq({ params: { userId: 'doctor-uuid' }, query: {} });
      const res = mockRes();

      await messageController.getConversation(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });

  // ── getConversationList ───────────────────────────────────────────────

  describe('getConversationList', () => {
    it('returns list of conversations with 200', async () => {
      const conversations = [{ partnerId: 'doctor-uuid', unreadCount: 2 }];
      (messageService.getConversationList as jest.Mock).mockResolvedValue(conversations);
      const req = mockReq();
      const res = mockRes();

      await messageController.getConversationList(req, res, mockNext);

      expect(messageService.getConversationList).toHaveBeenCalledWith('user-uuid');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns empty list when no conversations exist', async () => {
      (messageService.getConversationList as jest.Mock).mockResolvedValue([]);
      const req = mockReq();
      const res = mockRes();

      await messageController.getConversationList(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── getUnreadCount ────────────────────────────────────────────────────

  describe('getUnreadCount', () => {
    it('returns unread message count with 200', async () => {
      (messageService.getUnreadCount as jest.Mock).mockResolvedValue(5);
      const req = mockReq();
      const res = mockRes();

      await messageController.getUnreadCount(req, res, mockNext);

      expect(messageService.getUnreadCount).toHaveBeenCalledWith('user-uuid');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 0 when no unread messages', async () => {
      (messageService.getUnreadCount as jest.Mock).mockResolvedValue(0);
      const req = mockReq();
      const res = mockRes();

      await messageController.getUnreadCount(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ── markAsRead ────────────────────────────────────────────────────────

  describe('markAsRead', () => {
    it('marks messages as read and returns 200', async () => {
      (messageService.markAsRead as jest.Mock).mockResolvedValue(undefined);
      const req = mockReq({ params: { senderId: 'doctor-uuid' } });
      const res = mockRes();

      await messageController.markAsRead(req, res, mockNext);

      expect(messageService.markAsRead).toHaveBeenCalledWith('user-uuid', 'doctor-uuid');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('forwards errors to next()', async () => {
      const err = new Error('error');
      (messageService.markAsRead as jest.Mock).mockRejectedValue(err);
      const req = mockReq({ params: { senderId: 'doctor-uuid' } });
      const res = mockRes();

      await messageController.markAsRead(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });

  // ── getUsers ──────────────────────────────────────────────────────────

  describe('getUsers', () => {
    it('returns eligible messaging partners with 200', async () => {
      const result = { users: [{ id: 'doctor-uuid' }], total: 1 };
      (messageService.getUsers as jest.Mock).mockResolvedValue(result);
      const req = mockReq({
        query: { page: '1', limit: '10' } as Record<string, string>,
      });
      const res = mockRes();

      await messageController.getUsers(req, res, mockNext);

      expect(messageService.getUsers).toHaveBeenCalledWith(
        'user-uuid',
        UserRole.PATIENT,
        '1',
        '10'
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('works without pagination params', async () => {
      (messageService.getUsers as jest.Mock).mockResolvedValue({ users: [], total: 0 });
      const req = mockReq({ query: {} });
      const res = mockRes();

      await messageController.getUsers(req, res, mockNext);

      expect(messageService.getUsers).toHaveBeenCalledWith(
        'user-uuid',
        UserRole.PATIENT,
        undefined,
        undefined
      );
    });

    it('forwards errors to next()', async () => {
      const err = new Error('error');
      (messageService.getUsers as jest.Mock).mockRejectedValue(err);
      const req = mockReq({ query: {} });
      const res = mockRes();

      await messageController.getUsers(req, res, mockNext);
      await Promise.resolve();

      expect(mockNext).toHaveBeenCalledWith(err);
    });
  });
});
