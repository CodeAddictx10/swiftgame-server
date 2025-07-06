import { Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
  user: {
    id: string;
  };
}

export interface JwtPayload {
  sub: string;
  username: string;
  iat: number;
  exp: number;
}
