const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('android-webusb-ir-test/index.html','utf8');const code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
let now=0,nextTimer=0;const timers=new Map(),elements=new Map();
const el=()=>({textContent:'',value:'',hidden:false,disabled:false,appendChild(){},replaceChildren(){},click(){},scrollHeight:0});
const usb={requestDevice:async()=>device,addEventListener(){}};
const ctx=vm.createContext({console,Uint8Array,TextEncoder,DOMException,Blob,URL,Date,JSON,performance:{now:()=>now},location:{href:'https://test.example/',origin:'https://test.example'},window:{isSecureContext:true},navigator:{usb,userAgent:'test',language:'ru'},document:{getElementById(id){if(!elements.has(id))elements.set(id,el());return elements.get(id);},createElement:el,createDocumentFragment:el,addEventListener(){}},setTimeout(fn,ms){timers.set(++nextTimer,{fn,at:now+ms});return nextTimer;},clearTimeout(id){timers.delete(id);},setInterval(){return 999;},clearInterval(){}});
vm.runInContext(code,ctx);const run=s=>vm.runInContext(s,ctx);
const ep=(direction,endpointNumber)=>({direction,endpointNumber,type:'bulk',packetSize:64});
const alt={alternateSetting:0,interfaceClass:2,interfaceSubclass:2,interfaceProtocol:1,endpoints:[ep('in',1),ep('out',2)]};
let pending=[],tx=[],outMode='ok',inflight=0,maxInflight=0;
const device={vendorId:0x045c,productId:0x195,opened:false,configuration:null,configurations:[{configurationValue:7,interfaces:[{interfaceNumber:3,alternate:alt,alternates:[alt]}]}],async open(){this.opened=true;},async selectConfiguration(v){assert.equal(v,7);this.configuration=this.configurations[0];},async claimInterface(n){assert.equal(n,3);},async selectAlternateInterface(){},transferIn(ep,n){assert.equal(ep,1);assert.equal(n,16384);inflight++;maxInflight=Math.max(maxInflight,inflight);return new Promise((resolve,reject)=>pending.push({resolve:r=>{inflight--;resolve(r);},reject:e=>{inflight--;reject(e);}}));},async transferOut(ep,bytes){assert.equal(ep,2);tx.push(Array.from(bytes));return {status:outMode,bytesWritten:outMode==='ok'?4:2};},async close(){this.opened=false;while(pending.length)pending.shift().reject(new DOMException('closed','AbortError'));}};
ctx.device=device;
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
async function advance(ms){now+=ms;for(const [id,t] of [...timers])if(t.at<=now){timers.delete(id);t.fn();}await flush();}
function rx(bytes,status='ok'){const buffer=new Uint8Array(bytes.length+8);buffer.set(bytes,4);pending.shift().resolve({status,data:new DataView(buffer.buffer,4,bytes.length)});}
(async()=>{
 run("globalThis.parsedEvents=[];globalThis.p=new Parser((type,data)=>parsedEvents.push({type,...data}))");
 const feed=b=>{ctx.testBytes=new Uint8Array(b);run('p.feed(testBytes)');};
 feed([0x99,0xfb]);feed([0xfb,0xfb]);feed([0xfb,7,8,0xfa,0xfa,0xfa,0xfa,2,3,0xfe,0xfe]);feed([0xfe,0xfe,0,8,0xfe,0xfe,0xfe,0xfe,0xfb,0xfb,0xfb,0xfb]);
 assert.deepEqual(JSON.parse(run('JSON.stringify(parsedEvents.map(x=>x.type))')),['unknown','FB','FA','FE']);assert.equal(run('parsedEvents[3].payloadBytes'),8);assert.equal(run('p.buffer.length'),0);
 // Maximum length, all split positions and coalescing, zero-length payload.
 for(let split=0;split<=10;split++){run('parsedEvents=[];p=new Parser((type,data)=>parsedEvents.push({type,...data}))');const frame=[254,254,254,254,0,4,1,2,3,4];feed(frame.slice(0,split));feed(frame.slice(split));assert.equal(run("parsedEvents.filter(e=>e.type==='FE').length"),1);}
 run('parsedEvents=[];p=new Parser((type,data)=>parsedEvents.push({type,...data}))');feed([254,254,254,254,255,255]);feed(new Array(65535).fill(251));assert.equal(run('parsedEvents[0].actualBytes'),65541);
 run('parsedEvents=[];p=new Parser((type,data)=>parsedEvents.push({type,...data}))');feed([254,254,254,254,0,0]);assert.equal(run('parsedEvents[0].actualBytes'),6);
 run('parsedEvents=[];p=new Parser((type,data)=>parsedEvents.push({type,...data}))');feed([254,254,254,254,0,5,1]);now=2001;run('p.tick()');assert.equal(run('parsedEvents.at(-1).type'),'incomplete-warning');now=10001;run('p.tick()');assert.equal(run('parsedEvents.at(-1).type'),'incomplete-timeout');assert.equal(run('p.blocked'),true);
 console.log('PASS parser: fragmentation/coalescing, unknown bytes, embedded markers, 65535/zero payload, incomplete deadlines');
 await run('connect()');assert.equal(pending.length,1);assert.equal(tx.length,0);await advance(250);assert.deepEqual(tx[0],[252,252,252,252]);rx([251,251,251,251,1,2]);await flush();assert.deepEqual(tx[1],[250,250,250,250]);rx([251,251,251,251,1,2]);await flush();assert.equal(tx.length,2);await advance(650);assert.deepEqual(tx[2],[254,254,254,254]);rx([254,254,254,254,0,2,17,34]);await flush();assert.equal(run('session.frames'),1);await advance(60);assert.equal(tx.length,4);assert.equal(maxInflight,1);assert.equal(run("events.filter(e=>e.operation==='transferIn'&&e.hex==='FE FE FE FE 00 02 11 22')[0].actualBytes"),8);
 console.log('PASS USB mock: configuration 7, endpoints, reader before FC, 250/900 timing, one auto FA, continuous FE +60, DataView offset');
 outMode='stall';await run("send(session,0xFC,'test')");assert.equal(run('session.failed'),true);const before=tx.length;await advance(5000);assert.equal(tx.length,before);await run('disconnect()');await flush();assert.equal(run('session'),null);
 outMode='ok';await run('connect()');assert.equal(pending.length,1);await run('disconnect()');await flush();assert.equal(maxInflight,1);await run('connect()');rx([], 'babble');await flush();assert.equal(run('session.failed'),true);await run('disconnect()');
 console.log('PASS USB mock: non-ok TX / RX stop without retry; pending reader close and explicit reconnection');
 // Retention cap and user-controlled clear.
 run("for(let i=0;i<110;i++)log('large',{hex:'AA '.repeat(20000)})");assert.ok(run('logBytes')<=5*1024*1024);assert.ok(run('evicted')>0);run("$('clear').onclick()");assert.equal(run('events.length'),1);assert.equal(run('evicted'),0);
 console.log('PASS 5 MiB log eviction counter and clear');
 fs.writeFileSync('software-checks.txt','PASS: JavaScript parse and VM execution\nPASS: parser fragmentation, coalescing, payload markers, max/zero length, unknown bytes, 2s/10s deadlines\nPASS: mocked WebUSB configuration/endpoints, reader before startup, 250/900ms timing, one FA, 60ms rearm, DataView offset\nPASS: mocked error statuses, explicit reconnect, one outstanding reader\nPASS: log size bound and eviction counter\nNOT TESTED: physical Android/Chrome/USB Blaster compatibility and S2–S8 hardware acceptance\n');
})().catch(e=>{console.error(e);process.exitCode=1});
