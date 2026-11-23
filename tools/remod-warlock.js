// 악마술사(워락) 직업 정의(saveTransfer 번들 안 SG 직업 목록 앞에 끼워 넣음, 번들 지역 함수 lc·pc·mc·M·N·P·T·E·Mf·Of·Bf·A·UE·O·Df 를 그대로 씀)
// 스킬 수치·이름·설명·트리 자리는 D2R 설치본 표(tools/warlock-skills.json, build.cjs 가 __WKD 로 넣음). 미사일 그림은 D2R 2D 표의 CelFile 이 가리키는 옛 그림
var __WKS=__WKD.skills,__WKP={},__wkId=n=>n.split(/[^A-Za-z0-9]+/).filter(Boolean).map((w,i)=>(i?w[0].toUpperCase():w[0].toLowerCase())+w.slice(1)).join(``),
// D2 레벨별 증가(1~8, 9~16, 17~22, 23~28, 29~) 로 최소·최대 평균, 게임 수치는 D2 의 4배 × 스킬별 보정(__WKM)
__wkD=(s,l)=>{let g=(b,k)=>{let v=+(s[b]??0),c=[[2,8,1],[9,16,2],[17,22,3],[23,28,4],[29,99,5]];for(let[a,z,n]of c)for(let i=a;i<=Math.min(l,z);i++)v+=+(s[k+`Lev`+n]??0);return v};let lo=s.EMin?g(`EMin`,`EMin`):+(s.MinDam??0)+l*2,hi=s.EMax?g(`EMax`,`EMax`):+(s.MaxDam??0)+l*3;return((lo+hi)/2*4+(__WKF[__wkId(s.skill)]??0))*(__WKM[__wkId(s.skill)]??1)},
// 낮은 레벨이 너무 약한 기술에 더하는 기본 피해(보정 전)
__WKF={miasmaBolt:27},
__wkE=s=>({fire:`fire`,cold:`cold`,ltng:`lightning`,pois:`poison`,mag:`magic`})[s.EType]??`physical`,
// 스킬별 피해 보정: 여러 마리 맞히는 것은 낮추고, 혼자 맞히는 독기 볼트는 원소술사 화염 볼트(같은 1단계)와 비슷하게
// 밸런스(11-23): 종말·가르기·칼날 이동·거울 칼날 낮춤, 불의 고리·울림 일격·무기력 인장 올림, +스킬은 원작처럼 1당 D2 2.5레벨
__WKM={miasmaBolt:.48,echoingStrike:.45,sigilLethargy:.5,hexBane:.45,hexPurge:.45,hexSiphon:.6,bloodBoil:.25,flameWave:.45,ringOfFire:.25,apocalypse:.2,cleave:.5,bladeWarp:.6,mirroredBlades:.5,abyss:.46,eldritchBlast:.8,miasmaChains:.58},
// 지속 효과가 올려 주는 우리 스킬 피해(트리별)
__wkB=t=>1+.06*((t===1?(__WKP.demonicMastery??0)+(__WKP.bloodOath??0):t===2?__WKP.levitate??0:__WKP.enhancedEntropy??0)),
__wkDmg=(e,s,l)=>{let el=__wkE(s);return __wkD(s,l)*(el===`fire`?UE(e):el===`physical`?1:A(e,el))*__wkB(s.page)*($s(e.player,e.source)?.effects?.damage??1)},
// 기술 변형 표를 원작 변형 목록에 더함(build.cjs WK_XS)
__wkXs=Object.assign(Xs,__WKX),
__wkN=(e,n,r=450)=>Of(P(e,n,r),n),
// 스킬별 동작. 그림 이름은 우리 missiles.json 키(D2R CelFile 과 같은 그림)
__WKC={
miasmaBolt:{cd:O(1.17,.93),cast(e,t,d){let{player:n}=e,r=__wkN(e,1+Math.floor((t-1)/2));for(let s of r){let a=Bf(n,s),D=Math.min(400,Math.hypot(s.x-n.x,s.y-n.y)),x=n.x+Math.cos(a)*D,y=n.y+Math.sin(a)*D;lc(e,`miasmaBolt`,n.x,n.y,a,360,{damage:d,life:1.4,radius:6,missile:`poisonnova`});E(e,D/360,()=>mc(e,x,y,34+t*2,d*.25,2.5,`poisonjavcloud`))}return r.length>0}},
ringOfFire:{cd:O(3.1,.93),cast(e,t,d){let{player:n}=e;if(!P(e,1,400).length)return!1;let k=6+t;for(let i=0;i<k;i++){let a=i/k*Math.PI*2;lc(e,`ringOfFire`,n.x,n.y,a,250,{damage:d,life:.9,radius:10,pierce:2,missile:`fireball`});E(e,.9,()=>T(e,`explodingarrowexp`,n.x+Math.cos(a)*225,n.y+Math.sin(a)*225))}return!0}},
flameWave:{cd:O(2.9,.93),cast(e,t,d){let{player:n}=e,[r]=P(e,1,450);if(!r)return!1;let a=Bf(n,r),x=n.x,y=n.y;lc(e,`flameWave`,x,y,a,240,{damage:d,life:1.7,radius:26,pierce:99,missile:`firewall`});for(let i=1;i<=8;i++)E(e,i*.2,()=>mc(e,x+Math.cos(a)*48*i,y+Math.sin(a)*48*i,24,d*.12,2.5,`firesmall`));return!0}},
miasmaChains:{cd:O(2.34,.93),cast(e,t,d){let{player:n}=e,r=P(e,1+Math.floor(t/3),420);for(let s of r){for(let o of Mf(e,n,s,18))M(e,o,d);T(e,`chainlightning`,s.x,s.y);mc(e,s.x,s.y,40,d*.2,2,`poisonjavcloud`)}return r.length>0}},
sigilLethargy:{cd:O(5.2,.93),cast(e,t,d){let[r]=P(e,1,400);if(!r)return!1;mc(e,r.x,r.y,90+t*6,d*.3,4,t<4?`grimwardsmall`:t<7?`grimwardmedium`:`grimwardlarge`);return!0}},
sigilRancor:{cd:O(6.5,.93),cast(e,t,d){let[r]=P(e,1,400);if(!r)return!1;mc(e,r.x,r.y,100+t*6,d*.4,4,t<4?`grimwardsmall`:t<7?`grimwardmedium`:`grimwardlarge`);return!0}},
sigilDeath:{cd:O(6.5,.93),cast(e,t,d){let[r]=P(e,1,400);if(!r)return!1;let{x:a,y:o}=r;mc(e,a,o,110+t*6,d*.6,3,t<4?`grimwardsmall`:t<7?`grimwardmedium`:`grimwardlarge`);E(e,1.5,()=>{T(e,`explodingarrowexp`,a,o);for(let s of N(e,a,o,130))M(e,s,d*2)});return!0}},
apocalypse:{cd:O(11.7,.93),cast(e,t,d){let{player:n}=e,r=N(e,n.x,n.y,420);if(!r.length)return!1;r.slice(0,20).forEach((s,i)=>E(e,i*.03,()=>{s.dead||(M(e,s,d),T(e,`poisonjavcloud`,s.x,s.y),T(e,`fireexplode`,s.x,s.y))}));return!0}},
abyss:{cd:O(9.1,.93),cast(e,t,d){let[r]=P(e,1,420);if(!r)return!1;let{x:a,y:o}=r;T(e,`meteorcenter`,a,o);E(e,.8,()=>T(e,`meteor`,a,o));E(e,1.2,()=>{T(e,`explodingarrowexp`,a,o);for(let s of N(e,a,o,170+t*6))M(e,s,d*2)});return!0}},
hexBane:{cd:O(1.82,.93),cast(e,t,d){let r=P(e,2+Math.floor(t/3),380);for(let s of r)M(e,s,d),T(e,`curse_hit`,s.x,s.y);return r.length>0}},
hexPurge:{cd:O(2.6,.93),cast(e,t,d){let r=P(e,2+Math.floor(t/4),380);for(let s of r)M(e,s,d),Math.random()<.35&&pc(e,s.x,s.y,80,d,8405200,`nova`);return r.length>0}},
hexSiphon:{cd:O(3.12,.93),cast(e,t,d){let r=P(e,3+Math.floor(t/3),380);for(let s of r)M(e,s,d*.8),T(e,`curse_hit`,s.x,s.y);return r.length>0}},
cleave:{cd:O(1.43,.93),cast(e,t,d){let{player:n}=e,[r]=P(e,1,360);if(!r)return!1;let a=Bf(n,r),q=N(e,n.x,n.y,220+t*4).filter(s=>Math.abs(((Math.atan2(s.y-n.y,s.x-n.x)-a+Math.PI*3)%(Math.PI*2))-Math.PI)<1.1);for(let i=-3;i<=3;i++)T(e,`bonespiritexplode`,n.x+Math.cos(a+i*.32)*110,n.y+Math.sin(a+i*.32)*110);for(let s of q)M(e,s,d),T(e,`curse_hit`,s.x,s.y);return q.length>0}},
echoingStrike:{cd:O(1.56,.93),cast(e,t,d){let{player:n}=e,r=__wkN(e,1+Math.floor((t-1)/3));for(let s of r){let a=Bf(n,s);lc(e,`echoingStrike`,n.x,n.y,a,330,{damage:d,life:1.2,radius:10,pierce:99,missile:`blessedhammer`});E(e,1.2,()=>T(e,`lightninghit`,n.x+Math.cos(a)*396,n.y+Math.sin(a)*396))}return r.length>0}},
bladeWarp:{cd:O(2.86,.93),cast(e,t,d){let{player:n}=e,[r]=P(e,1,450);if(!r)return!1;let a=Bf(n,r),D=Math.hypot(r.x-n.x,r.y-n.y),x=r.x,y=r.y;lc(e,`bladeWarp`,n.x,n.y,a,420,{damage:d,life:D/420,radius:10,pierce:99,missile:`blessedhammer`});E(e,D/420,()=>{T(e,`explodingarrowexp`,x,y);for(let s of N(e,x,y,80))M(e,s,d*.7)});return!0}},
psychicWard:{cd:O(7.8,.93),cast(e,t,d){let{player:n}=e;if(!P(e,1,300).length)return!1;pc(e,n.x,n.y,110,d,8421631,`nova`);return!0}},
eldritchBlast:{cd:O(3.38,.93),cast(e,t,d){let{player:n}=e;if(!P(e,1,400).length)return!1;pc(e,n.x,n.y,200+t*6,d,8405200,`warcryshockwave`);return!0}},
mirroredBlades:{cd:O(3.12,.93),cast(e,t,d){let{player:n}=e;if(!P(e,1,400).length)return!1;let k=6+Math.floor(t/2);for(let i=0;i<k;i++)lc(e,`mirroredBlades`,n.x,n.y,i/k*Math.PI*2,300,{damage:d,life:1.3,radius:10,pierce:99,missile:`blessedhammer`});return!0}},
// 악마 속박(D2R: 몬스터를 내 악마로 묶음): 일반·정예 하나를 쓰러뜨리고 그 몸을 강령술사 부활처럼 일으켜 잠시 아군으로
// 악마 트리: 악마 소환체는 다음 단계(D2R 악마 그림 꺼낸 뒤). 지금은 악마의 공격을 그림과 피해로
summonGoatman:{cd:O(2.6,.94),cast:(e,t)=>__wkPet(e,`warGoatman`,1+Math.floor(t/4),t,{life:D(70,30)(t),damage:D(22,12)(t)*__wkB(1),radius:13})},
summonTainted:{cd:O(3.38,.94),cast:(e,t,d)=>__wkPet(e,`warTainted`,1+Math.floor(t/5),t,{life:D(55,20)(t),damage:d,radius:16,element:`fire`})},
summonDefiler:{cd:O(3.9,.94),cast:(e,t)=>__wkPet(e,`warDefiler`,1,t,{life:D(130,50)(t),damage:D(30,15)(t)*__wkB(1),radius:14,element:`poison`})},
deathMark:{cd:O(2.6,.93),cast(e,t,d){let[r]=P(e,1,300);if(!r)return!1;M(e,r,d*(1+.6*__wkPets(e).length));T(e,`curse_hit`,r.x,r.y);return!0}},
bloodBoil:{cd:O(3.64,.93),cast(e,t,d){let r=P(e,2+Math.floor(t/3),400);for(let s of r){T(e,`explodingarrowexp`,s.x,s.y);for(let o of N(e,s.x,s.y,70+t*3))M(e,o,d*.6)}return r.length>0}},
engorge:{cd:O(3.9,.93),cast(e,t,d){let q=__wkPets(e);if(!q.length)return!1;for(let p of q)p.life=Math.min(p.maxLife,p.life+p.maxLife*(.25+t*.03)),p.damage*=1.04,T(e,`lightningjavelin`,p.x,p.y);return!0}},
consume:{cd:O(7.8,.93),cast(e,t,d){let q=__wkPets(e).sort((a,b)=>a.life/a.maxLife-b.life/b.maxLife),p=q[0],{player:n}=e;if(!p||!P(e,1,450).length)return!1;Pv(p);pc(e,p.x,p.y,180,d*1.6,13369344,`nova`);T(e,`explodingarrowexp`,p.x,p.y);typeof n.life==`number`&&typeof n.maxLife==`number`&&(n.life=Math.min(n.maxLife,n.life+n.maxLife*.2));return!0}},
bindDemon:{cd:O(6.5,.93),cast(e,t,d){if(Av(e,`warBound`).length>=1+Math.floor((t-1)/4))return!1;let r=P(e,8,450).find(s=>(s.rank===`normal`||s.rank===`champion`)&&s.type?.speed>0);if(!r)return!1;let{x,y}=r;M(e,r,r.life*10+d);E(e,.05,()=>{let o=FA(e,{x,y},40);o?LA(e,o):o=r;let s=o.type,c=s.melee[0]?.damage??s.ranged[0]?.damage??10;jv(e,{group:`warBound`,struck:cA,ownLife:!0,anims:o.anims,velocity:s.velocity,life:(o.maxLife*3+60)*(1+t*.1),damage:c*Math.max(1,o.might)*(1+t*.15)*__wkB(1),speed:Math.max(s.speed,130),radius:s.radius,attackRate:1,reach:8,lifetime:20+t*2,tint:hke,sound:s.sound?`mon.${s.sound}`:s.art},o.x,o.y);T(e,`curse_hit`,o.x,o.y)});return!0}}},
// 진화(다른 직업처럼 8레벨 + 같은 트리 지속 기술이면 상자에서 다음 기술로): D2R 선행 스킬(reqskill1) 줄을 따름. 선행이 지속 기술인 것은 그 위 기술에서(심연 ← 독기 사슬), 겹치는 것(죽음의 징표·소모)은 시작 기술로
__WKEV={summonGoatman:`summonTainted`,summonTainted:`summonDefiler`,deathMark:`bloodBoil`,bloodBoil:`engorge`,engorge:`bindDemon`,echoingStrike:`bladeWarp`,bladeWarp:`mirroredBlades`,cleave:`psychicWard`,psychicWard:`eldritchBlast`,hexBane:`hexPurge`,hexPurge:`hexSiphon`,miasmaBolt:`miasmaChains`,miasmaChains:`abyss`,ringOfFire:`flameWave`,flameWave:`apocalypse`,sigilLethargy:`sigilRancor`,sigilRancor:`sigilDeath`},
__WKED=new Set(Object.values(__WKEV)),__WKEL=10,__WKEP={1:`demonicMastery`,2:`levitate`,3:`enhancedEntropy`},
// 시너지: D2R EDmgSymPerCalc/DmgSymPerCalc 의 skill('이름'.blvl) × par8/par9/pa10(그 기술 Param 값, 지속 기술은 빼고)
__wkSy=s=>{let f=s.EDmgSymPerCalc||s.DmgSymPerCalc;if(!f)return[];let m=f.match(/\*\s*\(?(?:skill\('[^']+'\.)?(par|pa)(\d+)/),v=m?+(s[`Param`+m[2]]??0):0;return[...f.matchAll(/skill\('([^']+)'\.blvl\)/g)].map(x=>__WKS.find(q=>q.skill===x[1])).filter(q=>q&&!q.passive).map(q=>({from:__wkId(q.skill),perLevel:v||8}))},
__WKSK={},__WKPA={},
// 소환: 강령술사 해골과 같은 소환 함수(hA). 대상은 자기 둘레 250 안 가장 가까운 적(원작 기본은 넓고 액트 보스 먼저라 멀리 뛰어감). 그림은 D2R 이 쓰는 같은 몬스터 그림(GM 달 부족·BH 빅헤드·45 부패한 파멸자)
__wkPets=e=>Av(e).filter(p=>/^war(Goatman|Tainted|Defiler|Bound)$/.test(p.def.group)),
__wkPet=(e,u,n,t,o)=>hA(e,u,n,n,()=>({def:{group:u,struck:(e,t,n,r,i,a)=>cA(e,t,n,r,i,a)*3,mod:null,anims:e.art.summons[u]??null,life:o.life,damage:o.damage,speed:170,radius:o.radius,attackRate:.8,reach:10,sound:`skeleton`,pick:(e,t)=>{let b=null,q=250*250;for(let a of N(e,t.x,t.y,250)){let d=(a.x-t.x)**2+(a.y-t.y)**2;d<q&&(b=a,q=d)}return b},...o.element&&{strike:(e,t,n)=>j(e,o.element,()=>M(e,n,t.damage))}},stats:{life:o.life,damage:o.damage}}));
for(let s of __WKS){let id=__wkId(s.skill),c=__WKC[id];if(s.passive){__WKPA[id]={name:s.ko,tree:s.page,maxLevel:5,describe:`${s.koDesc} (이 트리 기술 피해 +6%)`,at:e=>`${s.koDesc} (이 트리 기술 피해 +${e*6}%)`,apply:(e,t)=>{__WKP[id]=t}};continue}
if(!c)continue;let ev=__WKEV[id],ed=__WKED.has(id),L=t=>ed?__WKEL+(t-1)*2.5:t<=8?t:8+(t-8)*2.5,sy=__wkSy(s);__WKSK[id]={name:s.ko,...s.castoverlay&&{castOverlay:s.castoverlay},element:__wkE(s),tree:s.page,maxLevel:ed?1:8,synergies:sy,...ed&&{evolved:!0},...ev&&{evolution:{passive:__WKEP[s.page],into:ev,...s.summon&&{keeps:!0}}},cooldown:t=>c.cd(L(t)),
describe:(e,t=e)=>`${s.koDesc} 피해 ${Math.round(__wkD(s,L(e))*__wkB(s.page))}.`,
damage:(e,t)=>({min:__wkDmg(e,s,L(t)),per:`한 번`}),
cast(e,t){return c.cast(e,L(t),__wkDmg(e,s,L(t)))}}}
var __WK=Df({id:`warlock`,name:`악마술사`,token:`WK`,weaponClass:`1HS`,modes:{idle:`NU`,run:`RN`,cast:`SC`,death:`DT`},castTime:.6,missiles:[],units:[`warGoatman`,`warTainted`,`warDefiler`],soundRules:{},skills:__WKSK,passives:__WKPA,update(e,t){xy(e,t),Iv(e,t)}});
globalThis.__WKdef=__WK;
