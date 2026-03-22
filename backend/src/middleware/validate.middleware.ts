import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { validationErrorResponse } from '../utils/response.util';

export const validate = (schema: ZodTypeAny): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validatedData = (await schema.parseAsync({
        body: req.body as unknown,
        query: req.query as unknown,
        params: req.params as unknown,
        cookies: req.cookies as unknown,
      })) as Record<string, unknown>;

      if (validatedData && typeof validatedData === 'object') {
        const data = validatedData;
        if ('body' in data) {
          req.body = data.body;
        }
        if ('query' in data && typeof data.query === 'object' && data.query !== null) {
          Object.assign(req.query, data.query);
        }
        if ('params' in data && typeof data.params === 'object' && data.params !== null) {
          Object.assign(req.params, data.params);
        }
        if ('cookies' in data && typeof data.cookies === 'object' && data.cookies !== null) {
          Object.assign(req.cookies, data.cookies);
        }
      }

      next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const formattedErrors: Record<string, string[]> = {};
        error.issues.forEach(err => {
          const pathAfterRoot = err.path.slice(1);
          const field =
            pathAfterRoot.length > 0
              ? pathAfterRoot.join('.')
              : err.path.length > 0
                ? err.path[0].toString()
                : err.code || 'unknown';
          if (!formattedErrors[field]) {
            formattedErrors[field] = [];
          }
          formattedErrors[field].push(err.message);
        });

        validationErrorResponse(res, formattedErrors);
        return;
      }
      next(error);
    }
  };
};
