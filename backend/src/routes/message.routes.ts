import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  sendMessage,
  getConversation,
  getConversationList,
  getUnreadCount,
  markAsRead,
  getUsers,
} from '../controllers/message.controller';
import {
  senderIdParamValidation,
  sendMessageValidation,
  conversationQueryValidation,
  messageUsersQueryValidation,
} from '../dto/message.dto';

const router = Router();

// All messaging routes require authentication
router.use(authMiddleware);

// GET /messages/users - Get list of all users to message
router.get('/users', validate(messageUsersQueryValidation), getUsers);

// GET /messages/unread-count - Get total unread count
router.get('/unread-count', getUnreadCount);

// GET /messages/conversations - Get all conversations (inbox)
router.get('/conversations', getConversationList);

// GET /messages/conversations/:userId - Get conversation with a specific user
router.get('/conversations/:userId', validate(conversationQueryValidation), getConversation);

// POST /messages - Send a message
router.post('/', validate(sendMessageValidation), sendMessage);

// PATCH /messages/read/:senderId - Mark messages from sender as read
router.patch('/read/:senderId', validate(senderIdParamValidation), markAsRead);

export default router;
