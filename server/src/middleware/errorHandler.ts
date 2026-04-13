import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 500, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Already-sent response — nothing to do
  if (res.headersSent) return;

  const status = (err as AppError).status || 500;
  const code = (err as AppError).code;

  if (status >= 500) {
    console.error("[ERROR]", err.message, err.stack);
  }

  res.status(status).json({
    error: {
      message: status >= 500 ? "Internal server error" : err.message,
      ...(code && { code }),
    },
  });
}
