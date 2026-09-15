import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { extname } from 'path';

@Injectable()
export class UploadsService {
  private readonly s3: S3Client;
  private readonly bucket = process.env.AWS_S3_BUCKET ?? '';
  private readonly region = process.env.AWS_REGION ?? 'us-east-1';
  private readonly hasS3Config = Boolean(
    process.env.AWS_S3_BUCKET &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY,
  );

  constructor() {
    this.s3 = new S3Client({
      region: this.region,
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }

  async uploadImages(files: Express.Multer.File[]) {
    return Promise.all(files.map((file) => this.uploadFile(file, 'listings')));
  }

  async uploadChatMedia(file: Express.Multer.File) {
    const url = await this.uploadFile(file, 'chat');

    return {
      url,
      type: this.resolveMediaType(file.mimetype),
      mimeType: file.mimetype,
      size: file.size,
      fileName: file.originalname,
    };
  }

  private async uploadFile(file: Express.Multer.File, folder: string) {
    const extension = extname(file.originalname);
    const key = `${folder}/${randomUUID()}-${Date.now()}${extension}`;

    if (!this.hasS3Config) {
      await mkdir(`uploads/${folder}`, { recursive: true });
      await writeFile(`uploads/${key}`, file.buffer);

      const baseUrl =
        process.env.API_PUBLIC_URL ??
        `http://localhost:${process.env.PORT ?? 3001}`;

      return `${baseUrl}/uploads/${key}`;
    }

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  private resolveMediaType(mimeType: string): 'IMAGE' | 'AUDIO' | 'FILE' {
    if (mimeType.startsWith('image/')) {
      return 'IMAGE';
    }

    if (mimeType.startsWith('audio/')) {
      return 'AUDIO';
    }

    return 'FILE';
  }
}
