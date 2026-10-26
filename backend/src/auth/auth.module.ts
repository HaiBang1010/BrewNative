import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PushToken } from '../users/entities/push-token.entity.js';
import { User } from '../users/entities/user.entity.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { OAuthAccount } from './entities/oauth-account.entity.js';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { GoogleAuthService } from './google-auth.service.js';

// Global so the app-wide JwtAuthGuard can inject JwtService.
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, OAuthAccount, RefreshToken, PushToken]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleAuthService],
  exports: [JwtModule],
})
export class AuthModule {}
