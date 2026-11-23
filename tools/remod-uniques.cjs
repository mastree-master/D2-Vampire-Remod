// Remod 오리지널 유니크·세트·룬워드 데이터를 생성·검증해 remod-items.json으로 쓰는 스크립트
const fs = require('fs'), path = require('path');
const IS = require('../save/d2/itemstats.json');
// reimagined.json은 저장소에서 삭제됨: 이름 충돌 검사용으로 git 이력(cbf3ed9~1)에서 읽음
const RE = JSON.parse(require('child_process').execSync('git show cbf3ed9~1:tools/reimagined.json', { cwd: __dirname, maxBuffer: 1 << 28 }).toString());

// 약어 -> vanilla 시그니처 (func 값은 vanilla props와 동일)
const S = (...a) => a.map(x => { const [stat, func] = x.split(':'); return { stat, func: +func }; });
const A = {
  ac: S('armorclass:1'), acp: S('item_armor_percent:2'), str: S('strength:1'), dex: S('dexterity:1'),
  vit: S('vitality:1'), ene: S('energy:1'), hp: S('maxhp:1'), mana: S('maxmana:1'),
  fres: S('fireresist:1'), cres: S('coldresist:1'), lres: S('lightresist:1'), pres: S('poisonresist:1'),
  allres: S('fireresist:1', 'lightresist:3', 'coldresist:3', 'poisonresist:3'),
  allstat: S('strength:1', 'energy:3', 'dexterity:3', 'vitality:3'),
  ed: S('item_maxdamage_percent:1', 'item_mindamage_percent:3'),
  fdmg: S('firemindam:15', 'firemaxdam:16'), ldmg: S('lightmindam:15', 'lightmaxdam:16'),
  cdmg: S('coldmindam:15', 'coldmaxdam:16', 'coldlength:17'), pdmg: S('poisonmindam:15', 'poisonmaxdam:16', 'poisonlength:17'),
  ll: S('lifedrainmindam:1'), ml: S('manadrainmindam:1'), ias: S('item_fasterattackrate:8'),
  fcr: S('item_fastercastrate:8'), fhr: S('item_fastergethitrate:8'), fbr: S('item_fasterblockrate:8'),
  frw: S('item_fastermovevelocity:8'), dr: S('normal_damage_reduction:1'), mf: S('item_magicbonus:1'),
  gold: S('item_goldbonus:1'), lrad: S('item_lightradius:1'), allsk: S('item_allskills:1'),
  toblock: S('toblock:1'), thorns: S('item_attackertakesdamage:1'), cb: S('item_crushingblow:1'),
  ds: S('item_deadlystrike:1'), ow: S('item_openwounds:1'), ar: S('tohit:1'), mreg: S('manarecoverybonus:1'),
  knock: S('item_knockback:1'), undead: S('item_undeaddamage_percent:1'), demon: S('item_demondamage_percent:1'),
  pierce: S('item_pierce:1'), maxdam: S('maxdamage:1'), maxfres: S('maxfireresist:1'),
  firem: S('passive_fire_mastery:1'), coldm: S('passive_cold_mastery:1'), ltngm: S('passive_ltng_mastery:1'),
  hpreg: S('hpregen:1'), mk: S('item_manaafterkill:1'), lifep: S('item_maxhp_percent:1'), cbf: S('item_cannotbefrozen:1'),
};
// cls<n>: 직업 스킬 (val 0아마 1소서 2네크 3팔라 4바바 5드루 6어쌔)
for (let c = 0; c < 7; c++) A['cls' + c] = [{ stat: 'item_addclassskills', func: 21, val: c }];
const LEN = { cdmg: 75, pdmg: 100 }; // 냉기 지속 / 독 지속(프레임)

function props(src) {
  return src.split(';').map(t => {
    const [k, a, b] = t.trim().split(/\s+/);
    if (!A[k]) throw new Error('unknown alias ' + k + ' in ' + src);
    const p = { stats: A[k].map(s => ({ ...s })), min: +a, max: +(b ?? a) };
    if (LEN[k]) p.par = LEN[k];
    return p;
  });
}

// [영문명, 한글명, 베이스, 요구레벨, 옵션]
const U = `
Emberglass Hood|엠버글라스 두건|Cap|6|ac 10 15;fres 15 20;mana 15 20;lrad 1
Gravel-Tooth Visor|자갈이빨 면갑|Skull Cap|10|acp 40 60;str 5 8;hp 15 20;dr 2 3
Oathbound Helm|맹세의 투구|Great Helm|20|acp 60 80;vit 8 10;allres 10 15;fhr 10
Tithe Crown|십일조 왕관|Crown|26|acp 80 100;mf 20 30;gold 50 80;allres 10;lrad 2
Dewveil Circlet|이슬장막 서클릿|Circlet|18|fcr 10;mana 20 30;ene 10;lres 20 25;mreg 10
Ashen Seer Mask|잿빛 예언자 가면|Death Mask|38|acp 100 130;allsk 1;fcr 10;fres 20 30;mana 30 40
Gloomcrest|어둠볏 투구|Casque|42|acp 100 140;str 10 15;ll 4 6;dex 8 10;ac 30 50
Sunken King's Circlet|가라앉은 왕의 관|Grand Crown|50|acp 120 150;cres 30 40;mana 40 50;mreg 15;mf 25 35
Brightmoor Coronet|브라이트무어 보관|Coronet|40|allsk 1;mana 30 40;hp 30 40;allres 10 15;lrad 2
Starwoven Diadem|별짜임 왕관|Diadem|68|allsk 2;fcr 20;mana 50 60;allres 15 20;mreg 20
Ironvow Armet|강철서약 투구|Armet|72|acp 140 180;str 15 20;vit 15 20;dr 8 10;fhr 20
Thornspire Helm|가시첨탑 투구|Spired Helm|78|acp 150 180;ll 5 8;thorns 30 50;cb 15 20;str 20
Veilwatch Corona|장막감시 보관|Corona|66|acp 120 150;allsk 1;mf 30 40;allres 20 25;lrad 3
Hollowheart Demonhead|공허심장 악마투구|Demonhead|84|acp 160 200;ll 6 8;ml 4 6;str 20 25;fhr 20
Moonhowl Pelt|달울음 가죽|Wolf Head|14|cls5 1;acp 60 80;hp 20 30;ias 10
Thornwood Mask|가시나무 가면|Totemic Mask|46|cls5 1 2;acp 100 130;hp 30 40;fhr 20
Rootmother Spirit|뿌리어머니의 영혼|Sky Spirit|70|cls5 2;acp 140 170;vit 15 20;allres 20 25;fcr 20
Skullbreaker Jaw|두개골분쇄 턱투구|Jawbone Cap|12|cls4 1;acp 60 80;str 8 10;maxdam 3 5;hp 20
Clangor Helm|쨍그랑 투구|Avenger Guard|44|cls4 1 2;acp 100 130;str 10 12;ll 3 4;fhr 10
Warcry Visor|함성 면갑|Fury Visor|74|cls4 2;acp 150 180;str 15 20;ll 5 7;fhr 20
Grinning Ancestor|웃는 조상|Preserved Head|10|cls2 1;acp 50 70;mana 20 30;pres 20 25;toblock 10 15
Whisperskull|속삭이는 해골|Minion Skull|44|cls2 1 2;acp 100 120;fcr 10;mana 30 40;toblock 15
Ossuary Crown|납골당 왕관|Hellspawn Skull|70|cls2 2;acp 120 150;fcr 20;pres 30 40;mana 50 60;toblock 20
Dawnwarden Targe|새벽수호 방패|Targe|14|cls3 1;acp 60 80;toblock 15 20;allres 15;fbr 20
Sunvigil Rondache|태양불침 론다슈|Akaran Rondache|44|cls3 1 2;acp 100 130;allres 25 30;toblock 15 20;fhr 10
Halo of Ninefold|아홉겹 광륜|Sacred Targe|72|cls3 2;acp 150 180;allres 35 45;toblock 20 25;fcr 20
Kindling Orb|불씨 구슬|Eagle Orb|12|cls1 1;fcr 10 15;fdmg 5 12;mana 20 30;mreg 10
Stormvial Orb|폭풍병 구슬|Glowing Orb|45|cls1 1 2;fcr 20;ldmg 1 40;lres 30 40;mana 40 50
Nightglass Shard|밤유리 파편|Dimensional Shard|80|cls1 2;fcr 20;mana 60 80;allres 15 20;mreg 20 25;ene 15 20
Gutterfang|시궁송곳니|Katar|12|cls6 1;ed 80 100;ias 20;ll 4 5;dex 5 8
Silken Talons|비단 발톱|Quhab|45|cls6 1 2;ed 140 170;ias 20;ow 15 20;dex 10 15
Widow's Thread|과부의 실|Suwayyah|76|cls6 2;ed 170 210;ias 30;ds 20 25;ll 5 8;fhr 10
Spearmaiden's Vow|창처녀의 서약|Maiden Javelin|16|cls0 1;ed 90 120;ias 20;ldmg 1 20;dex 8 10
Moonarrow|달화살|Ceremonial Bow|44|cls0 1 2;ed 130 160;ias 20;dex 10;ar 80 120
Skyreach Bow|하늘닿는 활|Matriarchal Bow|72|cls0 2;ed 160 200;ias 20;dex 15 20;ll 4 6
Bramblebark Buckler|가시나무껍질 버클러|Buckler|5|ac 10 15;thorns 5 8;toblock 10;pres 15 20
Rivetwall|리벳 장벽|Large Shield|16|acp 60 80;dr 2 3;toblock 15;vit 5 8
Saltmarch Kite|소금행진 연방패|Kite Shield|22|acp 70 90;cres 25 30;lres 25 30;fbr 20
Grimward Scutum|음울수호 스쿠툼|Scutum|40|acp 100 130;fres 30 40;toblock 20;str 10;ac 20 40
Lanternbearer|등불지기|Dragon Shield|52|acp 110 140;allres 20 25;lrad 2;fbr 30;hp 30 40
Starfall Monarch|유성 군주방패|Monarch|60|acp 120 160;fbr 30;allres 20 25;str 15;vit 15
Tidebreaker Aegis|파도깨기 아이기스|Aegis|72|acp 140 180;toblock 25;cres 40 50;dr 8 10;fhr 20
Quiet Bastion|고요한 보루|Ward|80|acp 160 200;allres 30 35;toblock 20;dr 10 12;hp 40 60
Ragpicker's Quilt|넝마주이 누비갑옷|Quilted Armor|5|acp 40 60;hp 15 20;pres 15;gold 30 40
Tannery Coat|무두장이 코트|Leather Armor|9|acp 50 70;dex 5 8;fhr 10;ac 10 20
Smoldering Mail|그을린 사슬갑옷|Chain Mail|18|acp 60 90;fres 25 35;thorns 6 10;str 6 8
Brinescale|소금비늘 갑옷|Scale Mail|22|acp 70 90;cres 30;hp 25 30;fhr 20
Ironhide Plate|무쇠가죽 판금|Plate Mail|28|acp 90 110;dr 4 5;str 10 12;vit 8 10;ac 30 50
Rattling Husk|덜거덕 껍데기|Scarab Husk|38|acp 100 120;dex 10 12;fhr 20;pres 30 40
Duskweave Robe|황혼실 로브|Mage Plate|40|acp 100 130;fcr 20;mana 40 50;allres 15 20;ene 10 15
Gutterking's Cuirass|시궁왕의 흉갑|Cuirass|45|acp 110 140;ll 4 6;str 15;fhr 20;ac 50 80
Hollowbone Hauberk|빈뼈 사슬갑옷|Great Hauberk|50|acp 120 150;vit 15 20;dr 6 8;allres 15
Embered Templar|잉걸불 기사외투|Templar Coat|56|acp 120 150;fres 40 50;maxfres 5;fdmg 10 30;str 15
Wyrmskin Mantle|용가죽 망토|Wyrmhide|66|acp 140 170;fres 30 40;str 15 20;dex 15 20;fhr 20
Shadeskin|그늘가죽|Dusk Shroud|70|acp 150 180;fcr 20;allres 20 25;mana 50 60;fhr 20
Deepcurrent Shell|심해조류 껍데기|Kraken Shell|76|acp 150 190;cres 40 50;hp 60 80;fhr 30;ll 4 6
Glassmind Raiment|유리정신 예복|Archon Plate|80|acp 150 180;fcr 25;allsk 1;mana 60 80;mreg 20
Vowkeeper Plate|서약수호 판금|Sacred Armor|84|acp 160 200;allsk 1;dr 12 15;allres 20 25;vit 20 25
Pickpocket's Mitts|소매치기 장갑|Leather Gloves|5|acp 30 40;gold 50 80;mf 10 15;dex 3 5
Furnace Grips|용광로 손아귀|Heavy Gloves|12|acp 40 60;fres 15 20;fdmg 3 6;ias 10
Linkwarden|사슬수호 장갑|Chain Gloves|20|acp 50 70;ias 10;str 5 8;ll 3
Quickhand Bracers|날랜손 팔찌|Heavy Bracers|38|acp 70 90;ias 20;dex 10;ow 10
Graverobber's Clutch|도굴꾼의 손아귀|Vampirebone Gloves|42|acp 80 100;ll 4 6;str 10 12;mf 15 20
Emberweave Mitts|잉걸실 장갑|Bramble Mitts|60|acp 90 110;fdmg 15 30;fres 30;mana 30 40
Sorrowmend Gauntlets|슬픔수선 건틀릿|Vambraces|66|acp 100 130;ias 20;cb 10 15;str 15;ll 4 5
Oathmaster Gauntlets|서약주 건틀릿|Ogre Gauntlets|76|acp 110 140;str 15 20;ias 20;cb 10;ll 5 6
Ropeknot Sash|밧줄매듭 띠|Sash|5|acp 30 40;hp 10 15;pres 15;gold 30
Smithing Girdle|대장간 허리띠|Heavy Belt|15|acp 50 60;str 5 8;dr 2;fhr 10
Hollowcord|공허끈|Demonhide Sash|36|acp 80 100;mana 30 40;lres 25 30;hp 20 30
Bonebinder Belt|뼈묶음 허리띠|Mesh Belt|48|acp 90 110;vit 10 12;dr 5 6;cres 25 30
Wanderer's Cord|방랑자의 끈|Spiderweb Sash|68|acp 100 120;fcr 10;mana 40 50;allres 15 20;frw 10
Titancoil|거인고리|Colossus Girdle|80|acp 120 150;str 20 25;vit 15 20;fhr 20;dr 8 10
Puddlejumpers|웅덩이뛰기 장화|Boots|5|acp 30 40;frw 20;dex 3 5;pres 10 15
Cobblestomp|조약돌구르기 장화|Heavy Boots|12|acp 40 60;frw 20;str 5 6;hp 10 15
Frostrunner Greaves|서리질주 경갑|Chain Boots|20|acp 50 70;frw 20;cres 25 30;cdmg 2 6
Mireskippers|늪건너기 장화|Demonhide Boots|36|acp 70 90;frw 30;pres 30 40;fhr 10;dex 8 10
Ashwalkers|재걷기 장화|Sharkskin Boots|42|acp 80 100;frw 30;fres 30 40;fdmg 5 15;str 8 10
Driftwind Treads|떠도는바람 신발|Wyrmhide Boots|66|acp 100 120;frw 30;dex 15;mf 20 30;fhr 10
Ironmarch Greaves|강철행군 경갑|Myrmidon Greaves|72|acp 110 140;frw 30;str 15;dr 6 8;vit 10
Stormstride|폭풍걸음|Mirrored Boots|80|acp 120 150;frw 40;lres 40 50;ldmg 1 50;fhr 20
Copper Promise|구리 약속|Ring|8|mana 10 15;hp 10 15;allres 5;lrad 1
Ember Signet|잉걸 인장|Ring|20|fres 20 25;fdmg 3 9;ene 5 8;mana 20
Leechglass Band|흡혈유리 반지|Ring|36|ll 4 6;ar 50 100;str 5 8;dex 5 8
Wellspring Loop|샘물 고리|Ring|48|mreg 15 20;mana 30 40;fcr 10;ene 10 12
Hunter's Knot|사냥꾼의 매듭|Ring|60|ar 100 150;dex 12 15;ll 3 5;hp 20 30;mk 3 4
Gilded Whisper|금빛 속삭임|Ring|66|mf 20 30;gold 50 80;allres 10 15;dex 10
Seal of Nine Winters|아홉겨울 인장|Ring|74|cres 30 40;cdmg 5 20;fcr 10;mana 30 40;ene 10 15
Pebble Charmstring|조약돌 목걸이|Amulet|8|allres 8 10;hp 15 20;lrad 1;ene 5
Kindlewreath|불쏘시개 화환|Amulet|30|fres 30;fdmg 5 15;fcr 10;mana 20 30
Graveroot Pendant|무덤뿌리 펜던트|Amulet|44|ll 4 6;str 10 12;vit 10 12;pres 30
Lantern of Saints|성인의 등불|Amulet|58|allsk 1;allres 15 20;lrad 3;hp 30 40
Wolfmother Fang|늑대어미 송곳니|Amulet|68|str 15 20;dex 15 20;ll 4 6;ar 100 150
Riftheart Locket|균열심장 로켓|Amulet|76|allsk 2;fcr 10;mana 40 60;ene 10 15;dr 5
Alleyblade|골목칼|Short Sword|6|ed 60 80;ias 10;dex 3 5;ar 20 40;ll 2 3
Drakefeather Blade|용깃털 검|Long Sword|20|ed 80 110;fdmg 5 15;fres 20;str 5 8
Mountain's Hush|산의 침묵|Claymore|26|ed 100 130;cb 10 15;str 10;ar 50 80
Inkblade|먹물검|Rune Sword|42|ed 140 170;ias 20;mana 30;ldmg 1 40;ar 80 120
Headsman's Mercy|망나니의 자비|Executioner Sword|54|ed 160 190;ds 20 25;ow 20 25;str 15
Moonshear|달가름|Phase Blade|74|ed 180 220;ias 30;cdmg 20 50;dex 15;ll 4 6
Worldsplitter|세계가르개|Colossus Blade|82|ed 200 240;cb 20 25;str 20 25;ll 5 7;ias 20
Woodcutter's Grudge|나무꾼의 원한|Hand Axe|5|ed 60 80;ar 20 30;str 3 5;ow 10
Bloodtithe|피의 십일조|Large Axe|14|ed 90 120;ll 4 6;str 5 8;ar 30 50
Ravensplit|까마귀쪼개기|Great Axe|24|ed 100 130;ds 15 20;ias 10;hp 20
Marrowdrinker|골수마시개|Gothic Axe|46|ed 150 180;ll 6 8;ml 3 4;cb 10;str 12 15
Serpent's Due|뱀의 몫|Naga|50|ed 150 180;pdmg 30 60;pres 30;ias 20
Tollkeeper|통행세꾼|Decapitator|76|ed 190 230;ds 25 30;ll 5 7;ias 20;str 15
Hearthbreaker|화로부수개|Glorious Axe|84|ed 200 240;fdmg 50 120;fres 30;cb 15 20;ll 5 6
Tavern Settler|주점 해결사|Club|5|ed 60 80;maxdam 3 5;str 3 5;knock 1
Bellringer|종치기|Morning Star|16|ed 90 110;undead 100 150;ar 40 60;lrad 2
Anvilsong|모루노래|War Hammer|26|ed 100 140;cb 15 20;str 10;fhr 10
Penitent's Lash|참회자의 채찍|Knout|44|ed 140 170;demon 100 150;ll 4 5;ias 20
Quarrybreaker|채석장부수개|Martel de Fer|56|ed 160 200;cb 20;str 15 20;knock 1;hp 30 40
Thornlash|가시채찍|Scourge|72|ed 180 220;ow 25 30;ll 5 6;ias 20;dex 10 15
Skyfall Hammer|하늘추락 망치|Thunder Maul|84|ed 200 240;ldmg 1 150;cb 20;str 20 25;lres 30
Cloisterbell|수도원 종|Scepter|10|cls3 1;ed 60 80;undead 100;mana 15 20
Mercyrod|자비의 홀|Divine Scepter|50|cls3 1 2;ed 140 170;allres 15;fcr 10;hp 30
Hymnal Rod|찬송의 홀|Caduceus|78|cls3 2;ed 180 210;fcr 20;allres 20;undead 150 200
Ditchwhisper|도랑속삭임|Wand|8|cls2 1;fcr 10;mana 15 20;pres 10 15
Cryptlamp|묘실 등불|Tomb Wand|44|cls2 1 2;fcr 20;mana 40 50;mreg 15;pres 30
Bonechoir|뼈합창|Lich Wand|76|cls2 2;fcr 20;mana 50 70;allres 15 20;ene 15
Hedgewitch Staff|울타리마녀 지팡이|Short Staff|8|cls1 1;fcr 10;mana 20 30;fres 15
Tempest Rod|폭풍장대|Rune Staff|46|cls1 1 2;fcr 20;ldmg 1 60;lres 30;mana 50 60
Ninefold Ember|아홉겹 잉걸|Archon Staff|80|allsk 2;fcr 30;fdmg 30 80;firem 10 15;mana 60 80
Sparrowstring|참새시위|Short Bow|6|ed 60 80;ias 10;dex 3 5;ar 30 40
Marshlight|늪불빛 활|Long Bow|18|ed 80 110;fdmg 5 15;ias 10;dex 5 8
Grimfletch|음울깃 활|Rune Bow|44|ed 140 170;ias 20;pierce 25;ll 3 5;dex 10 12
Thousand Eyes|천 개의 눈|Hydra Bow|80|ed 180 220;ias 20;dex 20;ar 200 300;ll 4 6
Boltwright|볼트장인|Light Crossbow|12|ed 80 100;ar 40 60;pierce 20;dex 5
Siegebreaker|공성파괴자|Ballista|52|ed 150 180;cb 15 20;ar 100 150;str 10 15
Wraithquarrel|망령화살|Demon Crossbow|82|ed 190 230;ias 20;ds 20 25;ll 5 7;pdmg 50 100
Fishwife's Gaff|어부아내의 갈고리|Spear|8|ed 70 90;ar 30 40;cres 15 20;knock 1
Tidecaller Fork|조수부름 작살|War Fork|46|ed 140 170;cdmg 15 35;cres 30;ias 20
Spiritpiercer|영혼꿰뚫개|Ghost Spear|78|ed 190 230;ias 20;ds 20;ll 5 6;dex 15
Harvestwatch|수확지기|Voulge|14|ed 90 110;ow 10 15;str 5 8;ar 30 40
Gatewarden|성문지기|Partizan|48|ed 150 180;cb 15;ll 4 6;str 12 15
Reaping Silence|수확의 고요|Giant Thresher|82|ed 200 240;ds 25 30;ll 6 8;ias 20;fhr 20
Cutpurse|소매치기 단검|Dagger|5|ed 60 80;gold 40 60;dex 3 5;ias 10
Snakebite|뱀물기|Cinquedeas|40|ed 120 150;pdmg 40 80;ias 20;pres 25
Nightmother's Kiss|밤어미의 입맞춤|Fanged Knife|74|ed 170 210;pdmg 80 160;ias 30;ll 4 6;dex 10 15
Hawkhurl|매던지기|Javelin|10|ed 70 90;ldmg 1 15;ar 30 40;dex 3 5
Stormherald|폭풍전령|Hyperion Javelin|74|ed 170 210;ldmg 1 120;ias 20;lres 30
`.trim().split('\n').map(l => l.split('|').map(s => s.trim()));

