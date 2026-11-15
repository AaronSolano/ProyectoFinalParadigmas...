import { Inject, Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { ImageStorage } from '../domain/ports';
import { imageType } from '../domain/images';
@Controller()
export class PublicController {
  constructor(@Inject("IMAGE_STORAGE") private readonly images: ImageStorage) {}
  @Get("health") health() {
    return {
      status: "ok",
      service: "kahoot-api",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    };
  }
  @Get("images/:filename") async image(
    @Param("filename") name: string,
    @Res() res: Response,
  ) {
    res.setHeader("Content-Type", imageType(name));
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(await this.images.get(name));
  }
}
