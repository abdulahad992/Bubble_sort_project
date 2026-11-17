/* app.js - the Two-Line Moonlit Puzzle animation + the Python backend client.
   Flow: numbers -> POST api/sort (Flask/Python) -> trace of steps -> the boy animates exactly those steps.
   If there is no backend (GitHub Pages / file://), sorter.js (same logic) is used instead. */
(function(){
'use strict';
var NS='http://www.w3.org/2000/svg';
var MAX_TILES=10,COLS=5,CELL=62,GX=45,GY=78,MIN_V=-99,MAX_V=999;
function slotPos(i){var r=Math.floor(i/COLS),c=i%COLS;if(r%2===1)c=COLS-1-c;return{x:GX+c*CELL+CELL/2,y:GY+r*CELL+CELL/2}}
var D='M0 0 H42 C42 -6 38 -8 38 -14 A13 13 0 1 1 62 -14 C62 -8 58 -6 58 0 H100 V42 C106 42 108 38 114 38 A13 13 0 1 1 114 62 C108 62 106 58 100 58 V100 H58 C58 94 62 92 62 86 A13 13 0 1 0 38 86 C38 92 42 94 42 100 H0 V58 C6 58 8 62 14 62 A13 13 0 1 0 14 38 C8 38 6 42 0 42 Z';
var TS=.6;
var RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
function $(id){return document.getElementById(id)}
function mk(tag,attrs){var e=document.createElementNS(NS,tag);for(var k in attrs)e.setAttribute(k,attrs[k]);return e}
function cl(x,a,b){return Math.min(1,Math.max(0,(x-a)/(b-a)))}
function lerp(a,b,t){return a+(b-a)*t}
function easeOut(x){return 1-Math.pow(1-x,3)}
function back(x){var c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)}
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}

var layers={pieces:$('pieces'),nums:$('nums')};
var msgEl=$('msg'),cA=$('cA'),cB=$('cB'),cOp=$('cOp'),hl=$('pairHL'),head=$('head');
var pieces=[],order=[],trace=null,stepIdx=0,n=0,roundNow=1,cmpN=0,swN=0;
var busy=false,done=false,running=false,ready=false,gen=0,speed=1.4,celebrating=false,reward=null,boardOp=1;
var lookX=0,headX=0;

function setMsg(t){msgEl.textContent=t}
function think(a,b){$('t1').textContent=a||'';$('t2').textContent=b||''}   // the boy's thought bubble
function setPair(a,b,op,cls){
cA.textContent=a===null?'-':a;cB.textContent=b===null?'-':b;cOp.textContent=op;
cOp.className='op'+(cls?' '+cls:'');
cA.classList.toggle('on',a!==null&&cls!=='x');cB.classList.toggle('on',a!==null&&cls!=='x');
}
function stats(){$('sp').textContent=Math.min(roundNow,Math.max(n-1,1));$('sc').textContent=cmpN;$('ss').textContent=swN}
function T(ms){return ms/speed}
function wait(ms){return new Promise(function(r){setTimeout(r,T(ms))})}
function setButtons(on){['bNext','bAuto','bNew','bUse'].forEach(function(id){$(id).disabled=!on&&id!=='bNew'})}

/* ---------- Python backend (ya JS fallback) ---------- */
async function solve(vals){
var ctrl=new AbortController(),t=setTimeout(function(){ctrl.abort()},2500),data;
try{
var res=await fetch('api/sort',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({array:vals}),signal:ctrl.signal});
if(!res.ok)throw new Error('HTTP '+res.status);
data=await res.json();data.source='python';
}catch(e){data=window.BubbleSorter.trace(vals);data.source='browser'}
clearTimeout(t);
var m=$('mode');
if(data.source==='python'){m.textContent='Python (Flask) backend connected';m.className='mode py'}
else{m.textContent='Browser mode: running a JS copy of the Python logic';m.className='mode js'}
return data;
}

