import { ArgumentsHost, Body, Catch, Controller, ExceptionFilter, Get, Headers, HttpCode, HttpException, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';
import { Response } from 'express';
import { AuthService } from '../application/auth-service';
import { RsaTokens } from '../data/credentials';
import { DomainError } from '../domain/profile';
import { AuthResponse, HealthStatus, Jwks, Problem, ProfileResponse } from './models';
export class LoginRequest {
  @ApiProperty({format:'email',maxLength:254}) @IsEmail() @MaxLength(254) email!: string;
  @ApiProperty({format:'password',maxLength:128}) @IsString() @MaxLength(128) password!: string;
}
export class RegisterRequest extends LoginRequest {
  @ApiProperty({format:'password', minLength:8,maxLength:128,pattern:'^(?=.*[A-Za-z])(?=.*[0-9]).{8,128}$'}) @Matches(/^(?=.*[A-Za-z])(?=.*[0-9]).{8,128}$/) declare password: string;
  @ApiProperty({minLength:2,maxLength:40}) @IsString() @Length(2,40) displayName!: string;
}
@ApiTags('Autenticación') @Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly service: AuthService) {}
  @Post('register') @ApiResponse({status:201,type:AuthResponse}) @ApiResponse({status:400,type:Problem}) @ApiResponse({status:409,type:Problem})
  register(@Body() body: RegisterRequest) { return this.service.register(body.email,body.password,body.displayName); }
  @Post('login') @HttpCode(200) @ApiResponse({status:200,type:AuthResponse}) @ApiResponse({status:400,type:Problem}) @ApiResponse({status:401,type:Problem})
  login(@Body() body: LoginRequest) { return this.service.login(body.email,body.password); }
  @Get('me') @ApiBearerAuth() @ApiResponse({status:200,type:ProfileResponse}) @ApiResponse({status:401,type:Problem})
  me(@Headers('authorization') authorization?: string) { return this.service.me(/^Bearer ([^\s]+)$/i.exec(authorization ?? '')?.[1] ?? ''); }
}
@Controller()
export class PublicController {
  constructor(@Inject(RsaTokens) private readonly tokens: RsaTokens) {}
  @Get('health') @ApiResponse({status:200,type:HealthStatus}) health() { return {status:'ok',service:'auth-api',timestamp:new Date().toISOString()}; }
  @Get('.well-known/jwks.json') @ApiResponse({status:200,type:Jwks}) jwks() { return this.tokens.jwks(); }
}
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
