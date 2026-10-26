import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

class DeviceInfoDto {
  /** Shown in "signed-in devices", e.g. "iPhone 16 của Bang". */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;
}

export class RegisterDto extends DeviceInfoDto {
  @Transform(normalizeEmail)
  @IsEmail()
  email: string;

  /** 8-72 characters (72 is the practical limit of most password hashers). */
  @IsString()
  @Length(8, 72)
  password: string;

  @IsString()
  @Length(1, 100)
  fullName: string;
}

export class LoginDto extends DeviceInfoDto {
  @Transform(normalizeEmail)
  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(72)
  password: string;
}

export class GoogleLoginDto extends DeviceInfoDto {
  /** ID token returned by Google Sign-In in the app. */
  @IsString()
  idToken: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class LogoutDto extends RefreshTokenDto {
  /** This device's Expo push token, so it stops receiving notifications for this account. */
  @IsOptional()
  @IsString()
  pushToken?: string;
}
