import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
  username: string;
  sub: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'yourSecretKey', // Should be the same secret as in the JwtModule
    });
  }

  validate(payload: JwtPayload): { userId: number; username: string } {
    // The payload is the decoded JWT.
    // We can use the user ID from the payload to fetch the user from the database.
    return { userId: payload.sub, username: payload.username };
  }
}
