import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import type { SessionMetadata } from './interfaces/session-metadata.interface';
import type { JwtPayload } from './interfaces/jwt-payload.interface';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  private getSessionMetadata(req: Request): SessionMetadata {
    return {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      deviceName: req.headers['user-agent'],
    };
  }
  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, this.getSessionMetadata(req));
  }
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, this.getSessionMetadata(req));
  }
  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }
  @HttpCode(HttpStatus.NO_CONTENT)
  @SkipThrottle()
  @Post('logout')
  async logout(@CurrentUser() user: JwtPayload): Promise<void> {
    await this.authService.logout(user.sessionId);
  }
  @HttpCode(HttpStatus.NO_CONTENT)
  @SkipThrottle()
  @Post('logout-all')
  async logoutAll(@CurrentUser() user: JwtPayload): Promise<void> {
    await this.authService.logoutAll(user.id);
  }
  @HttpCode(HttpStatus.NO_CONTENT)
  @SkipThrottle()
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(user.id, user.sessionId, dto);
  }

  @SkipThrottle()
  @Get('sessions')
  listSessions(@CurrentUser() user: JwtPayload) {
    return this.authService.listSessions(user.id);
  }
  @HttpCode(HttpStatus.NO_CONTENT)
  @SkipThrottle()
  @Delete('sessions/:id')
  async revokeSession(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<void> {
    await this.authService.revokeSession(user.id, id);
  }
  @SkipThrottle()
  @Get('profile')
  profile(@CurrentUser() user: JwtPayload) {
    return user;
  }
}