// ---- 세트: [세트영문, 세트한글, 부분보너스(2,3,4,5피스), 풀보너스, [[아이템, 한글, 베이스, 요구레벨, 옵션, 피스보너스]...]]
const SETS = [
  ['Lanternwright\'s Toil', '등불장인의 노고', ['allres 10', 'mana 20', '', ''], 'mf 50;hp 40;lrad 3;fhr 20', [
    ['Lanternwright\'s Hood', '등불장인의 두건', 'Cap', 8, 'ac 15;lrad 2', 'mana 20'],
    ['Lanternwright\'s Apron', '등불장인의 앞치마', 'Leather Armor', 10, 'acp 50;fres 20', 'hp 20'],
    ['Lanternwright\'s Wick', '등불장인의 심지', 'Ring', 12, 'fdmg 3 6;mana 15', 'fres 15'],
  ]],
  ['Brinewatch Garrison', '소금감시 수비대', ['dr 3', 'cres 25', '', ''], 'allres 25;str 15;vit 15;fbr 30', [
    ['Brinewatch Helm', '소금감시 투구', 'Helm', 16, 'acp 60;cres 20', 'ac 30'],
    ['Brinewatch Hauberk', '소금감시 사슬갑옷', 'Chain Mail', 18, 'acp 70;vit 10', 'dr 3'],
    ['Brinewatch Wall', '소금감시 성벽', 'Large Shield', 18, 'toblock 15;ac 25', 'fbr 20'],
    ['Brinewatch Greaves', '소금감시 경갑', 'Chain Boots', 20, 'frw 20;cres 15', 'hp 25'],
  ]],
  ['Thornmother\'s Grove', '가시어머니의 숲', ['thorns 20', 'pres 30', '', ''], 'cls5 2;hp 60;ll 5;fhr 20', [
    ['Thornmother\'s Antlers', '가시어머니의 뿔', 'Antlers', 30, 'cls5 1;acp 80', 'pres 20'],
    ['Thornmother\'s Bark', '가시어머니의 껍질', 'Studded Leather', 30, 'acp 80;thorns 15', 'vit 10'],
    ['Thornmother\'s Vine', '가시어머니의 덩굴', 'Light Belt', 32, 'acp 50;hp 20', 'str 10'],
  ]],
  ['Gravechant Liturgy', '묘송의 전례', ['mana 30', 'fcr 10', 'allres 15', ''], 'cls2 2;mana 80;mreg 25;dr 8', [
    ['Gravechant Skull', '묘송의 해골', 'Zombie Head', 40, 'cls2 1;toblock 15', 'pres 25'],
    ['Gravechant Wand', '묘송의 지팡이', 'Grave Wand', 40, 'cls2 1;fcr 10', 'mana 30'],
    ['Gravechant Shroud', '묘송의 수의', 'Wire Fleece', 42, 'acp 100;mana 40', 'fhr 20'],
    ['Gravechant Coil', '묘송의 고리', 'Ring', 42, 'ene 10;mreg 10', 'mana 20'],
  ]],
  ['Emberforged Legion', '잉걸단조 군단', ['fres 30', 'str 10', 'ias 10', ''], 'fdmg 30 60;maxfres 5;ll 6;ed 50', [
    ['Emberforged Visor', '잉걸단조 면갑', 'Basinet', 45, 'acp 100;fres 20', 'str 10'],
    ['Emberforged Plate', '잉걸단조 판금', 'Embossed Plate', 48, 'acp 110;dr 5', 'hp 40'],
    ['Emberforged Cleaver', '잉걸단조 도끼', 'Twin Axe', 48, 'ed 150;fdmg 10 30', 'ias 20'],
    ['Emberforged Gauntlets', '잉걸단조 건틀릿', 'War Gauntlets', 46, 'acp 80;ias 10', 'fres 20'],
  ]],
  ['Stormcaller\'s Vigil', '폭풍소환사의 철야', ['lres 30', 'fcr 10', 'mana 50', ''], 'cls1 2;ldmg 1 80;ltngm 10;allres 20', [
    ['Stormcaller\'s Crown', '폭풍소환사의 관', 'Tiara', 62, 'allsk 1;lres 25', 'mana 30'],
    ['Stormcaller\'s Orb', '폭풍소환사의 구슬', 'Heavenly Stone', 64, 'cls1 1;fcr 15', 'lres 20'],
    ['Stormcaller\'s Robe', '폭풍소환사의 로브', 'Mage Plate', 62, 'acp 120;mana 40', 'fhr 20'],
    ['Stormcaller\'s Sash', '폭풍소환사의 띠', 'Vampirefang Belt', 64, 'acp 90;lres 20', 'mreg 15'],
  ]],
  ['Duskstalker\'s Pact', '황혼추적자의 서약', ['dex 15', 'ias 10', 'ds 15', ''], 'cls6 2;frw 30;ow 25;ll 5', [
    ['Duskstalker\'s Blades', '황혼추적자의 칼날', 'Runic Talons', 72, 'cls6 1;ed 170', 'ias 20'],
    ['Duskstalker\'s Cowl', '황혼추적자의 두건', 'Shako', 70, 'acp 120;dex 10', 'fhr 20'],
    ['Duskstalker\'s Wrap', '황혼추적자의 휘감기', 'Shadow Plate', 74, 'acp 140;fhr 20', 'allres 15'],
    ['Duskstalker\'s Steps', '황혼추적자의 발걸음', 'Scarabshell Boots', 72, 'frw 30;dex 10', 'pres 30'],
  ]],
  ['Oathsworn Bastion', '맹세한 보루', ['allres 15', 'dr 4', 'vit 20', 'toblock 15'], 'cls3 2;allres 25;hp 100;fbr 30;fhr 20', [
    ['Oathsworn Crown', '맹세한 왕관', 'Guardian Crown', 80, 'acp 150;vit 15', 'allres 10'],
    ['Oathsworn Aegis', '맹세한 성방패', 'Zakarum Shield', 82, 'cls3 1;toblock 20', 'fbr 20'],
    ['Oathsworn Mail', '맹세한 갑주', 'Lacquered Plate', 82, 'acp 160;dr 8', 'hp 50'],
    ['Oathsworn Grips', '맹세한 손아귀', 'Crusader Gauntlets', 80, 'acp 120;ias 20', 'str 15'],
    ['Oathsworn Cinch', '맹세한 허리띠', 'Mithril Coil', 80, 'acp 120;fhr 20', 'vit 15'],
  ]],
];

// ---- 룬워드: [영문, 한글, 룬열, 베이스 타입, 옵션]
const RW = [
  ['Lantern', '등불', 'Tal Ith', 'helm', 'lrad 3;mana 20;fres 20'],
  ['Hearthguard', '화로수호', 'Ort Nef Ral', 'tors', 'acp 60;fres 30;dr 3'],
  ['Sparrowsong', '참새노래', 'Eld Amn', 'miss', 'ed 60;ias 10;ll 4'],
  ['Saltwind', '소금바람', 'Thul Shael', 'shie', 'cres 35;fbr 30;toblock 15'],
  ['Gutterkin', '시궁혈족', 'Amn Tir Dol', 'weap', 'ed 120;ll 6;mk 2;ias 20'],
  ['Inkwell', '잉크병', 'Io Ith Ral', 'staf', 'allsk 1;fcr 20;mana 40'],
  ['Tidestone', '조수석', 'Thul Io Hel', 'tors', 'acp 100;cres 40;vit 10;fhr 20'],
  ['Ironvow', '강철서약', 'Lum Dol Sol', 'shie', 'acp 80;dr 8;allres 20;fbr 20'],
  ['Ashfall', '잿비', 'Fal Ral Um', 'mele', 'ed 180;fdmg 30 70;cb 20;fres 30'],
  ['Moonlace', '달레이스', 'Lem Io Ko', 'helm', 'allsk 1;mf 30;dex 10;fhr 20'],
  ['Hollowchoir', '빈합창', 'Mal Pul Ist', 'wand', 'cls2 2;fcr 30;mana 60;mreg 20'],
  ['Stormgrasp', '폭풍움켜쥠', 'Gul Lum Um', 'miss', 'ed 200;ias 20;ldmg 1 150;ar 300'],
  ['Thousand Oaths', '천 개의 맹세', 'Vex Sol Ohm', 'weap', 'ed 250;ll 8;cb 25;ias 30'],
  ['Wyrmheart', '용심장', 'Sur Fal Lem Io', 'tors', 'acp 150;hp 80;allres 25;str 20;fhr 30'],
  ['Night Unbound', '풀려난 밤', 'Cham Ist Ber Mal', 'mele', 'ed 280;ds 30;ow 30;ll 8;ias 40;allsk 1'],
];
// 충돌 검사용 vanilla 룬워드 룬열(itemstats에 룬열이 없어 대표 시퀀스를 내장)
const VANILLA_RW = ['Tal Eth', 'Ort Sol', 'Tir El', 'Nef Lum', 'Ral Tir Tal Sol', 'Amn Tir', 'Tir Ral', 'Shael Ko Nef', 'Tal Thul Ort Amn', 'Ral Ort Tal', 'Dol Eld Hel Ist Tir Vex', 'Thul Io Nef', 'Ort Eld', 'Tal Shael', 'Hel Ko Lem Gul', 'Nef Ko', 'Shael Io Ith', 'Ral Ohm Sur Eth', 'Ber Ith Ber', 'Dol Lo', 'Shael Um Tir', 'Shael Thul Amn', 'Ko Vex Pul Thul', 'Eth Tir Lo Mal Ral', 'Mal Ist Mal Ist', 'Sur Pul Ko Mal', 'Ist Ral Ort', 'Ko Lo Ber', 'Mal Gul Ral', 'Dol Shael Eld', 'Amn Shael Ko Lo', 'Eth Ral Sur', 'Lum Ith Eld', 'Fal Ohm Ort Jah', 'Jah Ith Ber', 'Sol Ist Ist Ith Vex', 'Sol Um Um', 'Hel El Sol', 'Mal Ral Sol Fal', 'Lem Ko Tir', 'Vex Ohm Ist Dol', 'Hel Lum Fal', 'Ohm Ith', 'Vex Hel El Eld Zod Eth', 'Fal Um Pul', 'Tir Ral Ith', 'Gul Vex Ohm', 'Lem Pul Um', 'Ith El Eth', 'Zod Vex Jah', 'Ohm Jah Sol', 'Mal Ohm Jah Sur', 'Ber Vex Cham', 'Ber Tir Um Mal Lum', 'Ort Sur', 'Dol Um Ber Ist', 'Amn El Ith Tir Sol', 'Dol Io', 'Ith Ber', 'Ort Ral', 'Gul Ith', 'Ral Tir Ith', 'Ko Vex Shael', 'Ist Ohm', 'Cham Shael Lo', 'Lo Lo', 'Pul Mal Um', 'Ber Ral Tir Zod', 'Ko Thul Ist'];

// ---- 확장분: 시드 고정 생성기 (기존 항목 뒤에만 추가해 세이브 호환 유지)
let seed = 20261119;
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// 클래스 전용 베이스
const CLS = {
  0: /^(Stag Bow|Reflex Bow|Ashwood Bow|Ceremonial Bow|Matriarchal Bow|Grand Matron Bow|Maiden |Ceremonial |Matriarchal )/,
  1: /Orb|Globe|Sphere|Crystal$|Shard|Jared's Stone|Sparkling Ball|Heavenly Stone|Demon Heart/,
  2: /Head$|Trophy|Skull$/,
  3: /Targe|Rondache|Heraldic|Aerin|Crown Shield|Gilded|Protector Shield|Royal Shield|Kurast Shield|Zakarum|Vortex Shield/,
  4: /Jawbone|Fanged Helm|Horned Helm|Assault Helmet|Avenger Guard|Lion Helm|Rage Mask|Savage Helmet|Slayer Guard|Carnage Helm|Fury Visor|Destroyer Helm|Conqueror Crown|Guardian Crown/,
  5: /Wolf Head|Hawk Helm|Antlers|Falcon Mask|Spirit|Alpha Helm|Griffon|Hunter's Guise|Sacred Feathers|Totemic|Sky Spirit/,
  6: /Katar|Hatchet Hands|^Claws|Talons|Wrist|Cestus|Quhab|Fascia|Hand Scythe|Greater Claws|Suwayyah|War Fist|Feral Claws/,
};
function cat(n, b) {
  if (n === 'Ring') return 'ring'; if (n === 'Amulet') return 'amulet';
  for (const c in CLS) if (CLS[c].test(n)) return 'cls' + c;
  if (b.block) return 'shield';
  if (b.defense) {
    if (/Gloves|Mitts|Bracers|Gauntlets|Vambraces/.test(n)) return 'gloves';
    if (/Sash|Belt|Girdle|Coil/.test(n)) return 'belt';
    if (/Boots|Greaves/.test(n)) return 'boots';
    if (/Cap|Helm|Crown|Circlet|Coronet|Diadem|Tiara|Armet|Corona|Demonhead|Mask|Casque|Shako|Hat|Sallet|Visage|Hydraskull|Basinet|Conch/.test(n)) return 'helm';
    return 'armor';
  }
  if (/Wand/.test(n)) return 'wand';
  if (/Staff|Stick|Stalagmite|Shillelagh/.test(n)) return 'staff';
  if (/Scepter|Rod$|Caduceus|Holy Water/.test(n)) return 'scepter';
  if (/Bow|Crossbow|Ballista|Arbalest|Chu-Ko-Nu|Javelin|Pilum|Throwing|Hurlbat|Flying|Winged|Balanced|Dart|Francisca|Tomahawk|Harpoon|Spiculum|Simbilan|Legend Spike|Glaive/.test(n)) return 'missile';
  return 'melee';
}
// 베이스 요구레벨 추정 (노멀 베이스는 level 필드가 없음)
const baseLv = (b) => b.level ? Math.min(80, b.level + 2 + Math.floor(rnd() * 8)) : Math.min(30, 3 + Math.floor((b.str || b.dex || 20) / 5) + Math.floor(rnd() * 6));

// 옵션 풀: [약어, t=0 값, t=1 값, 최소 t]  (t = 레벨/85)
const C = [['hp', 10, 60], ['mana', 10, 60], ['str', 3, 20], ['dex', 3, 20], ['vit', 3, 20], ['allres', 5, 25], ['fres', 10, 40], ['cres', 10, 40], ['lres', 10, 40], ['pres', 10, 40], ['mf', 10, 40], ['fhr', 10, 30]];
const POOL = {
  helm: [['acp', 40, 160], ['ac', 10, 80], ['ll', 2, 6], ['mk', 1, 5], ['allsk', 1, 1, 0.6], ['lrad', 1, 3], ['dr', 1, 7], ...C],
  armor: [['acp', 50, 180], ['ac', 20, 150], ['dr', 1, 10], ['thorns', 5, 30], ['lifep', 3, 8, 0.6], ['hpreg', 2, 10], ...C],
  shield: [['acp', 50, 170], ['toblock', 5, 25], ['fbr', 10, 30], ['dr', 1, 8], ['thorns', 5, 25], ...C],
  gloves: [['acp', 40, 120], ['ias', 10, 20], ['ll', 2, 5], ['ml', 2, 5], ['cb', 5, 15], ['ar', 30, 200], ['gold', 20, 80], ...C],
  belt: [['acp', 40, 120], ['gold', 20, 100], ['dr', 1, 8], ['hpreg', 2, 8], ['maxfres', 1, 5, 0.5], ...C],
  boots: [['acp', 40, 120], ['frw', 10, 40], ['cbf', 1, 1, 0.4], ['gold', 20, 80], ...C],
  ring: [['ll', 2, 7], ['ml', 2, 6], ['fcr', 10, 10], ['ar', 30, 250], ['mreg', 5, 15], ['ds', 5, 15], ['allsk', 1, 1, 0.85], ...C],
  amulet: [['allsk', 1, 2, 0.5], ['fcr', 10, 20], ['ll', 2, 6], ['ml', 2, 6], ['mreg', 5, 20], ['allstat', 2, 10], ['dr', 1, 6], ...C],
  melee: [['ed', 60, 260], ['ias', 10, 40], ['ll', 3, 8], ['ml', 2, 6], ['cb', 10, 30], ['ds', 10, 30], ['ow', 10, 30], ['ar', 40, 300], ['fdmg', 3, 50], ['ldmg', 1, 80], ['cdmg', 2, 40], ['undead', 50, 200], ['demon', 50, 200], ['maxdam', 5, 20], ['str', 3, 20], ['knock', 1, 1]],
  missile: [['ed', 60, 240], ['ias', 10, 30], ['pierce', 10, 40], ['ll', 3, 7], ['ar', 40, 300], ['dex', 3, 20], ['fdmg', 3, 50], ['ldmg', 1, 80], ['cdmg', 2, 40], ['pdmg', 10, 100], ['ds', 10, 25], ['knock', 1, 1]],
  wand: [['cls2', 1, 3], ['fcr', 10, 20], ['mana', 10, 60], ['ene', 3, 15], ['mreg', 5, 20], ['pres', 10, 30], ['fhr', 10, 20]],
  staff: [['allsk', 1, 2, 0.4], ['fcr', 10, 30], ['mana', 20, 80], ['ene', 5, 20], ['firem', 5, 15], ['coldm', 5, 15], ['ltngm', 5, 15], ['mreg', 5, 25], ['allres', 5, 25]],
  scepter: [['cls3', 1, 3], ['ed', 60, 220], ['ias', 10, 30], ['undead', 50, 200], ['fcr', 10, 20], ['ll', 2, 6], ['ar', 40, 250], ['allres', 5, 20]],
};
const clsPool = (c, base) => [['cls' + c, 1, 3], ...POOL[base]];
POOL.cls0 = clsPool(0, 'missile'); POOL.cls1 = [['cls1', 1, 3], ['firem', 5, 15], ['coldm', 5, 15], ['ltngm', 5, 15], ...POOL.wand.slice(1)];
POOL.cls2 = clsPool(2, 'shield'); POOL.cls3 = clsPool(3, 'shield'); POOL.cls4 = clsPool(4, 'helm'); POOL.cls5 = clsPool(5, 'helm'); POOL.cls6 = clsPool(6, 'melee');
const FIXED = new Set(['fhr', 'fcr', 'ias', 'fbr', 'frw', 'knock', 'cbf', 'allsk', 'lrad']); // 고정값 옵션
function roll(pool, lv, n) {
  const t = Math.min(1, lv / 85), out = [], used = new Set();
  // 직업 아이템은 직업 스킬을 항상 먼저, 같은 스탯이 겹치는 약어(allres+fres 등)는 건너뜀
  for (const [k, a, b, minT = 0] of /^cls/.test(pool[0][0]) ? [pool[0], ...shuffle(pool.slice(1))] : shuffle(pool)) {
    if (out.length >= n) break;
    if (A[k].some(s => used.has(s.stat))) continue;
    if (t < minT || (k === 'allsk' && out.some(s => /^cls/.test(s))) || (/^cls/.test(k) && out.some(s => /^allsk/.test(s)))) continue;
    A[k].forEach(s => used.add(s.stat));
    let v = Math.max(1, Math.round(a + (b - a) * t));
    if (/^cls/.test(k)) v = Math.min(3, Math.max(1, Math.round(1 + 2 * t)));
    if (k === 'fdmg' || k === 'cdmg') out.push(`${k} ${v} ${v * 3}`);
    else if (k === 'ldmg') out.push(`${k} 1 ${v * 2}`);
    else if (k === 'pdmg') out.push(`${k} ${v} ${v * 2}`);
    else if (FIXED.has(k) || v < 5) out.push(`${k} ${v}`);
    else out.push(`${k} ${Math.round(v * 0.8)} ${v}`);
  }
  return out.join(';');
}

