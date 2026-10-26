import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import {
  BadRequestException,
  UseInterceptors,
  applyDecorators,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';

/** Files are written here and served at /uploads (see main.ts). */
export const UPLOADS_DIR = join(process.cwd(), 'uploads');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Accepts one image in the multipart field `file` and stores it in uploads/<folder>.
 * Read it in the handler with `@UploadedFile() file: Express.Multer.File`.
 */
export function ImageUpload(folder: string) {
  const destination = join(UPLOADS_DIR, folder);
  mkdirSync(destination, { recursive: true });

  return applyDecorators(
    UseInterceptors(
      FileInterceptor('file', {
        storage: diskStorage({
          destination,
          filename: (_req, file, cb) =>
            cb(
              null,
              `${randomUUID()}${extname(file.originalname).toLowerCase()}`,
            ),
        }),
        limits: { fileSize: MAX_SIZE_BYTES },
        fileFilter: (_req, file, cb) => {
          if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
          else
            cb(
              new BadRequestException(
                'Only JPEG, PNG, WebP or HEIC images are allowed',
              ),
              false,
            );
        },
      }),
    ),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['file'],
        properties: { file: { type: 'string', format: 'binary' } },
      },
    }),
  );
}

/** Public URL for a file saved by ImageUpload. */
export function uploadedFileUrl(
  publicUrl: string,
  folder: string,
  file: Express.Multer.File | undefined,
): string {
  if (!file) throw new BadRequestException('Field "file" is required');
  return `${publicUrl.replace(/\/$/, '')}/uploads/${folder}/${file.filename}`;
}
