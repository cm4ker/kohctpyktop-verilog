export interface Span { start: number; end: number; line: number; column: number; source?:string }
export interface Identifier { kind: 'Identifier'; name: string; span: Span }
export interface UnaryExpression { kind: 'UnaryExpression'; operator: '~' | '&' | '|'; argument: Expression; span: Span }
export interface Concatenation { kind: 'Concatenation'; elements: Expression[]; span: Span }
export interface BinaryExpression { kind: 'BinaryExpression'; operator: '&' | '|' | '||' | '^' | '<<'; left: Expression; right: Expression; span: Span }
export interface Selection { kind: 'Selection'; argument: Identifier; msb: number; lsb: number; span: Span }
export interface DynamicSelection { kind: 'DynamicSelection'; argument: Identifier; index: Expression; span: Span }
export interface NumberLiteral { kind:'NumberLiteral'; width:number; bits:string; span:Span }
export type Expression = Identifier | UnaryExpression | Concatenation | BinaryExpression | Selection | DynamicSelection | NumberLiteral;
export type AssignmentTarget = Identifier | Concatenation;
export interface Port { kind: 'Port'; direction: 'input' | 'output'; name: string; span: Span }
export interface WireDeclaration { kind: 'WireDeclaration'; name: string; msb: number; lsb: number; initializer?: Expression; span: Span }
export interface Assignment { kind: 'ContinuousAssignment'; target: AssignmentTarget; expression: Expression; span: Span }
export type IntegerExpression = {kind:'integer';value:number} | {kind:'parameter';name:string} | {kind:'arithmetic';operator:'+'|'-';left:IntegerExpression;right:IntegerExpression};
export interface GenerateIf {left:IntegerExpression;right:IntegerExpression;yes:ModuleBody;no:ModuleBody;span:Span}
export interface ModuleBody {wires:WireDeclaration[];instances:Instance[];assignments:Assignment[];generates:GenerateIf[]}
export interface Instance { kind:'Instance'; module:string; name:string; parameters:{name:string;value:number;expression?:IntegerExpression;span:Span}[]; connections:{name:string;signal:Identifier | NumberLiteral;span:Span}[]; span:Span }
export interface Module { strictLibrary?:boolean; parameters?:{name:string;value:number;span:Span}[];generates?:GenerateIf[]; definitions?: Module[]; kind: 'Module'; name: string; ports: Port[]; wires: WireDeclaration[]; instances: Instance[]; assignments: Assignment[]; span: Span }
export class Diagnostic extends Error {
  span: Span;
  constructor(message: string, span: Span) { super(message); this.name = 'Diagnostic'; this.span = span; }
}
interface Token { text: string; span: Span }
export function tokenize(source: string): Token[] {
  const tokens: Token[] = []; let at = 0, line = 1, column = 1;
  const step = () => { if (source[at++] === '\n') { line++; column = 1; } else column++; };
  const span = (): Span => ({start: at, end: at, line, column});
  while (at < source.length) {
    if (/\s/.test(source[at])) { step(); continue; }
    if (source.startsWith('//', at)) { while (at < source.length && source[at] !== '\n') step(); continue; }
    if (source.startsWith('/*', at)) { const loc = span(); step(); step(); while (at < source.length && !source.startsWith('*/', at)) step(); if (at === source.length) throw new Diagnostic('Незакрытый комментарий.', loc); step(); step(); continue; }
    const loc = span();
    if (/[a-zA-Z_$]/.test(source[at])) { do { step(); } while (at < source.length && /[a-zA-Z0-9_$]/.test(source[at])); }
    else if (/[0-9]/.test(source[at])) { do { step(); } while (at < source.length && /[0-9]/.test(source[at])); }
    else if ((source.startsWith('<<',at)||source.startsWith('==',at))) { step(); step(); }
    else if ("'"===source[at]) { step(); }
    else if ('(){},;=~&|^[]:#.+-'.includes(source[at])) { step(); if ((source[loc.start]==='&'||source[loc.start]==='|')&&source[at]===source[loc.start]) step(); }
    else throw new Diagnostic(`Символ «${source[at]}» пока не поддерживается.`, loc);
    tokens.push({text: source.slice(loc.start, at), span: {...loc, end: at}});
  }
  tokens.push({text: '<eof>', span: span()}); return tokens;
}
export function parse(source: string): Module {
  const tokens = tokenize(source); let index = 0;
  const peek = () => tokens[index];
  const take = () => tokens[index++];
  const expect = (text: string) => { if (peek().text !== text) throw new Diagnostic(`Ожидается «${text}», получено «${peek().text}».`, peek().span); return take(); };
  const integer = (): number => { const token=peek();if(!/^\d+$/.test(token.text)||!Number.isSafeInteger(Number(token.text)))throw new Diagnostic('Ожидается целый неотрицательный индекс.',token.span);take();return Number(token.text); };
  const integerExpression=():IntegerExpression=>{
    const atom=():IntegerExpression=>{if(/^\d+$/.test(peek().text))return {kind:'integer',value:integer()};const token=take();if(!/^[a-zA-Z_$][\w$]*$/.test(token.text))throw new Diagnostic('Expected parameter or integer.',token.span);return {kind:'parameter',name:token.text};};
    let left=atom();while(peek().text==='+'||peek().text==='-'){const operator=take().text as '+'|'-';left={kind:'arithmetic',operator,left,right:atom()};}return left;
  };
  const identifier = (): Identifier => { const token = peek(); if (!/^[a-zA-Z_$][\w$]*$/.test(token.text) || ['module','endmodule','assign','input','output','wire'].includes(token.text)) throw new Diagnostic('Ожидается имя.', token.span); take(); return {kind:'Identifier', name:token.text, span:token.span}; };
  const concatenation = (member: () => Expression): Concatenation => {
    const start = expect('{'); const elements: Expression[] = [member()];
    while (peek().text === ',') { take(); elements.push(member()); }
    const end = expect('}');
    return {kind:'Concatenation',elements,span:{...start.span,end:end.span.end}};
  };
  const target = (): AssignmentTarget => peek().text === '{' ? concatenation(target) : identifier();
  const unary = (): Expression => {
    if (['~','&','|'].includes(peek().text)) { const token=take(),argument=unary();return {kind:'UnaryExpression',operator:token.text as UnaryExpression['operator'],argument,span:{...token.span,end:tokens[index-1].span.end}}; }
    if (peek().text === '(') { take(); const result=expression();expect(')');return result; }
    if (peek().text === '{') return concatenation(expression);
    if(/^\d+$/.test(peek().text)){
      const start=take(),width=Number(start.text);expect("'");
      const base=take();let raw=base.text;
      if(raw==='b'||raw==='B')raw+=take().text;
      if(!/^[bB][01][01_]*$/.test(raw)||width<1||width>64)throw new Diagnostic('Expected a binary literal of width 1..64, for example 4\'b1.',start.span);
      const bits=raw.slice(1).replaceAll('_','').padStart(width,'0').slice(-width);
      return {kind:'NumberLiteral',width,bits,span:{...start.span,end:tokens[index-1].span.end}};
    }
    const argument=identifier();
    if(peek().text!=='[')return argument;
    take();
    if(!/^\d+$/.test(peek().text)){
      const selector=expression(),end=expect(']');
      return {kind:'DynamicSelection',argument,index:selector,span:{...argument.span,end:end.span.end}};
    }
    const msb=integer();let lsb=msb;if(peek().text===':'){take();lsb=integer();}const end=expect(']');
    return {kind:'Selection',argument,msb,lsb,span:{...argument.span,end:end.span.end}};
  };
  const binary = (member:()=>Expression,operator:'&'|'|'|'||'|'^'|'<<'):Expression => {
    let left=member();while(peek().text===operator){take();const right=member();left={kind:'BinaryExpression',operator,left,right,span:{...left.span,end:tokens[index-1].span.end}};}return left;
  };
  const expression = (): Expression => binary(()=>binary(()=>binary(()=>binary(()=>binary(unary,'<<'),'&'),'^'),'|'),'||');
  const module = (): Module => {
  const start = expect('module'), name = identifier().name;
  const parameters:NonNullable<Module['parameters']>=[];
  if(peek().text==='#'){take();expect('(');do{expect('parameter');const p=identifier();expect('=');parameters.push({name:p.name,value:integer(),span:p.span});if(peek().text!==',')break;take();}while(true);expect(')');}
  expect('(');
  const ports: Port[] = []; let direction: Port['direction'] | undefined;
  if (peek().text !== ')') while (true) {
    if (peek().text === 'input' || peek().text === 'output') direction = take().text as Port['direction'];
    if (!direction) throw new Diagnostic('Укажите input или output перед именем порта: input pin1.', peek().span);
    if (peek().text === 'wire') take();
    const id = identifier(); ports.push({kind:'Port', direction, name:id.name, span:id.span});
    if (peek().text !== ',') break; take();
  }
  expect(')'); expect(';');
  const body=():ModuleBody=>{
  const assignments: Assignment[] = [],wires:WireDeclaration[]=[],instances:Instance[]=[],generates:GenerateIf[]=[];
  while (!['endmodule','end','<eof>'].includes(peek().text)) {
    const token=take();
    if(token.text==='generate'){
      expect('if');expect('(');const left=integerExpression();expect('==');const right=integerExpression();expect(')');expect('begin');const yes=body();expect('end');expect('else');expect('begin');const no=body();expect('end');expect('endgenerate');generates.push({left,right,yes,no,span:token.span});continue;
    }
    if(token.text==='wire'){
      let msb=0,lsb=0;if(peek().text==='['){take();msb=integer();expect(':');lsb=integer();expect(']');}
      while(true){const id=identifier();let initializer:Expression|undefined;if(peek().text==='='){take();initializer=expression();}wires.push({kind:'WireDeclaration',name:id.name,msb,lsb,initializer,span:{...id.span,end:tokens[index-1].span.end}});if(peek().text!==',')break;take();}
    }else if(token.text==='assign'){
      let first=true;
      while(true){const destination=target();expect('=');const value=expression();assignments.push({kind:'ContinuousAssignment',target:destination,expression:value,span:{...(first?token.span:destination.span),end:tokens[index-1].span.end}});first=false;if(peek().text!==',')break;take();}
    }else{
      const parameters:Instance['parameters']=[];
      if(peek().text==='#'){
        take();expect('(');
        while(true){expect('.');const param=identifier();expect('(');const expression=integerExpression();expect(')');parameters.push({name:param.name,value:expression.kind==='integer'?expression.value:0,expression,span:param.span});if(peek().text!==',')break;take();}
        expect(')');
      }
      do {
      const connections:Instance['connections']=[];
      const instance=identifier();expect('(');
      if(peek().text!==')')while(true){expect('.');const port=identifier();expect('(');const signal=/^\d+$/.test(peek().text)?unary():identifier();if(signal.kind!=='Identifier'&&signal.kind!=='NumberLiteral')throw new Diagnostic('Expected a signal or sized constant.',signal.span);expect(')');connections.push({name:port.name,signal,span:port.span});if(peek().text!==',')break;take();}
      const end=expect(')');
      instances.push({kind:'Instance',module:token.text,name:instance.name,parameters,connections,span:{...token.span,end:end.span.end}});
      if(peek().text!==',')break;take();
      } while(true);
    }
    expect(';');
  }
  return {assignments,wires,instances,generates};
  };
  const {assignments,wires,instances,generates}=body();
  const end = expect('endmodule');
  return {kind:'Module',name,ports,wires,instances,assignments,parameters,generates,span:{...start.span,end:end.span.end}};
  };
  const definitions:Module[]=[];
  do { definitions.push(module()); } while(peek().text!=='<eof>');
  const top=definitions.find(m=>m.name==='root')??definitions[0];
  return {...top,definitions};
}
