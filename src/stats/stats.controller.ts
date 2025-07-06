import { Controller, Get, Req } from '@nestjs/common';
import { StatsService } from './stats.service';
import { IExpressRequest } from 'src/core/interfaces/express-request-interface';
import { Public } from 'src/core/decorators';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  async getUserStats(@Req() req: IExpressRequest) {
    return this.statsService.getUserStats(req.user?.id as string);
  }

  @Public()
  @Get('leaderboard')
  async getLeaderboard() {
    return this.statsService.getTopPlayers();
  }
}
