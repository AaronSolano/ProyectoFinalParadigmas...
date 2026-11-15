import 'reflect-metadata';
import { BadRequestException, RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Settings } from './config/settings';
import { Profiles } from './domain/profile';
import { ProblemFilter } from './presentation/problem.filter';
import { AppModule } from './app.module';
import { httpTelemetry } from './telemetry';
export async function createApp(config: Settings, profiles: Profiles) {
  const app = await NestFactory.create(AppModule.register(config, profiles), {logger:false});
  app.setGlobalPrefix('api/v1', {exclude:[{path:'.well-known/jwks.json',method:RequestMethod.GET}]});
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true, exceptionFactory:errors=>new BadRequestException({status:400,code:'VALIDATION_ERROR',message:'Los datos enviados no son válidos.',details:errors.flatMap(error=>Object.values(error.constraints ?? {}).map(message=>({field:error.property,message})))})}));
  app.useGlobalFilters(new ProblemFilter());
  app.enableCors({origin:config.corsOrigins});
  app.use(httpTelemetry);
  const document = SwaggerModule.createDocument(app,new DocumentBuilder().setTitle('ProfeLink auth-api').setVersion('1.0.0').addBearerAuth().addServer('/api/v1').build(),{ignoreGlobalPrefix:true});
  document.paths['/.well-known/jwks.json'].get!.servers=[{url:'/'}];
  SwaggerModule.setup('docs/openapi',app,document);
  const {apiReference} = await (new Function('return import("@scalar/nestjs-api-reference")')() as Promise<typeof import('@scalar/nestjs-api-reference')>);
  app.use('/docs',apiReference({content:document}));
  return {app,document};
}
