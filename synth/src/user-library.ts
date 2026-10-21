import {parse,Diagnostic} from './parser.ts';
import type {Module} from './parser.ts';
/** The same library elaboration path is used by the UI and headless tests. */
export function parseWithLibrary(source:string,files:Record<string,string>):Module {
  const ast=parse(source),definitions=[...(ast.definitions??[ast])];
  for(const [filename,code] of Object.entries(files).sort(([a],[b])=>a.localeCompare(b))){
    let library:Module;
    try{library=parse(code);}catch(error){if(error instanceof Diagnostic)error.span={...error.span,source:filename};throw error;}
    const annotate=(value:unknown):void=>{
      if(!value||typeof value!=='object')return;
      for(const [key,child]of Object.entries(value)){
        if(key==='span'&&child&&typeof child==='object')Object.assign(child,{source:filename});
        else annotate(child);
      }
    };
    annotate(library);
    for(const mod of library.definitions??[library]){
      if(mod.name==='root')throw new Diagnostic('Library files must not declare root.',mod.span);
      definitions.push(mod);
    }
  }
  return {...ast,definitions};
}
