import { Request } from 'express';
import { User } from '@prisma/client';

export interface IExpressRequest extends Request {
  user?: User;
}