// 이름 조각 [영, 한]
const ADJ = `Cinder 잿불|Gloam 어스름|Hollow 텅빈|Bramble 찔레|Ashen 잿빛|Rime 서리|Thorn 가시|Ember 잉걸|Dusk 황혼|Brine 소금물|Moss 이끼|Ivory 상아|Rust 녹슨|Pale 창백한|Drift 표류|Grim 음산한|Wraith 망령|Silt 개흙|Marrow 골수|Tallow 촛농|Cairn 돌무덤|Fen 늪지|Gale 돌풍|Hearth 화롯가|Iron 강철|Lantern 등불|Mire 수렁|Osprey 물수리|Quill 깃촉|Raven 까마귀|Sable 흑담비|Tern 제비갈매기|Umber 암갈색|Vesper 저녁별|Warden 파수꾼|Yew 주목|Copper 구리|Flint 부싯돌|Harrow 써레|Kestrel 황조롱이|Larch 낙엽송|Nettle 쐐기풀|Owl 올빼미|Pyre 화장단|Slate 점판암|Tide 밀물|Bog 수렁늪|Crag 바위산|Wolfsbane 투구꽃|Stormwake 폭풍자국|Duskmere 황혼호수|Coldhearth 식은화로|Saltmarrow 소금골수|Bleakwater 쓸쓸한물|Graveborn 무덤태생|Sunken 가라앉은|Gilded 금박|Barrow 고분|Forsaken 버림받은|Starless 별없는`.split('|').map(s => s.split(' '));
const NOUN = {
  helm: 'Brow 이마|Visor 면갑|Hood 두건|Cowl 고깔|Crest 볏|Gaze 시선', armor: 'Mantle 망토|Hauberk 사슬갑옷|Carapace 등딱지|Shroud 수의|Bulwark 방벽|Hide 가죽',
  shield: 'Bastion 보루|Ward 수호|Wall 성벽|Aegis 방패|Rampart 누벽', gloves: 'Grasp 손아귀|Knuckles 주먹|Grip 손잡이|Touch 손길', belt: 'Cinch 조임띠|Girth 허리끈|Binding 속박|Coil 고리띠',
  boots: 'Stride 발걸음|Tread 디딤|March 행군|Trail 자취', ring: 'Band 가락지|Loop 고리|Seal 인장|Signet 인장반지|Circle 둥근테|Coil 사리',
  amulet: 'Pendant 펜던트|Charm 부적|Locket 로켓|Talisman 호부|Medallion 메달', melee: 'Fang 송곳니|Edge 칼날|Reaver 약탈자|Bite 이빨|Wrath 격노|Toll 조종|Spite 악의|Maw 아가리',
  missile: 'Flight 비행|Sting 침|Volley 일제사격|Whisper 속삭임|Quarrel 화살촉', wand: 'Twig 잔가지|Rod 막대|Finger 손가락|Bone 뼈', staff: 'Stave 장대|Spire 첨탑|Root 뿌리|Branch 가지',
  scepter: 'Sceptre 홀|Verdict 판결|Rule 통치|Gavel 의사봉',
  cls0: 'Huntress 사냥꾼|Flight 비행|Spearsong 창노래', cls1: 'Eye 눈|Star 별|Prism 프리즘', cls2: 'Totem 토템|Reliquary 성유물함|Grin 웃음', cls3: 'Oath 맹세|Bulwark 방벽|Vow 서원',
  cls4: 'Warcry 함성|Horns 뿔|Fury 격분', cls5: 'Pelt 모피|Antler 뿔가지|Wildheart 야생심장', cls6: 'Claw 발톱|Talon 갈고리|Shiv 비수',
};
for (const k in NOUN) NOUN[k] = NOUN[k].split('|').map(s => s.split(' '));

// 원본 에셋 문자열 충돌 검사용
const assetDir = path.join(__dirname, 'original/desktop/dist/web/assets');
const ASSET = fs.readdirSync(assetDir).filter(f => f.endsWith('.js')).map(f => fs.readFileSync(path.join(assetDir, f), 'utf8')).join('\n');
const taken = new Set([...U.map(u => u[0]), ...SETS.flatMap(s => [s[0], ...s[4].map(i => i[0])]), ...RW.map(r => r[0]), ...banned0()]);
function banned0() { return [...Object.keys(IS.uniques), ...Object.keys(RE.uniques), ...Object.keys(IS.setItems), ...Object.keys(IS.sets), ...Object.keys(IS.runewords)]; }
const free = (n) => !taken.has(n) && !ASSET.includes(n);
function uname(c) {
  for (let i = 0; i < 500; i++) {
    const [ae, ak] = pick(ADJ), [ne, nk] = pick(NOUN[c]), en = `${ae} ${ne}`;
    if (free(en)) { taken.add(en); return [en, `${ak} ${nk}`]; }
  }
  throw new Error('name pool exhausted ' + c);
}

// 유니크: 미보유 베이스 전부 + 인기 베이스 추가분
const SKIP = /Charm|Jewel|Essence|Arrows|Bolts|Quiver/;
const have = new Set(U.map(u => u[2].replace('?', '').trim()));
const BN = Object.keys(IS.bases).filter(n => !SKIP.test(n));
const extra = [...Array(8).fill('Ring'), ...Array(7).fill('Amulet'), 'Sacred Armor', 'Archon Plate', 'Dusk Shroud', 'Shadow Plate', 'Monarch', 'Diadem', 'Corona', 'Phase Blade', 'Colossus Blade', 'Hydra Bow', 'Berserker Axe', 'Thunder Maul', 'Vortex Orb', 'Griffon Headdress', 'Bloodlord Skull', 'Sacred Rondache', 'Runic Talons', 'Matriarchal Javelin', 'Guardian Crown', 'Archon Staff'];
for (const bn of [...BN.filter(n => !have.has(n)), ...extra]) {
  const b = IS.bases[bn], c = cat(bn, b), lv = /^(Ring|Amulet)$/.test(bn) ? 5 + Math.floor(rnd() * 80) : baseLv(b);
  const [en, ko] = uname(c);
  U.push([en, ko, bn, String(lv), roll(POOL[c], lv, 4 + Math.floor(rnd() * 3))]);
}

// 세트
const SN = `Saltreed Wanderer 소금갈대 방랑자|Copperbell Watch 구리종 파수|Mossgrave Pilgrim 이끼무덤 순례자|Flintjaw Raiders 부싯돌턱 약탈단|Kestrel Outriders 황조롱이 척후대|Gloamwood Covenant 어스름숲 맹약|Ironhearth Vanguard 강철화로 선봉대|Rimebound Sentinel 서리묶인 보초|Pyreward Order 화장단 수호기사단|Starless Tribunal 별없는 재판정|Barrowking Regalia 고분왕의 예복|Huntmother Skyspear 사냥어미 하늘창|Prismwright Conclave 프리즘장인 비밀회의|Ossuary Keeper 납골당지기|Dawnvow Templar 새벽서원 성전기사|Ancestral Warhost 선조의 전투군단|Nightwillow Druid 밤버들 드루이드|Veilblade Sisterhood 장막칼날 자매단`.split('|').map(s => { const w = s.split(' '); return [w.slice(0, 2).join(' '), w.slice(2).join(' ')]; });
// [레벨, 피스수, 직업(-1 없음)]
const SPEC = [[5, 2, -1], [9, 3, -1], [14, 3, -1], [19, 4, -1], [24, 2, -1], [30, 4, -1], [36, 5, -1], [44, 3, -1], [52, 4, -1], [60, 6, -1], [70, 5, -1], [56, 4, 0], [66, 4, 1], [48, 4, 2], [76, 5, 3], [62, 4, 4], [72, 4, 5], [82, 5, 6]];
const SLOTS = ['helm', 'armor', 'shield', 'gloves', 'belt', 'boots', 'ring', 'amulet', 'melee'];
const CLSLOT = { 0: 'cls0', 1: 'cls1', 2: 'cls2', 3: 'cls3', 4: 'cls4', 5: 'cls5', 6: 'cls6' };
const PIECE = { helm: 'Crown 관', armor: 'Raiment 의복', shield: 'Guard 방패', gloves: 'Hands 손', belt: 'Sash 띠', boots: 'Boots 장화', ring: 'Ring 반지', amulet: 'Token 징표', melee: 'Blade 칼날', missile: 'Bow 활', cls0: 'Javelin 투창', cls1: 'Orb 구슬', cls2: 'Relic 유물', cls3: 'Shield 방패', cls4: 'Helm 투구', cls5: 'Pelt 모피', cls6: 'Claws 발톱' };
const byCat = {};
for (const n of BN) { const c = cat(n, IS.bases[n]); (byCat[c] = byCat[c] || []).push(n); }
const lvOf = (n) => IS.bases[n].level || Math.min(30, 3 + Math.floor((IS.bases[n].str || 20) / 5));
const near = (c, lv) => { const ok = byCat[c].filter(n => lvOf(n) <= lv); return ok.sort((a, b) => lvOf(b) - lvOf(a)).slice(0, 3); };
SPEC.forEach(([lv, np, cl], i) => {
  const [sen, sko] = SN[i]; if (!free(sen)) throw new Error('set name taken ' + sen); taken.add(sen);
  const slots = [...(cl >= 0 ? [CLSLOT[cl]] : []), ...shuffle(SLOTS.filter(s => s !== ({ 2: 'shield', 3: 'shield', 4: 'helm', 5: 'helm' })[cl]))].slice(0, np);
  const items = slots.map(c => {
    const [pe, pk] = PIECE[c].split(' '), bn = pick(near(c, lv).length ? near(c, lv) : byCat[c]);
    const pen = `${sen.split(' ')[0]}'s ${pe}`; if (!free(pen)) throw new Error('set item name taken ' + pen); taken.add(pen);
    return [pen, `${sko.split(' ')[0]}의 ${pk}`, bn, lv + Math.floor(rnd() * 4), roll(POOL[c], lv, 2 + Math.floor(rnd() * 2)), roll(C, lv, 1)];
  });
  const partial = [0, 1, 2, 3].map(k => (k < np - 1 ? roll(C, lv, 1) : ''));
  const full = (cl >= 0 ? `cls${cl} 2;` : '') + roll([...C, ['ll', 3, 7], ['fcr', 10, 20], ['ias', 10, 20], ['dr', 2, 10], ['frw', 10, 30]], lv, 3);
  SETS.push([sen, sko, partial, full, items]);
});

// 룬워드: vanilla 룬열은 원본 에셋에서 파싱
const runeOrder = Object.keys(IS.runes);
const st = fs.readdirSync(assetDir).find(f => /^saveTransfer-.*\.js$/.test(f));
const yk = fs.readFileSync(path.join(assetDir, st), 'utf8').match(/YK=\[(.*?)\]\s*[,;]\s*\w+=/s)[1];
const VRW_PARSED = [...yk.matchAll(/z\(`[^`]+`,\[([^\]]+)\]/g)].map(m => m[1].replace(/`/g, '').split(',').join(' '));
if (VRW_PARSED.length < 50) throw new Error('vanilla runeword parse failed: ' + VRW_PARSED.length);
const RWN = `Emberwake=잉걸깨움|Coldvigil=차가운철야|Driftmark=표류표식|Hearthstone=화로돌|Saltcrown=소금관|Grimlantern=음산한등불|Owlsight=올빼미눈|Ravenrook=까마귀둥지|Mossguard=이끼수호|Tallowlight=촛농빛|Cairnsong=돌무덤노래|Fenwatch=늪감시|Galecut=돌풍베기|Ironthread=강철실|Quillstorm=깃촉폭풍|Sablewing=흑담비날개|Ternflight=제비갈매기비행|Vesperbell=저녁종|Yewheart=주목심장|Copperoath=구리맹세|Harrowtine=써레살|Nettlesting=쐐기풀침|Pyrelight=화장불빛|Slatewall=점판벽|Tidecall=밀물부름|Cragborn=바위태생|Wolfsong=늑대노래|Bleakfrost=쓸쓸한서리|Gravelight=무덤빛|Sunderveil=갈라진장막|Starfall Requiem=별똥별 진혼곡|Marrowbind=골수결속|Barrowlord=고분군주|Oathwind=맹세바람|Thornmantle=가시망토|Lowtide=썰물|Silent Choir=침묵의 성가대|Stonepulse=돌맥박|Ashenvow=잿빛서원|Riverbend=강굽이|Kingsbane=왕의독|Mournlight=애도빛|Hollowcrown=빈왕관|Blackwater=검은물|Endless Hunt=끝없는 사냥`.split('|').map(s => s.split('='));
const RTY = ['helm', 'tors', 'shld', 'weap', 'mele', 'miss', 'staf', 'wand'];
const RPOOL = { helm: 'helm', tors: 'armor', shld: 'shield', weap: 'melee', mele: 'melee', miss: 'missile', staf: 'staff', wand: 'wand' };
const seqs = new Set([...VRW_PARSED, ...VANILLA_RW, ...RW.map(r => r[2])]);
RWN.forEach(([en, ko], i) => {
  if (!free(en)) throw new Error('rw name taken ' + en);
  taken.add(en);
  const lv = Math.round(13 + (72 * i) / (RWN.length - 1)), type = RTY[i % RTY.length];
  const hi = Math.min(runeOrder.length - 1, Math.round((lv / 85) * runeOrder.length));
  const n = Math.min(6, 2 + Math.floor(rnd() * 3) + (lv > 50 ? 1 : 0));
  let seq;
  do { seq = Array.from({ length: n }, (_, k) => runeOrder[Math.max(0, hi - Math.floor(rnd() * 10))]).join(' '); } while (seqs.has(seq));
  seqs.add(seq);
  RW.push([en, ko, seq, type, roll(POOL[RPOOL[type]], lv, n + 1)]);
});

// ---- 추가 세트/룬워드 (기존 생성 뒤에 붙여 기존 rnd 순서 유지)
const SN2 = `Thistledown Vagrant 엉겅퀴솜 부랑자|Peatsmoke Herald 토탄연기 전령|Wickerman Rites 버들인형 의식|Hailstone Brigade 우박돌 여단|Oxbow Fishers 우각호 어부단|Gallowmere Watch 교수대호수 감시대|Ashgrove Hermit 잿빛숲 은자|Brackenfold Shepherd 고사리우리 목자|Cindermoor Legion 잿불황야 군단|Hollowbell Choir 빈종 성가대|Stormcairn Wardens 폭풍돌무덤 파수단|Thornwick Masquerade 가시심지 가면무도회|Duskhollow Pact 황혼골 서약|Frostmantle Exile 서리망토 망명자|Sunscar Nomads 햇흉터 유목민|Gravelmoor Militia 자갈황야 민병대|Wyrmhollow Hoard 용굴 보물더미|Blightwater Coven 역병물 마녀회|Embervault Keepers 잉걸금고 수호자|Skyreach Ascendant 하늘끝 승천자|Windrunner Huntress 바람달림 여사냥꾼|Spearmaiden Vigil 창처녀 철야|Hexglass Savant 주술유리 현자|Emberquill Archive 잉걸깃촉 서고|Cryptbloom Mourner 납골꽃 애도자|Wormwood Embalmer 쑥 방부사|Oathstone Bulwark 맹세돌 성벽|Lionhearth Crusade 사자화로 성전|Bearclaw Chieftain 곰발톱 족장|Riverstone Berserkers 강돌 광전사|Oakroot Circle 참나무뿌리 원|Thornwold Shaman 가시숲 주술사|Shadowsilk Cabal 그림자비단 밀회|Ninefold Knives 아홉겹 비수단`.split('|').map(s => { const w = s.split(' '); return [w.slice(0, 2).join(' '), w.slice(2).join(' ')]; });
const SPEC2 = [[5, 4, -1], [7, 2, -1], [11, 5, -1], [16, 4, -1], [21, 6, -1], [27, 4, -1], [33, 2, -1], [39, 5, -1], [42, 6, -1], [47, 4, -1], [54, 6, -1], [58, 2, -1], [64, 5, -1], [68, 4, -1], [74, 6, -1], [78, 5, -1], [80, 2, -1], [84, 6, -1], [86, 5, -1], [88, 6, -1],
  [28, 4, 0], [79, 6, 0], [34, 5, 1], [85, 6, 1], [26, 4, 2], [77, 5, 2], [38, 5, 3], [87, 6, 3], [31, 4, 4], [73, 5, 4], [40, 5, 5], [81, 6, 5], [35, 4, 6], [88, 5, 6]];
