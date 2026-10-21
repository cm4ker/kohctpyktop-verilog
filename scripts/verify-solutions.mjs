import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,relative} from 'node:path';
import {solutionCases} from './solution-cases.mjs';
import {parseWithLibrary} from '../synth/src/user-library.ts';
import {synthesize} from '../synth/src/synthesis.ts';
import {route} from '../synth/src/routing.ts';
import {encode} from '../synth/src/board.ts';
import {decode} from '../game/storage.js';
import {Simulation} from '../game/simulation.js';
import {levels} from '../game/levels.js';
export async function systemLibrary(){const files={};for(const name of await readdir(new URL('../synth/library/',import.meta.url),{recursive:true}))if(name.endsWith('.v'))files['system/'+name]=await readFile(new URL('../synth/library/'+name.replaceAll('\\','/'),import.meta.url),'utf8');return files;}
export async function verifySolutions(){
 const files=await systemLibrary(),cases=solutionCases(await readFile(new URL('../solutions.v',import.meta.url),'utf8')),results=[];
 for(const c of cases){const level=levels[c.level-1];let result={level:c.level,id:level?.id,line:c.line,variant:c.variant,required:c.required};
  try{const net=synthesize(parseWithLibrary(c.source,files),{optimize:true}),layout=route(net),board=decode(encode(layout.board));board.mainCanvasLock=true;
   const sim=new Simulation(board,level);const rate=sim.run();result={...result,rate,passed:rate>=97,transistors:net.transistors.length,area:layout.area};
  }catch(e){result={...result,passed:false,error:e.message};}
  results.push(result);console.log(JSON.stringify(result));
 }
 const absent=levels.map((l,i)=>({level:i+1,id:l.id})).filter(l=>!cases.some(c=>c.level===l.level));
 return {results,absent,passed:results.filter(r=>r.required).every(r=>r.passed)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=await verifySolutions();await mkdir('test-results',{recursive:true});await writeFile('test-results/solutions.json',JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
}
