import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
export function staticServer(directory,prefix='/kohctpyktop/'){
 const root=resolve(directory),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg'};
 return createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith(prefix)){res.writeHead(404).end();return;}
  let path=resolve(root,decodeURIComponent(url.pathname.slice(prefix.length))||'index.html');if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403).end();return;}
  if((await stat(path)).isDirectory())path=resolve(path,'index.html');
  res.setHeader('Content-Type',types[extname(path)]??'application/octet-stream');res.end(await readFile(path));
 }catch{res.writeHead(404).end();}});
}
