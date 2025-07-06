import { Injectable, Logger } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { GameGateway } from './game.gateway';
import { Timeout } from '@nestjs/schedule';

const SESSION_INTERVAL = 40000; // 40 seconds
const GAME_DURATION = 30000; // 30 seconds

@Injectable()
export class SessionsCron {
  private logger = new Logger(SessionsCron.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly sessionService: SessionsService,
    private readonly gateway: GameGateway,
  ) {}

  onModuleInit() {
    this.startAlignedGameLoop();
  }

  private startAlignedGameLoop() {
    const now = Date.now();
    const delay = SESSION_INTERVAL - (now % SESSION_INTERVAL);

    setTimeout(() => {
      void this.runSessionCycle(); // first cycle
      this.timer = setInterval(
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        async () => {
          await this.runSessionCycle();
        },
        SESSION_INTERVAL,
      ); // all future cycles
    }, delay);
  }

  private async runSessionCycle() {
    const clientsActive = this.gateway.hasClients();

    if (!clientsActive) {
      this.logger.log('No clients — skipping session.');
      this.sessionService.setCurrentSession(null);
      return;
    }

    const session = await this.sessionService.createSession();
    this.sessionService.setCurrentSession(session);
    this.logger.log('Session started', session);
    this.gateway.emitToAll('sessionEvents', {
      type: 'sessionStarted',
      data: {
        id: session.id,
        duration: GAME_DURATION / 1000,
        timeLeft: GAME_DURATION / 1000,
      },
    });

    // Schedule session end
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setTimeout(async () => {
      const current = this.sessionService.getCurrentSession();
      if (!current) return;

      const result = await this.sessionService.endSession(current.id);
      this.logger.log('Session ended', result);

      this.gateway.emitToAll('sessionEvents', {
        type: 'sessionEnded',
        data: {
          sessionId: result.sessionId,
          winningNumber: result.winningNumber,
          nextSessionStart: (SESSION_INTERVAL - GAME_DURATION) / 1000,
        },
      });

      if (this.gateway.isConnectedToRoom(session.id)) {
        this.gateway.emitToRoom(session.id, 'currentGameSessionEnded', {
          ...result,
          duration: GAME_DURATION / 1000,
          timeLeft: 0,
        });

        this.gateway.removeRoom(session.id);
      }

      this.sessionService.setCurrentSession(null);
    }, GAME_DURATION);
  }

  @Timeout(10000)
  clearOldSessions() {
    this.logger.log('Clearing old sessions');
    // await this.sessionService.deleteOldSessions();
  }
}
