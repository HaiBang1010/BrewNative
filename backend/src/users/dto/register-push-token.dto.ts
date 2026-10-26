import { IsEnum, IsString, Matches } from 'class-validator';
import { DevicePlatform } from '../entities/push-token.entity.js';

export class RegisterPushTokenDto {
  /** From Notifications.getExpoPushTokenAsync() in the app. */
  @IsString()
  @Matches(/^Exp(onent)?PushToken\[.+\]$/, {
    message: 'token must be an Expo push token',
  })
  token: string;

  @IsEnum(DevicePlatform)
  platform: DevicePlatform;
}
