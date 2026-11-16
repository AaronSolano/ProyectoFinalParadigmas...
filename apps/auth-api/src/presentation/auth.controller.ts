import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../application/auth-service';
import { GuestRequest, LoginRequest, RegisterRequest } from './requests';
import {
  AuthResponse,
  GuestResponse,
  Problem,
  ProfileResponse,
} from './models';
@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly service: AuthService) {}
  @Post('register')
  @ApiResponse({ status: 201, type: AuthResponse })
  @ApiResponse({ status: 400, type: Problem })
  @ApiResponse({ status: 409, type: Problem })
  register(@Body() body: RegisterRequest) {
    return this.service.register(body.email, body.password, body.displayName);
  }
  @Post('login')
  @HttpCode(200)
  @ApiResponse({ status: 200, type: AuthResponse })
  @ApiResponse({ status: 400, type: Problem })
  @ApiResponse({ status: 401, type: Problem })
  login(@Body() body: LoginRequest) {
    return this.service.login(body.email, body.password);
  }
  @Post('guest')
  @ApiResponse({ status: 201, type: GuestResponse })
  @ApiResponse({ status: 400, type: Problem })
  guest(@Body() body: GuestRequest) {
    return this.service.guest(body.displayName);
  }
  @Get('me')
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: ProfileResponse })
  @ApiResponse({ status: 401, type: Problem })
  me(@Headers('authorization') authorization?: string) {
    return this.service.me(
      /^Bearer ([^\s]+)$/i.exec(authorization ?? '')?.[1] ?? '',
    );
  }
}
