'use strict';
const KEY='youjindu-goals-v1', LIMIT=5e6;
const $=s=>document.querySelector(s);
const uid=()=>globalThis.crypto?.randomUUID?.() || Date.now().toString(36)+Math.random().toString(36).slice(2);
const dateKey=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const localDate=s=>new Date(s+'T12:00:00');
const shift=(s,n)=>{const d=localDate(s);d.setDate(d.getDate()+n);return dateKey(d)};
const weekStart=s=>shift(s,-((localDate(s).getDay()+6)%7));
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&dateKey(localDate(s))===s;
const modes={total:'累计',weekly:'每周',daily:'每天'};
const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
function clean(s){
 if(!s||s.version!==1||!Array.isArray(s.goals)||!Array.isArray(s.logs)||s.goals.length>3000||s.logs.length>60000)throw Error('不支持的备份格式。');
 const ids=new Set(), logIds=new Set();
 const goals=s.goals.map(g=>{
  if(!g||typeof g.id!=='string'||!g.id||ids.has(g.id)||typeof g.name!=='string'||!g.name.trim()||!Object.hasOwn(modes,g.mode)||!finite(g.target,.01,1e8)||!validDate(g.start)||!(g.end===''||(validDate(g.end)&&g.end>=g.start)))throw Error('备份中有无效目标。');
  ids.add(g.id);return {id:g.id,name:g.name.slice(0,80),group:String(g.group||'').slice(0,32),mode:g.mode,target:g.target,unit:String(g.unit||'次').slice(0,16),start:g.start,end:g.end,archived:g.archived===true};
 });
 const logs=s.logs.map(l=>{
  if(!l||typeof l.id!=='string'||!l.id||logIds.has(l.id)||!ids.has(l.goal)||!validDate(l.date)||!finite(l.amount,.01,1e8))throw Error('备份中有无效打卡。');
  logIds.add(l.id);return {id:l.id,goal:l.goal,date:l.date,amount:l.amount,note:String(l.note||'').slice(0,400)};
 });
 return {version:1,goals,logs};
}
function stat(g,logs,today){
 const monday=weekStart(today);
 const lo=g.mode==='daily'?today:g.mode==='weekly'?monday:g.start;
 const hi=g.mode==='weekly'?shift(monday,6):today;
 const result=logs.filter(l=>l.goal===g.id&&l.date>=lo&&l.date<=hi&&l.date<=today&&l.date>=g.start&&(!g.end||l.date<=g.end)).reduce((a,l)=>a+l.amount,0);
 return {value:result,done:result+1e-9>=g.target};
}
if(typeof module==='object')module.exports={stat,clean,dateKey,weekStart,validDate};
if(typeof document!=='undefined')run();
function run(){
 const panel=$('#panel'), modal=$('#modal'), body=$('#modal-body');
 let state={version:1,goals:[],logs:[]}, view='active', problem='';
 try{const raw=localStorage.getItem(KEY);if(raw)state=clean(JSON.parse(raw));}catch{problem='无法读取本机存储。为避免覆盖原有记录，已暂停写入。';}
 function el(tag,txt,cl){const n=document.createElement(tag);if(txt!=null)n.textContent=txt;if(cl)n.className=cl;return n;}
 function btn(txt,fn,cl){const n=el('button',txt,cl);n.type='button';n.onclick=fn;return n;}
 function msg(s){$('#toast').textContent=s;}
 function err(s){$('#modal-error').textContent=s;}
 function commit(next,note,allowRepair=false){
  try{if(problem&&!allowRepair)throw Error(problem);
   const checked=clean(next), raw=JSON.stringify(checked);
   if(raw.length>LIMIT)throw Error('记录太多，无法保存。请先导出备份。');
   localStorage.setItem(KEY,raw);state=checked;problem='';if(modal.open)modal.close();render();msg(note);return true;
  }catch(e){const s=e.name==='QuotaExceededError'?'浏览器存储空间不足。未保存此次更改。':e.message;if(modal.open)err(s);else msg(s);return false;}
 }
 const format=n=>new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2}).format(n);
 function show(title,content){$('#dialog-title').textContent=title;body.replaceChildren(content);err('');if(!modal.open)modal.showModal();}
 function field(label,name,type,opts={}){const o=el('label',label),n=el(type==='select'?'select':type==='textarea'?'textarea':'input');
  if(n.tagName==='INPUT')n.type=type;n.name=name;
  if(opts.items)for(const [v,caption] of opts.items){const opt=el('option',caption);opt.value=v;n.append(opt);}
  if(opts.val!=null)n.value=opts.val;
  for(const k of ['min','max','step','maxLength','placeholder','required'])if(opts[k]!=null)n[k]=opts[k];
  o.append(n);return o;
 }
 function formButton(f,title){const b=el('button',title);b.type='submit';f.append(b);}
 function goalForm(g){
  const f=el('form',null,'form'), grid=el('div',null,'grid'), dates=el('div',null,'grid');
  f.append(field('目标名称','name','text',{val:g?.name,placeholder:'例如：读完一本书',maxLength:80,required:true}),field('分类（可选）','group','text',{val:g?.group,placeholder:'学习、运动、生活…',maxLength:32}),field('统计周期','mode','select',{val:g?.mode||'total',items:[['total','累计完成'],['weekly','每周重复'],['daily','每天重复']]}));
  grid.append(field('目标量','target','number',{val:g?.target??1,min:.01,max:1e8,step:.01,required:true}),field('单位','unit','text',{val:g?.unit||'次',placeholder:'次 / 分钟 / 页',maxLength:16}));f.append(grid);
  dates.append(field('开始日期','start','date',{val:g?.start||dateKey(),required:true}),field('截止日期（可选）','end','date',{val:g?.end}));f.append(dates,el('div','每周从周一开始统计；累计目标从开始日持续计入。','muted'));formButton(f,'保存目标');
  f.onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(f));if(!d.name.trim())return err('请输入目标名称。');if(d.end&&d.end<d.start)return err('截止日期不能早于开始日期。');
   if(g&&state.logs.some(l=>l.goal===g.id&&(l.date<d.start||(d.end&&l.date>d.end))))return err('新日期范围会排除已有打卡，请保留覆盖这些记录的日期。');
   const item={...d,id:g?.id||uid(),name:d.name.trim(),group:d.group.trim(),unit:d.unit.trim()||'次',target:Number(d.target),archived:g?.archived||false};
   if(commit({...state,goals:g?state.goals.map(x=>x.id===g.id?item:x):[item,...state.goals]},g?'目标已更新':'目标已创建')&&!g){view='active';render();}
  };show(g?'编辑目标':'新建目标',f);
 }
 function logForm(g,l){
  const f=el('form',null,'form'), today=dateKey(), end=g.end&&g.end<today?g.end:today;
  f.append(el('div',g.name,'wrap'),field('打卡日期','date','date',{val:l?.date||end,min:g.start,max:end,required:true}),field('完成量（'+g.unit+'）','amount','number',{val:l?.amount??1,min:.01,max:1e8,step:.01,required:true}),field('备注（可选）','note','textarea',{val:l?.note,maxLength:400,placeholder:'记录这次做了什么'}));formButton(f,l?'保存修改':'保存打卡');
  f.onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(f)),item={id:l?.id||uid(),goal:g.id,date:d.date,amount:Number(d.amount),note:d.note.trim()};
   if(!validDate(d.date)||d.date<g.start||d.date>end)return err('打卡日期需在目标日期内，且不能晚于今天。');
   commit({...state,logs:l?state.logs.map(x=>x.id===l.id?item:x):[item,...state.logs]},l?'打卡已修改':'打卡已记录');
  };show(l?'编辑打卡':'记录进度',f);
 }
 function quick(g){const t=dateKey();if(t<g.start||(g.end&&t>g.end))return msg('今天不在目标日期内，可通过「记录」补填。');
  commit({...state,logs:[{id:uid(),goal:g.id,date:t,amount:1,note:''},...state.logs]},'已打卡 +1 '+g.unit);
 }
 function confirmAction(title,desc,action,text){const p=el('div');p.append(el('p',desc),btn(text,action,'danger'));show(title,p);}
 function history(g){
  const fragment=document.createDocumentFragment(), list=state.logs.filter(l=>!g||l.goal===g.id).sort((a,b)=>b.date.localeCompare(a.date));
  fragment.append(el('h2',g?g.name+' · 打卡记录':'打卡记录','wrap'));
  if(!list.length)fragment.append(el('div','还没有打卡。','card empty'));
  for(const l of list){const goal=state.goals.find(x=>x.id===l.goal);const row=el('article',null,'card log'),left=el('div'),right=el('div',null,'actions');
   left.append(el('strong',goal.name+' · '+format(l.amount)+' '+goal.unit,'wrap'),el('p',l.date,'meta'));if(l.note)left.append(el('p',l.note,'wrap'));
   right.append(btn('编辑',()=>logForm(goal,l),'soft'),btn('删除',()=>confirmAction('删除打卡？','本条记录将从统计中移除。',()=>commit({...state,logs:state.logs.filter(x=>x.id!==l.id)},'打卡已删除'),'删除打卡'),'link'));
   row.append(left,right);fragment.append(row);
  }return fragment;
 }
 function render(){
  const t=dateKey(),active=state.goals.filter(g=>!g.archived);
  $('#today').textContent=new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'long'}).format(new Date());
  $('#summary').textContent=active.length?'今日打卡 '+state.logs.filter(l=>l.date===t).length+' 次 · '+active.filter(g=>stat(g,state.logs,t).done).length+' / '+active.length+' 个目标达到当前目标量':'从一个小目标开始，今天就记下第一步。';
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.view===view)));
  panel.replaceChildren();if(problem)panel.append(el('div',problem,'banner'));
  if(view==='history'){panel.append(history());return;}
  const archived=view==='archived',list=archived?state.goals.filter(g=>g.archived):active;
  panel.append(el('h2',archived?'已归档目标':'进行中的目标'));
  if(!list.length){const empty=el('div',null,'card empty');empty.append(el('strong',archived?'还没有归档目标':'还没有目标'),el('p',archived?'归档后打卡历史仍会保留。':'可以从「每周运动 3 次」或「累计阅读 200 页」开始。','muted'));if(!archived)empty.append(btn('创建第一个目标',()=>goalForm()));panel.append(empty);return;}
  for(const g of list){const s=stat(g,state.logs,t),c=el('article',null,'card'),top=el('div',null,'between'),tag=el('span',(g.group?g.group+' · ':'')+modes[g.mode],'tag wrap'),label=g.archived?'已归档':t<g.start?'未开始':s.done?'达标':g.end&&t>g.end?'已截止':'进行中';top.append(tag,el('span',label,'meta'));c.append(top,el('h3',g.name));
   const track=el('div',null,'track'),fill=el('div',null,'fill'),pct=Math.min(100,Math.round(100*s.value/g.target));track.setAttribute('role','progressbar');track.setAttribute('aria-label',g.name+'进度');track.setAttribute('aria-valuenow',pct);fill.style.width=pct+'%';track.append(fill);
   c.append(track,el('div',format(s.value)+' / '+format(g.target)+' '+g.unit+(g.end?' · 截止 '+g.end:''),'meta'));
   const actions=el('div',null,'actions');if(!archived){if(t>=g.start&&(!g.end||t<=g.end))actions.append(btn('+1 '+g.unit,()=>quick(g)));if(t>=g.start)actions.append(btn('记录 / 补卡',()=>logForm(g),'soft'));}
   actions.append(btn('历史',()=>show('目标记录',history(g)),'link'),btn('编辑',()=>goalForm(g),'link'),btn(archived?'恢复':'归档',()=>commit({...state,goals:state.goals.map(x=>x.id===g.id?{...x,archived:!archived}:x)},archived?'目标已恢复':'已归档，记录仍保留'),'link'));c.append(actions);panel.append(c);
  }
 }
 function settings(){
  const div=el('div',null,'form');div.append(el('p','不需要注册应用账号。备份文件含你的目标和打卡，建议自行保管。','muted'));
  div.append(btn('导出 JSON 备份',()=>{if(problem)return err('无法读取本地数据，未导出空备份。');const u=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=el('a');a.href=u;a.download='有进度-'+dateKey()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000);},'soft'));
  const upload=field('从备份恢复','backup','file');upload.querySelector('input').accept='.json,application/json';upload.onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>LIMIT)throw Error('备份文件过大。');const next=clean(JSON.parse(await file.text()));confirmAction('替换当前记录？','备份中有 '+next.goals.length+' 个目标、'+next.logs.length+' 条打卡。恢复会替换当前数据，建议先导出当前备份。',()=>commit(next,'备份已恢复',true),'确认恢复');}catch(e){err(e instanceof SyntaxError?'这不是有效的 JSON 备份。':e.message);}};div.append(upload);show('备份与设置',div);
 }
 $('#new').onclick=()=>goalForm();$('#settings').onclick=settings;$('#close').onclick=()=>modal.close();
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;render();});
 window.addEventListener('storage',e=>{if(e.key===KEY){try{state=e.newValue?clean(JSON.parse(e.newValue)):{version:1,goals:[],logs:[]};problem='';render();}catch{msg('另一个页面的数据无法读取。');}}});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
 render();
 if('serviceWorker' in navigator&&/^https?:/.test(location.protocol)){
  let reload=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reload)location.reload();});
  navigator.serviceWorker.register('./sw.js').then(r=>{const offer=()=>{if(!r.waiting||!navigator.serviceWorker.controller)return;$('#update').hidden=false;$('#refresh').onclick=()=>{reload=true;r.waiting.postMessage('activate');};};offer();r.addEventListener('updatefound',()=>{r.installing?.addEventListener('statechange',offer);});document.addEventListener('visibilitychange',()=>{if(!document.hidden)r.update().catch(()=>{});});}).catch(()=>{});
 }
}
