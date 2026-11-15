import "reflect-metadata";
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Module,
  ValidationPipe,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import { DataSource } from "typeorm";
import { Config } from "./config/config";
import { QuizUseCases } from './application/quiz-use-cases';
import { SessionUseCases } from './application/session-use-cases';
import { PostgresQuizRepository } from './data/quiz-repository';
import { PostgresSessionRepository } from './data/session-repository';
import { PostgresUnitOfWork } from './data/unit-of-work';
import { QuizRepository, SessionRepository, UnitOfWork, Clock, IdGenerator } from './domain/ports';
import { randomInt, randomUUID } from 'node:crypto';
import { AuthGuard } from "./auth/auth";
import {
  DiskImageStorage,
  ImageStorage,
  SupabaseImageStorage,
} from "./modules/images/storage";
import { PublicController } from './presentation/public.controller';
import { QuizzesController } from './presentation/quizzes.controller';
import { SessionsController } from './presentation/sessions.controller';
import { Problem } from "./domain/problem";
@Catch()
class ProblemFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    if (error instanceof Problem)
      return res.status(error.status).json({
        status: error.status,
        code: error.code,
        message: error.message,
      });
    const status = error instanceof HttpException ? error.getStatus() : 500;
    return res.status(status).json({
      status,
      code:
        status === 413
          ? "IMAGE_TOO_LARGE"
          : status === 400
            ? "VALIDATION_ERROR"
            : status === 404
              ? "NOT_FOUND"
              : "INTERNAL_ERROR",
      message:
        status === 500
          ? "Error interno del servicio."
          : status === 413
            ? "La imagen supera el maximo permitido."
            : "Solicitud invalida.",
    });
  }
}
export async function createApp(
  config: Config,
  db: DataSource,
  storage?: ImageStorage,
) {
  const images =
    storage ??
    (config.storage === "disk"
      ? new DiskImageStorage(config.imagePath)
      : new SupabaseImageStorage(
          config.supabaseUrl,
          config.supabaseKey,
          config.supabaseBucket,
        ));
  @Module({
    controllers: [QuizzesController, SessionsController, PublicController],
    providers: [
      {provide:'QuizRepository',useValue:new PostgresQuizRepository(db)},
      {provide:'SessionRepository',useValue:new PostgresSessionRepository(db)},
      {provide:'UnitOfWork',useValue:new PostgresUnitOfWork(db)},
      {provide:'Clock',useValue:{now:()=>new Date()}},
      {provide:'Ids',useValue:{uuid:randomUUID,roomCode:()=>Array.from({length:6},()=> '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'[randomInt("23456789ABCDEFGHJKLMNPQRSTUVWXYZ".length)]).join('')}},
      {provide:QuizUseCases,inject:['QuizRepository','UnitOfWork','IMAGE_STORAGE','Clock','Ids'],useFactory:(repo:QuizRepository,work:UnitOfWork,images:ImageStorage,clock:Clock,ids:IdGenerator)=>new QuizUseCases(repo,work,images,clock,ids,config.imageMaxBytes)},
      {provide:SessionUseCases,inject:['SessionRepository','UnitOfWork','Ids'],useFactory:(repo:SessionRepository,work:UnitOfWork,ids:IdGenerator)=>new SessionUseCases(repo,work,ids,config.questionTime)},
      { provide: AuthGuard, useValue: new AuthGuard(config) },
      { provide: "IMAGE_STORAGE", useValue: images },
      { provide: "CONFIG", useValue: config },
    ],
  })
  class AppModule {}
  const app = await NestFactory.create(AppModule, {
    logger: false,
    abortOnError: false,
  });
  app.setGlobalPrefix("api/v1");
  app.enableCors({ origin: config.cors });
  app.useGlobalFilters(new ProblemFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: () =>
        new Problem(
          400,
          "VALIDATION_ERROR",
          "Los datos enviados no son validos.",
        ),
    }),
  );
  const generated = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("Kahoot API")
      .setVersion("1.0.0")
      .addBearerAuth()
      .build(),
  );
  const contract = parse(
    readFileSync(
      resolve(__dirname, "../../../packages/contracts/openapi/kahoot-api.yaml"),
      "utf8",
    ),
  );
  // Keep schemas/descriptions canonical, but verify that real controller routes match the contract.
  const actual = Object.fromEntries(
    Object.entries(generated.paths).map(([path, item]) => [
      path.replace(/^\/api\/v1/, ""),
      Object.keys(item ?? {}).sort(),
    ]),
  );
  const expected = Object.fromEntries(
    Object.entries(contract.paths as Record<string, object>).map(
      ([path, item]) => [
        path,
        Object.keys(item)
          .filter((k) => k !== "parameters")
          .sort(),
      ],
    ),
  );
  for (const [path, methods] of Object.entries(expected))
    if (JSON.stringify(actual[path]) !== JSON.stringify(methods))
      throw new Error(`Contrato no implementado: ${path}`);
  if (Object.keys(actual).length !== Object.keys(expected).length)
    throw new Error("Rutas no declaradas");
  const { apiReference } = await (new Function(
    "return import('@scalar/nestjs-api-reference')",
  )() as Promise<typeof import("@scalar/nestjs-api-reference")>);
  app.use("/docs", apiReference({ content: contract }));
  await app.init();
  return { app, document: contract, generated };
}
