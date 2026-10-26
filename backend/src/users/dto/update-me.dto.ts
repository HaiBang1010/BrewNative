import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  fullName?: string;

  /** Digits, spaces, + and - only. Send null to clear. */
  @IsOptional()
  @Matches(/^[0-9+\-\s]{6,20}$/, {
    message: 'phone is not a valid phone number',
  })
  phone?: string | null;
}
