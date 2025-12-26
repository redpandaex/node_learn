import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import * as path from 'path';
import * as fs from 'fs-extra';

// 确保上传目录存在
const uploadsDir = path.join(process.cwd(), 'resources');
const chunksDir = path.join(uploadsDir, 'chunks');
fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(chunksDir);

@Module({
  imports: [
    MulterModule.register({
      dest: chunksDir,
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
