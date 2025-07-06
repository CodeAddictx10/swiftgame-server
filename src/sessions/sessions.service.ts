import { Injectable } from '@nestjs/common';
import {
  GameSession,
  GameSessionStatus,
  UserGameSession,
} from '@prisma/client';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class SessionsService {
  private currentSession: GameSession | null = null;
  private sessionStartTimestamp: number | null = null;
  constructor(private prisma: PrismaService) {}

  async createSession(): Promise<GameSession> {
    const session = await this.prisma.gameSession.create({
      data: {
        duration: 30,
        status: GameSessionStatus.ACTIVE,
      },
    });
    this.setCurrentSession(session);
    return session;
  }

  async endSession(sessionId: string): Promise<{
    sessionId: string;
    winningNumber: number;
    participants: UserGameSession[];
  }> {
    const winningNumber = this.generateWinningNumber();

    // Get all players in the session
    await this.prisma.userGameSession.updateMany({
      where: { gameSessionId: sessionId, selectedNumber: winningNumber },
      data: { isWinner: true },
    });

    // Update session
    await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        winningNumber,
        endTime: new Date(),
        status: GameSessionStatus.COMPLETED,
      },
    });

    const participants = await this.prisma.userGameSession.findMany({
      where: { gameSessionId: sessionId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    this.setCurrentSession(null);

    return { sessionId, participants, winningNumber };
  }

  async deleteOldSessions() {
    await this.prisma.gameSession.deleteMany({
      where: {
        numberOfPlayers: null,
        status: {
          not: GameSessionStatus.ACTIVE,
        },
      },
    });
  }

  generateWinningNumber(): number {
    return 6;
    return Math.floor(Math.random() * 10) + 1;
  }

  setCurrentSession(session: GameSession | null, startTime?: number) {
    this.currentSession = session;
    this.sessionStartTimestamp = session ? (startTime ?? Date.now()) : null;
  }

  getCurrentSession() {
    return this.currentSession;
  }

  getTimeLeftInCurrentSession(durationMs: number): number {
    if (!this.sessionStartTimestamp) return 0;

    const elapsed = Date.now() - this.sessionStartTimestamp;
    const remaining = durationMs - elapsed;
    return Math.max(0, remaining);
  }

  getTimeUntilNextSession(intervalMs: number): number {
    const now = Date.now();
    const next = intervalMs - (now % intervalMs);
    return next;
  }
}
