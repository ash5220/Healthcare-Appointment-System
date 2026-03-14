import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
    sendMessage,
    getConversation,
    getConversationList,
    getUnreadCount,
    markAsRead,
    getUsers,
} from '../controllers/message.controller';

const router = Router();

// All messaging routes require authentication
router.use(authMiddleware);

// GET /messages/users - Get list of all users to message
router.get('/users', getUsers);

// GET /messages/unread-count - Get total unread count
router.get('/unread-count', getUnreadCount);

// GET /messages/conversations - Get all conversations (inbox)
router.get('/conversations', getConversationList);

// GET /messages/conversations/:userId - Get conversation with a specific user
router.get('/conversations/:userId', getConversation);

// POST /messages - Send a message
router.post('/', sendMessage);

// PATCH /messages/read/:senderId - Mark messages from sender as read
router.patch('/read/:senderId', markAsRead);

export default router;
