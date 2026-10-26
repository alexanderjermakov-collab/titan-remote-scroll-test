'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
function runtime(){
 let now=0,nextTimer=0,inflight=0,maxInflight=0,requests=0,opens=0,closes=0;
 const timers=new Map(),elements=new Map(),pending=[],tx=[];
 const el=()=>({textContent:'',value:'',hidden:false,disabled:false,appendChild(){},replaceChildren(){},click(){},scrollHeight:0});
 const alt={alternateSetting:0,interfaceClass:255,interfaceSubclass:240,interfaceProtocol:0,endpoints:[{direction:'in',endpointNumber:2,type:'bulk',packetSize:64},{direction:'out',endpointNumber:2,type:'bulk',packetSize:64}]};
 const rx=(arr,status='ok')=>{const b=new Uint8Array(arr.length+6);b.set(arr,3);assert.ok(pending.length,'one reader must be pending');pending.shift().resolve({status,data:new DataView(b.buffer,3,arr.length)});};
 const device={vendorId:0x045C,productId:0x0195,opened:false,configuration:null,replyOnFE:null,outMode:'ok',configurations:[{configurationValue:1,interfaces:[{interfaceNumber:0,alternate:alt,alternates:[alt]}]}],async open(){opens++;this.opened=true;},async selectConfiguration(n){assert.equal(n,1);this.configuration=this.configurations[0];},async claimInterface(n){assert.equal(n,0);},transferIn(ep,n){assert.equal(ep,2);assert.equal(n,16384);inflight++;maxInflight=Math.max(maxInflight,inflight);return new Promise((resolve,reject)=>pending.push({resolve:r=>{inflight--;resolve(r);},reject:e=>{inflight--;reject(e);}}));},async transferOut(ep,b){assert.equal(ep,2);tx.push([...b]);if(b[0]===254&&this.replyOnFE){const a=this.replyOnFE;this.replyOnFE=null;rx(a);}return {status:this.outMode,bytesWritten:this.outMode==='ok'?4:2};},async close(){closes++;if(this.failClose)throw new Error('mock close failed');this.opened=false;while(pending.length)pending.shift().reject(new DOMException('closed','AbortError'));}};
 const ctx=vm.createContext({console,Uint8Array,TextEncoder,DOMException,Blob,URL,Date,JSON,performance:{now:()=>now},location:{href:'https://test.example/v1.0.1/',origin:'https://test.example'},window:{isSecureContext:true},navigator:{usb:{requestDevice:async()=>{requests++;return device;},addEventListener(){}},userAgent:'mock',language:'ru'},document:{getElementById(id){if(!elements.has(id))elements.set(id,el());return elements.get(id);},createElement:el,createDocumentFragment:el,addEventListener(){}},setTimeout(fn,ms){timers.set(++nextTimer,{fn,at:now+ms});return nextTimer;},clearTimeout(id){timers.delete(id);},setInterval(){return 999;},clearInterval(){}});
 vm.runInContext(code,ctx);const run=s=>vm.runInContext(s,ctx);
 const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
 const advance=async(ms)=>{now+=ms;for(const[id,t]of[...timers])if(t.at<=now){timers.delete(id);t.fn();}await flush();};
 return {run,rx,advance,flush,tx,device,elements,get stats(){return {inflight,maxInflight,requests,opens,closes};}};
}
test('FC7001 ack once, no FB equivalence, exact startup timing and DataView offset',async()=>{
 const r=runtime();await r.run('connect()');assert.equal(r.stats.inflight,1);assert.equal(r.tx.length,0);await r.advance(250);assert.equal(r.tx[0][0],252);
 r.rx([252,252]);await r.flush();r.rx([252,252,112,1]);await r.flush();assert.equal(r.run('session.identifyResponseType'),'FC');assert.equal(r.tx.filter(b=>b[0]===250).length,1);
 r.rx([252,252,252,252,112,1]);await r.flush();assert.equal(r.tx.filter(b=>b[0]===250).length,1);
 await r.advance(650);assert.equal(r.tx.at(-1)[0],254);await r.advance(3000);assert.equal(r.run("events.filter(e=>e.operation==='identify deadline').length"),0);
 assert.equal(r.run("events.find(e=>e.operation==='parse FC').hex"),'FC FC FC FC 70 01');await r.run('disconnect()');
});
test('unknown FC XY has no invented auto-FA; FA alone is not FC identify',async()=>{
 const r=runtime();await r.run('connect()');await r.advance(250);r.rx([250,250,250,250,34,1]);await r.flush();assert.equal(r.run('session.identifySeen'),false);
 r.rx([252,252,252,252,3,4]);await r.flush();assert.equal(r.run('session.identifyResponseType'),'FC');assert.equal(r.tx.filter(b=>b[0]===250).length,0);await r.run('disconnect()');
});
test('legacy FB followup remains a separate profile',async()=>{
 const r=runtime();await r.run('connect()');await r.advance(250);r.rx([251,251,251,251,1,2]);await r.flush();assert.equal(r.run('session.identifyResponseType'),'FB');assert.equal(r.tx.filter(b=>b[0]===250).length,1);await r.run('disconnect()');
});
test('waiting first FE deadline diagnostic only; repeated FE blocked',async()=>{
 const r=runtime();await r.run('connect()');await r.advance(900);const before=r.tx.length;await r.advance(15001);r.run('tickSession(session)');assert.equal(r.run("events.filter(e=>e.operation==='FE start deadline').length"),1);assert.equal(r.run('session.parser.blocked'),false);await r.run("send(session,0xFE,'manual')");assert.equal(r.tx.length,before);await r.run('disconnect()');
});
test('quarantine keeps raw RX, blocks TX, software reconnect reuses grant and one reader',async()=>{
 const r=runtime();await r.run('connect()');await r.advance(900);r.rx([254,254,254,254,1,30,117]);await r.flush();await r.advance(10001);r.run('tickSession(session)');assert.equal(r.run('session.parser.blocked'),true);const before=r.tx.length;
 for(const c of [250,252,254])await r.run(`send(session,${c},'test quarantine')`);assert.equal(r.tx.length,before);
 r.rx([254,254,254,254,0,2,17,34]);await r.flush();assert.equal(r.run('session.frames'),0);assert.ok(r.run("events.some(e=>e.operation==='transferIn'&&e.hex==='FE FE FE FE 00 02 11 22')"));
 await r.elements.get('reconnect').onclick();assert.equal(r.stats.requests,1);assert.equal(r.stats.opens,2);assert.equal(r.stats.closes,1);assert.equal(r.stats.inflight,1);assert.equal(r.stats.maxInflight,1);assert.equal(r.run('session.generation'),2);
 await r.advance(900);r.rx([254,254,254,254,0,2,17,34]);await r.flush();assert.equal(r.run('session.frames'),1);const n=r.tx.length;await r.advance(60);assert.equal(r.tx.length,n+1);await r.run('disconnect()');assert.equal(r.stats.inflight,0);
});
test('coalesced FE schedules one rearm; payload markers never trigger autoFA',async()=>{
 const r=runtime();await r.run('connect()');await r.advance(900);r.rx([254,254,254,254,0,4,252,252,252,252,254,254,254,254,0,1,117]);await r.flush();assert.equal(r.run('session.frames'),2);assert.equal(r.tx.filter(b=>b[0]===250).length,0);const n=r.tx.length;await r.advance(60);assert.equal(r.tx.length,n+1);await r.run('disconnect()');
});
test('fast FE response before OUT promise completion does not leave phantom awaiting flag',async()=>{
 const r=runtime();await r.run('connect()');r.device.replyOnFE=[254,254,254,254,0,1,117];await r.advance(900);assert.equal(r.run('session.frames'),1);assert.equal(r.run('session.awaitingIR'),null);await r.advance(60);assert.equal(r.tx.filter(b=>b[0]===254).length,2);await r.run('disconnect()');
});
test('TX failure stops timers and explicit reconnect remains available',async()=>{
 const r=runtime();await r.run('connect()');r.device.outMode='stall';await r.advance(250);assert.equal(r.run('session.failed'),true);const n=r.tx.length;await r.advance(20000);assert.equal(r.tx.length,n);assert.equal(r.elements.get('reconnect').disabled,false);r.device.outMode='ok';await r.elements.get('reconnect').onclick();assert.equal(r.run('session.failed'),false);await r.run('disconnect()');
});

test('failed close forbids a second session until explicit close retry succeeds',async()=>{
 const r=runtime();await r.run('connect()');r.device.failClose=true;await r.elements.get('reconnect').onclick();assert.equal(r.stats.opens,1);assert.equal(r.stats.inflight,1);assert.equal(r.run('session.closeFailed'),true);assert.equal(r.elements.get('connect').disabled,true);await r.run('connect()');assert.equal(r.stats.opens,1);r.device.failClose=false;await r.run('disconnect()');assert.equal(r.run('session'),null);assert.equal(r.stats.inflight,0);await r.run('connect()');assert.equal(r.stats.opens,2);assert.equal(r.stats.maxInflight,1);await r.run('disconnect()');
});