SPEC2.forEach(([lv, np, cl], i) => {
  const [sen, sko] = SN2[i]; if (!free(sen)) throw new Error('set name taken ' + sen); taken.add(sen);
  const slots = [...(cl >= 0 ? [CLSLOT[cl]] : []), ...shuffle([...SLOTS, 'missile'].filter(s => s !== ({ 2: 'shield', 3: 'shield', 4: 'helm', 5: 'helm' })[cl]))].slice(0, np);
  const items = slots.map(c => {
    const [pe, pk] = PIECE[c].split(' '), bn = pick(near(c, lv).length ? near(c, lv) : byCat[c]);
    const pen = `${sen.split(' ')[0]}'s ${pe}`; if (!free(pen)) throw new Error('set item name taken ' + pen); taken.add(pen);
    return [pen, `${sko.split(' ')[0]}의 ${pk}`, bn, lv + Math.floor(rnd() * 4), roll(POOL[c], lv, 2 + Math.floor(rnd() * 2)), roll(C, lv, 1)];
  });
  const partial = [0, 1, 2, 3].map(k => (k < np - 1 ? roll(C, lv, 1) : ''));
  const full = (cl >= 0 ? `cls${cl} 2;` : '') + roll([...C, ['ll', 3, 7], ['fcr', 10, 20], ['ias', 10, 20], ['dr', 2, 10], ['frw', 10, 30]], lv, 3);
  SETS.push([sen, sko, partial, full, items]);
});
const RWN2 = `Emberglass=잉걸유리|Frostwick=서리심지|Mirewalker=수렁걸음|Stonevow=돌서원|Gloomhart=음울사슴|Brightmoor=밝은황야|Saltfang=소금송곳니|Ravenquill=까마귀깃|Thistleguard=엉겅퀴수호|Cinderhymn=잿불찬가|Hollowwind=빈바람|Duskward=황혼수호|Rimeheart=서리심장|Bonelantern=뼈등불|Tidewarden=밀물파수|Ironpetal=강철꽃잎|Mosslight=이끼빛|Gravesong=무덤노래|Stormquill=폭풍깃촉|Fenlight=늪빛|Ashcrown=잿빛관|Wolfmoon=늑대달|Briarknot=찔레매듭|Coalheart=석탄심장|Owlwatch=올빼미감시|Sundrift=햇살표류|Nightbloom=밤꽃|Cragwind=바위바람|Hearthsong=화롯노래|Ironvigil=강철철야|Pinecrest=솔마루|Stillwater=고요한물|Rustwyrm=녹슨용|Embertide=잉걸물결|Silverbrook=은빛시내|Kindlewood=불쏘시개숲|Frostglen=서리골짜기|Mournstone=애도석|Coldbrand=차가운낙인|Glimmerveil=희미한장막|Thunderhoof=천둥발굽|Wildgrove=야생숲|Dreadlamp=공포등불|Starwell=별샘|Hollowroot=빈뿌리|Bitterwind=쓴바람|Moonwake=달깨움|Saltspire=소금첨탑|Cinderfang=잿불송곳니|Duskthorn=황혼가시|Mistveil=안개장막|Stormlantern=폭풍등불|Gloomwater=음울한물|Brightvow=밝은서원|Rimewall=서리벽|Grimhollow=음산한골|Ravenmoor=까마귀황야|Sunward=햇살수호|Ashenhymn=잿빛찬가|Wyrmscale=용비늘|Bloodreed=핏빛갈대|Coldspire=차가운첨탑|Fenfire=늪불|Thornwake=가시자국|Oakvow=참나무서원|Stoneshade=돌그늘|Pyrewind=화장바람|Nightquill=밤깃촉|Glasswing=유리날개|Marrowsong=골수노래|Bleakstar=쓸쓸한별|Emberveil=잉걸장막|Hailbreaker=우박깨기|Frostmarrow=서리골수|Sablemoon=흑담비달|Tallowhymn=촛농찬가|Cairnlight=돌무덤빛|Harrowmoon=써레달|Kestrelwind=황조롱이바람|Vespertide=저녁물결|Copperwind=구리바람|Slatehymn=점판찬가|Mirelight=수렁빛|Gloamsong=어스름노래|Wraithbell=망령종|Deepwell=깊은샘|Graywatch=잿빛감시|Lowmoor=낮은황야|Brinelight=소금물빛|Quillmoon=깃촉달|Hearthwind=화롯바람|Ternsong=제비갈매기노래|Mossvow=이끼서원|Ashgale=잿빛돌풍|Duskwell=황혼샘|Owlfeather=올빼미깃털`.split('|').map(s => s.split('=')).filter(([en]) => free(en)).slice(0, 90);
if (RWN2.length < 90) throw new Error('not enough free rw names ' + RWN2.length);
const RTY2 = ['helm', 'tors', 'shld', 'weap', 'mele', 'miss', 'staf', 'wand', 'axe', 'swor', 'pole', 'scep', 'hamm', 'mace', 'club', 'h2h', 'pala'];
Object.assign(RPOOL, { axe: 'melee', swor: 'melee', pole: 'melee', hamm: 'melee', mace: 'melee', club: 'melee', scep: 'scepter', h2h: 'cls6', pala: 'cls3' });
RWN2.forEach(([en, ko], i) => {
  taken.add(en);
  const lv = Math.round(5 + (83 * i) / (RWN2.length - 1)), type = RTY2[i % RTY2.length];
  const hi = Math.min(runeOrder.length - 1, Math.round((lv / 85) * runeOrder.length));
  const n = Math.min(6, 2 + Math.floor(rnd() * 3) + (lv > 50 ? 1 : 0) + (lv > 75 ? 1 : 0));
  let seq;
  do { seq = Array.from({ length: n }, () => runeOrder[Math.max(0, hi - Math.floor(rnd() * 10))]).join(' '); } while (seqs.has(seq));
  seqs.add(seq);
  RW.push([en, ko, seq, type, roll(POOL[RPOOL[type]], lv, n + 1)]);
});

// ---- 3차 추가 세트/룬워드 (뒤에 붙여 기존 rnd 순서 유지)
const setOk = ([en]) => free(en) && Object.values(PIECE).every(p => free(`${en.split(' ')[0]}'s ${p.split(' ')[0]}`));
const toSN = (s) => s.split('|').map(s => { const w = s.split(' '); return [w.slice(0, 2).join(' '), w.slice(2).join(' ')]; }).filter(setOk);
const SN3 = toSN(`Driftwood Castaway 유목 표류자|Lamplighter Guild 등불지기 조합|Saltmarsh Reavers 소금습지 약탈자|Owlbrook Scholars 올빼미시내 학자단|Chalkstone Pilgrims 백악돌 순례단|Hollyhock Maiden 접시꽃 아가씨|Ironwood Rangers 철목 순찰대|Mudlark Scavengers 갯벌 넝마주이|Pewter Sentry 백랍 보초|Blackthorn Outlaws 검은가시 무법자|Juniper Wayfarer 노간주 나그네|Frostfen Trappers 서리늪 덫사냥꾼|Ravenhold Garrison 까마귀성채 수비대|Sandstone Envoy 사암 사절|Wolfpine Stalkers 솔늑대 추적자|Candlewick Abbey 촛심지 수도원|Glacierheart Sovereign 빙하심장 군주|Moonshadow Regent 달그림자 섭정|Kingsfall Dirge 왕의몰락 만가|Deepdelve Miners 깊은굴 광부단|Copperkettle Tinkers 구리주전자 땜장이|Riverwatch Keepers 강가 파수꾼|Cloudpiercer Sentinels 구름뚫이 보초단|Goldleaf Courtier 금잎 궁정인|Hearthfire Matron 화톳불 여주인|Bloodmoon Reapers 핏빛달 수확자|Silverfrost Vanguard 은서리 선봉|Gravewind Heralds 무덤바람 전령단|Sunforge Artisans 태양대장간 장인단|Nightglass Oracle 밤유리 신탁|Stormbreaker Host 폭풍깨기 군세|Mistwood Hunters 안개숲 사냥꾼|Emberhorn Clan 잉걸뿔 부족|Ashfall Seer 잿비 예언자|Voidmark Heretic 공허낙인 이단자|Dragonbone Tyrant 용뼈 폭군|Ironbark Warden 철껍질 파수꾼|Seafoam Corsairs 바다거품 해적단|Highpeak Monks 고봉 수도승|Larkspur Minstrel 참제비고깔 음유시인|Cobalt Lancers 코발트 창기병|Thunderveil Augur 천둥장막 점술가|Quartzvein Delvers 석영맥 탐광자|Crescent Wanderer 초승달 방랑자|Glowcap Alchemist 빛버섯 연금술사|Titanforge Legacy 거인대장간 유산|Duneshade Raiders 모래그늘 습격대|Brightwater Healers 맑은물 치유사|Verdant Pathfinder 신록 길잡이|Obsidian Throne 흑요석 왕좌|Fairwind Sailors 순풍 선원단|Coldiron Jailers 찬쇠 간수단|Wintermoot Elders 겨울회합 원로회|Starforge Paragon 별대장간 귀감|Heathland Drovers 히스벌판 몰이꾼|Bellmaker Guild 종장인 조합|Pinewood Foresters 솔숲 산지기|Tidepool Gleaners 조수웅덩이 이삭줍기`);
const CSN3 = toSN(`Skylark Archer 종다리 궁수|Sunspear Warmaiden 태양창 여전사|Starweave Magus 별엮음 마도사|Frostcoil Enchantress 서리고리 마녀|Bonechime Necromant 뼈풍경 강령술사|Ashveil Revenant 잿장막 망자|Silverbell Templar 은방울 성기사|Dawnshield Zealot 새벽방패 광신도|Stonefist Warlord 돌주먹 전쟁군주|Bloodaxe Reaver 피도끼 약탈자|Mosshide Shapeshifter 이끼가죽 변신술사|Willowstorm Sage 버들폭풍 현자|Velvetknife Phantom 벨벳칼 유령|Ninthshade Stalker 아홉그늘 추적자`);
if (SN3.length < 46 || CSN3.length < 14) throw new Error('not enough free set names ' + SN3.length + '/' + CSN3.length);
const SPEC3 = [...Array.from({ length: 46 }, (_, i) => [Math.round(5 + (85 * i) / 45), 2 + ((i * 3) % 5), -1, SN3[i]]),
  ...CSN3.slice(0, 14).map((s, i) => [i % 2 ? 60 + ((i * 7) % 28) : 18 + ((i * 5) % 20), 4 + (i % 3), i >> 1, s])];
SPEC3.forEach(([lv, np, cl, [sen, sko]]) => {
  taken.add(sen);
  const slots = [...(cl >= 0 ? [CLSLOT[cl]] : []), ...shuffle([...SLOTS, 'missile'].filter(s => s !== ({ 2: 'shield', 3: 'shield', 4: 'helm', 5: 'helm' })[cl]))].slice(0, np);
  const items = slots.map(c => {
    const [pe, pk] = PIECE[c].split(' '), bn = pick(near(c, lv).length ? near(c, lv) : byCat[c]);
    const pen = `${sen.split(' ')[0]}'s ${pe}`; taken.add(pen);
    return [pen, `${sko.split(' ')[0]}의 ${pk}`, bn, lv + Math.floor(rnd() * 4), roll(POOL[c], lv, 2 + Math.floor(rnd() * 2)), roll(C, lv, 1)];
  });
  const partial = [0, 1, 2, 3].map(k => (k < np - 1 ? roll(C, lv, 1) : ''));
  const full = (cl >= 0 ? `cls${cl} 2;` : '') + roll([...C, ['ll', 3, 7], ['fcr', 10, 20], ['ias', 10, 20], ['dr', 2, 10], ['frw', 10, 30]], lv, 3);
  SETS.push([sen, sko, partial, full, items]);
});
const RWN3 = `Ashmantle=잿망토|Birchlight=자작빛|Blizzardcall=눈보라부름|Bonewind=뼈바람|Brambleheart=찔레심장|Brightforge=밝은대장간|Cinderstep=잿불걸음|Cloudbreak=구름깨기|Coldflame=찬불꽃|Coralcrown=산호관|Daggerfall=단검비|Dawnhymn=새벽찬가|Deeproot=깊은뿌리|Dewlight=이슬빛|Dragonmoor=용황야|Dreamthorn=꿈가시|Duneblade=모래칼날|Echovale=메아리골|Elmshadow=느릅그늘|Fallowfield=묵은밭|Farstrider=먼걸음|Featherfall=깃털낙하|Firebrand=불낙인|Flamewreath=불꽃화환|Forgefire=대장간불|Frostbloom=서리꽃|Galeheart=돌풍심장|Ghostlantern=유령등불|Glacierspine=빙하등뼈|Gloomspire=음울첨탑|Goldmoss=금이끼|Gravelstorm=자갈폭풍|Greyhallow=잿빛성소|Hawkeye=매눈|Hazelwand=개암지팡이|Heatherglow=히스노을|Hollowsun=빈해|Hornblast=뿔피리|Icebind=얼음결속|Ironwake=강철자국|Ivyclasp=담쟁이죔|Jadestorm=옥폭풍|Kindlemark=불씨표식|Lakeshade=호수그늘|Lightningroot=번개뿌리|Lilyveil=백합장막|Lionmane=사자갈기|Longwatch=긴감시|Maplefire=단풍불|Meadowsong=풀밭노래|Mirrorlake=거울호수|Moonfang=달송곳니|Mossfang=이끼송곳니|Mountainheart=산심장|Nightwind=밤바람|Northstar=북극성|Oakshield=참나무방패|Orchardsong=과수원노래|Palewind=창백한바람|Pebbleshot=조약돌탄|Pinefang=솔송곳니|Plaguewind=역병바람|Rainmaker=비부름이|Redcliff=붉은절벽|Reedsong=갈대노래|Ridgeback=등마루|Rivenstone=쪼갠돌|Rookwing=떼까마귀날개|Rosethorn=장미가시|Ruinsong=폐허노래|Runestride=룬걸음|Sagebrush=산쑥|Sandwhisper=모래속삭임|Scaldwater=끓는물|Seabreeze=바닷바람|Shadeburn=그늘불|Shalefist=혈암주먹|Shimmerbrook=반짝시내|Skyfire=하늘불|Snowmantle=눈망토|Softstep=사뿐걸음|Songbird=노래새|Sparkwind=불꽃바람|Spellbinder=주문묶기|Spiritwell=영혼샘|Springmoor=봄황야|Steelbloom=강철꽃|Stonecrown=돌관|Stormhorn=폭풍뿔|Sunbreak=해돋이|Swiftwater=급류|Thornfire=가시불|Thundercrest=천둥마루|Timberwolf=회색늑대|Torchbearer=횃불잡이|Twilightbell=황혼종|Valewind=골바람|Vinewhip=덩굴채찍|Wavecrest=물마루|Whitethorn=흰가시|Wildfire=들불|Willowshade=버들그늘|Windbreak=바람막이|Winterfang=겨울송곳니|Wispfire=도깨비불|Woodsmoke=나무연기|Wraithfire=망령불|Wyvernwing=와이번날개|Yewbow=주목활|Zephyrmark=미풍표식|Amberlight=호박빛|Anvilsong=모루노래|Aspenwind=사시나무바람|Autumnveil=가을장막|Basaltheart=현무심장|Beaconfire=봉화|Blackreed=검은갈대|Bluefrost=푸른서리|Boulderfall=낙석|Briarwood=찔레숲|Burrowdeep=깊은굴|Chillmoor=냉기황야|Clovermark=토끼풀표식|Crowfeather=갈까마귀깃털|Daybreak=동틀녘|Driftsnow=눈더미|Eaglecrest=독수리마루|Embercrown=잉걸관|Ferngrove=고사리숲|Firefly=반딧불|Flintspark=부싯불|Frostfang=서리송곳니|Gemheart=보석심장|Glimmerstone=빛돌|Granitevow=화강서원|Harvestmoon=한가위달|Highwind=높바람|Honeymead=꿀술|Icefall=빙폭|Inkshadow=먹그늘|Kingfisher=물총새|Marshlight=습지빛|Mistral=북서풍|Nightingale=밤꾀꼬리|Oldgrowth=원시림|Ploughshare=보습|Quarrystone=채석|Rainveil=빗장막|Rimefang=서리엄니|Rockmoss=바위이끼|Saltwind=소금바람|Shorebreak=파도머리|Silkthread=비단실|Skylance=하늘창|Snowhawk=눈매|Stormpetal=폭풍꽃잎|Sunpetal=햇꽃잎|Thornbark=가시껍질|Tinderbox=부싯깃통|Underbough=가지그늘|Wardstone=수호석|Whisperwind=속삭임바람|Wolfhaven=늑대안식처|Wrenwing=굴뚝새날개|Starbloom=별꽃|Moonwell=달샘|Duskfang=황혼송곳니|Galewing=돌풍날개`.split('|').map(s => s.split('=')).filter(([en]) => free(en)).slice(0, 150);
if (RWN3.length < 150) throw new Error('not enough free rw names ' + RWN3.length);
RWN3.forEach(([en, ko], i) => {
  taken.add(en);
  const lv = Math.round(3 + (87 * i) / (RWN3.length - 1)), type = RTY2[(i * 5) % RTY2.length];
  const hi = Math.min(runeOrder.length - 1, Math.round((lv / 85) * runeOrder.length));
  const n = Math.min(6, 2 + Math.floor(rnd() * 3) + (lv > 50 ? 1 : 0) + (lv > 75 ? 1 : 0));
  let seq;
  do { seq = Array.from({ length: n }, () => runeOrder[Math.max(0, hi - Math.floor(rnd() * 10))]).join(' '); } while (seqs.has(seq));
  seqs.add(seq);
  RW.push([en, ko, seq, type, roll(POOL[RPOOL[type]], lv, n + 1)]);
});

