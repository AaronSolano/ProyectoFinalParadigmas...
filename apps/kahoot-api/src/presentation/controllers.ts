import {
  Inject,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth } from "@nestjs/swagger";
import { Request, Response } from "express";
import { KahootService } from "../application/service";
import { AuthGuard, Identity } from "../auth/auth";
import { ImageStorage, imageType } from "../modules/images/storage";
import { Problem } from "../domain/problem";
import { QuizInput, QuestionInput, SessionInput, JoinInput } from "./dto";
type UserRequest = Request & { identity: Identity };
const uuid = new ParseUUIDPipe({
  version: "4",
  exceptionFactory: () =>
    new Problem(400, "VALIDATION_ERROR", "Identificador invalido."),
});
@Controller("quizzes")
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class QuizzesController {
  constructor(private readonly service: KahootService) {}
  @Get() list(@Req() r: UserRequest) {
    return this.service.listQuizzes(r.identity.id);
  }
  @Post() create(@Req() r: UserRequest, @Body() b: QuizInput) {
    return this.service.createQuiz(r.identity.id, b);
  }
  @Get(":quizId") get(
    @Req() r: UserRequest,
    @Param("quizId", uuid) id: string,
  ) {
    return this.service.getQuiz(r.identity.id, id);
  }
  @Put(":quizId") update(
    @Req() r: UserRequest,
    @Param("quizId", uuid) id: string,
    @Body() b: QuizInput,
  ) {
    return this.service.updateQuiz(r.identity.id, id, b);
  }
  @Delete(":quizId") @HttpCode(204) delete(
    @Req() r: UserRequest,
    @Param("quizId", uuid) id: string,
  ) {
    return this.service.deleteQuiz(r.identity.id, id);
  }
  @Get(":quizId/questions") questions(
    @Req() r: UserRequest,
    @Param("quizId", uuid) id: string,
  ) {
    return this.service.listQuestions(r.identity.id, id);
  }
  @Post(":quizId/questions") createQuestion(
    @Req() r: UserRequest,
    @Param("quizId", uuid) id: string,
    @Body() b: QuestionInput,
  ) {
    return this.service.saveQuestion(r.identity.id, id, b);
  }
  @Get(":quizId/questions/:questionId") question(
    @Req() r: UserRequest,
    @Param("quizId", uuid) id: string,
    @Param("questionId", uuid) q: string,
  ) {
    return this.service.getQuestion(r.identity.id, id, q);
  }
  @Put(":quizId/questions/:questionId") updateQuestion(
    @Req() r: UserRequest,
    @Param("quizId", uuid) id: string,
    @Param("questionId", uuid) q: string,
    @Body() b: QuestionInput,
  ) {
    return this.service.saveQuestion(r.identity.id, id, b, q);
  }
  @Delete(":quizId/questions/:questionId") @HttpCode(204) deleteQuestion(
    @Req() r: UserRequest,
    @Param("quizId", uuid) id: string,
    @Param("questionId", uuid) q: string,
  ) {
    return this.service.deleteQuestion(r.identity.id, id, q);
  }
  @Put(":quizId/questions/:questionId/image")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 2097152, files: 1 } }),
  )
  image(
    @Req() r: UserRequest,
    @Param("quizId", uuid) id: string,
    @Param("questionId", uuid) q: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file)
      throw new Problem(
        400,
        "VALIDATION_ERROR",
        "Se requiere el archivo file.",
      );
    return this.service.changeImage(r.identity.id, id, q, file);
  }
  @Delete(":quizId/questions/:questionId/image") removeImage(
    @Req() r: UserRequest,
    @Param("quizId", uuid) id: string,
    @Param("questionId", uuid) q: string,
  ) {
    return this.service.changeImage(r.identity.id, id, q);
  }
}
@Controller("sessions")
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class SessionsController {
  constructor(private readonly service: KahootService) {}
  @Get() list(@Req() r: UserRequest) {
    return this.service.listSessions(r.identity.id);
  }
  @Post() create(@Req() r: UserRequest, @Body() b: SessionInput) {
    return this.service.createSession(r.identity.id, b);
  }
  @Get(":code") get(@Param("code") code: string) {
    return this.service.getSession(code);
  }
  @Post(":code/join") @HttpCode(200) join(
    @Req() r: UserRequest,
    @Param("code") code: string,
    @Body() b: JoinInput,
  ) {
    return this.service.joinSession(r.identity, code, b ?? {});
  }
  @Get(":code/participants") participants(
    @Req() r: UserRequest,
    @Param("code") code: string,
  ) {
    return this.service.participants(r.identity.id, code);
  }
  @Get(":code/results") results(
    @Req() r: UserRequest,
    @Param("code") code: string,
  ) {
    return this.service.results(r.identity.id, code);
  }
}
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
