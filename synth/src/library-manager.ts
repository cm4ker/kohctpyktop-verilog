export interface LibraryEntry {id:string;name:string;source:string;enabled:boolean}
export interface LibraryState {version:1;users:LibraryEntry[];enabledSystem:string[]}
const key='kohctpyktop-library-v1';
export function validateLibrary(value:unknown):LibraryState {
  const s=value as LibraryState;
  if(!s||s.version!==1||!Array.isArray(s.users)||!Array.isArray(s.enabledSystem)||!s.enabledSystem.every(x=>typeof x==='string'))throw Error('Неверный формат библиотеки');
  const ids=new Set<string>();
  for(const e of s.users){if(!e||typeof e.id!=='string'||ids.has(e.id)||typeof e.name!=='string'||typeof e.source!=='string'||e.source.length>200000||typeof e.enabled!=='boolean')throw Error('Неверный модуль библиотеки');ids.add(e.id);}
  return s;
}
export function libraryManager(host:HTMLElement,system:Record<string,string>,changed:()=>void){
 let state:LibraryState={version:1,users:[],enabledSystem:[]};
 const message=document.createElement('p'),list=document.createElement('div'),form=document.createElement('div');
 const title=document.createElement('input'),source=document.createElement('textarea');title.placeholder='Имя файла';source.rows=12;source.style.width='100%';source.setAttribute('aria-label','Код библиотечного модуля');
 let editing:string|undefined;
 try{const raw=localStorage.getItem(key);if(raw)state=validateLibrary(JSON.parse(raw));}catch{message.textContent='Сохранённая библиотека не прочитана; экспортируйте данные перед очисткой браузера.';}
 const button=(label:string,fn:()=>void)=>{const b=document.createElement('button');b.textContent=label;b.onclick=fn;return b;};
 const persist=()=>{try{localStorage.setItem(key,JSON.stringify(state));message.textContent='Библиотека сохранена.';}catch{message.textContent='Не удалось сохранить библиотеку. Экспортируйте её в файл.';}changed();render();};
 const edit=(e?:LibraryEntry)=>{editing=e?.id;title.value=e?.name??'module.v';source.value=e?.source??'module custom(input a, output z);\n    assign z = ~a;\nendmodule';};
 function render(){
  list.replaceChildren();
  for(const [name,code]of Object.entries(system)){
   const row=document.createElement('div'),label=document.createElement('label'),toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=state.enabledSystem.includes(name);toggle.onchange=()=>{state.enabledSystem=state.enabledSystem.filter(n=>n!==name);if(toggle.checked)state.enabledSystem.push(name);persist();};
   label.append(toggle,document.createTextNode(' Системный: '+name.split('/').pop()));row.style.opacity=toggle.checked?'1':'.5';
   row.append(label,button('Копия для редактирования',()=>{edit({id:'',name:name.split('/').pop()!,source:code,enabled:true});editing=undefined;}));list.append(row);
  }
  for(const e of state.users){const row=document.createElement('div'),toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=e.enabled;toggle.onchange=()=>{e.enabled=toggle.checked;persist();};row.append(toggle,document.createTextNode(e.name+' '),button('Редактировать',()=>edit(e)),button('Удалить',()=>{state.users=state.users.filter(x=>x.id!==e.id);persist();}));list.append(row);}
 }
 const save=button('Сохранить модуль',()=>{const name=title.value.trim();if(!name||!source.value.trim()){message.textContent='Укажите имя и код модуля.';return;}const old=state.users.find(x=>x.id===editing);if(old){old.name=name;old.source=source.value;}else {const e={id:crypto.randomUUID(),name,source:source.value,enabled:true};state.users.push(e);editing=e.id;}persist();});
 form.append(title,source,save,button('Новый модуль',()=>edit()));
 const file=document.createElement('input');file.type='file';file.accept='.json';file.hidden=true;file.onchange=async()=>{try{const selected=file.files?.[0];if(!selected)return;if(selected.size>2000000)throw Error('Файл слишком большой');state=validateLibrary(JSON.parse(await selected.text()));persist();}catch(e){message.textContent=String(e);}file.value='';};
 host.append(list,form,button('Экспорт библиотеки',()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));a.href=url;a.download='kohctpyktop-library.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}),button('Импорт библиотеки',()=>file.click()),file,message);
 edit();render();
 return {sources:()=>Object.fromEntries([...Object.entries(system).filter(([name])=>state.enabledSystem.includes(name)),...state.users.filter(e=>e.enabled).map(e=>['user/'+e.id+'/'+e.name,e.source])]),enable:(names:string[])=>{for(const name of Object.keys(system))if(names.some(n=>name.endsWith('/'+n+'.v'))&&!state.enabledSystem.includes(name))state.enabledSystem.push(name);persist();}};
}