// ---- 4차 추가: 세트 40 / 룬워드 100 / 유니크 부적·주얼 (뒤에 붙여 기존 rnd 순서 유지)
Object.assign(A, { exp: S('item_addexperience:1'), mindam: S('mindamage:1'), price: S('item_reducedprices:1') });
const SN4 = toSN(`Hazelgrove Druids 개암숲 드루이드|Tinmark Smugglers 주석표식 밀수꾼|Saltglass Mariner 소금유리 뱃사람|Quarrymen Union 채석공 조합|Bellwether Shepherds 길잡이양 목동단|Redfern Poachers 붉은고사리 밀렵꾼|Graniteback Sentries 화강등 보초단|Lowmarsh Ferrymen 저습지 뱃사공|Ashwillow Widow 잿버들 과부|Ironquill Scribes 강철깃 필경사|Snowgrouse Trackers 눈뇌조 추적꾼|Burnished Paladin 광낸 성기사|Rookery Thieves 떼까마귀둥지 도둑단|Wheatfield Yeomen 밀밭 자영농|Cliffhaven Lookouts 절벽피난처 망꾼|Mossback Tortoise 이끼등 거북|Hollowpine Woodcutters 빈소나무 나무꾼|Brassbound Envoy 놋쇠테 사절|Vellum Archivist 양피지 기록관|Ninecairn Barrow 아홉돌무덤 고분|Gloamfen Witches 어스름늪 마녀단|Coldspring Abbot 찬샘 수도원장|Firethorn Brigands 피라칸타 산적단|Silverreed Courier 은갈대 파발꾼|Kilnfire Potters 가마불 도공단|Stagheart Lord 수사슴심장 영주|Whalebone Harpooners 고래뼈 작살꾼|Brimstone Pilgrim 유황 순례자|Owlgrave Sexton 올빼미무덤 묘지기|Tallgrass Outriders 키큰풀 기마척후|Winterbloom Duchess 겨울꽃 공작부인|Thundercairn Jarl 천둥돌무덤 족장|Lacewing Dancer 풀잠자리 무희|Hearthguard Elite 화로수호 정예`);
const CSN4 = toSN(`Hawkmoon Huntress 매달 여사냥꾼|Glyphwind Sorceress 문양바람 여마법사|Bonereed Mortician 뼈갈대 장의사|Lanternoak Crusader 등불참나무 성전사|Tuskridge Barbarian 엄니능선 야만전사|Bramblefur Warden 찔레털 수호자|Ironsilk Assassin 강철비단 암살자`);
if (SN4.length < 33 || CSN4.length < 7) throw new Error('not enough free set names ' + SN4.length + '/' + CSN4.length);
const SPEC4 = [...SN4.slice(0, 33).map((s, i) => [Math.round(6 + (84 * i) / 32), 2 + ((i * 2) % 5), -1, s]), ...CSN4.slice(0, 7).map((s, i) => [30 + ((i * 11) % 55), 4 + (i % 3), i, s])];
SPEC4.forEach(([lv, np, cl, [sen, sko]]) => {
  taken.add(sen);
  const slots = [...(cl >= 0 ? [CLSLOT[cl]] : []), ...shuffle([...SLOTS, 'missile'].filter(s => s !== ({ 2: 'shield', 3: 'shield', 4: 'helm', 5: 'helm' })[cl]))].slice(0, np);
  const items = slots.map(c => {
    const [pe, pk] = PIECE[c].split(' '), bn = pick(near(c, lv).length ? near(c, lv) : byCat[c]);
    const pen = `${sen.split(' ')[0]}'s ${pe}`; taken.add(pen);
    return [pen, `${sko.split(' ')[0]}의 ${pk}`, bn, lv + Math.floor(rnd() * 4), roll(POOL[c], lv, 2 + Math.floor(rnd() * 2)), roll(C, lv, 1)];
  });
  const partial = [0, 1, 2, 3].map(k => (k < np - 1 ? roll(C, lv, 1) : ''));
  const full = (cl >= 0 ? `cls${cl} 2;` : '') + roll([...C, ['ll', 3, 7], ['fcr', 10, 20], ['ias', 10, 20], ['dr', 2, 10], ['frw', 10, 30]], lv, 3);
  SETS.push([sen, sko, partial, full, items]);
});
const RWN4 = `Acornfall=도토리비|Alderwind=오리나무바람|Anchorstone=닻돌|Antlercrown=사슴뿔관|Applewood=사과나무|Archway=아치길|Ashpetal=잿꽃잎|Badgerhold=오소리굴|Bannerfall=깃발몰락|Barleymoon=보리달|Beechshade=너도밤그늘|Bellrope=종줄|Birchbark=자작껍질|Bittersweet=쓴단맛|Blackfeather=검은깃털|Bluebell=초롱꽃|Boarstep=멧돼지걸음|Brackwater=기수|Brasslight=놋빛|Breakwater=방파제|Brightwing=밝은날개|Brookstone=시냇돌|Buckthorn=갈매나무|Butterfly Knot=나비매듭|Cedarvow=삼나무서원|Chainlight=사슬빛|Chalkmark=분필표식|Charcoal Oath=숯 맹세|Cliffsong=절벽노래|Cobblestone=자갈길|Cragfang=바위송곳니|Crimsonreed=진홍갈대|Crownfire=왕관불|Dappleshade=얼룩그늘|Deepfrost=깊은서리|Dovewing=비둘기날개|Dragonfly=잠자리|Drumroll=북소리|Elderflame=딱총불|Emberlake=잉걸호수|Fernlight=고사리빛|Fieldmouse=들쥐|Fishhook=낚싯바늘|Flaxen Thread=아마실|Foxglove=디기탈리스|Frostpetal=서리꽃잎|Gildthorn=금가시|Goldcrest=상모솔새|Granitehymn=화강찬가|Grasswhisper=풀속삭임|Hailwind=우박바람|Hareswift=산토끼질주|Hearthbell=화롯종|Hedgerow=산울타리|Hillfort=언덕요새|Hoarfrost=흰서리|Hornbeam=서어나무|Icepetal=얼음꽃잎|Inkwell=잉크병|Jasperheart=벽옥심장|Lanternfly=꽃매미|Leafblade=잎칼날|Lichenstone=지의돌|Lodestar=길잡이별|Marigold=금잔화|Marshwind=습지바람|Millstone=맷돌|Minnowstream=피라미시내|Moorhen=쇠물닭|Nettlewind=쐐기바람|Nightjar=쏙독새|Oarsong=노젓기노래|Orchardmoon=과수원달|Otterbrook=수달시내|Pebblebrook=조약돌시내|Pinecone=솔방울|Pondlight=연못빛|Poppyfield=양귀비밭|Quarrelbolt=쇠뇌살|Ravenbell=까마귀종|Reedwhistle=갈대피리|Rimelight=서리빛|Riverstride=강걸음|Rowanmark=마가목표식|Rushlight=골풀등|Sandpiper=도요새|Scarletwing=주홍날개|Shalewind=혈암바람|Shepherdstar=목동별|Silverbirch=은자작|Skipstone=물수제비|Smokethorn=연기가시|Snowberry=눈열매|Sparrowhawk=새매|Spindlewood=화살나무|Stagsong=수사슴노래|Stonechat=검은딱새|Sunflare=햇불꽃|Swallowtail=호랑나비|Thimbleberry=골무딸기|Thrushsong=개똥지빠귀노래|Tumbleweed=회전초|Waterlily=수련|Weathervane=풍향계|Wheelwright=수레장인|Wildrose=들장미|Woodpecker=딱따구리`.split('|').map(s => s.split('=')).filter(([en]) => free(en)).slice(0, 100);
if (RWN4.length < 100) throw new Error('not enough free rw names ' + RWN4.length);
RWN4.forEach(([en, ko], i) => {
  taken.add(en);
  const lv = Math.round(4 + (86 * i) / (RWN4.length - 1)), type = RTY2[(i * 7) % RTY2.length];
  const hi = Math.min(runeOrder.length - 1, Math.round((lv / 85) * runeOrder.length));
  const n = Math.min(6, 2 + Math.floor(rnd() * 3) + (lv > 50 ? 1 : 0) + (lv > 75 ? 1 : 0));
  let seq;
  do { seq = Array.from({ length: n }, () => runeOrder[Math.max(0, hi - Math.floor(rnd() * 10))]).join(' '); } while (seqs.has(seq));
  seqs.add(seq);
  RW.push([en, ko, seq, type, roll(POOL[RPOOL[type]], lv, n + 1)]);
});
// 유니크 부적(소형 약/대형 중/거대 강, Annihilus·Torch 이하)·주얼(강한 레어 주얼 수준, 옵션 4개 이하)
const SPECIAL = `
Pilgrim's Pebble|순례자의 조약돌|Small Charm|8|hp 10 15;frw 3
Ember Tooth|잉걸 이빨|Small Charm|12|fdmg 3 9;fres 5 8
Frostbitten Knuckle|동상 입은 손마디|Small Charm|14|cdmg 2 6;cres 5 8
Spark in a Vial|병 속의 불꽃|Small Charm|16|ldmg 1 15;lres 5 8
Viper's Fang Fragment|독사 송곳니 조각|Small Charm|18|pdmg 20 40;pres 5 8
Wanderer's Copper|방랑자의 동전|Small Charm|20|gold 10 20;mf 5 7
Lucky Wishbone|행운의 위시본|Small Charm|28|mf 6 9;allres 3 5
Hearthstone Chip|화로돌 조각|Small Charm|34|hp 15 20;vit 2 3;fhr 5
Owl's Eye Bead|올빼미눈 구슬|Small Charm|40|ar 20 40;dex 2 4;lrad 1
Mossbound Token|이끼 감긴 징표|Small Charm|46|allres 5;hpreg 2 3
Quiet Ash|조용한 재|Small Charm|52|mana 15 20;mreg 5 8;ene 3
Gravedigger's Nail|무덤지기의 못|Small Charm|60|maxdam 2 4;ar 30 50;hp 15 20
Saltwater Locket|소금물 로켓|Large Charm|15|fres 8 12;cres 8 12;hp 15 20
Tinker's Cog|땜장이의 톱니|Large Charm|22|ias 5;ar 30 50;dex 3 5
Barrow Candle|고분 촛불|Large Charm|30|lrad 2;undead 15 25;fdmg 4 12
Shepherd's Horn|목동의 뿔피리|Large Charm|38|frw 5;vit 5 7;mana 15 20
Rimed Acorn|서리 낀 도토리|Large Charm|44|cdmg 4 10;coldm 3 5;cres 10 15
Stormglass Shard|폭풍유리 파편|Large Charm|50|ldmg 1 30;ltngm 3 5;lres 10 15
Cinderheart Ember|잿불심장 잉걸|Large Charm|56|fdmg 6 18;firem 3 5;fres 10 15
Merchant's Abacus|상인의 주판|Large Charm|62|gold 40 60;price 5 8;mf 8 12
Vigil Lantern|철야의 등불|Large Charm|70|allres 8 12;fhr 8;hp 20 30
Duskwalker's Charm|황혼걸음 부적|Grand Charm|35|frw 7;hp 30 40;fhr 12
Warlord's Medal|전쟁군주의 훈장|Grand Charm|48|ed 10 15;maxdam 5 8;ar 60 100;str 5 8
Grove Keeper's Seed|숲지기의 씨앗|Grand Charm|54|cls5 1;hp 25 35;allres 5 8
Spellweaver's Spindle|주문짜기 물렛가락|Grand Charm|58|cls1 1;mana 25 35;fcr 5
Bonewright's Knot|뼈장인의 매듭|Grand Charm|60|cls2 1;ene 5 8;mreg 10 15
Crusader's Reliquary|성전사의 성물함|Grand Charm|62|cls3 1;undead 20 30;allres 5 8
Chieftain's Fetish|족장의 주물|Grand Charm|64|cls4 1;str 6 10;hp 25 35
Huntress Feather|여사냥꾼 깃털|Grand Charm|66|cls0 1;dex 6 10;ar 50 80
Shadowmark Sigil|그림자표식 인장|Grand Charm|68|cls6 1;ias 5;dex 5 8
Wyrmheart Ember|용심장 잉걸|Grand Charm|72|allstat 5 10;allres 8 12;exp 2 4
Bloodstone Eye|혈석 눈|Jewel|20|ed 15 25;ar 30 50;hp 10 15
Frostglint|서리반짝임|Jewel|25|cdmg 5 12;cres 15 20;ias 10
Kindled Garnet|불붙은 석류석|Jewel|25|fdmg 8 20;fres 15 20;str 5 8
Stormpearl|폭풍진주|Jewel|28|ldmg 1 40;lres 15 20;dex 5 8
Venomtear|독눈물|Jewel|30|pdmg 40 80;pres 15 20;vit 5 8
Hollow Opal|빈 오팔|Jewel|34|mana 15 25;mreg 10 15;fcr 5;ene 5 8
Ironroot Agate|철뿌리 마노|Jewel|38|ac 40 60;dr 3 5;hp 15 20
Mourning Jet|애도의 흑옥|Jewel|42|undead 25 40;ar 50 80;allres 5 8
Wolfeye Topaz|늑대눈 황옥|Jewel|44|ias 15;maxdam 5 9;dex 6 9
Saltbound Pearl|소금묶인 진주|Jewel|46|allres 10 15;fhr 7;hp 10 15
Cinder Ruby|잿불 루비|Jewel|50|ed 25 35;fdmg 10 25;mindam 3 6
Glacier Sapphire|빙하 사파이어|Jewel|50|ed 20 30;cdmg 8 18;maxdam 4 8
Thunder Amethyst|천둥 자수정|Jewel|52|ldmg 1 60;ar 60 100;str 6 9
Plague Emerald|역병 에메랄드|Jewel|52|pdmg 60 120;dex 6 9;hp 10 15
Moonlit Diamond|달빛 다이아몬드|Jewel|56|allres 12 15;mf 8 12;lrad 1
Gravecaller Onyx|무덤부름 줄마노|Jewel|58|demon 30 40;undead 30 40;ll 3 5
Hawk's Tourmaline|매의 전기석|Jewel|60|ar 80 120;ds 5 8;ias 10
Brimstone Spinel|유황 첨정석|Jewel|62|fres 20 30;maxfres 2 3;vit 6 9
Kingsguard Jasper|근위대 벽옥|Jewel|64|ac 50 80;toblock 5;fbr 15;str 5 8
Duskveil Obsidian|황혼장막 흑요석|Jewel|66|ml 3 5;fcr 7;mana 20 30
Starlit Quartz|별빛 석영|Jewel|68|allstat 4 6;allres 8 10;hp 15 20
Ember Crown Jewel|잉걸관 보석|Jewel|70|ed 30 40;ow 10 15;cb 5 8
Rimeheart Beryl|서리심장 녹주석|Jewel|72|cres 20 30;cbf 1;hp 15 25
Wyrm's Eye|용의 눈|Jewel|76|ed 30 40;ar 100 150;ias 15;ll 3 5
Sunforged Citrine|태양단조 황수정|Jewel|80|allres 15;fhr 7;dr 3 5;str 6 10`.trim().split('\n').map(l => l.split('|'));
for (const [en] of SPECIAL) if (!free(en)) throw new Error('special name taken ' + en); else taken.add(en);
for (const s of SPECIAL) { const st = props(s[4]).flatMap(p => p.stats.map(x => x.stat)); if (new Set(st).size !== st.length) throw new Error('repeated stat ' + s[0]); if (s[2] === 'Jewel' && s[4].split(';').length > 4) throw new Error('jewel >4 props ' + s[0]); }
U.push(...SPECIAL);

// ---- 5차 추가: 세트 40 / 룬워드 100 / 유니크 부적 20·주얼 20 / 인기 베이스 유니크 60 (뒤에 붙여 기존 rnd 순서 유지)
const SN5 = toSN(`Ravenwood Hunters 까마귀숲 사냥꾼|Ironvale Guard 철골짜기 경비대|Mistmoor Wanderer 안개황야 방랑자|Goldbrook Merchants 금시내 상인단|Ashstone Sentinels 잿돌 보초단|Willowmere Maiden 버들호수 아가씨|Stormhold Knights 폭풍성채 기사단|Frostpine Rangers 서리솔 순찰대|Embergate Wardens 잉걸관문 파수꾼|Silvermoon Court 은달 궁정|Blackfen Cutthroats 검은늪 자객단|Oakhollow Elder 참나무골 원로|Sunmeadow Pilgrim 햇풀밭 순례자|Thornvale Outcast 가시골짜기 추방자|Saltcliff Sailors 소금절벽 선원단|Duskmarsh Seer 황혼습지 예언자|Granitepeak Clan 화강봉 부족|Moonbrook Hermit 달시내 은자|Copperhill Miners 구리언덕 광부단|Redstone Legion 붉은돌 군단|Snowfield Nomads 눈벌판 유목민|Lakewatch Archers 호수감시 궁수단|Glimmerdeep Delvers 반짝굴 탐험대|Hollowoak Sentry 빈참나무 보초|Brightspire Magi 밝은첨탑 마도단|Coldwater Fishers 찬물 어부단|Fireheart Zealots 불심장 광신도|Wolfden Raiders 늑대굴 습격대|Starfield Watchers 별밭 관측자|Amberleaf Druid 호박잎 드루이드|Shadowfen Coven 그림자늪 마녀회|Highmoor Lancers 높은황야 창기병|Ivoryspire Regent 상아첨탑 섭정|Bronzeshield Phalanx 청동방패 밀집대|Greywolf Pack 회색늑대 무리|Rosewater Healer 장밋물 치유사`);
const CSN5 = toSN(`Swiftarrow Amazon 빠른화살 아마존|Stormweaver Sorceress 폭풍짜기 여마법사|Gravebloom Necromancer 무덤꽃 강령술사|Brightoath Paladin 밝은맹세 성기사|Ironhide Barbarian 강철가죽 야만전사|Moonfur Druid 달털 드루이드|Silentblade Assassin 고요한칼 암살자`);
if (SN5.length < 33 || CSN5.length < 7) throw new Error('not enough free set names ' + SN5.length + '/' + CSN5.length);
const SPEC5 = [...SN5.slice(0, 33).map((s, i) => [Math.round(5 + (85 * i) / 32), 2 + ((i * 3) % 5), -1, s]), ...CSN5.slice(0, 7).map((s, i) => [25 + ((i * 13) % 60), 4 + (i % 3), i, s])];
SPEC5.forEach(([lv, np, cl, [sen, sko]]) => {
  taken.add(sen);
  const slots = [...(cl >= 0 ? [CLSLOT[cl]] : []), ...shuffle([...SLOTS, 'missile'].filter(s => s !== ({ 2: 'shield', 3: 'shield', 4: 'helm', 5: 'helm' })[cl]))].slice(0, np);
  const items = slots.map(c => {
    const [pe, pk] = PIECE[c].split(' '), bn = pick(near(c, lv).length ? near(c, lv) : byCat[c]);
    const pen = `${sen.split(' ')[0]}'s ${pe}`; taken.add(pen);
    return [pen, `${sko.split(' ')[0]}의 ${pk}`, bn, lv + Math.floor(rnd() * 4), roll(POOL[c], lv, 2 + Math.floor(rnd() * 2)), roll(C, lv, 1)];
  });
  const partial = [0, 1, 2, 3].map(k => (k < np - 1 ? roll(C, lv, 1) : ''));
  const full = (cl >= 0 ? `cls${cl} 2;` : '') + roll([...C, ['ll', 3, 7], ['fcr', 10, 20], ['ias', 10, 20], ['dr', 2, 10], ['frw', 10, 30]], lv, 3);
  SETS.push([sen, sko, partial, full, items]);
});
const RWN5 = `Morningstar=샛별|Evensong=저녁기도|Hollowhymn=빈찬가|Ironrain=쇠비|Frostcall=서리부름|Flamecall=불꽃부름|Stormcall=폭풍부름|Stonecall=돌부름|Moonlance=달창|Sunlance=해창|Starlance=별창|Bloodvine=핏빛덩굴|Silverthorn=은가시|Goldthorn=금빛가시|Ashthorn=잿가시|Mistthorn=안개가시|Riverhymn=강찬가|Cloudhymn=구름찬가|Firehymn=불찬가|Icehymn=얼음찬가|Wolfhowl=늑대울음|Hawkcry=매울음|Bearroar=곰포효|Owlhoot=올빼미울음|Dragonroar=용포효|Lionroar=사자포효|Stormwing=폭풍날개|Frostwing=서리날개|Flamewing=불꽃날개|Shadowwing=그림자날개|Ironfeather=강철깃털|Goldfeather=금깃털|Snowfeather=눈깃털|Ashfeather=잿깃털|Thunderstep=천둥걸음|Moonstep=달걸음|Shadowstep=그림자걸음|Lightstep=빛걸음|Deepstone=깊은돌|Brightstone=밝은돌|Darkstone=어둠돌|Coldstone=찬돌|Warmstone=따스한돌|Kingstone=왕의돌|Riverglass=강유리|Moonglass=달유리|Starglass=별유리|Sunglass=햇유리|Frostglass=서리유리|Ashglass=잿유리|Wolfblood=늑대피|Dragonblood=용의피|Starblood=별의피|Ironblood=강철피|Frostblood=서리피|Fireblood=불의피|Moonshield=달방패|Sunshield=해방패|Starshield=별방패|Stormshield=폭풍방패|Frostshield=서리방패|Ironshield=강철방패|Thornshield=가시방패|Ashshield=잿방패|Deepwood=깊은숲|Brightwood=밝은숲|Darkwood=어둠숲|Coldwood=찬숲|Silverwood=은숲|Goldwood=금숲|Redwood=붉은숲|Blackwood=검은숲|Stormvale=폭풍골|Frostvale=서리골|Moonvale=달골|Starvale=별골|Ashvale=잿골|Wolfvale=늑대골|Ravenvale=까마귀골|Thornvale=가시골|Mistvale=안개골|Duskvale=황혼골|Dawnvale=새벽골|Riverwatch=강감시|Moonwatch=달감시|Starwatch=별감시|Sunwatch=해감시|Stormwatch=폭풍감시|Frostwatch=서리감시|Firewatch=불감시|Ashwatch=잿감시|Wolfwatch=늑대감시|Ravenwatch=까마귀감시|Hawkwatch=매감시|Dragonwatch=용감시|Lionwatch=사자감시|Bearwatch=곰감시|Deerwatch=사슴감시|Stagwatch=수사슴감시|Foxwatch=여우감시|Hollowmoon=빈달|Redmoon=붉은달|Bluemoon=푸른달|Silvermoon=은달|Goldmoon=금달|Blackmoon=검은달|Whitemoon=흰달|Greymoon=잿빛달`.split('|').map(s => s.split('=')).filter(([en]) => free(en)).slice(0, 100);
if (RWN5.length < 100) throw new Error('not enough free rw names ' + RWN5.length);
RWN5.forEach(([en, ko], i) => {
  taken.add(en);
  const lv = Math.round(5 + (85 * i) / (RWN5.length - 1)), type = RTY2[(i * 3) % RTY2.length];
  const hi = Math.min(runeOrder.length - 1, Math.round((lv / 85) * runeOrder.length));
  const n = Math.min(6, 2 + Math.floor(rnd() * 3) + (lv > 50 ? 1 : 0) + (lv > 75 ? 1 : 0));
  let seq;
  do { seq = Array.from({ length: n }, () => runeOrder[Math.max(0, hi - Math.floor(rnd() * 10))]).join(' '); } while (seqs.has(seq));
  seqs.add(seq);
  RW.push([en, ko, seq, type, roll(POOL[RPOOL[type]], lv, n + 1)]);
});
// 인기 엘리트 베이스·장신구 유니크 60 (이름 직접 지정)
const U5 = `Kingsguard Halo|근위대의 후광|Diadem
Seraph's Vigil|천사의 철야|Sacred Armor
Emberlord Plate|잉걸군주의 판금|Archon Plate
Nightweave Shroud|밤짜기 수의|Dusk Shroud
Hollowking Plate|빈왕의 판금|Shadow Plate
Bastion of Dawn|새벽의 보루|Monarch
Starcrown|별왕관|Corona
Moonlit Edge|달빛 칼날|Phase Blade
Titan's Cleaver|거인의 대검|Colossus Blade
Stormstring|폭풍시위|Hydra Bow
Wolfmaw Axe|늑대아가리 도끼|Berserker Axe
Stormcrash Maul|폭풍붕괴 망치|Thunder Maul
Eye of the Tempest|폭풍의 눈|Vortex Orb
Alpha's Crest|우두머리의 볏|Griffon Headdress
Lichbone Skull|리치뼈 해골|Bloodlord Skull
Oathkeeper's Ward|맹세지기의 수호|Sacred Rondache
Silent Talons|고요한 갈고리|Runic Talons
Skyspear|하늘창|Matriarchal Javelin
Warlord's Crown|전쟁군주의 왕관|Guardian Crown
Spire of Ages|세월의 첨탑|Archon Staff
Glacier Mantle|빙하 망토|Wyrmhide
Cinderback Husk|잿불등 껍데기|Scarab Husk
Wardancer's Grip|전쟁무희의 손아귀|Vampirebone Gloves
Stormfist|폭풍주먹|Ogre Gauntlets
Wanderer's Path|방랑자의 길|Boneweave Boots
Riftwalker|균열걸음|Myrmidon Greaves
Ironbound Cinch|강철 조임띠|Vampirefang Belt
Titanbelt|거인의 허리띠|Colossus Girdle
Dreadbrow|공포의 이마|Demonhead
Shadowmask|그림자가면|Bone Visage
Warmaiden's Edge|여전사의 칼날|Cryptic Sword
Hellreaper|지옥수확자|Thresher
Doomtoll|종말의 종|Giant Thresher
Godhammer|신의 망치|Ogre Maul
Crownsplitter|왕관쪼개기|Champion Axe
Bloodfang|피송곳니|Legend Sword
Starfall Bow|별똥별 활|Crusader Bow
Gavel of Light|빛의 의사봉|Seraph Rod
Blackstar Sigil|검은별 인장|Ring
Moonstone Band|월장석 가락지|Ring
Coalfire Signet|숯불 인장반지|Ring
Frostbite Loop|동상 고리|Ring
Stormheart Ring|폭풍심장 반지|Ring
Gravewhisper Band|무덤속삭임 가락지|Ring
Oath Ring|맹세의 반지|Ring
Wolfeye Band|늑대눈 가락지|Ring
Serpent Coil|뱀똬리|Ring
Sunfire Seal|태양불 인장|Ring
Heart of Winter|겨울의 심장|Amulet
Dragon's Eye|용의 눈동자|Amulet
Saint's Locket|성자의 로켓|Amulet
Nightshade Pendant|벨라돈나 펜던트|Amulet
Wyrmtooth Charm|용이빨 부적|Amulet
Starlight Medallion|별빛 메달|Amulet
Tidecaller Talisman|조수부름 호부|Amulet
Crown of Embers|잉걸의 왕관|Amulet
Wraithbone Pendant|망령뼈 펜던트|Amulet
Mirror of Souls|영혼의 거울|Amulet
Hunter's Moon|사냥꾼의 달|Amulet
Banner of Kings|왕들의 깃발|Amulet
Dawnbreaker Ring|여명깨기 반지|Ring
Ivory Talisman|상아 호부|Amulet
Wyrmscale Plate|용비늘 판금|Archon Plate
Sunblade|태양검|Phase Blade
Frostreaver|서리약탈자|Berserker Axe`.split('\n').map(l => l.split('|'));
const U5ok = U5.filter(([en, , bn]) => free(en) && IS.bases[bn]).slice(0, 60);
if (U5ok.length < 60) throw new Error('U5 short: ' + U5.filter(([en, , bn]) => !(free(en) && IS.bases[bn])).map(u => u[0]).join(', '));
for (const [en, ko, bn] of U5ok) {
  taken.add(en);
  const b = IS.bases[bn], c = cat(bn, b), lv = /^(Ring|Amulet)$/.test(bn) ? 30 + Math.floor(rnd() * 55) : baseLv(b);
  U.push([en, ko, bn, String(lv), roll(POOL[c], lv, 4 + Math.floor(rnd() * 3))]);
}
// 유니크 부적 20·주얼 20
const SPECIAL5 = `
Traveler's Bead|나그네의 구슬|Small Charm|10|hp 10 15;frw 3
Glowing Coal|빛나는 숯|Small Charm|15|fdmg 3 10;hp 5 10
Snowflake Shard|눈송이 조각|Small Charm|17|cdmg 2 7;mana 5 10
Thunder Seed|천둥 씨앗|Small Charm|19|ldmg 1 16;ar 10 20
Adder's Scale|살무사 비늘|Small Charm|21|pdmg 25 45;dex 1 2
Lucky Clover|행운의 네잎클로버|Small Charm|30|mf 5 8;gold 10 15
Little Shield|작은 방패|Small Charm|36|allres 4 5;ac 10 20
Hunter's Token|사냥꾼의 징표|Small Charm|44|maxdam 2 3;ar 20 40
Scholar's Ink|학자의 먹물|Small Charm|50|mana 15 20;fcr 3
Iron Nail|무쇠 못|Small Charm|58|str 2 3;hp 15 20;fhr 5
Fisher's Float|어부의 찌|Large Charm|20|cres 10 14;lres 10 14
Woodsman's Whetstone|나무꾼의 숫돌|Large Charm|32|maxdam 3 5;ar 30 50
Pilgrim's Lamp|순례자의 등잔|Large Charm|42|lrad 2;undead 20 30;hp 15 20
Storm Bottle|폭풍 담은 병|Large Charm|52|ldmg 1 35;lres 10 15;fhr 5
Hearth Coal|화롯불 숯|Large Charm|64|fdmg 7 20;fres 10 15;vit 4 6
Mountain Heart|산의 심장|Grand Charm|40|hp 35 45;dr 2 3;vit 6 8
Battle Standard|전장의 깃발|Grand Charm|52|ed 12 18;ar 80 120;ias 5
Sage's Codex|현자의 사본|Grand Charm|60|allsk 1;mana 20 30
Wanderlust|방랑벽|Grand Charm|68|frw 10;fhr 10;allres 6 10
Dragon Scale|용비늘|Grand Charm|78|allres 10 15;hp 30 40;dr 3 4
Morning Dew|아침 이슬|Jewel|18|hpreg 3 5;hp 10 15;fhr 5
Crimson Drop|진홍 방울|Jewel|24|ll 3 4;ed 10 15;ar 20 40
Ice Tear|얼음 눈물|Jewel|28|cdmg 6 14;coldm 2 3;cres 10 15
Sun Shard|해 조각|Jewel|30|fdmg 9 22;firem 2 3;fres 10 15
Lightning Pearl|번개 진주|Jewel|32|ldmg 1 45;ltngm 2 3;lres 10 15
Witch's Eye|마녀의 눈|Jewel|36|fcr 5;ene 6 9;mreg 8 12
Serpent Eye|뱀눈|Jewel|40|pdmg 50 100;dex 5 8;pres 15 20
Knight's Badge|기사의 휘장|Jewel|44|ac 50 70;toblock 4;fbr 10
Lion's Heart|사자의 심장|Jewel|48|str 7 10;vit 5 8;hp 15 20
Ghost Opal|유령 오팔|Jewel|52|demon 30 40;undead 30 40;ar 40 60
Crowsight Onyx|까마귀눈 줄마노|Jewel|54|ias 10;ds 5 8;ar 60 90
Blood Diamond|핏빛 다이아몬드|Jewel|58|ed 25 35;ll 3 5;maxdam 3 6
Sky Sapphire|하늘 사파이어|Jewel|60|allres 12 15;fcr 5;mana 15 20
Earth Garnet|대지 석류석|Jewel|62|dr 3 5;hp 20 25;str 5 7
Silver Moonstone|은빛 월장석|Jewel|66|mf 10 14;gold 20 30;allres 5 8
Black Pearl|흑진주|Jewel|70|ml 4 6;mana 20 30;ene 5 8
Phoenix Feather|불사조 깃털|Jewel|72|fres 25 30;maxfres 2 3;fdmg 10 25
Titan's Tooth|거인의 이빨|Jewel|76|ed 30 40;cb 5 8;str 6 9
Starfire Gem|별불꽃 보석|Jewel|80|allstat 5 7;allres 10 12;fhr 7
Heart of the Mountain|산맥의 심장|Jewel|84|ed 35 40;ar 100 150;ow 10 15;hp 20 25`.trim().split('\n').map(l => l.split('|'));
{ const bad = SPECIAL5.filter(([en]) => !free(en)).map(s => s[0]); if (bad.length) throw new Error("special name taken " + bad); SPECIAL5.forEach(([en]) => taken.add(en)); }
for (const s of SPECIAL5) { const st = props(s[4]).flatMap(p => p.stats.map(x => x.stat)); if (new Set(st).size !== st.length) throw new Error('repeated stat ' + s[0]); if (s[2] === 'Jewel' && s[4].split(';').length > 4) throw new Error('jewel >4 props ' + s[0]); }
SPECIAL.push(...SPECIAL5);
U.push(...SPECIAL5);