/* ---------- tiles ---------- */
function makePiece(val,slot){
var g=mk('g',{'class':'piece'});
g.innerHTML='<path class="halo" d="'+D+'" filter="url(#blur6)"/><path class="body" d="'+D+'"/><path class="shine" d="M9 24 Q9 9 24 9"/>';
var nn=mk('g',{'class':'num'});
nn.innerHTML='<text class="numtxt" x="0" y="0" dy=".36em">'+val+'</text>';
layers.pieces.appendChild(g);layers.nums.appendChild(nn);
var sp=slotPos(slot);
return{val:val,g:g,n:nn,halo:g.firstChild,x:sp.x,y:sp.y,mv:null,tilt:Math.random()*6-3,rot:0,cmpA:0,cmp:false,locked:false,haloA:.38,liftA:0,idx:slot};
}
function flag(p){
p.g.classList.toggle('cmp',p.cmp);p.g.classList.toggle('lock',p.locked);
p.n.classList.toggle('cmp',p.cmp);p.n.classList.toggle('lock',p.locked);
}
function movePiece(p,to,dur,arc,liftF){p.mv={fx:p.x,fy:p.y,tx:to.x,ty:to.y,s:performance.now(),d:dur,arc:arc,lf:liftF}}
function showPair(j){
var a=slotPos(j),b=slotPos(j+1);
hl.setAttribute('x1',a.x);hl.setAttribute('y1',a.y);hl.setAttribute('x2',b.x);hl.setAttribute('y2',b.y);
hl.setAttribute('opacity','.2');lookX=(a.x+b.x)/2-200;
}
function hidePair(){hl.setAttribute('opacity','0');lookX=0}

function randomVals(){
var vals,ok;
do{var pool=[];while(pool.length<MAX_TILES){var v=5+Math.floor(Math.random()*95);if(pool.indexOf(v)<0)pool.push(v)}
vals=pool;ok=false;for(var i=0;i<vals.length-1;i++)if(vals[i]>vals[i+1])ok=true}while(!ok);
return vals;
}
function showErr(t){$('err').textContent=t||''}

async function fresh(vals){
gen++;var g=gen;
running=false;busy=false;done=false;ready=false;celebrating=false;reward=null;boardOp=1;
$('bAuto').textContent='Auto sort';
layers.pieces.innerHTML='';layers.nums.innerHTML='';
$('reward').setAttribute('visibility','hidden');
$('loot').innerHTML='';$('sparks').innerHTML='';
$('summary').hidden=true;$('log').innerHTML='';
hidePair();
vals=vals||randomVals();
n=vals.length;pieces=[];order=[];
for(var s=0;s<n;s++){var p=makePiece(vals[s],s);pieces.push(p);order.push(p)}
roundNow=1;cmpN=0;swN=0;stepIdx=0;stats();
setPair(null,null,'?','x');
setMsg('Asking Python for the plan...');think('Thinking...','');
setButtons(false);
var res=await solve(vals);if(g!==gen)return;
trace=res;ready=true;setButtons(true);
setMsg('Press Next step. The boy will look at the first two tiles.');
think('Ready!','Press Next step');
}

function addLog(s){
var li=document.createElement('li');
li.className=s.swap?'sw':'ok';
li.textContent='Round '+s.round+': '+s.a+' vs '+s.b+(s.swap?'  ->  swap':s.a===s.b?'  ->  equal, stay':'  ->  stay');
$('log').appendChild(li);$('log').scrollTop=1e6;
}

async function step(){
if(busy||done||celebrating||!ready)return;
if(!trace.steps.length){celebrate();return}
busy=true;var g=gen;
var s=trace.steps[stepIdx],j=s.index,pa=order[j],pb=order[j+1];
showPair(j);
setPair(s.a,s.b,'?','');
setMsg('Look at '+s.a+' and '+s.b+'. Which one is bigger?');
think(s.a+' vs '+s.b,'which is bigger?');
await wait(900);if(g!==gen)return;
pa.cmp=true;pb.cmp=true;flag(pa);flag(pb);cmpN=s.comparisons;stats();
await wait(500);if(g!==gen)return;
if(s.swap){
setPair(s.a,s.b,'>','swap');
setMsg(s.a+' is bigger than '+s.b+'. Bigger numbers go toward the END, so they swap.');
think(s.a+' > '+s.b,'swap them!');
await wait(700);if(g!==gen)return;
var A=slotPos(j),B=slotPos(j+1);
layers.pieces.appendChild(pa.g);
movePiece(pa,B,T(700),12,1);movePiece(pb,A,T(700),-12,.2);
order[j]=pb;order[j+1]=pa;swN=s.swaps;stats();
await wait(800);if(g!==gen)return;
}else{
var eq=s.a===s.b;
setPair(s.a,s.b,eq?'=':'<','stay');
setMsg(eq?s.a+' and '+s.b+' are equal. They are already in order, so nothing moves.':s.a+' is smaller than '+s.b+'. They are already in order, so nothing moves.');
think(eq?'They are equal':s.a+' < '+s.b,'nothing to do');
await wait(1100);if(g!==gen)return;
}
pa.cmp=false;pb.cmp=false;flag(pa);flag(pb);hidePair();
addLog(s);stepIdx++;
s.locked.forEach(function(k){order[k].locked=true;flag(order[k])});
if(s.done){busy=false;celebrate();return}
if(s.locked.length){
roundNow=s.round+1;stats();
setPair(null,null,'?','x');
setMsg(order[s.locked[0]].val+' reached its final place (gold). Round '+roundNow+' starts from the beginning.');
think('Round '+s.round+' done','next round!');
}
busy=false;
}

