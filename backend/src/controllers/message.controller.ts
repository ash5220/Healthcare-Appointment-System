import { Response } from 'express';
import { messageService } from '../services/message.service';
import { successResponse, createdResponse, errorResponse } from '../utils/response.util';
import { asyncHandler } from '../middleware';
import { AuthenticatedRequest } from '../types/express.d';

/**
 * Send a message to another user
 */
export const sendMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { receiverId, content } = req.body as { receiverId: string; content: string };

  if (!receiverId || !content.trim()) {
    errorResponse(res, 'receiverId and content are required', 400);
    return;
  }

  const message = await messageService.sendMessage({
    senderId: req.user.userId,
    receiverId,
    content,
  });

  createdResponse(res, { message }, 'Message sent successfully');
});

/**
 * Get conversation with a specific user
 */
export const getConversation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const { page, limit } = req.query;

  const { messages, total } = await messageService.getConversation(
    req.user.userId,
    userId,
    page ? parseInt(page as string) : 1,
    limit ? parseInt(limit as string) : 50
  );

  successResponse(res, { messages, total });
});

/**
 * Get all conversations (inbox) for the current user
 */
export const getConversationList = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const conversations = await messageService.getConversationList(req.user.userId);

    successResponse(res, { conversations });
  }
);

/**
 * Get unread message count for the current user
 */
export const getUnreadCount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const count = await messageService.getUnreadCount(req.user.userId);
  successResponse(res, { unreadCount: count });
});

/**
 * Mark messages from a sender as read
 */
export const markAsRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { senderId } = req.params;

  await messageService.markAsRead(req.user.userId, senderId);

  successResponse(res, null, 'Messages marked as read');
});

/**
 * Get list of users available to message (paginated)
 */
export const getUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const page = req.query.page ? parseInt(req.query.page as string) : 1;
  const limit = Math.min(req.query.limit ? parseInt(req.query.limit as string) : 50, 100);
  const { users, total } = await messageService.getUsers(req.user.userId, page, limit);
  successResponse(res, { users, total, page, limit });
});