// ---- 6차 추가: 세트 40 / 룬워드 100 / 유니크 60 / 유니크 부적 20·주얼 20 (뒤에 붙여 기존 rnd 순서 유지)
const SN6 = toSN(`Cobblestone Watch 조약돌 순찰대|Brinewind Corsairs 짠바람 해적단|Mapleheart Foresters 단풍심장 산지기|Lanternfen Guides 등불늪 길잡이|Slatehollow Miners 점판골 광부단|Rushlight Vigil 골풀등 철야|Heronmere Envoy 왜가리호수 사절|Tallowmark Chandlers 촛농표식 양초장이|Glassmoor Seers 유리황야 예언자|Bronzewing Lancers 청동날개 창기병|Wheatfield Yeomen 밀밭 자영농|Ravenhall Heralds 까마귀전당 전령|Sootstack Smiths 그을음굴뚝 대장장이|Cliffmoor Climbers 절벽황야 등반대|Pebblebrook Anglers 조약시내 낚시꾼|Hollowoak Hermitage 빈참나무 은둔처|Grimwharf Dockers 음산부두 하역꾼|Fogbell Mariners 안개종 선원단|Duskwheat Reapers 황혼밀 수확단|Rimewater Fishers 서리물 어부단|Candlemere Sisters 촛불호수 자매회|Ashbarrow Diggers 잿고분 도굴단|Stonebridge Tollmen 돌다리 통행세꾼|Wolfden Trappers 늑대굴 덫사냥꾼|Mirrorlake Oracles 거울호수 신탁단|Thornhedge Wardens 가시울타리 파수꾼|Pinecrest Scouts 솔마루 정찰대|Ironbell Ringers 쇠종 타종단|Cloudspire Monks 구름첨탑 수도승|Goldleaf Illuminators 금박 채식사|Brasshelm Militia 놋투구 민병대|Bramblegate Keepers 찔레관문 문지기|Sunmoor Caravan 햇황야 대상|Moonwell Acolytes 달샘 수련사제|Frostford Ferrymen 서리여울 뱃사공|Emberfield Tillers 잉걸들 농부단|Deepvault Bankers 깊은금고 금융단|Owlmoor Archivists 올빼미황야 기록관`);
const CSN6 = toSN(`Galewing Amazon 돌풍날개 아마존|Frostspire Sorceress 서리첨탑 여마법사|Bonelord Necromancer 뼈군주 강령술사|Sunhammer Paladin 태양망치 성기사|Rockjaw Barbarian 바위턱 야만전사|Elderbark Druid 고목껍질 드루이드|Veilstep Assassin 장막걸음 암살자`);
if (SN6.length < 33 || CSN6.length < 7) throw new Error('not enough free set names ' + SN6.length + '/' + CSN6.length);
const SPEC6 = [...SN6.slice(0, 33).map((s, i) => [Math.round(6 + (84 * i) / 32), 2 + ((i * 4) % 5), -1, s]), ...CSN6.slice(0, 7).map((s, i) => [28 + ((i * 9) % 58), 4 + (i % 3), i, s])];
SPEC6.forEach(([lv, np, cl, [sen, sko]]) => {
  taken.add(sen);
  const slots = [...(cl >= 0 ? [CLSLOT[cl]] : []), ...shuffle([...SLOTS, 'missile'].filter(s => s !== ({ 2: 'shield', 3: 'shield', 4: 'helm', 5: 'helm' })[cl]))].slice(0, np);
  const items = slots.map(c => {
    const [pe, pk] = PIECE[c].split(' '), bn = pick(near(c, lv).length ? near(c, lv) : byCat[c]);
    const pen = `${sen.split(' ')[0]}'s ${pe}`; taken.add(pen);
    return [pen, `${sko.split(' ')[0]}의 ${pk}`, bn, lv + Math.floor(rnd() * 4), roll(POOL[c], lv, 2 + Math.floor(rnd() * 2)), roll(C, lv, 1)];
  });
  const partial = [0, 1, 2, 3].map(k => (k < np - 1 ? roll(C, lv, 1) : ''));
  const full = (cl >= 0 ? `cls${cl} 2;` : '') + roll([...C, ['ll', 3, 7], ['fcr', 10, 20], ['ias', 10, 20], ['dr', 2, 10], ['frw', 10, 30]], lv, 3);
  SETS.push([sen, sko, partial, full, items]);
});
const RWN6 = `Aldermoon=오리나무달|Amberwake=호박깨움|Anvilsong=모루노래|Ashenreach=잿빛손길|Auroraveil=극광장막|Basaltheart=현무심장|Bearwood=곰숲|Bellflame=종불꽃|Blackmarsh=검은습지|Bladewind=칼바람|Bloodmoon=핏빛달|Boneflute=뼈피리|Brassveil=놋장막|Brightwater=맑은물|Brokenoath=깨진맹세|Candlewick=촛심지|Cedarsong=백향노래|Chainbreak=사슬끊기|Cinderfall=잿불비|Claymore Hymn=클레이모어 찬가|Cliffside=벼랑끝|Coldsteel=찬강철|Crimsonleaf=진홍잎|Crowsong=까마귀노래|Crystalvein=수정맥|Darkwater=어둠물|Dawnfire=새벽불|Deepfrost=깊은서리|Dirgebell=만가종|Dovewing=비둘기날개|Dragonbone=용뼈|Dustwalker=먼지걸음|Eaglecrest=독수리볏|Elmshade=느릅그늘|Embercoil=잉걸고리|Fallowfield=묵은밭|Farstrider=먼걸음|Featherfall=깃털낙하|Fernlight=고사리빛|Firebrand=불낙인|Flintspark=부싯불꽃|Foxglove=디기탈리스|Frostfang=서리송곳니|Gildedthorn=금박가시|Glimmerstone=반짝돌|Goldenrod=미역취|Granitecrown=화강관|Greywolf=회색늑대|Hailstorm Hymn=우박 찬가|Hawkwind=매바람|Heathfire=히스불|Hollowbone=빈뼈|Hornblast=뿔나팔|Icewind=얼음바람|Ironbloom=강철꽃|Ivyheart=담쟁이심장|Jadewind=비취바람|Kestrelwing=황조롱이날개|Lakeshadow=호수그림자|Lanternfall=등불낙하|Leafstorm=잎폭풍|Lightfoot=가벼운발|Lionsmane=사자갈기|Magpie=까치|Marblehall=대리석전당|Mistveil=안개장막|Moonbrook=달시내|Mountainsong=산노래|Nightbloom=밤꽃|Northwind=북풍|Oakenshield=참나무방패|Onyxheart=줄마노심장|Pebbleshot=조약돌사격|Pinewind=솔바람|Quicksilver=수은|Rainfall=빗줄기|Redhawk=붉은매|Reedsong=갈대노래|Rockfall=낙석|Rosethorn=장미가시|Runeward=룬수호|Sandstorm Hymn=모래폭풍 찬가|Seafoam=바다거품|Shadowfen=그림자늪|Shieldwall=방패벽|Silverleaf=은잎|Skyfire=하늘불|Snowveil=눈장막|Southwind=남풍|Sparrowhawk=새매|Steelwind=강철바람|Stonehymn=돌찬가|Sunwell=해샘|Swiftwater=급류|Thunderhoof=천둥발굽|Timberwolf=회색이리|Torchbearer=횃불잡이|Twilightsong=땅거미노래|Valewind=골바람|Westwind=서풍|Whitethorn=흰가시|Wildfire Hymn=들불 찬가|Willowisp=도깨비불|Winterbloom=겨울꽃|Wyrmfire=용불|Yarrow=톱풀|Ambercrest=호박볏|Birchwind=자작바람|Coalheart=숯심장|Dewfall=이슬비|Elkhorn=엘크뿔|Galeborn=돌풍태생|Hearthsong=화롯노래|Larkspur=제비고깔|Mistfang=안개송곳니|Pinemoon=솔달|Quillmoor=깃촉황야|Rookwarden=떼까마귀파수|Saltbriar=소금찔레|Thistlewind=엉겅퀴바람|Umberfrost=암갈서리|Vesperthorn=저녁가시|Wrenwhistle=굴뚝새휘파람|Ashlark=잿종다리|Brinehollow=소금물골|Cobaltveil=코발트장막|Duskreed=황혼갈대|Emberwren=잉걸굴뚝새|Fjordsong=피오르노래|Gorsefire=가시금작불|Heronstep=왜가리걸음|Ironfern=강철고사리|Juniperveil=노간주장막|Kelpmoor=다시마황야|Lichenstone=이끼돌|Mothlight=나방빛|Nettlebrook=쐐기풀시내|Otterglide=수달미끄럼|Pewtermoon=백랍달|Quartzhymn=석영찬가|Rushwind=골풀바람|Sorrelflame=수영불꽃|Tanglewood=얽힌숲|Vetchsong=살갈퀴노래|Wispthorn=도깨비가시|Zephyrbell=산들종`.split('|').map(s => s.split('=')).filter(([en]) => free(en)).slice(0, 100);
if (RWN6.length < 100) throw new Error('not enough free rw names ' + RWN6.length);
RWN6.forEach(([en, ko], i) => {
  taken.add(en);
  const lv = Math.round(5 + (85 * i) / (RWN6.length - 1)), type = RTY2[(i * 11) % RTY2.length];
  const hi = Math.min(runeOrder.length - 1, Math.round((lv / 85) * runeOrder.length));
  const n = Math.min(6, 2 + Math.floor(rnd() * 3) + (lv > 50 ? 1 : 0) + (lv > 75 ? 1 : 0));
  let seq;
  do { seq = Array.from({ length: n }, () => runeOrder[Math.max(0, hi - Math.floor(rnd() * 10))]).join(' '); } while (seqs.has(seq));
  seqs.add(seq);
  RW.push([en, ko, seq, type, roll(POOL[RPOOL[type]], lv, n + 1)]);
});
// 인기 베이스 유니크 60 (이름 직접 지정)
const U6 = `Crown of the Lost|잃어버린 자의 왕관|Diadem
Wraithwing Coronet|망령날개 보관|Corona
Gilded Sentinel|금박 파수꾼|Guardian Crown
Grimvisage|음산한 낯|Bone Visage
Stormbrow|폭풍이마|Demonhead
Plate of the Fallen King|몰락한 왕의 판금|Sacred Armor
Ashen Aegis Plate|잿빛 수호판금|Archon Plate
Veil of Whispers|속삭임의 장막|Dusk Shroud
Darkforge Mail|어둠대장간 갑옷|Shadow Plate
Lionguard|사자수호|Monarch
Sunward Rondache|태양향 론다슈|Sacred Rondache
Nightfang Blade|밤송곳니 검|Phase Blade
Worldsplitter|세계쪼개기|Colossus Blade
Thunderreach|천둥손길|Hydra Bow
Gorefang Axe|피송곳니 도끼|Berserker Axe
Earthshaker Maul|대지흔들기 망치|Thunder Maul
Spellstorm Orb|주문폭풍 구슬|Vortex Orb
Packlord's Crown|무리군주의 관|Griffon Headdress
Gravelord Skull|무덤군주 해골|Bloodlord Skull
Whisperclaw|속삭임발톱|Runic Talons
Galespear|돌풍창|Matriarchal Javelin
Staff of Twilight|땅거미의 지팡이|Archon Staff
Frostwyrm Hide|서리용 가죽|Wyrmhide
Beetleshell Guard|딱정벌레껍질 수호|Scarab Husk
Bloodgrip|피손아귀|Vampirebone Gloves
Titanfist|거인주먹|Ogre Gauntlets
Duststride Boots|먼지걸음 장화|Boneweave Boots
Ironmarch Greaves|철행군 정강이받이|Myrmidon Greaves
Thirstcoil Belt|갈증고리 허리띠|Vampirefang Belt
Mountainbelt|산맥 허리띠|Colossus Girdle
Soulreaper|영혼수확자|Thresher
Harvest Moon|수확의 달|Giant Thresher
Skullcrusher Maul|두개골분쇄 망치|Ogre Maul
Kingsbane Axe|왕살해 도끼|Champion Axe
Oathblade|맹세검|Legend Sword
Faithbow|신앙의 활|Crusader Bow
Rod of Mercy|자비의 지팡이|Seraph Rod
Cryptkeeper's Edge|묘지기의 칼날|Cryptic Sword
Embercoil Ring|잉걸고리 반지|Ring
Rimeband|서리가락지|Ring
Thunderloop|천둥고리|Ring
Venomsigil|독인장|Ring
Duskstone Ring|황혼돌 반지|Ring
Kingsring|왕의 반지|Ring
Bloodmoon Band|핏빛달 가락지|Ring
Pilgrim's Ring|순례자의 반지|Ring
Mender's Loop|치유사의 고리|Ring
Starseed Ring|별씨앗 반지|Ring
Eye of the Storm|태풍의 눈|Amulet
Amulet of Embers|잉걸의 목걸이|Amulet
Frostheart Pendant|서리심장 펜던트|Amulet
Saint's Rosary|성자의 묵주|Amulet
Wolfmother's Fang|늑대어미 송곳니|Amulet
Dreamcatcher|드림캐처|Amulet
Seer's Locket|예언자의 로켓|Amulet
Gravebloom Amulet|무덤꽃 목걸이|Amulet
Tidestone Talisman|조수돌 호부|Amulet
Sigil of Dawn|여명의 인장|Amulet
Heart of Embers|잉걸의 심장|Amulet
Lion's Pride|사자의 긍지|Amulet
Dawnstar Band|새벽별 가락지|Ring
Ember Shroud|잉걸 수의|Dusk Shroud
Moonreaver|달약탈자|Berserker Axe
Glowstone Ring|빛돌 반지|Ring
Hollowmoon Amulet|빈달 목걸이|Amulet`.split('\n').map(l => l.split('|'));
const U6ok = U6.filter(([en, , bn]) => free(en) && IS.bases[bn]).slice(0, 60);
if (U6ok.length < 60) throw new Error('U6 short: ' + U6.filter(([en, , bn]) => !(free(en) && IS.bases[bn])).map(u => u[0]).join(', '));
for (const [en, ko, bn] of U6ok) {
  taken.add(en);
  const b = IS.bases[bn], c = cat(bn, b), lv = /^(Ring|Amulet)$/.test(bn) ? 30 + Math.floor(rnd() * 55) : baseLv(b);
  U.push([en, ko, bn, String(lv), roll(POOL[c], lv, 4 + Math.floor(rnd() * 3))]);
}
// 유니크 부적 20·주얼 20
const SPECIAL6 = `
Wayfarer's Pebble|길손의 조약돌|Small Charm|9|hp 10 15;frw 3
Smoldering Ember|그을린 잉걸|Small Charm|14|fdmg 3 9;fres 4 7
Hoarfrost Chip|서릿발 조각|Small Charm|16|cdmg 2 6;cres 4 7
Static Spark|정전기 불꽃|Small Charm|18|ldmg 1 15;lres 4 7
Toad's Wart|두꺼비 사마귀|Small Charm|20|pdmg 20 40;pres 4 7
Copper Horseshoe|구리 편자|Small Charm|26|mf 5 8;gold 10 15
Squire's Buckle|종자의 버클|Small Charm|34|ac 15 25;allres 3 5
Archer's Fletching|궁수의 깃|Small Charm|42|ar 20 40;dex 2 3
Candle Stub|몽당초|Small Charm|48|mana 15 20;mreg 5 8
Soldier's Dogtag|병사의 인식표|Small Charm|56|hp 15 20;str 2 3;fhr 5
Riverstone|강돌|Large Charm|18|fres 8 12;pres 8 12
Hunter's Snare|사냥꾼의 올가미|Large Charm|30|maxdam 3 5;dex 3 5
Monk's Prayer Bead|수도승의 염주|Large Charm|40|undead 20 30;mana 15 20
Frozen Lantern|얼어붙은 등불|Large Charm|50|cdmg 4 10;cres 10 15;lrad 1
Ember Lantern|타오르는 등불|Large Charm|62|fdmg 6 18;fres 10 15;hp 15 20
Oaken Heart|참나무 심장|Grand Charm|38|hp 30 40;vit 5 7;hpreg 3 5
Champion's Laurel|투사의 월계관|Grand Charm|50|ed 10 15;ar 60 100;str 4 6
Arcanist's Seal|비전술사의 인장|Grand Charm|58|mana 25 35;fcr 5;ene 5 7
Trailblazer's Compass|개척자의 나침반|Grand Charm|66|frw 8;fhr 8;allres 5 8
Wyrm's Hoard|용의 보물|Grand Charm|76|mf 10 15;gold 40 60;allres 8 12
Dawn Dew|새벽 이슬|Jewel|18|hpreg 3 5;hp 10 15;frw 5
Ruby Drop|루비 방울|Jewel|22|ll 3 4;ed 10 15;str 3 5
Frost Pearl|서리 진주|Jewel|26|cdmg 6 14;cres 10 15;dex 3 5
Ember Topaz|잉걸 황옥|Jewel|28|fdmg 9 22;fres 10 15;vit 3 5
Storm Opal|폭풍 오팔|Jewel|30|ldmg 1 45;lres 10 15;mana 10 15
Toxic Jade|맹독 비취|Jewel|34|pdmg 50 100;pres 15 20;hp 10 15
Sage's Moonstone|현자의 월장석|Jewel|38|fcr 5;mreg 8 12;mana 15 20
Guardian Agate|수호자의 마노|Jewel|42|ac 50 70;dr 3 4;fbr 10
Bear's Eye|곰의 눈|Jewel|46|str 6 9;hp 15 20;fhr 7
Holy Quartz|성스러운 석영|Jewel|50|undead 30 40;demon 30 40;allres 5 8
Falcon Eye|매눈 보석|Jewel|54|ias 10;ar 60 90;dex 5 8
Wolf's Blood|늑대의 피|Jewel|58|ed 25 35;ll 3 5;ow 5 10
Rainbow Opal|무지개 오팔|Jewel|60|allres 12 15;fhr 7;hp 10 15
Bedrock Garnet|기반암 석류석|Jewel|62|dr 3 5;vit 6 9;ac 40 60
Fortune's Pearl|행운의 진주|Jewel|66|mf 10 14;gold 20 30;lrad 1
Void Onyx|공허 줄마노|Jewel|70|ml 4 6;fcr 5;ene 5 8
Glacial Heart|빙하의 심장|Jewel|72|cres 25 30;cbf 1;coldm 2 3
Warlord's Tooth|군주의 이빨|Jewel|76|ed 30 40;cb 5 8;maxdam 3 6
Prism Gem|프리즘 보석|Jewel|80|allstat 5 7;allres 10 12;mana 15 20
Crown Diamond|왕관 다이아몬드|Jewel|84|ed 35 40;ar 100 150;ds 5 8;hp 20 25`.trim().split('\n').map(l => l.split('|'));
{ const bad = SPECIAL6.filter(([en]) => !free(en)).map(s => s[0]); if (bad.length) throw new Error("special name taken " + bad); SPECIAL6.forEach(([en]) => taken.add(en)); }
for (const s of SPECIAL6) { const st = props(s[4]).flatMap(p => p.stats.map(x => x.stat)); if (new Set(st).size !== st.length) throw new Error('repeated stat ' + s[0]); if (s[2] === 'Jewel' && s[4].split(';').length > 4) throw new Error('jewel >4 props ' + s[0]); }
SPECIAL.push(...SPECIAL6);
U.push(...SPECIAL6);

