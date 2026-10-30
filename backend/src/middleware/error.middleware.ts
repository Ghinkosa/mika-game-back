import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../shared/errors.js';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Invalid request data',
      details: err.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message
      }))
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {})
    });
  }

  if (err?.code === '23505') {
    return res.status(409).json({
      error: 'A record with that unique value already exists'
    });
  }

  if (err?.status && Number.isInteger(err.status)) {
    return res.status(err.status).json({
      error: err.message
    });
  }

  console.error('Unhandled API Exception:', err?.message || err);
  return res.status(500).json({
    error: 'Internal server error'
  });
}
