import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from 'generated/prisma/client';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { ResponseMessage } from 'src/common/interceptors/transform.interceptor';
import { UploadMaintenanceCardPhotosDto } from './dto/maintenance-card-media.dto';
import { MaintenanceCardMediaService } from './maintenance-card-media.service';

const PHOTO_LIMIT = 8 * 1024 * 1024;
const SIGNATURE_LIMIT = 4 * 1024 * 1024;

@ApiTags('Maintenance Card Media')
@ApiBearerAuth()
@Controller({ path: 'maintenance-cards', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class MaintenanceCardMediaController {
  constructor(private readonly service: MaintenanceCardMediaService) {}

  @Post(':cardId/photos')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      storage: memoryStorage(),
      limits: { fileSize: PHOTO_LIMIT },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files'],
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
        displayOrder: { type: 'integer', minimum: 0 },
      },
    },
  })
  @ResponseMessage('maintenanceMedia.responses.photos_uploaded')
  uploadPhotos(
    @Param('cardId', ParseIntPipe) cardId: number,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Body() dto: UploadMaintenanceCardPhotosDto,
    @GetUser('id') userId: number,
  ) {
    return this.service.uploadPhotos(cardId, files, dto.displayOrder, userId);
  }

  @Get(':cardId/photos')
  @ResponseMessage('maintenanceMedia.responses.photos_retrieved')
  listPhotos(@Param('cardId', ParseIntPipe) cardId: number) {
    return this.service.listPhotos(cardId);
  }

  @Get(':cardId/photos/:photoId/content')
  @ApiOperation({ summary: 'Stream private maintenance-card photo content' })
  async photoContent(
    @Param('cardId', ParseIntPipe) cardId: number,
    @Param('photoId', ParseIntPipe) photoId: number,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.service.photoContent(cardId, photoId);
    this.stream(response, file);
  }

  @Delete(':cardId/photos/:photoId')
  @ResponseMessage('maintenanceMedia.responses.photo_deleted')
  async deletePhoto(
    @Param('cardId', ParseIntPipe) cardId: number,
    @Param('photoId', ParseIntPipe) photoId: number,
  ) {
    await this.service.deletePhoto(cardId, photoId);
    return null;
  }

  @Post(':cardId/signature')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: SIGNATURE_LIMIT },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ResponseMessage('maintenanceMedia.responses.signature_uploaded')
  uploadSignature(
    @Param('cardId', ParseIntPipe) cardId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.service.uploadSignature(cardId, file);
  }

  @Get(':cardId/signature')
  @ResponseMessage('maintenanceMedia.responses.signature_retrieved')
  getSignature(@Param('cardId', ParseIntPipe) cardId: number) {
    return this.service.getSignature(cardId);
  }

  @Get(':cardId/signature/content')
  @ApiOperation({
    summary: 'Stream private maintenance-card signature content',
  })
  async signatureContent(
    @Param('cardId', ParseIntPipe) cardId: number,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.service.signatureContent(cardId);
    this.stream(response, file);
  }

  @Delete(':cardId/signature')
  @ResponseMessage('maintenanceMedia.responses.signature_deleted')
  async deleteSignature(@Param('cardId', ParseIntPipe) cardId: number) {
    await this.service.deleteSignature(cardId);
    return null;
  }

  private stream(
    response: Response,
    file: {
      stream: NodeJS.ReadableStream;
      mimeType: string;
      sizeBytes: number;
    },
  ): void {
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Length', file.sizeBytes);
    response.setHeader('Cache-Control', 'private, no-store');
    file.stream.pipe(response);
  }
}
