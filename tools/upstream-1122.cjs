// 원작 1122.1 버그 수정을 1105.3 고정본에 옮긴 패치 [파일, 찾기, 바꾸기]: 빈 세이브 백업 삭제·읽을 수 없는 세이브·Collect 담금질 템·무기 탭·Esc/C 닫기·되살린 괴물 검은 상자 / 신규: 공포 100 이후 괴물 수·보스 체력, 착용 템 팔 때 확인, 99레벨 경험치 신전 MF +200%. 리모드: 공포 단계 건너뛰기 없음(늘 1단계)
module.exports = [
 [
  "main",
  "var SaveCopy = class {",
  "var SAVE_PROGRESS = [\"gold\",\"ranks\",\"extraRanks\",\"imbues\",\"bestTimes\",\"unlocked\",\"baalSlain\",\"heroes\",\"retired\",\"terror\",\"cain\",\"light\",\"underway\",\"cursor\",\"stashTabs\",\"uniques\",\"inventoryByClass\",\"charmsByClass\",\"equippedByClass\",\"weaponSets\"];\nvar saveNone = (v) => v === void 0 || v === null || v === false || v === 0 || v === \"\" || Array.isArray(v) && v.length === 0;\nvar saveEmpty = (v) => saveNone(v) || typeof v === \"object\" && !Array.isArray(v) && Object.values(v).every(saveNone);\nfunction holdsNothing(text) {\n  if (!readable(text)) return false;\n  const raw = JSON.parse(text);\n  return SAVE_PROGRESS.every((f) => saveEmpty(raw[f]));\n}\nvar SaveCopy = class {\n  keepsBefore() {\n    const text = (path) => { try { return this.disk.exists(path) ? this.disk.read(path) : null; } catch { return null; } };\n    const before = text(this.previous);\n    if (before === null || !readable(before) || holdsNothing(before)) return false;\n    const last = text(this.last);\n    return last === null || !readable(last) || holdsNothing(last);\n  }"
 ],
 [
  "main",
  "if (!this.launched && this.disk.exists(this.last)) this.disk.rename(this.last, this.previous);",
  "if (!this.launched && this.disk.exists(this.last) && !this.keepsBefore()) this.disk.rename(this.last, this.previous);"
 ],
 [
  "saveTransfer",
  "function Vot(e){let t=null,n,r=!1;try{t=localStorage.getItem(o9()),t===null&&!Q6()&&(t=zot(),r=t!==null),n=t?JSON.parse(t):null}catch{return t&&Tot(t),w9()}if(!$(n))return t&&n!==null&&Tot(t),w9();",
  "function Vot(e){let t=null,n,r=!1;try{t=localStorage.getItem(o9())}catch{}try{n=t?JSON.parse(t):null}catch{n=void 0}if(t!==null&&!$(n)){n!==null&&Tot(t);t=null;n=null}if(t===null&&!Q6()){t=zot();r=t!==null;try{n=t?JSON.parse(t):null}catch{n=null}}if(!$(n))return w9();"
 ],
 [
  "saveTransfer",
  "function L2(e,t){return[...I2(t,t=>U2(e,t)).values()]}",
  "function L2(e,t){return[...I2(t,t=>U2(e,t)&&!(Object.values(t.forge?.t??{}).reduce((e,t)=>e+t,0)>0||(t.forge?.up??0)>0)).values()]}"
 ],
 [
  "Game",
  "this.hud.bindSwap(()=>void this.swapWeaponSet())",
  "this.hud.bindSwap(()=>void this.swapWeaponSet(!0))"
 ],
 [
  "Game",
  "swapWeaponSet(){let e=Zc({",
  "swapWeaponSet(b=!1){let e=Zc({"
 ],
 [
  "Game",
  "holding:!!this.save.cursor});if(!e)return!1;",
  "holding:!!this.save.cursor&&!b});if(!e)return!1;"
 ],
 [
  "Game",
  "if(Hi(this.save,e,t))return this.hud.banner(_f,",
  "if(Hi(this.save,e,t)&&!(b&&this.save.cursor&&t===`stash`))return this.hud.banner(_f,"
 ],
 [
  "saveTransfer",
  "constructor(e=()=>performance.now()){this.now=e}open(e){this.handler=e,this.openedAt=this.now()}",
  "constructor(e=()=>performance.now()){this.now=e,globalThis.__d2keyHook||(globalThis.__d2keyHook=!0,globalThis.addEventListener?.(`keydown`,e=>globalThis.__d2lastKey=e,!0))}open(e){this.handler=e,this.openedBy=globalThis.__d2lastKey}"
 ],
 [
  "saveTransfer",
  "key(e){!this.handler||e.repeat||e.timeStamp<this.openedAt||this.handler(e)}",
  "key(e){!this.handler||e.repeat||e===this.openedBy||this.handler(e)}"
 ],
 [
  "saveTransfer",
  "lets(e){return e.timeStamp-this.closedAt>=500}",
  "lets(e){return this.now()-this.closedAt>=500}"
 ],
 [
  "saveTransfer",
  "key(e){return e.timeStamp-this.openedAt>=A2e}",
  "key(e){return this.over()}"
 ],
 [
  "saveTransfer",
  "hold(e,t){e&&this.holds.set(e,Math.max(t,this.holds.get(e)??0))}",
  "hold(e,t){e&&this.holds.set(e,Math.max(t,this.holds.get(e)??0))}raised=new Map;raisedArt(e){if(!e)return null;let t=this.raised.get(e);if(!t){let n=()=>this.looks.get(e)?.anims??{};t=new Proxy({},{get:(e,t)=>Reflect.get(n(),t),has:(e,t)=>Reflect.has(n(),t),ownKeys:()=>Reflect.ownKeys(n()),getOwnPropertyDescriptor:(e,t)=>{let r=Reflect.getOwnPropertyDescriptor(n(),t);return r&&{...r,configurable:!0}},set:()=>!1,deleteProperty:()=>!1}),this.raised.set(e,t)}return t}"
 ],
 [
  "saveTransfer",
  "mod:r??null,anims:o.anims,velocity:s.velocity",
  "mod:r??null,anims:e.monsters.raisedArt(o.look)??o.anims,velocity:s.velocity"
 ],
 [
  "saveTransfer",
  "function Ka(e){return 8+Math.max(0,e-2+1)}",
  "function Ka(e){return 8+Math.max(0,e-2+1)}function __Tb(e){return Ka(e)+7*Math.max(0,e-100)}"
 ],
 [
  "saveTransfer",
  "Ym=(e,t)=>Jm(e,t)?qa(Ga(e)):Ipe(e)",
  "Ym=(e,t,n=t)=>Jm(e,t)?qa(t===`actBoss`&&n===`actBoss`&&!!e.terror&&!e.terror.uber&&!e.terror.finale&&!e.tristram?Math.max(Ga(e),__Tb(e.terror.tier)):Ga(e)):Ipe(e)"
 ],
 [
  "saveTransfer",
  "b=u?Ym(e,s):1",
  "b=u?Ym(e,s,o):1"
 ],
 [
  "report",
  "function ns(e){return Math.round((2500+500*Math.log2(1+Math.max(1,e)/10))/9)*9}",
  "function ns(e){let t=Math.max(1,e);return Math.round((2500+500*Math.log2(1+t/10)+5571/2/600*Math.max(0,t-100))/9)*9}"
 ],
 [
  "Game",
  "sellHeld:()=>{if(this.forgeUp)return this.toAnvil(t);",
  "sellAsks:()=>!!i.cursor&&`slot`in i.cursor.from&&!this.forgeUp,sellHeld:()=>{if(this.forgeUp)return this.toAnvil(t);"
 ],
 [
  "saveTransfer",
  "ask(e,t){this.last=null,X4(this.node),this.node.replaceChildren(r3(e.rarity,`Drop ${y(e.name,e.rarity,e.base)}?`),r3(`price`,`Tap again to drop`))",
  "ask(e,t,n=`drop`){this.last=null,X4(this.node);let r=y(e.name,e.rarity,e.base);this.node.replaceChildren(r3(e.rarity,n===`drop`?`Drop ${r}?`:`Sell ${r}?`),r3(`price`,n===`drop`?`Tap again to drop`:Y.touch?`Tap again to sell`:`Click again to sell`))"
 ],
 [
  "saveTransfer",
  "e.addEventListener(`click`,e=>{let t=v4?.actions.sellHeld;Y.item&&t&&(e.stopPropagation(),e.preventDefault(),t())},!0))}",
  "e.addEventListener(`click`,t=>{let n=v4?.actions.sellHeld;Y.item&&n&&(t.stopPropagation(),t.preventDefault(),__sellAsk(Y.node??e))},!0))}function __sellAsk(e){let t=Y.item,n=v4?.actions.sellHeld;t&&n&&v4&&(v4.actions.sellAsks?.()&&globalThis.__sellAsked!==t&&e?(globalThis.__sellAsked=t,W4(t),v4.tooltip.ask(t,e,`sell`)):(globalThis.__sellAsked=null,W4(null),v4.tooltip.hide(),n()))}"
 ],
 [
  "saveTransfer",
  "e.addEventListener(`click`,e=>{e.stopPropagation();let t=v4?.actions.sellHeld;Y.item&&t&&v4&&(v4.tooltip.hide(),t())}))}",
  "e.addEventListener(`click`,t=>{t.stopPropagation();let n=v4?.actions.sellHeld;Y.item&&n&&v4&&__sellAsk(e)}))}"
 ],
 [
  "saveTransfer",
  "wse=e=>gu.find(t=>e<t.under)?.jump??1",
  "wse=e=>1"
 ],
 [
  "report",
  "this.say(e,n.message);let{player:r}=e;",
  "this.say(e,t.type===`experience`&&e.player.level>=99?`Your experience brings you fortune.`:n.message);let{player:r}=e;"
 ],
 [
  "report",
  "else t===`experience`&&(this.xpMultiplier=1+r.arg/100,i=()=>this.xpMultiplier=1);",
  "else t===`experience`&&n.level>=99?(e.shrineMagicFind=200,i=()=>void delete e.shrineMagicFind):t===`experience`&&(this.xpMultiplier=1+r.arg/100,i=()=>this.xpMultiplier=1);"
 ],
 [
  "report",
  "this.buff={id:t,name:r.name,",
  "this.buff={id:t,name:t===`experience`&&n.level>=99?`Magic Find`:r.name,"
 ],
 [
  "saveTransfer",
  "function Gg(e){let{player:t}=e,n=t.owner??t;return{magicFind:t.magicFind+(t.owner?n.magicFind:0),cls:n.cls}}",
  "function Gg(e){let{player:t}=e,n=t.owner??t;return{magicFind:t.magicFind+(t.owner?n.magicFind:0)+(e.shrineMagicFind??0),cls:n.cls}}"
 ],
 [
  "ko",
  "\"Your experience teaches you well.\":`경험으로부터 많은 가르침을 얻습니다.`",
  "\"Your experience teaches you well.\":`경험으로부터 많은 가르침을 얻습니다.`,\"Your experience brings you fortune.\":`경험이 행운을 가져다줍니다.`,\"Click again to sell\":`다시 클릭하면 판매합니다`,\"Tap again to sell\":`다시 탭하면 판매합니다`,\"Sell *?\":`{0} 판매?`"
 ],
 // 괴물에 걸린 저주가 여럿이면 그림이 한 바퀴 돌 때마다 다음 저주로 차례로 보임(마지막에 건 것 하나만 보이던 것)
 [
  "saveTransfer",
  "let a=i.shown;i.sprite&&a?.anim&&(i.sprite.texture=qs(a.anim,0,a.age%(a.anim.framesPerDirection/a.anim.fps))",
  "if(!r.dead&&i.shown?.anim){let L=i.shown.anim.framesPerDirection/i.shown.anim.fps;i.showing=(i.showing??0)+t;if(i.showing>=L){i.showing%=L;let c=[...i.curses.values()].filter(x=>x.anim).sort((x,y)=>x.laid-y.laid),k=c.indexOf(i.shown),x=c[(k+1)%c.length];x&&x!==i.shown&&(uy(e,i,x),i.showing=0)}}let a=i.shown;i.sprite&&a?.anim&&(i.sprite.texture=qs(a.anim,0,i.showing??0)"
 ],
 // 유령(Wraith 계열)은 D2 처럼 시체를 남기지 않음. 죽는 동작 마지막 장면(긴 안개 기둥)이 그대로 서 있던 것
 [
  "saveTransfer",
  "if(!r||e.corpses.length>=xae)return null;",
  "if(!r||e.corpses.length>=xae||/^wraith/.test(t.type?.id))return null;"
 ]
];
