import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { QuizUseCases } from "../application/quiz-use-cases";
import { AuthGuard, Identity } from "../auth/auth";
import { Config } from "../config/config";
import { Problem } from "../domain/problem";
import { quizView, questionView } from "./mappers";
type UserRequest = Request & { identity: Identity };
const uuid = new ParseUUIDPipe({
  version: "4",
  exceptionFactory: () =>
    new Problem(400, "VALIDATION_ERROR", "Identificador invalido."),
});
/** Biblioteca compartida: cuestionarios de solo lectura que cualquier docente puede usar o copiar. */
@Controller("library")
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class LibraryController {
  constructor(
    private readonly service: QuizUseCases,
    @Inject("CONFIG") private readonly config: Config,
  ) {}
  @Get() list() {
    return this.service.listLibrary().then((items) => items.map(quizView));
  }
  @Get(":quizId/questions") questions(@Param("quizId", uuid) id: string) {
    return this.service
      .libraryQuestions(id)
      .then((items) =>
        items.map((value) => questionView(value, this.config.publicUrl)),
      );
  }
  @Post(":quizId/copy") copy(
    @Req() r: UserRequest,
    @Param("quizId", uuid) id: string,
  ) {
    return this.service
      .copyFromLibrary(r.identity.id, id)
      .then((value) => quizView(value));
  }
}
