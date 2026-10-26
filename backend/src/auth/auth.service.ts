import { createHash, randomBytes } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import type { AccessTokenPayload } from '../common/guards/jwt-auth.guard.js';
import { hashPassword, verifyPassword } from '../common/utils/password.js';
import { PushToken } from '../users/entities/push-token.entity.js';
import { User } from '../users/entities/user.entity.js';
import type {
  GoogleLoginDto,
  LoginDto,
  LogoutDto,
  RegisterDto,
} from './dto/auth.dto.js';
import {
  OAuthAccount,
  OAuthProvider,
} from './entities/oauth-account.entity.js';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { GoogleAuthService } from './google-auth.service.js';

export type AuthResponse = {
  accessToken: string;
  /** Seconds until accessToken expires. */
  expiresIn: number;
  refreshToken: string;
  user: User;
};

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlDays: number;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    @InjectRepository(PushToken)
    private readonly pushTokens: Repository<PushToken>,
    private readonly jwt: JwtService,
    private readonly google: GoogleAuthService,
    config: ConfigService,
  ) {
    this.accessTtlSeconds = Number(config.get('JWT_ACCESS_TTL_SECONDS'));
    this.refreshTtlDays = Number(config.get('REFRESH_TOKEN_TTL_DAYS'));
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    if (await this.users.existsBy({ email: dto.email })) {
      throw new ConflictException('Email is already registered');
    }
    const user = await this.users.save(
      this.users.create({
        email: dto.email,
        passwordHash: await hashPassword(dto.password),
        fullName: dto.fullName.trim(),
      }),
    );
    return this.issueTokens(user, dto.deviceName);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: dto.email })
      .getOne();

    // Same message for "no such user" and "wrong password" so emails can't be probed.
    const ok =
      user?.passwordHash &&
      (await verifyPassword(dto.password, user.passwordHash));
    if (!user || !ok) {
      throw new UnauthorizedException('Email or password is incorrect');
    }
    return this.issueTokens(user, dto.deviceName);
  }

  /**
   * Finds the user by Google account, else links to an existing user with the same
   * (verified) email, else creates a new user.
   */
  async loginWithGoogle(dto: GoogleLoginDto): Promise<AuthResponse> {
    const profile = await this.google.verify(dto.idToken);
    if (!profile.emailVerified) {
      throw new UnauthorizedException('Google email is not verified');
    }

    const user = await this.dataSource.transaction(async (manager) => {
      const account = await manager.findOne(OAuthAccount, {
        where: { provider: OAuthProvider.Google, providerUserId: profile.sub },
        relations: { user: true },
      });
      if (account) return account.user;

      let existing = await manager.findOneBy(User, { email: profile.email });
      if (!existing) {
        existing = await manager.save(
          manager.create(User, {
            email: profile.email,
            fullName: profile.name ?? profile.email.split('@')[0],
            avatarUrl: profile.picture,
          }),
        );
      }
      await manager.save(
        manager.create(OAuthAccount, {
          userId: existing.id,
          provider: OAuthProvider.Google,
          providerUserId: profile.sub,
        }),
      );
      return existing;
    });

    return this.issueTokens(user, dto.deviceName);
  }

  /** Rotates the refresh token: the old one stops working, a new pair is returned. */
  async refresh(refreshToken: string): Promise<AuthResponse> {
    const stored = await this.refreshTokens.findOne({
      where: { tokenHash: sha256(refreshToken) },
      relations: { user: true },
    });
    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Conditional update so two concurrent refreshes can't both succeed.
    const { affected } = await this.refreshTokens.update(
      { id: stored.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    if (!affected) {
      // A revoked token being reused means it was probably stolen:
      // sign this user out everywhere. The app must therefore never send
      // two refresh requests at once (queue requests behind one refresh).
      await this.refreshTokens.update(
        { userId: stored.userId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    return this.issueTokens(stored.user, stored.deviceName ?? undefined);
  }

  async logout(dto: LogoutDto): Promise<void> {
    const stored = await this.refreshTokens.findOneBy({
      tokenHash: sha256(dto.refreshToken),
    });
    if (!stored) return;

    await this.refreshTokens.update(
      { id: stored.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    if (dto.pushToken) {
      await this.pushTokens.delete({
        userId: stored.userId,
        token: dto.pushToken,
      });
    }
  }

  private async issueTokens(
    user: User,
    deviceName?: string,
  ): Promise<AuthResponse> {
    const payload: AccessTokenPayload = { sub: user.id, role: user.role };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: this.accessTtlSeconds,
    });

    const refreshToken = randomBytes(48).toString('base64url');
    await this.refreshTokens.save(
      this.refreshTokens.create({
        userId: user.id,
        tokenHash: sha256(refreshToken),
        deviceName: deviceName ?? null,
        expiresAt: new Date(Date.now() + this.refreshTtlDays * 86_400_000),
      }),
    );

    delete (user as Partial<User>).passwordHash;
    return {
      accessToken,
      expiresIn: this.accessTtlSeconds,
      refreshToken,
      user,
    };
  }
}
