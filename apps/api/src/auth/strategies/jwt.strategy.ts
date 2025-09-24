import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('auth.jwtSecret', 'development-secret'),
      audience: configService.get<string>('auth.audience'),
      issuer: configService.get<string>('auth.issuer')
    });
  }

  async validate(payload: AuthenticatedUser): Promise<AuthenticatedUser> {
    return payload;
  }
}