async function auto(){
if(!ready)return;
if(running){running=false;$('bAuto').textContent='Auto sort';return}
if(done||celebrating)return;
running=true;$('bAuto').textContent='Pause';var g=gen;
while(running&&!done&&!celebrating&&g===gen){
if(!busy)await step();else await wait(120);
await wait(150);
}
if(g===gen){running=false;$('bAuto').textContent='Auto sort'}
}

/* ---------- custom input / presets ---------- */
function parseInput(text){
var parts=text.split(/[\s,;]+/).filter(Boolean);
if(parts.length<2||parts.length>MAX_TILES)return{error:'Enter 2 to '+MAX_TILES+' numbers, separated by commas or spaces.'};
var out=[];
for(var i=0;i<parts.length;i++){
if(!/^-?\d+$/.test(parts[i]))return{error:'"'+parts[i]+'" is not a number. Use whole numbers only.'};
var v=parseInt(parts[i],10);
if(v<MIN_V||v>MAX_V)return{error:'Numbers must be between '+MIN_V+' and '+MAX_V+'.'};
out.push(v);
}
return{values:out};
}
function useMine(){
var r=parseInput($('custom').value);
if(r.error){showErr(r.error);return}
showErr('');fresh(r.values);
}
async function loadPresets(){
var sel=$('preset'),list=[];
try{var res=await fetch('data/samples.json');list=(await res.json()).presets||[]}catch(e){}
list.forEach(function(p,i){var o=document.createElement('option');o.value=i;o.textContent=p.name;sel.appendChild(o)});
sel.addEventListener('change',function(){
if(sel.value==='')return;
var v=list[+sel.value].values;$('custom').value=v.join(', ');showErr('');fresh(v.slice());sel.value='';
});
}

