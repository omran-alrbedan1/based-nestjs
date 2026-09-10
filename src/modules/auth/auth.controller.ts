import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ResponseMessage } from 'src/utils/transform.interceptor';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenGuard } from './guard/refresh-token.guard';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('refresh')
  @Throttle({
    default: {
      limit: 10,
      ttl: 60000,
    },
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshTokenGuard)
  @ResponseMessage('auth.responses.tokens_refreshed')
  async refresh(@GetUser('id') userId: string): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(userId);
  }

  @Post('logout')
  @Throttle({
    default: {
      limit: 20,
      ttl: 60000,
    },
  })
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('auth.responses.user_logged_out')
  async logout(@GetUser('id') userId: string): Promise<null> {
    await this.authService.logout(userId);
    return null;
  }

  @Post('login')
  @Throttle({
    default: {
      limit: 5,
      ttl: 60000,
    },
  })
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('auth.responses.user_logged_in')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }
}
