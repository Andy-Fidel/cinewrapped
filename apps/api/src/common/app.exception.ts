import { HttpException } from '@nestjs/common';

export class AppException extends HttpException {
  public constructor(
    status: number,
    public readonly code: string,
    message: string,
    public readonly details: Record<string, unknown> | null = null,
  ) {
    super(message, status);
  }
}
