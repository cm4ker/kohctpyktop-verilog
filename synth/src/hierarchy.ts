import {specializeModule} from './parameters.ts';
import {Diagnostic} from './parser.ts';
import type {Module,Expression,Identifier,AssignmentTarget} from './parser.ts';

/** Elaborate user instances before transistor synthesis; preserve source spans. */
export function flattenModules(top:Module):Module {
  const definitions=new Map<string,Module>();
  for(const mod of top.definitions??[top]){
    if(definitions.has(mod.name))throw new Diagnostic(`Duplicate module: ${mod.name}.`,mod.span);
    if(['transistor_n','transistor_p'].includes(mod.name))throw new Diagnostic(`Reserved library module: ${mod.name}.`,mod.span);
    definitions.set(mod.name,mod);
  }
  const result:Module={...top,definitions:undefined,wires:[],instances:[],assignments:[]};
  function expand(definition:Module,path:string,ports:Map<string,string>,stack:string[],parameters=new Map<string,number>()):void {
    const mod=specializeModule(definition,parameters),signature=mod.name+JSON.stringify([...parameters]);
    if(stack.length>128||stack.includes(signature))throw new Diagnostic(`Recursive module instantiation: ${[...stack,mod.name].join(' -> ')}.`,mod.span);
    const names=new Map(ports),declared=new Set<string>();
    for(const declaration of [...mod.ports,...mod.wires,...mod.instances]){
      if(declared.has(declaration.name))throw new Diagnostic(`Duplicate declaration: ${declaration.name}.`,declaration.span);
      declared.add(declaration.name);
    }
    for(const wire of mod.wires)names.set(wire.name,path+wire.name);
    const rename=(id:Identifier):Identifier=>{
      const name=names.get(id.name);
      if(!name)throw new Diagnostic(`Undeclared signal: ${id.name}.`,id.span);
      return {...id,name};
    };
    const expr=(e:Expression):Expression=>{
      switch(e.kind){
        case 'NumberLiteral':return e;
        case 'Identifier':return rename(e);
        case 'DynamicSelection':return {...e,argument:rename(e.argument),index:expr(e.index)};
        case 'Selection':return {...e,argument:rename(e.argument)};
        case 'UnaryExpression':return {...e,argument:expr(e.argument)};
        case 'BinaryExpression':return {...e,left:expr(e.left),right:expr(e.right)};
        case 'Concatenation':return {...e,elements:e.elements.map(expr)};
      }
    };
    for(const wire of mod.wires)result.wires.push({...wire,name:path+wire.name,initializer:wire.initializer?expr(wire.initializer):undefined});
    for(const a of mod.assignments)result.assignments.push({...a,target:expr(a.target) as AssignmentTarget,expression:expr(a.expression)});
    for(const instance of mod.instances){
      const child=definitions.get(instance.module);
      const connections=instance.connections.map(c=>{
        if(c.signal.kind==='Identifier')return c;
        const direction=child?.ports.find(p=>p.name===c.name)?.direction??((instance.module==='delay_line'&&c.name==='in')||(instance.module==='rs_trigger'&&['r','s'].includes(c.name))||(['transistor_n','transistor_p'].includes(instance.module)&&['s','g'].includes(c.name))?'input':'output');
        if(direction!=='input')throw new Diagnostic('A constant can only connect to an input port.',c.span);
        if(c.signal.width!==1)throw new Diagnostic('Input port requires a one-bit constant.',c.span);
        const name=`$constant.${instance.name}.${c.name}`;
        if(names.has(name))throw new Diagnostic('Duplicate constant port connection.',c.span);
        const qualified=path+name;names.set(name,qualified);
        result.wires.push({kind:'WireDeclaration',name:qualified,msb:0,lsb:0,initializer:c.signal,span:c.span});
        return {...c,signal:{kind:'Identifier' as const,name,span:c.signal.span}};
      });
      if(!child){
        if(!(top.strictLibrary?['transistor_n','transistor_p']:['por','delay_line','rs_trigger','transistor_n','transistor_p']).includes(instance.module))throw new Diagnostic(`Unknown module: ${instance.module}.`,instance.span);
        result.instances.push({...instance,name:path+instance.name,connections:connections.map(c=>({...c,signal:rename(c.signal as Identifier)}))});
        continue;
      }
      const parameterValues=new Map<string,number>();for(const p of instance.parameters){if(parameterValues.has(p.name))throw new Diagnostic('Duplicate parameter: '+p.name,p.span);parameterValues.set(p.name,p.value);}
      const connected=new Map<string,string>();
      for(const connection of connections){
        const c={...connection,signal:connection.signal as Identifier};
        const port=child.ports.find(p=>p.name===c.name);
        if(!port)throw new Diagnostic(`Unknown port ${instance.module}.${c.name}.`,c.span);
        if(connected.has(c.name))throw new Diagnostic(`Duplicate port connection: ${c.name}.`,c.span);
        const wire=mod.wires.find(w=>w.name===c.signal.name);
        if(wire&&wire.msb!==wire.lsb)throw new Diagnostic(`Port ${c.name} requires a scalar signal.`,c.span);
        if(port.direction==='output'&&mod.ports.some(p=>p.name===c.signal.name&&p.direction==='input'))throw new Diagnostic(`Cannot drive input ${c.signal.name}.`,c.span);
        connected.set(c.name,rename(c.signal).name);
      }
      for(const port of child.ports)if(!connected.has(port.name)){if(child.name==='por'&&port.name==='pre_out'){const name=path+instance.name+'.$pre_out';result.wires.push({kind:'WireDeclaration',name,msb:0,lsb:0,span:port.span});connected.set(port.name,name);continue;}throw new Diagnostic(`Missing port connection: ${instance.module}.${port.name}.`,instance.span);}
      expand(child,path+instance.name+'.',connected,[...stack,signature],parameterValues);
    }
  }
  expand(top,'',new Map(top.ports.map(p=>[p.name,p.name])),[]);
  return result;
}
