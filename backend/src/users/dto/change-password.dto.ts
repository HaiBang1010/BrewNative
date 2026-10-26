import { IsOptional, IsString, Length } from 'class-validator';

export class ChangePasswordDto {
  /** Required if the account already has a password. Google-only accounts can omit it. */
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsString()
  @Length(8, 72)
  newPassword: string;
}
