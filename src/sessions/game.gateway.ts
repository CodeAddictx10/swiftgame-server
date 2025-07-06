import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthenticatedSocket, JwtPayload } from 'src/core/types';
import { PrismaService } from 'src/prisma.service';
import { SessionsService } from './sessions.service';
import { Logger } from '@nestjs/common';
import { GAME_DURATION, SESSION_INTERVAL } from 'src/core/constant';

@WebSocketGateway({
  cors: {
    origin: process.env.ORIGINS?.split(','),
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private logger = new Logger(GameGateway.name);
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly sessionsService: SessionsService,
  ) {}
  @WebSocketServer() server: Server;
  private connectedClients = new Set<string>();
  private connectedRooms = new Set<string>();

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string;

    if (!token) {
      return false;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
      client['user'] = await this.prisma.user.findUnique({
        where: {
          id: (payload as JwtPayload).sub,
        },
      });
      if (!client['user']) {
        this.logger.error('Invalid token');
        return false;
      }
    } catch {
      this.logger.error('Invalid token');
      return false;
    }

    this.connectedClients.add(client.id);

    const currentSession = this.sessionsService.getCurrentSession();
    const timeLeft =
      this.sessionsService.getTimeLeftInCurrentSession(GAME_DURATION) / 1000;
    const nextIn =
      this.sessionsService.getTimeUntilNextSession(SESSION_INTERVAL) / 1000;

    client.emit('sessionEvents', {
      type: 'sessionInit',
      data: {
        ...currentSession,
        timeLeft: timeLeft,
        nextSessionStart: nextIn,
      },
    });

    this.logger.log(
      '⚡️⚡️Client is connected⚡️⚡️',
      client.id,
      this.connectedClients.values(),
    );
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.connectedClients.delete(client.id);
  }

  hasClients(): boolean {
    return this.connectedClients.size > 0;
  }

  emitToAll(event: string, payload: unknown) {
    this.server.emit(event, payload);
  }

  emitToRoom(room: string, event: string, payload: unknown) {
    this.server.to(room).emit(event, payload);
  }

  @SubscribeMessage('sessionInit')
  handleSessionInit(@ConnectedSocket() client: AuthenticatedSocket) {
    const currentSession = this.sessionsService.getCurrentSession();
    const timeLeft =
      this.sessionsService.getTimeLeftInCurrentSession(GAME_DURATION) / 1000;
    const nextIn =
      this.sessionsService.getTimeUntilNextSession(SESSION_INTERVAL) / 1000;

    client.emit('sessionEvents', {
      type: 'sessionInit',
      data: {
        ...currentSession,
        timeLeft: timeLeft,
        nextSessionStart: nextIn,
      },
    });
  }

  @SubscribeMessage('joinGameSession')
  async handleJoinGameSession(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<WsException | void> {
    try {
      const userId = client.user.id;

      const session = await this.prisma.gameSession.findUnique({
        where: { id: data.sessionId },
      });

      if (!session || session.status !== 'ACTIVE') {
        client.emit('gameSessionJoinError', 'Session not active');
        return;
      }

      const existing = await this.prisma.userGameSession.findUnique({
        where: {
          userId_gameSessionId: {
            userId,
            gameSessionId: data.sessionId,
          },
        },
      });

      if (existing) {
        client.emit(
          'gameSessionJoinError',
          'You have already joined this session',
        );
        return;
      }

      await this.prisma.userGameSession.create({
        data: {
          userId,
          gameSessionId: data.sessionId,
          selectedNumber: null,
        },
      });

      await this.prisma.gameSession.update({
        where: { id: data.sessionId },
        data: {
          numberOfPlayers: {
            increment: 1,
          },
        },
      });

      await client.join(data.sessionId);

      const participants = await this.prisma.user.findMany({
        where: {
          gameParticipations: {
            some: {
              gameSessionId: data.sessionId,
            },
          },
        },
      });

      client.emit('gameSessionJoined', {
        ...session,
        participants,
        timeLeft:
          this.sessionsService.getTimeLeftInCurrentSession(GAME_DURATION) /
          1000,
      });

      client.to(session.id).emit('participantEnteredGameSession', {
        id: session.id,
        participants,
      });

      this.connectedRooms.add(data.sessionId);
    } catch (err) {
      this.logger.error('joinGameSession error', err);
      client.emit(
        'gameSessionJoinError',
        err instanceof Error ? err.message : 'Join session failed',
      );
    }
  }

  @SubscribeMessage('selectNumberInGameSession')
  async handleSelectNumberInGameSession(
    @MessageBody() payload: { sessionId: string; number: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const userId = client.user.id;

    const existing = await this.prisma.userGameSession.findUnique({
      where: {
        userId_gameSessionId: {
          userId,
          gameSessionId: payload.sessionId,
        },
        selectedNumber: {
          not: null,
        },
      },
    });

    if (existing) {
      client.emit('numberSelectionError', 'You have already picked a number');
      return;
    }

    await this.prisma.userGameSession.update({
      where: {
        userId_gameSessionId: {
          userId,
          gameSessionId: payload.sessionId,
        },
      },
      data: {
        selectedNumber: payload.number,
      },
    });
  }

  isConnectedToRoom(roomId: string) {
    return this.connectedRooms.has(roomId);
  }

  removeRoom(roomId: string) {
    this.connectedRooms.delete(roomId);
  }
}
