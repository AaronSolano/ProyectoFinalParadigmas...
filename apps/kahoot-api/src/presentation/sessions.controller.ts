import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { SessionUseCases } from '../application/session-use-cases';
import { AuthGuard, Identity } from '../auth/auth';
import { SessionInput, JoinInput } from './dto';
import { sessionView, participantView } from './mappers';
type UserRequest = Request & {identity:Identity};
@Controller("sessions")
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class SessionsController {
  constructor(private readonly service: SessionUseCases) {}
  @Get() list(@Req() r: UserRequest) {
    return this.service.listSessions(r.identity.id).then(items => items.map(value => sessionView(value)));
  }
  @Post() create(@Req() r: UserRequest, @Body() b: SessionInput) {
    return this.service.createSession(r.identity.id, b).then(value => sessionView(value));
  }
  @Get(":code") get(@Param("code") code: string) {
    return this.service.getSession(code).then(value => sessionView(value));
  }
  @Post(":code/join") @HttpCode(200) join(
    @Req() r: UserRequest,
    @Param("code") code: string,
    @Body() b: JoinInput,
  ) {
    return this.service.joinSession(r.identity, code, b ?? {}).then(value => participantView(value));
  }
  @Get(":code/participants") participants(
    @Req() r: UserRequest,
    @Param("code") code: string,
  ) {
    return this.service.participants(r.identity.id, code).then(items => items.map(value => participantView(value)));
  }
  @Get(":code/results") results(
    @Req() r: UserRequest,
    @Param("code") code: string,
  ) {
    return this.service.results(r.identity.id, code);
  }
}
