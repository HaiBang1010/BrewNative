import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/auth.decorators.js';
import { ImageUpload, uploadedFileUrl } from '../uploads/image-upload.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { RegisterPushTokenDto } from './dto/register-push-token.dto.js';
import { UpdateMeDto } from './dto/update-me.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  getMe(@CurrentUser() user: AuthUser) {
    return this.users.findById(user.id);
  }

  @Patch()
  updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.users.update(user.id, dto);
  }

  @Put('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.users.changePassword(user.id, dto);
  }

  /** multipart/form-data, field `file`. */
  @Post('avatar')
  @ImageUpload('avatars')
  uploadAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const url = uploadedFileUrl(
      this.config.getOrThrow<string>('PUBLIC_URL'),
      'avatars',
      file,
    );
    return this.users.setAvatar(user.id, url);
  }

  @Post('push-tokens')
  @HttpCode(HttpStatus.NO_CONTENT)
  registerPushToken(
    @CurrentUser() user: AuthUser,
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.users.registerPushToken(user.id, dto);
  }

  @Delete('push-tokens/:token')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePushToken(
    @CurrentUser() user: AuthUser,
    @Param('token') token: string,
  ) {
    return this.users.removePushToken(user.id, token);
  }
}
