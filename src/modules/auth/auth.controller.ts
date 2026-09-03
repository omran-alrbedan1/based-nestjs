import { Body, Controller, HttpCode, HttpStatus, Logger, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ResponseMessage } from 'src/utils/transform.interceptor';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/auth.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenGuard } from './guard/refresh-token.guard';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private readonly logger = new Logger(AuthController.name);

  @Post('register')
  @Throttle({
    default: {
      limit: 3,
      ttl: 60000,
    },
  })
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('auth.responses.user_registered')
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    this.logger.log(`Register attempt for email: ${registerDto.email}`);
    return this.authService.register(registerDto);
  }

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
    this.logger.log(`Login attempt for email: ${loginDto.email}`);
    return this.authService.login(loginDto);
  }
}