var items=[],sparks=[],coinCount=0,gemCount=0,finalMsg=false;
var GEMS=['#ff4d6d','#4cc9ff','#3ddc97','#b36bff','#ffb347'];
function coinEl(){
var g=mk('g',{});
g.innerHTML='<circle r="14" fill="url(#gGold)" stroke="#a8680f" stroke-width="2"/><circle r="9.5" fill="none" stroke="#ffe69a" stroke-width="1.5"/><path d="M0 -5 L1.5 -1.5 L5 0 L1.5 1.5 L0 5 L-1.5 1.5 L-5 0 L-1.5 -1.5Z" fill="#fff1b8"/><path d="M-10 -5 Q-6 -11 0 -11" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-linecap="round"/>';
return g;
}
function gemEl(c){
var g=mk('g',{});
g.innerHTML='<polygon points="0,-15 13,-7.5 13,7.5 0,15 -13,7.5 -13,-7.5" fill="'+c+'" stroke="#fff" stroke-opacity=".7" stroke-width="1.5"/><polygon points="0,-15 13,-7.5 0,0 -13,-7.5" fill="#fff" opacity=".38"/><polygon points="0,0 13,-7.5 13,7.5" fill="#000" opacity=".12"/><path d="M-13 -7.5 L0 0 L0 15 M13 -7.5 L0 0" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1"/>';
return g;
}
function buildLoot(){
var loot=$('loot');loot.innerHTML='';items=[];coinCount=0;gemCount=0;
var kinds=[];for(var i=0;i<21;i++)kinds.push(i%3===2?'gem':'coin');shuffle(kinds);
var slots=[];
for(i=0;i<9;i++)slots.push({a:i/9*Math.PI*2+.3+(Math.random()-.5)*.15,r:96+Math.random()*8});
for(i=0;i<12;i++)slots.push({a:i/12*Math.PI*2+.1+(Math.random()-.5)*.12,r:128+Math.random()*8});
for(i=0;i<4;i++){slots.push({a:Math.random()*6.28,r:Math.random()*24});kinds.push(i===3?'gem':'coin')}
slots.forEach(function(s,i){
var kind=kinds[i];var el=kind==='coin'?coinEl():gemEl(GEMS[i%GEMS.length]);
if(kind==='coin')coinCount++;else gemCount++;
loot.appendChild(el);
items.push({el:el,kind:kind,a:s.a,r:s.r,d:2.0+i*.055,spin:Math.random()*360});
});
var sp=$('sparks');sp.innerHTML='';sparks=[];
for(i=0;i<16;i++){
var e=mk('path',{d:'M0 -9 L2 -2 L9 0 L2 2 L0 9 L-2 2 L-9 0 L-2 -2Z'});
sp.appendChild(e);sparks.push({el:e,x:50+Math.random()*300,y:30+Math.random()*230,ph:Math.random()*6.28,sc:.6+Math.random()*.9});
}
}
function celebrate(){
celebrating=true;running=false;finalMsg=false;$('bAuto').textContent='Auto sort';done=true;
hidePair();setPair(null,null,'?','x');
var t=trace;
setMsg(t.early_exit?'No swaps in the last round, so the boy knows it is sorted and stops early!':'All sorted: smallest at START, biggest at END.');
think('Sorted!','Smart sort done');
var sm=$('summary');
sm.innerHTML='<h2>Result</h2>'
+'<div>Original: <code>['+t.original.join(', ')+']</code></div>'
+'<div>Sorted: <code>['+t.sorted.join(', ')+']</code></div>'
+'<div>Comparisons: <b>'+t.comparisons+'</b> &nbsp; Swaps: <b>'+t.swaps+'</b> &nbsp; Rounds: <b>'+t.rounds+'</b></div>'
+'<div class="smart">'+(t.saved_comparisons>0?'The smart boy saved '+t.saved_comparisons+' comparisons by stopping early (naive maximum = '+t.max_comparisons+').':'No comparisons could be saved here (maximum = '+t.max_comparisons+').')+'</div>'
+'<div>Calculated by: '+(t.source==='python'?'Python (Flask)':'browser (JS copy of the Python logic)')+'</div>';
sm.hidden=false;
buildLoot();
$('reward').setAttribute('visibility','visible');
reward={t0:performance.now()};
}

function runReward(now){
var t=(now-reward.t0)/1000*(RM?1.6:1);
var f1=cl(t,0,.35),f2=cl(t,.35,1.8);
var fo=.85*f1*(1-.8*f2)*(1-cl(t,1.8,4));
$('flash').setAttribute('opacity',(RM?Math.min(fo,.2):fo).toFixed(3));
$('pool').setAttribute('opacity',(.75*cl(t,0,.5)*(1-.5*cl(t,1,3))).toFixed(3));
$('beam').setAttribute('opacity',(.5*cl(t,.1,.7)*(1-.55*cl(t,1.5,3))).toFixed(3));
var mo=cl(t,0,.7);
$('moon').setAttribute('transform','translate(200 30) scale('+(back(mo)).toFixed(3)+')');
$('moon').setAttribute('opacity',cl(t,0,.4).toFixed(3));
for(var i=0;i<3;i++){
var tt=cl(t,i*.35,i*.35+1.5),c=$('rp'+i);
c.setAttribute('r',(14+260*easeOut(tt)).toFixed(1));
c.setAttribute('opacity',(t<i*.35?0:.8*(1-tt)).toFixed(3));
}
boardOp=1-.72*cl(t,.5,1.3);
var ba=cl(t,.8,1.5),bs=lerp(1.6,1,back(ba));
$('box').setAttribute('transform','translate(200 140) scale('+bs.toFixed(3)+')');
$('box').setAttribute('opacity',cl(t,.8,1.1).toFixed(3));
var e=cl(t,1.9,2.6),ee=easeOut(e);
$('lid').setAttribute('transform','translate(0 '+(-46*ee).toFixed(1)+') rotate('+(-16*ee).toFixed(1)+') scale('+(1+.28*ee).toFixed(3)+')');
$('lid').setAttribute('opacity',(1-cl(t,2.2,2.6)).toFixed(3));
$('boxGlow').setAttribute('opacity',(e*(.8+.2*Math.sin(t*3))).toFixed(3));
items.forEach(function(it,k){
var p=cl(t,it.d,it.d+.95);
if(p<=0){it.el.setAttribute('transform','scale(0)');return}
var ep=easeOut(p),s=Math.max(0,back(p));
var x=Math.cos(it.a)*it.r*ep,y=Math.sin(it.a)*it.r*ep-Math.sin(p*Math.PI)*40;
var sx=1,rot=0;
if(it.kind==='coin'){sx=lerp(Math.abs(Math.cos(p*20)),1,p*p)}
else{rot=(1-p)*it.spin;s*=1+(p>=1?.05*Math.sin(t*3+k):0)}
it.el.setAttribute('transform','translate('+x.toFixed(1)+' '+y.toFixed(1)+') rotate('+rot.toFixed(1)+') scale('+(sx*s).toFixed(3)+' '+s.toFixed(3)+')');
});
if(t>3.2){
sparks.forEach(function(sp){
var v=Math.max(0,Math.sin(t*2.2+sp.ph));v=v*v*v;
sp.el.setAttribute('transform','translate('+(sp.x-200).toFixed(1)+' '+(sp.y-140).toFixed(1)+') scale('+(v*sp.sc).toFixed(3)+')');
});
}
}

