import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { startTelemetry } from '../src/telemetry';
import { createApp } from '../src/app';
import { MemoryProfiles, testSettings } from './helpers';
import request from 'supertest';
test('exports HTTP traces and metrics over OTLP HTTP',async()=>{
  const received: {url:string;body:string}[]=[];
  const collector: Server=createServer((req,res)=>{let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{received.push({url:req.url!,body});res.writeHead(200,{'content-type':'application/json'});res.end('{}');});});
  await new Promise<void>(resolve=>collector.listen(0,'127.0.0.1',resolve));
  const sdk=startTelemetry(`http://127.0.0.1:${(collector.address() as AddressInfo).port}`)!;
  const built=await createApp(testSettings(),new MemoryProfiles()); await built.app.init();
  try {
    await request(built.app.getHttpServer()).get('/api/v1/health').expect(200);
    await sdk.shutdown();
    expect(received.some(item=>item.url==='/v1/traces'&&item.body.includes('auth-api'))).toBe(true);
    expect(received.some(item=>item.url==='/v1/metrics'&&item.body.includes('http.server.requests'))).toBe(true);
  } finally { await built.app.close(); await new Promise<void>(resolve=>collector.close(()=>resolve())); }
});
