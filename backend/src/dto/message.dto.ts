/**
 * Zod validation schemas for Message routes.
 *
 * Ensures:
 * - User IDs are well-formed UUIDs (prevents arbitrary DB queries on garbage input)
 * - Message content has a maximum length (prevents memory/DB abuse)
 */
import { z } from 'zod';
import type { Request } from 'express';

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

/** Shared pagination query schema (page & limit) */
const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type PaginationQuery = z.infer<typeof paginationQuery>;

/** Validates query params for GET /conversations/:userId */
export const conversationQueryValidation = z.object({
  params: z.object({ userId: uuidParam }),
  query: paginationQuery,
});

export type ConversationQuery = z.infer<typeof conversationQueryValidation>;
/** Typed Express request for GET /conversations/:userId */
export type ConversationRequest = Request<{ userId: string }, unknown, unknown, PaginationQuery>;

/** Validates query params for GET /users */
export const messageUsersQueryValidation = z.object({
  query: paginationQuery,
});

export type GetUsersQuery = z.infer<typeof messageUsersQueryValidation>;
/** Typed Express request for GET /users */
export type GetUsersRequest = Request<Record<string, string>, unknown, unknown, PaginationQuery>;

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
