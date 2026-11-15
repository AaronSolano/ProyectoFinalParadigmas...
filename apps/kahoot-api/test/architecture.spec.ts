import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
describe('reglas ejecutables de capas',()=>{
 const root=resolve(__dirname,'..');
 const fixtures=[
 ['domain/invalid.ts','import type { Repository } from "../data/repository"; export type X = Repository;'],
 ['domain/nested/invalid.ts','export * from "../../application/quiz-use-cases";'],
 ['domain/invalid.ts','import { Injectable } from "@nestjs/common"; export const x = Injectable;'],
 ['application/nested/invalid.ts','export * from "../../data/repository";'],
 ['application/invalid.ts','import type { Request } from "../presentation/dto"; export type X = Request;'],
 ['application/invalid.ts','import { DataSource } from "typeorm"; export const x = DataSource;'],
 ['presentation/nested/invalid.ts','export * from "../../data/repository";'],
 ];
 it.each(fixtures)('rechaza %s: %s',(filename,source)=>{
  const result=spawnSync(process.execPath,[resolve(require.resolve('eslint/package.json'),'../bin/eslint.js'),'--stdin','--stdin-filename',resolve(root,'src',filename),'--format','json'],{cwd:root,input:source,encoding:'utf8'});
  expect(result.status).toBe(1); expect(JSON.parse(result.stdout)[0].messages.some((m:{ruleId:string})=>m.ruleId==='layers/boundaries')).toBe(true);
 });
 it('permite consumir puertos desde aplicaci�n',()=>{
  const result=spawnSync(process.execPath,[resolve(require.resolve('eslint/package.json'),'../bin/eslint.js'),'--stdin','--stdin-filename',resolve(root,'src/application/valid.ts')],{cwd:root,input:'export type { QuizRepository } from "../domain/ports";',encoding:'utf8'}); expect(result.status).toBe(0);
 });
});

