import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { GameGateway } from './game.gateway';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import { SessionsCron } from './sessions.cron';

@Module({
  imports: [JwtModule],
  controllers: [SessionsController],
  providers: [SessionsService, GameGateway, PrismaService, SessionsCron],
})
export class SessionsModule {}
