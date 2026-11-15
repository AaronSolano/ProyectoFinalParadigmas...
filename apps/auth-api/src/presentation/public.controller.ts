import { Controller, Get, Inject } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { TOKENS, Tokens } from '../domain/profile';
import { HealthStatus, Jwks } from './models';
@Controller()
export class PublicController {
  constructor(@Inject(TOKENS) private readonly tokens: Tokens) {}
  @Get('health') @ApiResponse({status:200,type:HealthStatus}) health() { return {status:'ok',service:'auth-api',timestamp:new Date().toISOString()}; }
  @Get('.well-known/jwks.json') @ApiResponse({status:200,type:Jwks}) jwks() { return this.tokens.jwks(); }
}
