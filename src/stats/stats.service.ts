import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getUserStats(userId: string) {
    console.log('Getting user stats for user', userId);

    const sessions = await this.prisma.userGameSession.findMany({
      where: { userId },
    });

    if (sessions.length === 0) {
      return { totalGames: 0, totalWins: 0, totalLoses: 0, winPercentage: 0 };
    }

    const totalGames = sessions.length;
    const totalWins = sessions.filter((session) => session.isWinner).length;
    const winPercentage = (totalWins / totalGames) * 100;
    const totalLoses = totalGames - totalWins;
    return { totalGames, totalWins, totalLoses, winPercentage };
  }

  //API to fetch the top 10 players (sorted by wins)
  async getTopPlayers() {
    const topPlayers = await this.prisma.userGameSession.groupBy({
      by: ['userId'],
      where: {
        isWinner: true, // only count winning sessions
      },
      _count: {
        isWinner: true,
      },
      orderBy: {
        _count: {
          isWinner: 'desc',
        },
      },
      take: 10,
    });

    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: topPlayers.map((p) => p.userId),
        },
      },
      select: {
        id: true,
        username: true,
      },
    });

    const leaderboard = topPlayers.map((p) => {
      const user = users.find((u) => u.id === p.userId);
      return {
        userId: p.userId,
        username: user?.username || 'Unknown',
        wins: p._count.isWinner,
      };
    });

    return leaderboard;
  }
}
