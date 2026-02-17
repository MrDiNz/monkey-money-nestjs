import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('global.jwtSecret') || '',
    });
  }

  async validate(payload: any) {
    console.log('testttttttttttttt');
    Logger.log('testLoggerrrrrrrr');
    return { userId: payload.sub, username: payload.username };
  }
}