// ---- 7차 추가: 세트 60 / 룬워드 150 / 유니크 270 + 부적 15·주얼 15 (뒤에 붙여 기존 rnd 순서 유지)
const SN7 = toSN(`Hayloft Drifters 건초다락 떠돌이|Lockwarden Guild 자물쇠지기 조합|Shalebrook Trappers 셰일시내 덫사냥꾼|Gorsefield Yeomen 가시금작화 자영농|Inkwell Clerks 잉크병 서기단|Cloverhill Folk 토끼풀언덕 사람들|Stonebridge Tollmen 돌다리 통행세꾼|Lichenwall Monks 지의벽 수도사|Puddlejump Tinkers 물웅덩이 땜장이|Wheatgold Reapers 밀금빛 추수꾼|Kettleblack Cooks 솥검댕 요리사|Pebbleshore Gleaners 조약돌해안 이삭줍기|Cragmoss Hermits 바위이끼 은자|Lowfield Wardens 낮은들 파수꾼|Burrowdeep Diggers 굴깊이 굴착꾼|Dovecote Messengers 비둘기장 전령|Haywain Caravan 건초마차 대상|Sootfinger Smiths 검댕손 대장장이|Marshlight Lurkers 습지빛 잠복자|Tanglewood Poachers 엉킨숲 밀렵꾼|Ropewalk Sailors 밧줄길 선원|Glassblow Artisans 유리불기 장인|Fernhollow Seers 고사리골 예언자|Ashlar Masons 마름돌 석공|Driftice Sealers 유빙 물개잡이|Candlewick Nuns 촛심지 수녀회|Brookmill Millers 시냇방앗간 방앗간지기|Hillfort Pikemen 언덕성채 창병|Saltpan Workers 염전 일꾼|Sheepfold Watch 양우리 감시대|Bonfire Revelers 모닥불 축제꾼|Chimneyrock Climbers 굴뚝바위 등반가|Plowshare Militia 보습날 민병대|Wellspring Healers 샘물 치유사|Cobweb Thieves 거미줄 도둑단|Mapleshade Bards 단풍그늘 음유시인|Grindstone Brothers 맷돌 형제단|Larkspur Couriers 참제비고깔 파발꾼|Cedarhall Lords 삼나무전당 영주|Duneglass Wanderers 모래유리 방랑자|Icefloe Hunters 얼음뗏목 사냥꾼|Timberwolf Scouts 회색늑대 정찰대|Gullcry Pirates 갈매기울음 해적|Rookery Spies 떼까마귀둥지 첩자|Furrowmark Farmers 밭고랑 농부단|Chainmail Sergeants 사슬갑옷 부사관|Lampblack Scribes 그을음먹 필경사|Thornhedge Keepers 가시울타리 지기|Peakwind Herders 봉우리바람 목자|Ravenhill Mourners 까마귀언덕 조문객|Mudbrick Builders 진흙벽돌 건축가|Tidepool Divers 조수웅덩이 잠수부|Goldleaf Gilders 금박장이 조합|Snowdrift Couriers 눈더미 파발꾼|Harvestmoon Dancers 추수달 춤꾼|Bonfirehill Clan 횃불언덕 씨족|Stormglass Navigators 폭풍유리 항해사|Woolgather Spinners 양털모음 실잣기|Quarrystone Guard 채석돌 경비대|Coalpit Delvers 탄갱 탐굴꾼`);
const CSN7 = toSN(`Windlark Amazon 바람종다리 아마존|Thornbow Amazon 가시활 아마존|Starflare Sorceress 별섬광 여마법사|Embercoil Sorceress 잉걸고리 여마법사|Cryptlace Necromancer 납골레이스 강령술사|Ashbone Necromancer 잿뼈 강령술사|Dawnward Paladin 새벽수호 성기사|Bronzevow Paladin 청동서원 성기사|Skullbreak Barbarian 해골깨기 야만전사|Stonefist Barbarian 돌주먹 야만전사|Mossclaw Druid 이끼발톱 드루이드|Rainhorn Druid 빗뿔 드루이드|Smokestep Assassin 연기걸음 암살자|Glintknife Assassin 번뜩칼 암살자`);
if (SN7.length < 51 || CSN7.length < 9) throw new Error('not enough free set names ' + SN7.length + '/' + CSN7.length);
const CLS7 = { Amazon: 0, Sorceress: 1, Necromancer: 2, Paladin: 3, Barbarian: 4, Druid: 5, Assassin: 6 };
const SPEC7 = [...SN7.slice(0, 51).map((s, i) => [Math.round(5 + (85 * i) / 50), 2 + ((i * 3) % 5), -1, s]), ...CSN7.slice(0, 9).map((s, i) => [26 + ((i * 17) % 60), 4 + (i % 3), CLS7[s[0].split(' ')[1]], s])];
SPEC7.forEach(([lv, np, cl, [sen, sko]]) => {
  taken.add(sen);
  const slots = [...(cl >= 0 ? [CLSLOT[cl]] : []), ...shuffle([...SLOTS, 'missile'].filter(s => s !== ({ 2: 'shield', 3: 'shield', 4: 'helm', 5: 'helm' })[cl]))].slice(0, np);
  const items = slots.map(c => {
    const [pe, pk] = PIECE[c].split(' '), bn = pick(near(c, lv).length ? near(c, lv) : byCat[c]);
    const pen = `${sen.split(' ')[0]}'s ${pe}`; taken.add(pen);
    return [pen, `${sko.split(' ')[0]}의 ${pk}`, bn, lv + Math.floor(rnd() * 4), roll(POOL[c], lv, 2 + Math.floor(rnd() * 2)), roll(C, lv, 1)];
  });
  const partial = [0, 1, 2, 3].map(k => (k < np - 1 ? roll(C, lv, 1) : ''));
  const full = (cl >= 0 ? `cls${cl} 2;` : '') + roll([...C, ['ll', 3, 7], ['fcr', 10, 20], ['ias', 10, 20], ['dr', 2, 10], ['frw', 10, 30]], lv, 3);
  SETS.push([sen, sko, partial, full, items]);
});
const RWN7 = `Acornshield=도토리방패|Alderflame=오리나무불꽃|Amberfrost=호박서리|Anvilfall=모루낙하|Applebloom=사과꽃|Arrowrain=화살비|Ashwillow=잿버들|Autumnhorn=가을뿔피리|Badgerclaw=오소리발톱|Barleycorn=보리알|Basaltvow=현무서원|Beaconfire=봉화불|Beehive=벌집|Bellstrike=종울림|Birchwind=자작바람|Blackthorn=검은가시나무|Blizzardheart=눈보라심장|Bonecairn=뼈돌무덤|Bramblewind=찔레바람|Brassbell=놋종|Breakwater=방파제|Brightwater=밝은물|Brookstone=시냇돌|Bronzewing=청동날개|Burrowlight=굴빛|Candleflame=촛불꽃|Cedarsong=삼나무노래|Chalkwind=백악바람|Chimeheart=풍경심장|Cinderfall=잿불낙하|Clayhorn=진흙뿔|Cliffwatch=절벽감시|Cloudhorn=구름뿔피리|Cloverleaf=토끼풀잎|Coalwind=석탄바람|Cobblesong=조약돌노래|Copperleaf=구리잎|Crowfeather=까마귀깃털|Crystalbrook=수정시내|Daggerwind=단검바람|Dappleshade=얼룩그늘|Dawnfrost=새벽서리|Deepfrost=깊은서리|Dewlight=이슬빛|Dovewing=비둘기날개|Dragonmoss=용이끼|Driftsnow=날린눈|Duneshade=모래언덕그늘|Duskflame=황혼불꽃|Eaglecrest=독수리볏|Earthsong=대지노래|Elmshade=느릅그늘|Emberstone=잉걸돌|Evergreen=상록|Falconwind=매바람|Farrowmoon=새끼돼지달|Featherfall=깃털낙하|Fernsong=고사리노래|Fireflower=불꽃꽃|Flintheart=부싯돌심장|Foxglove=디기탈리스|Frostbloom=서리꽃|Gildedvow=금박서원|Glacierheart=빙하심장|Gloomroot=음울뿌리|Goldmoss=금이끼|Granitevow=화강서원|Grassblade=풀잎칼|Greywind=회색바람|Hailfire=우박불|Hawkfeather=매깃털|Hazelwind=개암바람|Heatherbloom=헤더꽃|Hillsong=언덕노래|Hollystone=호랑가시돌|Honeycomb=벌꿀집|Hornbeam=서어나무|Iceshard=얼음조각|Inkshadow=먹그림자|Ironbark=철나무껍질|Ivyheart=담쟁이심장|Jadewind=비취바람|Juniperflame=노간주불꽃|Kettledrum=케틀드럼|Lakeshade=호수그늘|Lanternwind=등불바람|Larkspur=참제비고깔|Leafstorm=잎폭풍|Lilyveil=백합장막|Limestone=석회석|Lynxeye=스라소니눈|Maplewind=단풍바람|Meadowlight=초원빛|Millstone=맷돌|Mistfall=안개낙하|Moonpetal=달꽃잎|Mossfire=이끼불|Mudlantern=진흙등불|Nightfrost=밤서리|Oakenshield=참나무방패|Onyxwind=줄마노바람|Orchardsong=과수원노래|Otterbrook=수달시내|Pearlwater=진주물|Pebblewind=조약돌바람|Pinefrost=솔서리|Plumebright=밝은깃장식|Poppyfield=양귀비밭|Quartzlight=석영빛|Rainbell=빗방울종|Reedsong=갈대노래|Ridgewind=능선바람|Rimefall=서리낙하|Rockrose=바위장미|Rosethorn=장미가시|Rubyflame=루비불꽃|Rushwater=골풀물|Saffronveil=사프란장막|Sandstorm=모래폭풍|Shalewind=셰일바람|Shellsong=조개노래|Silverleaf=은잎|Skyhorn=하늘뿔피리|Slatefire=점판불|Smokeveil=연기장막|Snowpetal=눈꽃잎|Sparrowsong=참새노래|Spruceheart=가문비심장|Starmoss=별이끼|Stonebloom=돌꽃|Stormpetal=폭풍꽃잎|Sunpetal=햇꽃잎|Swanfeather=백조깃털|Thistlewind=엉겅퀴바람|Thornfrost=가시서리|Thunderbell=천둥종|Timberfall=목재낙하|Topazwind=황옥바람|Torchlight=횃불빛|Twilightbloom=땅거미꽃|Valleysong=골짜기노래|Violetflame=제비꽃불꽃|Walnutshell=호두껍질|Waterlily=수련|Wheatfield=밀밭|Whitethorn=흰가시나무|Wildfrost=야생서리|Willowsong=버들노래|Windbell=바람종|Winterbloom=겨울꽃|Wolfpaw=늑대발|Woodsmoke=나무연기|Wrenfeather=굴뚝새깃털|Yarrowlight=톱풀빛|Yewfrost=주목서리|Zephyrsong=산들바람노래|Alpenglow=산노을|Bracken Hymn=고사리 찬가|Cinder Rose=잿불 장미|Frost Lantern=서리 등불|Iron Psalm=강철 시편|Lantern Oath=등불 맹세|Mossy Crown=이끼 왕관|Pale Harvest=창백한 수확|Quiet Thunder=고요한 천둥|Silver Dusk=은빛 황혼|Velvet Night=벨벳 밤|Winter Ember=겨울 잉걸|Hollow Oak=빈 참나무|Glass Tide=유리 물결|Copper Dawn=구리 새벽|Amber Lullaby=호박 자장가|Ashen Lullaby=잿빛 자장가|Birch Requiem=자작 진혼곡|Bramble Psalm=찔레 시편|Cobalt Hymn=코발트 찬가|Crimson Psalm=진홍 시편|Dusky Meadow=어스름 초원|Ember Lullaby=잉걸 자장가|Fallow Moon=묵은밭 달|Fennel Dawn=회향 새벽|Gentle Gale=순한 돌풍|Gilded Hymn=금박 찬가|Granite Lullaby=화강 자장가|Hazel Psalm=개암 시편|Ivory Tide=상아 물결|Juniper Hymn=노간주 찬가|Lilac Thunder=라일락 천둥|Linen Banner=아마포 깃발|Marble Lantern=대리석 등불|Mulberry Dusk=뽕나무 황혼|Nettle Psalm=쐐기풀 시편|Olive Dawn=올리브 새벽|Plum Tempest=자두 폭풍|Rowan Oath=마가목 맹세|Rustic Hymn=소박한 찬가|Sable Lullaby=흑담비 자장가|Teal Requiem=청록 진혼곡|Thistle Psalm=엉겅퀴 시편|Umber Tide=암갈 물결|Walnut Oath=호두 맹세|Wheat Requiem=밀 진혼곡|Willow Psalm=버들 시편|Wren Lullaby=굴뚝새 자장가|Saffron Dawn=사프란 새벽|Indigo Ember=쪽빛 잉걸`.split('|').map(s => s.split('=')).filter(([en]) => free(en)).slice(0, 150);
if (RWN7.length < 150) throw new Error('not enough free rw names ' + RWN7.length);
RWN7.forEach(([en, ko], i) => {
  taken.add(en);
  const lv = Math.round(4 + (86 * i) / (RWN7.length - 1)), type = RTY2[(i * 13) % RTY2.length];
  const hi = Math.min(runeOrder.length - 1, Math.round((lv / 85) * runeOrder.length));
  const n = Math.min(6, 2 + Math.floor(rnd() * 3) + (lv > 50 ? 1 : 0) + (lv > 75 ? 1 : 0));
  let seq;
  do { seq = Array.from({ length: n }, () => runeOrder[Math.max(0, hi - Math.floor(rnd() * 10))]).join(' '); } while (seqs.has(seq));
  seqs.add(seq);
  RW.push([en, ko, seq, type, roll(POOL[RPOOL[type]], lv, n + 1)]);
});
// 일반 장비 유니크 270 (베이스를 섞어 고르고 이름은 아래 목록 순서대로 직접 지정)
const N7 = `Censer of Penance|참회의 향로
Plaguebolt Engine|역병화살 기계
Frostbarrow Wall|서리고분 벽
Treasure-Hunter's Wraps|보물사냥꾼의 손목싸개
Grinning Warden|웃는 파수해골
Skyward Verdict|하늘의 판결
Hearthwall|화롯담
Fiendcleaver Poleaxe|마귀쪼개기 폴액스
Icewind Arbalest|얼음바람 쇠뇌
Phantom's Toss|유령의 투척
Hellknuckle|지옥주먹마디
Hawkeye Veil|매눈 가리개
Wintercleave|겨울가르기
Pilgrim's Bulwark|순례자의 방벽
Nightwarden's Shell|밤파수꾼의 껍질
Exhumer's Rod|발굴자의 막대
Winterglass Eye|겨울유리 눈
Tricolor Talons|삼색 갈고리
Stormsnare|폭풍올가미
Forgefall|대장간 낙하
Frostbitten Headsman|동상 입은 망나니
Tempest Shaft|폭풍자루
Penitent Spike|참회의 못
Woodsman's Wrath|나무꾼의 분노
Boarsplitter|멧돼지쪼개기
Highland Thunder|고지대의 천둥
Chapel Gavel|예배당 의사봉
Mercenary's Oath|용병의 맹세
Gravedust Twig|무덤먼지 잔가지
Ironhorn Crown|무쇠뿔 왕관
Glacial Penance|빙하의 속죄
Tinker's Splints|땜장이의 부목
Goldleaf Coronet|금잎 보관
Rift of Cinders|잿불 균열
Apprentice's Prism|견습생의 프리즘
Ribcage of Plenty|풍요의 갈비뼈
Vagabond's Mail|부랑자의 사슬갑옷
Barbed Heirloom|가시 박힌 가보
Caravan Treads|대상의 발길
Stablehand's Grips|마구간지기 장갑
Squire's Bolter|종자의 석궁
Threefold Path|세 갈래 길
Prismscale Hauberk|프리즘비늘 갑옷
Bloodknuckle|피맺힌 주먹
Cryptsplitter|묘실쪼개기
Emberflange|잉걸 철퇴날
Thunderwell Stone|천둥샘 돌
Plaguewarden Mail|역병수호 갑옷
Frostflame Web|서리불꽃 거미줄
Dunewalker Carapace|모래언덕 등딱지
Clanhold Helm|씨족성채 투구
Trollhide Purse|트롤가죽 전대
Ploughman's Belt|쟁기꾼의 허리띠
Acolyte's Halo|수행자의 광륜
Ancestor's Embrace|선조의 품
Dunestrike Scimitar|모래일격 언월도
Twinbane|쌍멸
Thornhalo|가시광륜
Hallowpoint|성별된 창끝
Nightmoth Veil|밤나방 장막
Elderbark Visage|노목껍질 낯
Butcher's Frost|도축자의 서리
Viper's Two Tongues|독사의 두 혀
Sentry's Burden|보초의 짐
Gilded Lacquer|금칠 옻판금
Sage of Storm and Ember|폭풍과 잉걸의 현자
Embalmer's Needle|방부사의 바늘
Sepulchre Finger|묘소의 손가락
Hellwidow|지옥과부
Frostjarl's Crown|서리족장의 왕관
Valkyrie's Spark|발키리의 불꽃
Pyre Hands|화장단 손
Discord Mail|불화의 갑옷
Marrowpick|골수송곳
Altar Boy's Mace|복사의 철퇴
Crusade's End|성전의 끝
Rod of Last Rites|종부성사의 홀
Thunderpick|천둥곡괭이
Glacier Lance|빙하 장창
Graveyard Sprig|묘지 잔가지
Ratcatcher's Wand|쥐잡이 지팡이
Twinflare|쌍불꽃
Gravemower|무덤베기
Sexton's Prize|교회지기의 전리품
Venomglint Bow|독광채 활
Winter's Verdict|겨울의 판결
Courier's Kite|전령의 연방패
Stormbeard Helm|폭풍수염 투구
Crowfrost|까마귀서리
Dreamwild|꿈야생
Bristleplate|가시털 판금
Hedge Scholar's Staff|떠돌이 학자의 지팡이
Glimmerglobe|가물빛 구체
Scavenger's Pot|넝마꾼의 냄비투구
Taskmaster's Knout|감독관의 채찍
Whirlpool Crystal|소용돌이 수정
Swampwing Hatchet|늪날개 손도끼
Northern Champion|북방의 투사
Sunset Corona|저녁노을 보관
Poltergeist Mail|소란유령 갑옷
Tusk of Embers|잉걸 엄니
Signalfire Longbow|신호불 장궁
Fledgling Oath|햇병아리 맹세
Cathedral Staff|대성당 지팡이
Wyrmguard|용수호
Bonepicker's Helm|뼈줍개 투구
Farmhand's Greatsword|농부의 대검
Watchman's Bill|야경꾼의 미늘창
Militia Breastplate|민병대 흉갑
Imp-Skin Jerkin|임프가죽 조끼
Flickerblade|깜박임검
Duelist's Spark|결투자의 불씨
Beacon Pike|봉화 장창
Wasp's Kiss|말벌의 입맞춤
Clasp of Embers|잉걸 걸쇠
Brawler's Wraps|싸움꾼의 붕대
Pyrebrand Axe|화장낙인 도끼
Ritual Kris|의식의 단검
Sunpiercer|태양꿰뚫개
Gravedigger's Hatchet|무덤지기 손도끼
Rimevenom Javelin|서리독 투창
Silver Sentence|은빛 선고
Hollow Prince|공허의 왕자
Dawnhammer Scepter|여명망치 홀
Quicksilver Fang|수은 송곳니
Riddle of Thunder|천둥의 수수께끼
Ghoulward|구울막이
Featherstorm Crown|깃털폭풍 관
Raider's Brow|약탈자의 이마
Smuggler's Girdle|밀수꾼의 허리띠
Barbwire Fleece|철조망 양털
Mourner's Helm|문상객의 투구
Gatehouse Casque|성문루 투구
Crowcall|까마귀부름
Ashstorm Bow|잿폭풍 활
Feral Tempest|야성의 폭풍
Seraph's Lament|천사의 비가
Banshee's Finger|밴시의 손가락
Tinsmith's Mail|양철장이 갑옷
Lord Regent's Plate|섭정공의 판금
Cub's Jaw|새끼곰 턱투구
Frosthilt|서리손잡이
Pilgrimage Ward|순례 수호방패
Kestrel's Brow|황조롱이 이마
Mummer's Mask|광대 가면
Gullwing Helm|갈매기날개 투구
Glacierfall Mallet|빙하붕괴 망치
Sparkwell Stone|불꽃샘 돌
Ashen Sickle|잿빛 낫
Leviathan's Barb|리바이어던의 미늘
Cedarbough|삼나무 가지
Prismstring|프리즘시위
Serpent Flame|뱀불꽃
Zealot's Vow|광신자의 서원
Purifier's Halberd|정화자의 미늘창
Thunderwing|천둥날개
Scaleshard Hide|비늘조각 가죽
Gilded Parade Plate|열병식 판금
Wavering Edge|일렁이는 칼날
Yeoman's Plate|자영농 판금
Hedgehog Mail|고슴도치 갑옷
Peddler's Boots|행상인의 장화
Giant's Pyre|거인의 화장단
Icebiter|얼음물기
Stalker's Guise|추적자의 탈
Templar's Falx|성전기사의 낫칼
Dawnspike|새벽가시
Fisher's Spear|낚시꾼의 창
Aspergillum of Ash|잿빛 성수채
Sergeant's Plate|부사관의 판금
Carp-Scale Coat|잉어비늘 외투
Whisperpoint|속삭이는 칼끝
Alley Cat's Claw|골목고양이 발톱
Footman's Sallet|보병의 샐릿
Frostspinner|서리팽이
Pitchfork of Judgement|심판의 쇠스랑
Relic of Storms|폭풍의 유물
Steeple Helm|종탑 투구
Marsh Viper|늪독사
Porter's Belt|짐꾼의 허리띠
Moonsilver Circlet|달은 서클릿
Gravewarden Blade|묘지파수 검
Crossbowman's Pavise|석궁병의 방패
Hilltroll Blade|언덕트롤 검
Pugilist's Cestus|권투가의 주먹싸개
Ferryman's Bardiche|뱃사공의 도끼창
Fable's End|전설의 끝
Packleader's Brow|무리지기의 이마
Hailstone Mace|우박 철퇴
Bloodmoon Spirit|핏빛달 영혼
Smokeglass Sphere|연기유리 구체
Plowman's Boots|밭갈이 장화
Stoneroot Spirit|돌뿌리 영혼
Wandering Adept's Staff|방랑 숙련자의 지팡이
Frostfire Reaver|서리불 약탈자
Thornknot Club|가시매듭 곤봉
Sphinx's Riddle|스핑크스의 수수께끼
Skyroot Totem|하늘뿌리 토템
Rampart Bow|성벽 활
Wristguards of the Watch|경비대 손목보호대
Giantking's Girdle|거인왕의 허리띠
Abyssal Shell|심연의 껍데기
Quartermaster's Belt|병참장교 허리띠
Five-Finger Fang|다섯손가락 송곳니
Legionary's Scutum|군단병 스쿠툼
Bloodless Grasp|핏기없는 손아귀
Gleaner's Mitts|이삭줍기 장갑
Chainthorn Coat|사슬가시 외투
Tyrant's Storm|폭군의 폭풍
Lumberjack's Pair|벌목꾼의 쌍날
Merchant Prince's Boots|상인왕자의 장화
Sunspear of the Matron|가모장의 태양창
Berserker's Grimace|광전사의 찡그림
Urchin Buckler|성게 방패
Highwayman's Jerkin|노상강도 조끼
Maelstrom Eye|큰소용돌이 눈
Hellbrow|지옥이마
Infernal Anvil Plate|지옥모루 판금
Sulfurtongue Lance|유황혀 창
Temptress Skull|유혹녀의 해골
Graverobber's Cap|도굴꾼 모자
Shears of Hallow|성스러운 가위
Hedgerow Bow|산울타리 활
Cold Heart of Hell|지옥의 냉심장
Rat-King's Bolter|쥐왕의 석궁
Royal Oath|왕실의 맹세
Courtier's Fury|궁신의 격노
Thunderbird Tomahawk|천둥새 토마호크
Deckhand's Falchion|갑판원의 팔시온
Hedgeguard|울타리방패
Rattling Repeater|덜컹 연발쇠뇌
Page's Shortsword|시동의 단검
Stormember Hatchet|폭풍잉걸 손도끼
Adder-Skin Coat|살무사가죽 외투
Matron's Venom|가모장의 독
Skirmisher's Blade|척후병의 검
Beetleback Treads|딱정벌레등 신발
Ogre's Appetite|오우거의 식욕
Last Rampart|마지막 누벽
Poacher's Bow|밀렵꾼의 활
Barber's Blades|이발사의 칼날
Squire's Promise|종자의 약속
Embossed Covenant|돋을새김 맹약
Pauper's Crown|빈민의 왕관
Exorcist's Cudgel|퇴마사의 곤봉
Gutter Poignard|시궁 비수
Skull of the Crimson Lord|진홍군주의 해골
Brawlhouse Mace|싸움판 철퇴
Sanctum Plate|성소의 판금
Ironmonger's Gloves|철물상 장갑
Herald's Crest|전령의 문장
Cutthroat's Wrist|목따개 손목칼
Stormanvil|폭풍모루
Maiden's First Hunt|처녀의 첫 사냥
Bladewall|칼날벽
Runespark|룬불꽃
Voidcutter|공허가르개
Elderfrost Axe|태고서리 도끼
Hellgate Halberd|지옥문 미늘창
Skirmish Javelin|소전투 투창
Matron's Gale|가모장의 돌풍
Reefshark Hide|암초상어 가죽
Mummy's Grin|미라의 웃음
Fawnhunter|새끼사슴 사냥꾼
Fetish King's Trophy|주물왕의 전리품
Glorybringer|영광의 인도자
Purgefire Greatblade|정화불 대검
Castellan's Armet|성주의 아멧
Reefrunner Boots|암초달리기 장화
Smithy's Pride|대장간의 자랑`.split('\n').map(l => l.split('|'));
if (N7.length !== 270) throw new Error('N7 count ' + N7.length);
{ const bad = N7.filter(([en]) => !free(en)).map(n => n[0]); if (bad.length) throw new Error('N7 name taken: ' + bad.join(', ')); N7.forEach(([en]) => taken.add(en)); }
shuffle(BN).slice(0, 270).forEach((bn, i) => {
  const b = IS.bases[bn], c = cat(bn, b), lv = /^(Ring|Amulet)$/.test(bn) ? 30 + Math.floor(rnd() * 55) : baseLv(b);
  uname(c); // 예전 자동 이름이 쓰던 rnd 소비를 그대로 유지해 옵션 수치가 바뀌지 않게 함
  const [en, ko] = N7[i];
  U.push([en, ko, bn, String(lv), roll(POOL[c], lv, 4 + Math.floor(rnd() * 3))]);
});
// 유니크 부적 15·주얼 15
const SPECIAL7 = `
Cobbler's Hobnail|구두장이의 징|Small Charm|11|hp 10 15;fhr 4
Kindling Twig|불쏘시개 잔가지|Small Charm|15|fdmg 3 9;mana 5 10
Icicle Bead|고드름 구슬|Small Charm|17|cdmg 2 6;hp 5 10
Thunder Pebble|천둥 조약돌|Small Charm|19|ldmg 1 15;dex 1 2
Spider's Silk|거미줄 명주|Small Charm|23|pdmg 20 40;vit 1 2
Shiny Button|반짝 단추|Small Charm|32|gold 10 20;mf 4 7
Whetted Flint|간 부싯돌|Small Charm|45|maxdam 2 3;ar 20 35
Quill Pen|깃펜|Small Charm|54|mana 15 20;ene 2 3
Weaver's Shuttle|베틀북|Large Charm|24|fres 8 12;lres 8 12
Hunting Whistle|사냥 호루라기|Large Charm|36|frw 5;dex 3 5;ar 20 40
Ironbound Tome|쇠장정 책|Large Charm|48|mana 15 25;mreg 5 8;fhr 5
Ploughman's Charm|쟁기꾼의 부적|Large Charm|60|hp 20 25;str 3 5;dr 1 2
Old King's Coin|옛 왕의 금화|Grand Charm|44|gold 30 50;mf 8 12;allres 4 6
Bulwark Rivet|성벽 리벳|Grand Charm|56|ac 40 60;dr 2 3;hp 25 35
Wildfire Seed|들불 씨앗|Grand Charm|70|fdmg 8 22;ldmg 1 35;ed 8 12
Morning Garnet|아침 석류석|Jewel|20|hp 10 15;str 3 5;hpreg 2 3
Rainwater Pearl|빗물 진주|Jewel|26|mana 10 15;mreg 6 10;cres 10 15
Coal Eye|숯눈|Jewel|29|fdmg 8 20;ed 10 15;fres 10 15
Frozen Hailstone|얼어붙은 우박돌|Jewel|31|cdmg 5 12;ar 30 50;cres 10 15
Spark Beryl|불티 녹주석|Jewel|33|ldmg 1 40;ias 5;lres 10 15
Nightshade Jade|벨라돈나 비취|Jewel|37|pdmg 45 90;dex 4 6;pres 10 15
Shepherd's Agate|목자의 마노|Jewel|41|allres 8 10;hp 10 15;fhr 5
Iron Garnet|무쇠 석류석|Jewel|45|ac 40 60;str 5 7;dr 2 3
Owl's Topaz|올빼미 황옥|Jewel|49|ar 50 80;dex 5 7;lrad 1
Monk's Jet|수도승의 흑옥|Jewel|53|undead 25 35;demon 25 35;mana 10 15
Swift Opal|날랜 오팔|Jewel|57|ias 10;frw 5;dex 4 6
Ember Heart|잉걸 심장석|Jewel|63|ed 25 35;fdmg 10 25;ll 2 4
Winter Moonstone|겨울 월장석|Jewel|67|cres 20 25;coldm 2 3;hp 15 20
Scholar's Sapphire|학자의 사파이어|Jewel|73|fcr 5;ene 5 8;ml 3 5
Kingmaker Ruby|킹메이커 루비|Jewel|82|ed 30 40;ar 80 120;cb 5 7;hp 15 20`.trim().split('\n').map(l => l.split('|'));
{ const bad = SPECIAL7.filter(([en]) => !free(en)).map(s => s[0]); if (bad.length) throw new Error("special name taken " + bad); SPECIAL7.forEach(([en]) => taken.add(en)); }
for (const s of SPECIAL7) { const st = props(s[4]).flatMap(p => p.stats.map(x => x.stat)); if (new Set(st).size !== st.length) throw new Error('repeated stat ' + s[0]); if (s[2] === 'Jewel' && s[4].split(';').length > 4) throw new Error('jewel >4 props ' + s[0]); }
SPECIAL.push(...SPECIAL7);
U.push(...SPECIAL7);

