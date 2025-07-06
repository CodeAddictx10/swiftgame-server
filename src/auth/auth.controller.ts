import { Controller, Get, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';
import { User } from '@prisma/client';
import { CurrentUser, Public } from 'src/core/decorators';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post()
  create(@Body() authDto: AuthDto) {
    return this.authService.authenticate(authDto.username);
  }

  @Get('me')
  findOne(@CurrentUser() user: User) {
    return user;
  }
}
