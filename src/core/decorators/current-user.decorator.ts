import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';
import { IExpressRequest } from '../interfaces/express-request-interface';

export const CurrentUser = createParamDecorator(
  (key: keyof User, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<IExpressRequest>();

    if (!request.user) {
      return null;
    }

    if (key) {
      return request.user[key];
    }

    return request.user;
  },
);
