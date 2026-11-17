import { deflateSync } from 'node:zlib';
export function pngFixture() {
  const crc32 = buffer => { let crc=0xffffffff;for(const byte of buffer){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0; };
  const chunk=(type,data)=>{const content=Buffer.concat([Buffer.from(type),data]),header=Buffer.alloc(4),tail=Buffer.alloc(4);header.writeUInt32BE(data.length);tail.writeUInt32BE(crc32(content));return Buffer.concat([header,content,tail]);};
  const header=Buffer.alloc(13);header.writeUInt32BE(64,0);header.writeUInt32BE(64,4);header[8]=8;header[9]=6;
  const pixels=Buffer.alloc(64*(1+64*4));for(let y=0;y<64;y++)for(let x=0;x<64;x++){const at=y*257+1+x*4;pixels[at]=x*4;pixels[at+1]=y*4;pixels[at+2]=155;pixels[at+3]=255;}
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);
}
export function mockSkinFetch({model='classic',url='https://textures.minecraft.net/texture/'+'a'.repeat(64),onRequest=()=>{}}={}) {
  return async request=>{
    onRequest(request);
    if(request.includes('users/profiles')||request.includes('/lookup/name/'))return Response.json({id:'a'.repeat(32),name:'TestPlayer'});
    if(request.includes('session/minecraft'))return Response.json({properties:[{name:'textures',value:Buffer.from(JSON.stringify({textures:{SKIN:{url,metadata:{model}}}})).toString('base64')}]});
    return new Response(pngFixture(),{headers:{'Content-Type':'image/png'}});
  };
}
