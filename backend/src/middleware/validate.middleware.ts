import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodError } from 'zod';
import { validationErrorResponse } from '../utils/response.util';

export const validate = (schema: ZodType) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        cookies: req.cookies,
      });
      next();
    } catch (error) {
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
