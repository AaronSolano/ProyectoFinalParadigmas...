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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { QuizUseCases } from "../application/quiz-use-cases";
import { AccountGuard, Identity } from "../auth/auth";
import { Config } from "../config/config";
import { Problem } from "../domain/problem";
import { QuizInput, QuestionInput } from "./dto";
import { quizView, questionView } from "./mappers";
type UserRequest = Request & { identity: Identity };
const uuid = new ParseUUIDPipe({
  version: "4",
  exceptionFactory: () =>
    new Problem(400, "VALIDATION_ERROR", "Identificador invalido."),
});
@Controller("quizzes")
@UseGuards(AccountGuard)
@ApiBearerAuth()
export class QuizzesController {
  constructor(
    private readonly service: QuizUseCases,
    @Inject("CONFIG") private readonly config: Config,
  ) {}
  @Get() list(@Req() r: UserRequest) {
    return this.service
      .listQuizzes(r.identity.id)
      .then((items) => items.map((value) => quizView(value)));
  }
  @Post() create(@Req() r: UserRequest, @Body() b: QuizInput) {
    return this.service
      .createQuiz(r.identity.id, b)
      .then((value) => quizView(value));
  }
  @Get(":quizId") get(
    @Req() r: UserRequest,
    @Param("quizId", uuid) id: string,
  ) {
    return this.service
      .getQuiz(r.identity.id, id)
      .then((value) => quizView(value));
  }
  @Put(":quizId") update(
    @Req() r: UserRequest,
    @Param("quizId", uuid) id: string,
    @Body() b: QuizInput,
  ) {
    return this.service
      .updateQuiz(r.identity.id, id, b)
      .then((value) => quizView(value));
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
    return this.service
      .listQuestions(r.identity.id, id)
      .then((items) =>
        items.map((value) => questionView(value, this.config.publicUrl)),
      );
  }
  @Post(":quizId/questions") createQuestion(
    @Req() r: UserRequest,
    @Param("quizId", uuid) id: string,
    @Body() b: QuestionInput,
  ) {
    return this.service
      .saveQuestion(r.identity.id, id, b)
      .then((value) => questionView(value, this.config.publicUrl));
  }
  @Get(":quizId/questions/:questionId") question(
    @Req() r: UserRequest,
    @Param("quizId", uuid) id: string,
    @Param("questionId", uuid) q: string,
  ) {
    return this.service
      .getQuestion(r.identity.id, id, q)
      .then((value) => questionView(value, this.config.publicUrl));
  }
  @Put(":quizId/questions/:questionId") updateQuestion(
    @Req() r: UserRequest,
    @Param("quizId", uuid) id: string,
    @Param("questionId", uuid) q: string,
    @Body() b: QuestionInput,
  ) {
    return this.service
      .saveQuestion(r.identity.id, id, b, q)
      .then((value) => questionView(value, this.config.publicUrl));
  }
  @Delete(":quizId/questions/:questionId") @HttpCode(204) deleteQuestion(
    @Req() r: UserRequest,
    @Param("quizId", uuid) id: string,
    @Param("questionId", uuid) q: string,
  ) {
    return this.service.deleteQuestion(r.identity.id, id, q);
  }
  @Put(":quizId/questions/:questionId/image")
  @UseInterceptors(FileInterceptor("file"))
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
    return this.service
      .changeImage(r.identity.id, id, q, file)
      .then((value) => questionView(value, this.config.publicUrl));
  }
  @Delete(":quizId/questions/:questionId/image") removeImage(
    @Req() r: UserRequest,
    @Param("quizId", uuid) id: string,
    @Param("questionId", uuid) q: string,
  ) {
    return this.service
      .changeImage(r.identity.id, id, q)
      .then((value) => questionView(value, this.config.publicUrl));
  }
}
