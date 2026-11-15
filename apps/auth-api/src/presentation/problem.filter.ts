import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../domain/profile';
@Catch()
export class ProblemFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (error instanceof DomainError) {
      const status = {VALIDATION_ERROR:400,EMAIL_TAKEN:409,INVALID_CREDENTIALS:401,UNAUTHORIZED:401}[error.code];
      response.status(status).json({status,code:error.code,message:error.message}); return;
    }
    if (error instanceof HttpException) {
      const status = error.getStatus(); const body = error.getResponse();
      if (typeof body === 'object' && 'code' in body) { response.status(status).json(body); return; }
      response.status(status).json({status,code: status === 400 ? 'VALIDATION_ERROR' : 'HTTP_ERROR',message: status === 400 ? 'Los datos enviados no son válidos.' : error.message}); return;
    }
    response.status(500).json({status:500,code:'INTERNAL_ERROR',message:'Error interno del servicio.'});
  }
}
