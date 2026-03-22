/**
 * Zod validation schemas for Message routes.
 *
 * Ensures:
 * - User IDs are well-formed UUIDs (prevents arbitrary DB queries on garbage input)
 * - Message content has a maximum length (prevents memory/DB abuse)
 */
import { z } from 'zod';

const uuidParam = z.uuid('Must be a valid UUID');

/** Validates the :userId route param (GET /conversations/:userId) */
export const userIdParamValidation = z.object({
  params: z.object({
    userId: uuidParam,
  }),
});

/** Validates the :senderId route param (PATCH /read/:senderId) */
export const senderIdParamValidation = z.object({
  params: z.object({
    senderId: uuidParam,
  }),
});

/** Validates POST / body (send a message) */
export const sendMessageValidation = z.object({
  body: z.object({
    receiverId: uuidParam,
    content: z
      .string()
      .min(1, 'Message content cannot be empty')
      .max(4000, 'Message content must not exceed 4000 characters'),
  }),
});
