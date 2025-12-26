import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  Query,
  Res,
  UsePipes,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express, Response, Request } from 'express';
import { UploadService } from './upload.service';
import { ChunkUploadDto, ChunkUploadSchema } from './dto/chunk-upload.dto';
import { VerifyChunkDto, VerifyChunkSchema } from './dto/verify-chunk.dto';
import { MergeChunksDto, MergeChunksSchema } from './dto/merge-chunks.dto';
import { diskStorage } from 'multer';
import * as path from 'path';
import fs from 'fs-extra';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  // 验证文件是否已上传或部分上传
  @Post('verify')
  @UsePipes(new ZodValidationPipe<VerifyChunkDto>(VerifyChunkSchema))
  verifyUpload(@Body() verifyChunkDto: VerifyChunkDto) {
    return this.uploadService.verifyUpload(verifyChunkDto);
  }

  // 上传分片
  @Post('chunk')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          // 使用临时目录，避免依赖req.body
          const tempDir = path.join(process.cwd(), 'resources/temp');
          // 确保目录存在
          fs.mkdirSync(tempDir, { recursive: true });
          cb(null, tempDir);
        },
        filename: (req, file, cb) => {
          // 生成唯一的临时文件名
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `temp-${uniqueSuffix}`);
        },
      }),
    }),
  )
  async uploadChunk(
    @UploadedFile() file: Express.Multer.File,
    @Body(new ZodValidationPipe(ChunkUploadSchema))
    chunkUploadDto: ChunkUploadDto,
  ) {
    console.log('[debug] file', file);
    return this.uploadService.saveChunk(file, chunkUploadDto);
  }

  // 合并分片
  @Post('merge')
  @UsePipes(new ZodValidationPipe(MergeChunksSchema))
  mergeChunks(@Body() mergeChunksDto: MergeChunksDto) {
    return this.uploadService.mergeChunks(mergeChunksDto);
  }

  // 下载已上传的文件
  @Get('download/:fileHash')
  downloadFile(
    @Param('fileHash') fileHash: string,
    @Res() res: Response,
    @Req() req: Request,
    @Query('filename') filename?: string,
  ) {
    return this.uploadService.downloadFile(fileHash, res, req, filename);
  }
}
