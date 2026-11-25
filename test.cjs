const {test}=require('node:test'),assert=require('node:assert/strict'), fs=require('node:fs');
const {stat,clean,weekStart,validDate}=require('./app.js');
const g={id:'one',name:'阅读',group:'学习',mode:'weekly',target:3,unit:'页',start:'2026-11-01',end:'',archived:false};
const log=(id,date,amount)=>({id,goal:g.id,date,amount,note:''});
const logs=[log('a','2026-11-22',4),log('b','2026-11-23',1),log('c','2026-11-25',2),log('d','2026-11-26',9)];
test('每日、周一换周、累计，忽略未来与截止后的打卡',()=>{
 assert.equal(weekStart('2026-11-22'),'2026-11-16');
 assert.deepEqual(stat(g,logs,'2026-11-25'),{value:3,done:true});
 assert.equal(stat({...g,mode:'daily'},logs,'2026-11-25').value,2);
 assert.equal(stat({...g,mode:'total'},logs,'2026-11-25').value,7);
 assert.equal(stat({...g,end:'2026-11-24'},logs,'2026-11-25').value,1);
});
test('备份往返通过；拒绝重复记录、非法日期、错误关联及非有限数值',()=>{
 const data={version:1,goals:[g],logs};
 assert.deepEqual(clean(JSON.parse(JSON.stringify(data))),data);
 for(const bad of [[logs[0],logs[0]],[{...logs[0],goal:'none'}],[{...logs[0],date:'2026-02-31'}],[{...logs[0],amount:Infinity}]])assert.throws(()=>clean({...data,logs:bad}));
 assert.equal(validDate('2028-02-29'),true);
});
test('离线及安装所需文件齐备',()=>{
 for(const f of ['app.js','sw.js','manifest.webmanifest','icon-192.png','icon-512.png','index.html'])assert.ok(fs.statSync('./'+f).size);
});
