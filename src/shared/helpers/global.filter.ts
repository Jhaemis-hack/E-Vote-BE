import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { AppError } from '../../errors/app.error';
import * as SYS_MSG from '../constants/systemMessages';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof AppError) {
      this.logger.error(`[${exception.statusCode}] ${exception.message}`, exception.stack);

      return response.status(exception.statusCode).json(exception.toResponse());
    } else if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      this.logger.error(`[${status}] ${JSON.stringify(exceptionResponse)}`, exception.stack);

      return response.status(status).json({
        status_code: status,
        message: typeof exceptionResponse === 'object' ? exceptionResponse['message'] : exceptionResponse,
        data: null,
      });
    } else {
      this.logger.error('Unexpected error', exception);

      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status_code: HttpStatus.INTERNAL_SERVER_ERROR,
        message: SYS_MSG.INTERNAL_SERVER_ERROR,
        data: null,
      });
    }
  }
}
