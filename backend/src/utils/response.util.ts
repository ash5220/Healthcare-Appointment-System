import { Response } from 'express';

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: string[] | Record<string, string[]>;
    metadata?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
    };
}

export const successResponse = <T>(
    res: Response,
    data: T,
    message?: string,
    statusCode = 200
): Response => {
    const response: ApiResponse<T> = {
        success: true,
        data,
        message,
    };
    return res.status(statusCode).json(response);
};

export const createdResponse = <T>(
    res: Response,
    data: T,
    message = 'Resource created successfully'
): Response => {
    return successResponse(res, data, message, 201);
};

export const paginatedResponse = <T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number,
    message?: string
): Response => {
    const response: ApiResponse<T[]> = {
        success: true,
        data,
        message,
        metadata: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
    return res.status(200).json(response);
};

export const errorResponse = (
    res: Response,
    message: string,
    statusCode = 400,
    errors?: string[] | Record<string, string[]>
): Response => {
    const response: ApiResponse = {
        success: false,
        message,
        errors,
    };
    return res.status(statusCode).json(response);
};

export const notFoundResponse = (
    res: Response,
    resource = 'Resource'
): Response => {
    return errorResponse(res, `${resource} not found`, 404);
};

export const unauthorizedResponse = (
    res: Response,
    message = 'Unauthorized access'
): Response => {
    return errorResponse(res, message, 401);
};

export const forbiddenResponse = (
    res: Response,
    message = 'Access forbidden'
): Response => {
    return errorResponse(res, message, 403);
};

export const validationErrorResponse = (
    res: Response,
    errors: string[] | Record<string, string[]>
): Response => {
    return errorResponse(res, 'Validation failed', 422, errors);
};

export const serverErrorResponse = (
    res: Response,
    message = 'Internal server error'
): Response => {
    return errorResponse(res, message, 500);
};
