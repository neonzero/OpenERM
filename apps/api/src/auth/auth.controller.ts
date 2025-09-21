import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('refresh')
  rotate(@Body() payload: unknown) {
    return this.authService.rotateRefreshToken(payload);
  }
}
