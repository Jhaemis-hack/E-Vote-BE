import { HttpStatus } from '@nestjs/common';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly message: string;
  public readonly data: any;

  constructor(statusCode: number, message: string, data: any = null) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  public toResponse() {
    return {
      status_code: this.statusCode,
      message: this.message,
      data: this.data,
    };
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, data: any = null) {
    super(HttpStatus.BAD_REQUEST, message, data);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, data: any = null) {
    super(HttpStatus.NOT_FOUND, message, data);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string, data: any = null) {
    super(HttpStatus.UNAUTHORIZED, message, data);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, data: any = null) {
    super(HttpStatus.FORBIDDEN, message, data);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string, data: any = null) {
    super(HttpStatus.INTERNAL_SERVER_ERROR, message, data);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, data: any = null) {
    super(HttpStatus.CONFLICT, message, data);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}
