'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=html.slice(html.indexOf('class Parser {'),html.indexOf('async function call('));
const hex=b=>Buffer.from(b).toString('hex').match(/../g)?.join(' ').toUpperCase()||'';
const Parser=vm.runInNewContext(source+';Parser',{Uint8Array,performance,hex,RX_LIMIT:256*1024});
const bytes=h=>Uint8Array.from(Buffer.from(h.replaceAll(' ',''),'hex'));
const fixtures=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/real-usb.json'),'utf8'));
const newParser=()=>{const out=[];const parser=new Parser((type,data)=>out.push({type,...data}));return {parser,out};};
let replayFrames=[];
for(const run of fixtures.runs){
 test('real raw RX replay '+run.id,()=>{
  const generations=new Map();
  for(const e of run.events){
   if(!generations.has(e.connectionGeneration))generations.set(e.connectionGeneration,newParser());
   const {parser,out}=generations.get(e.connectionGeneration);
   if(e.operation==='transferIn'&&e.status==='ok'&&e.hex)parser.feed(bytes(e.hex),e.elapsedMs);
   if(e.operation==='parse incomplete-timeout')parser.tick(e.elapsedMs);
  }
  for(const [gen,{parser,out}]of generations){
   const expected=run.events.filter(e=>e.connectionGeneration===gen&&e.operation==='parse FE').map(e=>e.hex);
   const actual=out.filter(e=>e.type==='FE').map(e=>e.hex);
   assert.deepEqual(actual,expected,`${run.id} gen${gen}`);
   replayFrames.push(...actual);
   const timeouts=run.events.filter(e=>e.connectionGeneration===gen&&e.operation==='parse incomplete-timeout');
   if(timeouts.length){assert.equal(parser.blocked,true);assert.ok(parser.buffer.length>=timeouts[0].actualBytes);assert.ok(hex(parser.buffer).startsWith(timeouts[0].hex));assert.equal(out.find(e=>e.type==='incomplete-timeout').actualBytes,timeouts[0].actualBytes);assert.equal(out.filter(e=>e.type==='incomplete-timeout').length,1);}
  }
 });
}
const full=fixtures.runs.flatMap(r=>r.events.filter(e=>e.operation==='parse FE'));
test('all 19 real complete FE at every single split position',()=>{
 assert.equal(full.length,19);
 for(const e of full){const b=bytes(e.hex);for(let split=0;split<=b.length;split++){
  const {parser,out}=newParser();parser.feed(b.slice(0,split),0);parser.feed(b.slice(split),1);
  assert.deepEqual(out.filter(x=>x.type==='FE').map(x=>x.hex),[e.hex],`seq ${e.seq}, split ${split}`);
 }}
});
test('FC/FA/legacy FB fragment and coalesce independently',()=>{
 for(const marker of ['FC','FA','FB']){const h=`${marker} ${marker} ${marker} ${marker} 70 01`;for(let split=0;split<=6;split++){
  const {parser,out}=newParser(),b=bytes(h);parser.feed(b.slice(0,split),0);parser.feed(b.slice(split),1);const a=out.filter(e=>e.type===marker);assert.equal(a.length,1);assert.deepEqual(Array.from(a[0].xy),[112,1]);
 }}
 const {parser,out}=newParser();parser.feed(bytes('FC FC FC FC 70 01 FA FA FA FA 22 01 FB FB FB FB 01 02'),0);assert.deepEqual(out.filter(e=>['FA','FB','FC'].includes(e.type)).map(e=>e.type),['FC','FA','FB']);
});
test('many consecutive FE in one transfer and marker bytes inside payload',()=>{
 const {parser,out}=newParser();const h='FE FE FE FE 00 0C FC FC FC FC FA FA FA FA FE FE FE FE';parser.feed(bytes(h+' '+full[0].hex+' '+full[1].hex),0);assert.deepEqual(out.filter(e=>e.type==='FE').map(e=>e.hex),[h,full[0].hex,full[1].hex]);assert.equal(out.filter(e=>e.type==='FC').length,0);
});
test('partial marker 1..3 and partial length bytes time out without deletion',()=>{
 for(const marker of ['FA','FB','FC','FE'])for(let n=1;n<=5;n++){
  const {parser,out}=newParser();parser.feed(bytes(`${marker} ${marker} ${marker} ${marker} 00`.split(' ').slice(0,n).join(' ')),0);parser.tick(2001);assert.equal(out.at(-1).type,'incomplete-warning');parser.tick(10001);assert.equal(parser.blocked,true);assert.equal(parser.buffer.length,n);assert.equal(out.at(-1).expectedTotal,null);assert.equal(out.at(-1).headerBytesMissing,6-n);
 }
});
test('all 3 real incomplete FE remain incomplete, including trailing 75',()=>{
 for(const r of fixtures.runs)for(const e of r.events.filter(e=>e.operation==='parse incomplete-timeout')){
  const {parser,out}=newParser();parser.feed(bytes(e.hex),0);parser.tick(10001);
  assert.equal(out.filter(e=>e.type==='FE').length,0);const failed=out.find(e=>e.type==='incomplete-timeout');assert.equal(failed.expectedTotal,6+parseInt(e.hex.split(' ').slice(4,6).join(''),16));assert.equal(failed.actualBytes,e.actualBytes);assert.equal(parser.buffer.length,e.actualBytes);
 }
});
test('no unsafe resync: subsequent full frame stays raw quarantine, fresh session parses it',()=>{
 const {parser,out}=newParser();parser.feed(bytes('FE FE FE FE 01 1E 75'),0);parser.tick(10001);parser.feed(bytes(full[0].hex),11000);assert.equal(out.filter(e=>e.type==='FE').length,0);assert.equal(out.at(-1).type,'quarantine-rx');assert.equal(parser.safeForCommand(),false);
 const fresh=newParser();fresh.parser.feed(bytes(full[0].hex),11001);assert.equal(fresh.out.filter(e=>e.type==='FE').length,1);
});
test('deadline on feed prevents late resurrection and absolute cap bounds trickle',()=>{
 const {parser,out}=newParser();parser.feed(bytes('FE FE FE FE 00 02 11'),0);parser.feed(bytes('22'),10001);assert.equal(parser.blocked,true);assert.equal(out.filter(e=>e.type==='FE').length,0);
 const p=newParser();p.parser.feed(bytes('FE FE FE FE FF FF'),0);for(let now=1000;now<=30000;now+=1000)p.parser.feed(bytes('01'),now);assert.equal(p.parser.blocked,true);assert.equal(p.out.find(e=>e.type==='incomplete-timeout').timeoutKind,'assembly absolute');
});
test('quarantine memory cap and overflow, with accounting',()=>{
 const {parser,out}=newParser();parser.feed(bytes('FC'),0);parser.tick(10001);parser.feed(new Uint8Array(300000),11000);assert.equal(parser.buffer.length,256*1024);assert.equal(parser.quarantineDropped,300001-256*1024);assert.equal(out.filter(e=>e.type==='FC').length,0);
 const q=newParser();q.parser.feed(new Uint8Array(300000),0);assert.equal(q.parser.blocked,true);assert.equal(q.out[0].type,'overflow');
});
test('unknown bytes retained as events; empty reads do not start assembly deadline',()=>{
 const {parser,out}=newParser();parser.feed(bytes('11 22 FC'),0);assert.equal(out[0].hex,'11 22');parser.feed(bytes('FC FC FC 70 01'),1);assert.equal(out.filter(e=>e.type==='FC').length,1);
 const q=newParser();q.parser.feed(new Uint8Array(),0);q.parser.tick(100000);assert.equal(q.out.length,0);assert.equal(q.parser.safeForCommand(),true);
});
test('big endian preserved including 65535 and zero-length structural packet',()=>{
 const {parser,out}=newParser();const b=new Uint8Array(65541);b.set([254,254,254,254,255,255]);parser.feed(b,0);assert.equal(out[0].payloadBytes,65535);
 const q=newParser();q.parser.feed(bytes('FE FE FE FE 00 00'),0);assert.equal(q.out[0].actualBytes,6);
});
