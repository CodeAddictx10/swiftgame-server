import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
  ) {}

  async authenticate(username: string): Promise<any> {
    let user = await this.prismaService.user.findUnique({
      where: {
        username,
      },
    });
    if (!user) {
      user = await this.prismaService.user.create({
        data: {
          username,
        },
      });
    }
    const payload = { sub: user.id, username: user.username };
    return {
      token: await this.jwtService.signAsync(payload),
      user,
    };
  }
}
