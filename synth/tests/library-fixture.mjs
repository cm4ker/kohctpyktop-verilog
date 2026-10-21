import {readFileSync,readdirSync} from 'node:fs';
import {parse as parseSource} from '../src/parser.ts';
export {Diagnostic} from '../src/parser.ts';
const directory=new URL('../library/',import.meta.url);
const definitions=readdirSync(directory).filter(n=>n.endsWith('.v')).flatMap(name=>parseSource(readFileSync(new URL(name,directory),'utf8')).definitions);
export function parse(source){const ast=parseSource(source);return {...ast,definitions:[...ast.definitions,...definitions]};}