var last=performance.now();
function frame(now){
var dt=Math.min(.05,(now-last)/1000);last=now;
pieces.forEach(function(p){
var lift=0;
if(p.mv){
var k=cl(now,p.mv.s,p.mv.s+p.mv.d);
var e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
var dx=p.mv.tx-p.mv.fx,dy=p.mv.ty-p.mv.fy,len=Math.hypot(dx,dy)||1;
var off=p.mv.arc*Math.sin(Math.PI*k);
p.x=p.mv.fx+dx*e+(-dy/len)*off;p.y=p.mv.fy+dy*e+(dx/len)*off;
lift=Math.sin(Math.PI*k)*.08*p.mv.lf;
if(k>=1){p.x=p.mv.tx;p.y=p.mv.ty;p.mv=null}
}
p.liftA=lift;
p.rot+=((p.locked?0:p.tilt)-p.rot)*(1-Math.exp(-5*dt));
p.cmpA+=((p.cmp?1:0)-p.cmpA)*(1-Math.exp(-10*dt));
var s=1+.07*p.cmpA+p.liftA;
p.g.setAttribute('transform','translate('+p.x.toFixed(1)+' '+p.y.toFixed(1)+') rotate('+p.rot.toFixed(2)+') scale('+(TS*s).toFixed(3)+') translate(-50 -50)');
p.n.setAttribute('transform','translate('+p.x.toFixed(1)+' '+p.y.toFixed(1)+') rotate('+p.rot.toFixed(2)+') scale('+s.toFixed(3)+')');
var target=p.cmp?.95:(p.locked?.5:.38);
p.haloA+=(target-p.haloA)*(1-Math.exp(-8*dt));
p.halo.setAttribute('opacity',(p.haloA+((p.cmp||p.locked)?0:.07*Math.sin(now/600+p.idx*1.3))).toFixed(3));
});
layers.pieces.setAttribute('opacity',boardOp.toFixed(3));layers.nums.setAttribute('opacity',boardOp.toFixed(3));
var f=1-Math.exp(-(RM?30:7)*dt);
headX+=(lookX*.3-headX)*f;
head.setAttribute('transform','translate('+headX.toFixed(1)+' 0) rotate('+(headX*.12).toFixed(2)+' 200 288)');
if(reward)runReward(now);
requestAnimationFrame(frame);
}

$('bNext').addEventListener('click',function(){if(!running)step()});
$('bAuto').addEventListener('click',auto);
$('bNew').addEventListener('click',function(){showErr('');fresh()});
$('bUse').addEventListener('click',useMine);
$('custom').addEventListener('keydown',function(e){if(e.key==='Enter')useMine()});
$('speed').addEventListener('input',function(e){speed=+e.target.value});
loadPresets();
fresh();
requestAnimationFrame(frame);
})();
