import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};

/** Verifies Google ID tokens sent by the app (signature, expiry, audience). */
@Injectable()
export class GoogleAuthService {
  private readonly client = new OAuth2Client();
  private readonly clientIds: string[];

  constructor(config: ConfigService) {
    this.clientIds = (config.get<string>('GOOGLE_CLIENT_IDS') ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }

  async verify(idToken: string): Promise<GoogleProfile> {
    if (!this.clientIds.length) {
      throw new ServiceUnavailableException(
        'Google sign-in is not configured (GOOGLE_CLIENT_IDS is empty)',
      );
    }

    let payload;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientIds,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google ID token');
    }
    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Google ID token has no email');
    }

    return {
      sub: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: payload.email_verified === true,
      name: payload.name ?? null,
      picture: payload.picture ?? null,
    };
  }
}