// ---- 밸런스 보정 (rnd를 쓰지 않아 기존 생성 순서·룬열은 그대로)
// 자동 생성 세트(앞 8개 수작업 제외): 부분/풀 보너스끼리, 아이템 보너스와 자기 옵션끼리 같은 스탯이 겹치면 안 쓴 C 옵션으로 교체
const statsOf = (src) => (src ? src.split(';').flatMap(t => A[t.trim().split(/\s+/)[0]].map(s => s.stat)) : []);
const cVal = ([k, a, b], lv) => { const v = Math.max(1, Math.round(a + (b - a) * Math.min(1, lv / 85))); return FIXED.has(k) || v < 5 ? `${k} ${v}` : `${k} ${Math.round(v * 0.8)} ${v}`; };
const dedupe = (src, used, lv, salt) => (src ? src.split(';').map(t => {
  const st = A[t.trim().split(/\s+/)[0]].map(s => s.stat);
  if (!st.some(s => used.has(s))) { st.forEach(s => used.add(s)); return t; }
  for (let j = 0; j < C.length; j++) { const c = C[(salt + j) % C.length]; if (!A[c[0]].some(s => used.has(s.stat))) { A[c[0]].forEach(s => used.add(s.stat)); return cVal(c, lv); } }
  throw new Error('dedupe exhausted');
}).join(';') : src);
SETS.slice(8).forEach((s, si) => {
  const lv = Math.min(...s[4].map(i => i[3])), used = new Set();
  s[2] = s[2].map((p, k) => dedupe(p, used, lv, si + k));
  s[3] = dedupe(s[3], used, lv, si + 7);
  s[4].forEach((it, k) => { it[5] = dedupe(it[5], new Set(statsOf(it[4])), lv, si + k); });
});

// ---- 검증 + 조립
const err = [];
const allStats = new Set(Object.keys(IS.stats));
const usedNames = new Set();
const banned = new Set([...Object.keys(IS.uniques), ...Object.keys(RE.uniques), ...Object.keys(IS.setItems), ...Object.keys(IS.sets), ...Object.keys(IS.runewords)]);
const name = (n) => { if (usedNames.has(n)) err.push('dup ' + n); if (banned.has(n)) err.push('collision ' + n); usedNames.add(n); };
const base = (b, n) => { if (!IS.bases[b]) err.push('bad base ' + b + ' (' + n + ')'); };
const chk = (ps, n) => { for (const p of ps) for (const s of p.stats) if (!allStats.has(s.stat)) err.push('bad stat ' + s.stat + ' (' + n + ')'); return ps; };
const P = (src, n) => (src ? chk(props(src), n) : []);

const out = { uniques: {}, drops: [], ko: {}, setItems: {}, sets: {}, setDrops: [], runewords: {}, special: SPECIAL.map(s => s[0]) };
for (const [en, ko, b0, lv, src] of U) {
  const b = b0.replace('?', '').trim();
  name(en); base(b, en);
  out.uniques[en] = { level: +lv, props: P(src, en) };
  out.drops.push([en, b, Math.min(99, +lv + 3)]);
  out.ko[en] = ko;
}
for (const [sn, sko, partial, full, items] of SETS) {
  name(sn); out.ko[sn] = sko;
  out.sets[sn] = { partial: partial.map(s => P(s, sn)), full: P(full, sn) };
  for (const [en, ko, b, lv, src, bonus] of items) {
    name(en); base(b, en); out.ko[en] = ko;
    out.setItems[en] = { level: lv, props: P(src, en), bonus: [P(bonus, en)], bonusBy: 'item', set: sn };
    out.setDrops.push([en, sn, b, Math.min(99, lv + 3)]);
  }
}
const seen = new Set(), runeSet = new Set(Object.keys(IS.runes)), vrw = new Set([...VANILLA_RW, ...VRW_PARSED]);
for (const [en, ko, runes, type, src] of RW) {
  name(en); out.ko[en] = ko;
  const rs = runes.split(' ');
  if (rs.length < 2 || rs.length > 6 || rs.some(r => !runeSet.has(r))) err.push('bad runes ' + en);
  if (vrw.has(runes)) err.push('vanilla rune sequence ' + en);
  if (seen.has(runes)) err.push('dup rune sequence ' + en); seen.add(runes);
  out.runewords[en] = { name: en, runes: rs, types: [type], props: P(src, en) };
}
if (err.length) { console.error(err.join('\n')); process.exit(1); }

fs.writeFileSync(path.join(__dirname, 'remod-items.json'), JSON.stringify(out, null, 1));
const SLOT = [['ring', /^Ring$/], ['amulet', /^Amulet$/], ['boots', /Boots|Greaves/], ['belt', /Sash|Belt|Girdle|Coil|Cord/],
  ['gloves', /Gloves|Mitts|Bracers|Gauntlets|Vambraces/], ['class', /Wolf Head|Totemic|Sky Spirit|Jawbone|Avenger|Fury|Preserved|Minion|Hellspawn|Targe|Rondache|Orb|Shard|Katar|Quhab|Suwayyah|Maiden|Ceremonial Bow|Matriarchal/],
  ['helm', /Cap|Helm|Crown|Circlet|Coronet|Diadem|Armet|Corona|Demonhead|Mask|Casque/], ['shield', /Buckler|Shield|Scutum|Monarch|Aegis|Ward$/],
  ['armor', /Armor|Mail|Plate|Quilted|Coat|Husk|Cuirass|Hauberk|Wyrmhide|Shroud|Shell/]];
const tally = {};
for (const [, b] of out.drops) { const k = (SLOT.find(([, r]) => r.test(b)) || ['weapon'])[0]; tally[k] = (tally[k] || 0) + 1; }
console.log('uniques', U.length, 'sets', SETS.length, 'setItems', Object.keys(out.setItems).length, 'runewords', RW.length);
console.log(JSON.stringify(tally));
