import Phaser from 'phaser';
import { AudioService } from '../core/AudioService';
import { COLORS, TRIP_CASTS } from '../core/GameConfig';
import { PortalBridge } from '../core/PortalBridge';
import { SaveService } from '../core/SaveService';
import { FISH, fishFlipXForDirection, type Fish } from '../gameplay/Fish';
import { TREASURES, type TreasureId } from '../gameplay/Treasure';
import { TripState } from '../gameplay/TripState';

type Phase='CAST'|'FLIGHT'|'UNDERWATER'|'RETRACTING'|'RESULT';
type Target={fish:Fish;sprite:Phaser.GameObjects.Image;aura:Phaser.GameObjects.Arc;badge:Phaser.GameObjects.Text;slots:number;capture:number;direction:number;speed:number;baseY:number;phase:number};

export class PierGameplayScene extends Phaser.Scene {
  private phase:Phase='CAST'; private trip!:TripState; private castQuality=0; private marker=0; private markerDir=1;
  private surface!:Phaser.GameObjects.Container; private underwater?:Phaser.GameObjects.Container; private overlay?:Phaser.GameObjects.Container;
  private title!:Phaser.GameObjects.Text; private help!:Phaser.GameObjects.Text; private meter!:Phaser.GameObjects.Graphics;
  private angler!:Phaser.GameObjects.Image; private bobber!:Phaser.GameObjects.Arc;
  private hookPos=new Phaser.Math.Vector2(480,92); private hookTarget=new Phaser.Math.Vector2(480,92); private anchor=new Phaser.Math.Vector2(480,70);
  private rope!:Phaser.GameObjects.Graphics; private hookArt!:Phaser.GameObjects.Graphics; private captureArt!:Phaser.GameObjects.Graphics;
  private hookSprite!:Phaser.GameObjects.Image;
  private lineText!:Phaser.GameObjects.Text; private basketText!:Phaser.GameObjects.Text; private diveHint!:Phaser.GameObjects.Text;
  private targets:Target[]=[]; private caught:{fish:Fish;sprite:Phaser.GameObjects.Image}[]=[]; private usedSlots=0; private maxSlots=2; private treasureFound=false;
  private treasure?:Phaser.GameObjects.Container; private maxLinePx=590; private lineMeters=22; private pointerSteering=false; private inputLockedUntil=0;
  private trail:Phaser.Math.Vector2[]=[]; private retractIndex=0;
  private keys!:Record<string,Phaser.Input.Keyboard.Key>;
  private reducedMotion=false;
  private surfaceWaterMask?:Phaser.Display.Masks.GeometryMask;
  private surfaceClouds:{sprite:Phaser.GameObjects.Image;speed:number}[]=[];
  private cooler!:Phaser.GameObjects.Image;private collectionModal?:Phaser.GameObjects.Container;private modalOpen=false;
  private currentTreasureId?:TreasureId;

  constructor(){super('Pier')}
  init(){this.trip=new TripState();this.phase='CAST';this.inputLockedUntil=0}
  create(){
    this.reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    PortalBridge.gameplayStart();this.surface=this.add.container(0,0);this.drawSurface();
    this.title=this.add.text(480,28,'',{fontSize:'25px',fontStyle:'bold',color:'#fff6dc',stroke:'#153a4a',strokeThickness:6}).setOrigin(.5).setDepth(100);
    this.help=this.add.text(480,500,'',{fontSize:'20px',fontStyle:'bold',color:'#153a4a',backgroundColor:'#fff6dc',align:'center'}).setPadding(14,9).setOrigin(.5).setDepth(100);
    this.meter=this.add.graphics().setDepth(90);
    this.keys=this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE') as Record<string,Phaser.Input.Keyboard.Key>;
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{
      if(this.modalOpen)return;
      if(this.phase==='CAST'&&this.cooler?.getBounds().contains(p.worldX,p.worldY)){this.openCollection('fish');return}
      this.pointerSteering=true;this.hookTarget.set(p.worldX,p.worldY);this.press();
    });
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(this.pointerSteering)this.hookTarget.set(p.worldX,p.worldY)});
    this.input.on('pointerup',()=>this.pointerSteering=false);
    this.beginCast();
  }
  private drawSurface(){
    const bg=this.add.image(480,270,'bg-pier-cloudless').setDisplaySize(960,540);
    const shade=this.add.rectangle(480,270,960,540,0x153a4a,.06);
    const cloudA=this.add.image(165,126,'surface-clouds','cloud-a').setDisplaySize(216,88);
    const cloudB=this.add.image(486,145,'surface-clouds','cloud-b').setDisplaySize(188,87);
    const cloudC=this.add.image(820,180,'surface-clouds','cloud-c').setDisplaySize(208,85);
    this.surfaceClouds=[{sprite:cloudA,speed:1.45},{sprite:cloudB,speed:1.05},{sprite:cloudC,speed:1.25}];
    const foregroundMaskSource=this.add.graphics().setVisible(false);
    foregroundMaskSource.fillStyle(0xffffff,1)
      .fillRect(39,111,34,248)
      .fillRect(42,119,126,37)
      .fillRect(88,155,39,65)
      .beginPath().moveTo(0,137).lineTo(55,150).lineTo(56,329).lineTo(0,354).closePath().fillPath();
    const foregroundOccluder=this.add.image(480,270,'bg-pier-cloudless').setDisplaySize(960,540).setMask(foregroundMaskSource.createGeometryMask());
    const waterMaskSource=this.add.graphics().setVisible(false);
    waterMaskSource.fillStyle(0xffffff,1).beginPath().moveTo(0,259).lineTo(960,259).lineTo(960,540).lineTo(210,540).lineTo(210,500).lineTo(252,462).lineTo(282,423).lineTo(337,391).lineTo(395,328).lineTo(0,328).closePath().fillPath();
    this.surfaceWaterMask=waterMaskSource.createGeometryMask();
    const farWater=this.add.image(480,404,'menu-water').setDisplaySize(990,590).setAlpha(.12).setBlendMode(Phaser.BlendModes.SOFT_LIGHT).setMask(this.surfaceWaterMask);
    const nearWater=this.add.image(500,425,'menu-water').setDisplaySize(1020,610).setAlpha(.09).setBlendMode(Phaser.BlendModes.SCREEN).setMask(this.surfaceWaterMask);
    const rearPostRipples=this.makePostRipples(false);
    this.cooler=this.add.image(335,328,'hub-cooler').setDisplaySize(78,56).setInteractive({useHandCursor:true}).setDepth(4);
    const save=SaveService.load(),stickers:Phaser.GameObjects.Arc[]=[];
    const stickerColors=[0xffd166,0xef6b4a,0x69d6c5];
    for(let i=0;i<save.coolerStickerTier;i++)stickers.push(this.add.circle(318+i*11,334,4,stickerColors[i]).setStrokeStyle(1,0xfff6dc).setDepth(5));
    this.angler=this.add.image(245,315,'angler-chair-perspective').setDisplaySize(330,220).setDepth(5);
    const frontPostRipples=this.makePostRipples(true);
    this.bobber=this.add.circle(385,270,8,0xef6b4a).setStrokeStyle(3,0xfff6dc).setVisible(false).setDepth(8);
    const top=this.add.rectangle(480,0,960,68,COLORS.navy,.42).setOrigin(.5,0).setDepth(10);
    const zone=this.add.text(22,22,'SUNNY PIER',{fontSize:'18px',fontStyle:'bold',color:'#fff6dc'}).setDepth(11);
    const level=SaveService.levelProgress(save.xp),xpLabel=level.maxed?`${save.xp} XP`:`${level.current}/${level.needed} XP`;
    const progress=this.add.text(938,22,`LEVEL ${level.level}   ${xpLabel}   COINS ${save.coins}`,{fontSize:'15px',fontStyle:'bold',color:'#fff6dc'}).setOrigin(1,0).setDepth(11);
    const coolerHint=this.add.text(335,364,'FISHER BOOK',{fontSize:'11px',fontStyle:'bold',color:'#fff6dc',backgroundColor:'#153a4a'}).setPadding(6,3).setOrigin(.5).setDepth(9);
    this.surface.add([bg,cloudA,cloudB,cloudC,foregroundOccluder,shade,farWater,nearWater,...rearPostRipples,this.cooler,...stickers,this.angler,...frontPostRipples,this.bobber,top,zone,progress,coolerHint]);
    if(!this.reducedMotion){
      this.tweens.add({targets:farWater,x:495,y:406,duration:6800,yoyo:true,repeat:-1,ease:'Sine.inOut'});
      this.tweens.add({targets:nearWater,x:476,y:428,duration:4700,yoyo:true,repeat:-1,ease:'Sine.inOut'});
      this.scheduleSurfaceGull(true);
    }
  }
  private makePostRipples(front:boolean){
    const posts=[{x:253,y:466,w:35,delay:0,duration:3100},{x:365,y:405,w:27,delay:900,duration:3700}];
    return posts.map(({x,y,w,delay,duration})=>{
      const ripple=this.add.graphics().setPosition(x,y).setAlpha(front?.52:.38);
      ripple.lineStyle(front?2:3,front?0xfff6dc:0x69d6c5,1).beginPath();
      if(front)ripple.arc(0,0,w/2,0,Math.PI,false);else ripple.strokeEllipse(0,0,w,Math.max(7,w*.27));
      if(front)ripple.strokePath();
      if(front)ripple.setScale(1,.24);
      if(!this.reducedMotion)this.tweens.add({targets:ripple,scaleX:{from:.86,to:1.12},scaleY:{from:front?.21:.92,to:front?.28:1.06},alpha:{from:front?.52:.34,to:front?.2:.12},duration,yoyo:true,repeat:-1,delay,ease:'Sine.inOut'});
      return ripple;
    });
  }
  private beginCast(){
    this.clearOverlay();this.surface.setVisible(true);this.underwater?.destroy(true);this.underwater=undefined;this.phase='CAST';this.marker=0;this.markerDir=1;this.inputLockedUntil=this.time.now+250;
    this.title.setText(`DIVE ${TRIP_CASTS-this.trip.castsLeft+1} OF ${TRIP_CASTS}`);this.help.setVisible(true).setText('TAP / SPACE TO CAST');this.bobber.setVisible(false);
  }
  private press(){
    if(this.modalOpen||this.time.now<this.inputLockedUntil)return;AudioService.unlock();
    if(this.phase==='CAST')this.cast();else if(this.phase==='RESULT')this.nextDive();
  }
  private cast(){
    this.castQuality=1;this.trip.useCast();this.phase='FLIGHT';this.hideCastMeter();AudioService.cast();this.help.setText('CASTING…');
    this.bobber.setVisible(true).setPosition(385,270).setScale(.5);
    this.tweens.add({targets:this.bobber,x:620,y:350,scale:1,duration:500,ease:'Quad.easeOut',onComplete:()=>{
      AudioService.splash();this.smallSplash(620,350);this.waterRing(620,353);
      if(!this.reducedMotion)this.tweens.add({targets:this.bobber,y:346,scaleX:.92,scaleY:1.08,duration:145,yoyo:true,repeat:1,ease:'Sine.inOut'});
      this.time.delayedCall(240,()=>this.waterRing(620,353,.7));
      this.time.delayedCall(620,()=>this.startUnderwater());
    }});
  }
  private startUnderwater(){
    this.phase='UNDERWATER';this.surface.setVisible(false);this.help.setVisible(false);this.title.setText('');this.hookPos.set(480,92);this.hookTarget.copy(this.hookPos);this.usedSlots=0;this.caught=[];this.treasureFound=false;this.currentTreasureId=undefined;this.targets=[];
    const c=this.underwater=this.add.container(0,0);c.setDepth(20);
    c.add(this.add.image(480,270,'bg-underwater').setDisplaySize(960,540));
    for(let i=0;i<13;i++)c.add(this.add.circle(60+i*78,105+(i%3)*38,3+(i%2)*2,0xb9f0e8,.4));
    for(const [x,y,s] of [[80,440,1],[180,475,.8],[720,485,.9],[875,430,.75]] as number[][]){const weed=this.add.graphics();weed.lineStyle(10,0x3f9b83,.9);for(let j=0;j<3;j++)weed.beginPath().moveTo(x+j*13,y+80).lineTo(x-8+j*14,y+25-j*7).strokePath();weed.setScale(s);c.add(weed)}
    this.rope=this.add.graphics().setDepth(35);this.hookArt=this.add.graphics().setVisible(false);this.captureArt=this.add.graphics().setDepth(39);this.hookSprite=this.add.image(this.hookPos.x,this.hookPos.y,'hook-seadragon').setDisplaySize(48,62).setDepth(40);c.add([this.rope,this.hookArt,this.captureArt,this.hookSprite]);this.trail=[this.anchor.clone(),this.hookPos.clone()];
    this.lineText=this.add.text(24,18,'',{fontSize:'18px',fontStyle:'bold',color:'#fff6dc',backgroundColor:'#153a4a'}).setPadding(12,8).setDepth(60);
    this.basketText=this.add.text(480,18,'',{fontSize:'18px',fontStyle:'bold',color:'#fff6dc',backgroundColor:'#153a4a'}).setPadding(12,8).setOrigin(.5,0).setDepth(60);
    const reelBg=this.add.rectangle(860,39,150,48,0xef6b4a).setStrokeStyle(3,0xfff6dc).setInteractive({useHandCursor:true}).setDepth(60);
    const reelTx=this.add.text(860,39,'REEL IN',{fontSize:'19px',fontStyle:'bold',color:'#fff6dc'}).setOrigin(.5).setDepth(61);
    reelBg.on('pointerdown',()=>this.startRetract());
    this.diveHint=this.add.text(480,505,'MOVE THE HOOK • STAY ON A FISH • REEL IN ANYTIME',{fontSize:'16px',fontStyle:'bold',color:'#153a4a',backgroundColor:'#fff6dc'}).setPadding(10,6).setOrigin(.5).setDepth(60);
    c.add([this.lineText,this.basketText,reelBg,reelTx,this.diveHint]);this.spawnTargets(c);this.spawnTreasure(c);this.refreshHud();
    this.time.delayedCall(4500,()=>this.diveHint?.setVisible(false));PortalBridge.submitAnalyticsEvent('underwater_start');
  }
  private spawnTargets(c:Phaser.GameObjects.Container){
    const specs=[
      {fish:FISH[0],x:280,y:195,slots:1,speed:32}, {fish:FISH[1],x:690,y:175,slots:1,speed:40},
      {fish:FISH[2],x:420,y:330,slots:1,speed:46}, {fish:FISH[3],x:745,y:350,slots:1,speed:54},
      {fish:FISH[5],x:310,y:445,slots:2,speed:58}
    ];
    specs.forEach((s,i)=>{const rarityColor=s.fish.rarity==='Rare'?0xffd166:s.fish.rarity==='Uncommon'?0x69d6c5:0xfff6dc;const direction=i%2===0?1:-1;const aura=this.add.circle(s.x,s.y,s.slots===2?47:34,rarityColor,s.fish.rarity==='Common'?.08:.2).setDepth(29);const sprite=this.add.image(s.x,s.y,s.fish.id==='sardine'?'fish-sardine':'fish-minnow').setDisplaySize(s.slots===2?112:76,s.slots===2?68:48).setTint(s.fish.color).setFlipX(fishFlipXForDirection(direction)).setDepth(30);const badge=this.add.text(s.x,s.y-37,s.fish.rarity==='Rare'?'★':s.fish.rarity==='Uncommon'?'◆':'•',{fontSize:s.fish.rarity==='Rare'?'18px':'14px',fontStyle:'bold',color:`#${rarityColor.toString(16).padStart(6,'0')}`}).setOrigin(.5).setDepth(31);const target:Target={...s,sprite,aura,badge,capture:0,direction,baseY:s.y,phase:i*1.2};this.targets.push(target);c.add([aura,sprite,badge])});
  }
  private spawnTreasure(c:Phaser.GameObjects.Container){
    const treasure=TREASURES[Math.floor(Math.random()*TREASURES.length)];this.currentTreasureId=treasure.id;
    const glow=this.add.circle(802,447,38,0xffd166,.16),item=this.add.image(802,447,treasure.texture).setDisplaySize(68,68),label=this.add.text(802,490,'SECRET',{fontSize:'12px',fontStyle:'bold',color:'#fff6dc'}).setOrigin(.5);
    this.treasure=this.add.container(0,0,[glow,item,label]).setDepth(28);c.add(this.treasure);this.tweens.add({targets:glow,scale:1.2,alpha:.05,duration:750,yoyo:true,repeat:-1})
  }
  private updateUnderwater(delta:number){
    if(Phaser.Input.Keyboard.JustDown(this.keys.E)||Phaser.Input.Keyboard.JustDown(this.keys.SPACE)){this.startRetract();return}
    const d=delta/1000,move=new Phaser.Math.Vector2(),before=this.hookPos.clone();
    if(this.keys.A.isDown||this.keys.LEFT.isDown)move.x--;if(this.keys.D.isDown||this.keys.RIGHT.isDown)move.x++;if(this.keys.W.isDown||this.keys.UP.isDown)move.y--;if(this.keys.S.isDown||this.keys.DOWN.isDown)move.y++;
    const tinySlowdown=1-Math.min(this.caught.length*.025,.05),speed=165*tinySlowdown;
    if(move.lengthSq()>0)this.hookPos.add(move.normalize().scale(speed*d));else if(this.pointerSteering)this.hookPos.add(this.hookTarget.clone().subtract(this.hookPos).limit(speed*d));
    this.hookPos.x=Phaser.Math.Clamp(this.hookPos.x,42,918);this.hookPos.y=Phaser.Math.Clamp(this.hookPos.y,82,502);
    if(this.isBlocked(this.hookPos))this.hookPos.copy(before);
    const laid=this.routeLength(),step=before.distance(this.hookPos),remaining=this.maxLinePx-laid;if(step>remaining)this.hookPos.copy(before.clone().add(this.hookPos.clone().subtract(before).setLength(Math.max(0,remaining))));
    const last=this.trail[this.trail.length-1];if(last.distance(this.hookPos)>=7)this.trail.push(this.hookPos.clone());
    this.updateFish(d);this.checkTreasure();this.drawHookAndRope();this.refreshHud();
  }
  private isBlocked(p:Phaser.Math.Vector2){
    // Sunny Pier starts intentionally open: only the natural map edges and
    // seabed are solid. Decorative plants and distant rocks remain passable.
    return p.y>478||p.x<82||p.x>878;
  }
  private routeLength(){let total=0;for(let i=1;i<this.trail.length;i++)total+=this.trail[i-1].distance(this.trail[i]);total+=this.trail[this.trail.length-1].distance(this.hookPos);return total}
  private updateFish(d:number){
    let touching:Target|undefined;
    for(const t of this.targets){if(!t.sprite.visible)continue;t.sprite.x+=t.direction*t.speed*d;if(t.sprite.x<90||t.sprite.x>870){t.direction*=-1;t.sprite.setFlipX(fishFlipXForDirection(t.direction))}t.sprite.y=t.baseY+Math.sin(this.time.now*.002+t.phase)*15;t.aura.setPosition(t.sprite.x,t.sprite.y);t.badge.setPosition(t.sprite.x,t.sprite.y-37);if(Phaser.Math.Distance.Between(t.sprite.x,t.sprite.y,this.hookPos.x,this.hookPos.y)<42)touching=t}
    this.captureArt.clear();
    for(const t of this.targets){if(t===touching&&this.usedSlots+t.slots<=this.maxSlots){t.capture+=d;const needed=t.slots===2?1.25:.78;this.captureArt.lineStyle(6,0xffd166,1).beginPath().arc(t.sprite.x,t.sprite.y,36,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(t.capture/needed,1)).strokePath();if(t.capture>=needed)this.catchTarget(t)}else t.capture=Math.max(0,t.capture-d*.65)}
  }
  private catchTarget(t:Target){
    t.sprite.setVisible(false);t.aura.setVisible(false);t.badge.setVisible(false);this.usedSlots+=t.slots;AudioService.catch();const mini=this.add.image(this.hookPos.x-18,this.hookPos.y+20,t.fish.id==='sardine'?'fish-sardine':'fish-minnow').setDisplaySize(42,27).setDepth(38);this.underwater!.add(mini);this.caught.push({fish:t.fish,sprite:mini});this.refreshHud();this.showToast(`${t.fish.name} caught!`);if(this.usedSlots>=this.maxSlots)this.time.delayedCall(500,()=>this.showToast('Basket full — reel in!'));
  }
  private checkTreasure(){
    if(this.treasureFound||!this.treasure||!this.currentTreasureId)return;
    if(Phaser.Math.Distance.Between(this.hookPos.x,this.hookPos.y,802,447)<38){
      this.treasureFound=true;this.treasure.setVisible(false);this.trip.addBonus(25);
      const saved=SaveService.load(),isNew=!saved.discoveredTreasures.includes(this.currentTreasureId)&&!this.trip.treasures.some(t=>t.id===this.currentTreasureId);
      this.trip.addTreasure({id:this.currentTreasureId,isNew});AudioService.perfect();
      const treasure=TREASURES.find(t=>t.id===this.currentTreasureId);this.showToast(`${isNew?'NEW SECRET':'Secret'}: ${treasure?.name??'Treasure'}  +25 coins`);
    }
  }
  private drawHookAndRope(){
    this.rope.clear().lineStyle(3,0xfff6dc,.92).beginPath().moveTo(this.trail[0].x,this.trail[0].y);for(let i=1;i<this.trail.length;i++)this.rope.lineTo(this.trail[i].x,this.trail[i].y);this.rope.lineTo(this.hookPos.x,this.hookPos.y).strokePath();
    this.hookSprite.setPosition(this.hookPos.x,this.hookPos.y+13).setRotation(Math.sin(this.time.now*.004)*.04);
    this.caught.forEach((c,i)=>{const p=this.pointBehind(26+i*34);c.sprite.setPosition(p.x+Math.sin(this.time.now*.006+i)*3,p.y+8).setRotation(Math.sin(this.time.now*.005+i)*.12)});
  }
  private pointBehind(distance:number){const pts=[...this.trail,this.hookPos];let left=distance;for(let i=pts.length-1;i>0;i--){const len=pts[i].distance(pts[i-1]);if(left<=len)return pts[i].clone().lerp(pts[i-1],left/len);left-=len}return pts[0].clone()}
  private refreshHud(){if(!this.lineText)return;const meters=this.routeLength()/this.maxLinePx*this.lineMeters;this.lineText.setText(`LINE  ${(this.lineMeters-meters).toFixed(1)} m LEFT`);this.basketText.setText(`BASKET  ${this.usedSlots} / ${this.maxSlots}${this.treasureFound?'   ★':''}`)}
  private startRetract(){if(this.phase!=='UNDERWATER')return;this.phase='RETRACTING';this.pointerSteering=false;this.diveHint?.setVisible(false);if(this.trail[this.trail.length-1].distance(this.hookPos)>1)this.trail.push(this.hookPos.clone());this.retractIndex=this.trail.length-2;this.showToast('Following the line home…')}
  private updateRetract(delta:number){
    const step=340*delta/1000;if(this.retractIndex<0){this.hookPos.copy(this.anchor);this.finishDive();return}const target=this.trail[this.retractIndex],v=target.clone().subtract(this.hookPos);if(v.length()<=step){this.hookPos.copy(target);this.trail.length=this.retractIndex+1;this.retractIndex--}else this.hookPos.add(v.setLength(step));this.drawHookAndRope();this.refreshHud();
  }
  private finishDive(){
    this.phase='RESULT';this.underwater?.destroy(true);this.underwater=undefined;this.surface.setVisible(true);this.help.setVisible(false);let totalCoins=0,totalXp=0;
    const saved=SaveService.load(),records:{fish:Fish;weight:number;isNew:boolean;isRecord:boolean}[]=[];
    this.caught.forEach(({fish})=>{
      const weight=Phaser.Math.FloatBetween(fish.weightMin,fish.weightMax),coins=Math.round(fish.value*weight),earlier=this.trip.catches.filter(c=>c.fish.id===fish.id),best=Math.max(saved.fishStats[fish.id]?.bestWeight??0,...earlier.map(c=>c.weight),0);
      const isNew=!saved.fishStats[fish.id]&&earlier.length===0,isRecord=weight>best;totalCoins+=coins;totalXp+=fish.xp;records.push({fish,weight,isNew,isRecord});this.trip.add({fish,weight,coins,xp:fish.xp,isNew,isRecord});
    });
    const shade=this.add.rectangle(480,270,960,540,0x102f3d,.7).setInteractive(),card=this.add.rectangle(480,280,540,360,0xfff6dc,.98).setStrokeStyle(8,COLORS.navy),heading=this.add.text(480,125,this.caught.length?'DIVE HAUL':'EMPTY HOOK',{fontSize:'34px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5);
    const icons=records.map((r,i)=>this.add.image(420+i*120,220,r.fish.id==='sardine'?'fish-sardine':'fish-minnow').setDisplaySize(100,62).setTint(r.fish.color));
    const names=records.map((r,i)=>this.add.text(420+i*120,280,`${r.fish.name}\n${r.weight.toFixed(2)} kg${r.isNew?'  NEW!':r.isRecord?'  RECORD!':''}`,{fontSize:'14px',fontStyle:'bold',align:'center',color:r.isNew?'#ef6b4a':'#153a4a'}).setOrigin(.5));
    const newSecret=this.trip.treasures.at(-1)?.isNew?'   NEW SECRET!':this.treasureFound?'   SECRET':'';
    const reward=this.add.text(480,350,`${this.caught.length} fish   +${totalCoins+(this.treasureFound?25:0)} coins   +${totalXp} XP${newSecret}`,{fontSize:'17px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5),next=this.add.text(480,420,'TAP TO CONTINUE',{fontSize:'18px',fontStyle:'bold',color:'#fff6dc',backgroundColor:'#ef6b4a'}).setPadding(18,10).setOrigin(.5);
    this.overlay=this.add.container(0,0,[shade,card,heading,...icons,...names,reward,next]).setDepth(150);this.title.setText('');this.inputLockedUntil=this.time.now+300;
  }
  private nextDive(){if(this.trip.complete){PortalBridge.gameplayStop();this.scene.start('Summary',{trip:this.trip})}else this.beginCast()}
  private smallSplash(x:number,y:number){
    const fx=this.add.image(x,y,'splash').setDisplaySize(48,48).setDepth(30);
    const targetX=fx.scaleX,targetY=fx.scaleY;fx.setScale(targetX*.34,targetY*.34);
    this.tweens.add({targets:fx,scaleX:targetX,scaleY:targetY,alpha:{from:.88,to:0},y:y-8,duration:300,ease:'Quad.easeOut',onComplete:()=>fx.destroy()});
  }
  private waterRing(x:number,y:number,alpha=1){
    const ring=this.add.ellipse(x,y,28,9).setStrokeStyle(2,0xfff6dc,.8*alpha).setFillStyle(0xffffff,0).setDepth(29);
    this.tweens.add({targets:ring,scaleX:2.4,scaleY:1.9,alpha:0,duration:520,ease:'Quad.easeOut',onComplete:()=>ring.destroy()});
  }
  private scheduleSurfaceGull(first=false){
    const delay=first?Phaser.Math.Between(4500,7500):Phaser.Math.Between(15000,30000);
    this.time.delayedCall(delay,()=>{
      if(this.scene.isActive()&&this.surface.visible)this.flySurfaceGull();else this.scheduleSurfaceGull();
    });
  }
  private flySurfaceGull(){
    const count=Phaser.Math.Between(2,4),startY=Phaser.Math.Between(104,168),birds:Phaser.GameObjects.Graphics[]=[];
    for(let i=0;i<count;i++){
      const bird=this.add.graphics().setPosition(i*Phaser.Math.Between(18,31),Phaser.Math.Between(-6,6));
      const size=Phaser.Math.Between(4,7);bird.lineStyle(2,0x153a4a,1).beginPath().moveTo(-size,0).lineTo(0,-Math.max(2,size*.45)).lineTo(size,0).strokePath();birds.push(bird);
    }
    const flock=this.add.container(-45,startY,birds);this.surface.addAt(flock,4);
    birds.forEach((bird,i)=>this.tweens.add({targets:bird,y:bird.y+(i%2?2:-2),duration:Phaser.Math.Between(900,1500),yoyo:true,repeat:-1,ease:'Sine.inOut'}));
    this.tweens.add({targets:flock,x:1010,y:startY-Phaser.Math.Between(3,14),duration:Phaser.Math.Between(16000,21000),ease:'Linear',onComplete:()=>{flock.destroy(true);this.scheduleSurfaceGull()}});
  }
  private openCollection(tab:'fish'|'treasures'){
    this.modalOpen=true;this.pointerSteering=false;this.help.setVisible(false);this.collectionModal?.destroy(true);
    const saved=SaveService.load(),items:Phaser.GameObjects.GameObject[]=[];
    this.trip.catches.forEach(c=>SaveService.recordCatch(saved,c.fish.id,c.weight));
    this.trip.treasures.forEach(t=>SaveService.discoverTreasure(saved,t.id));
    const shade=this.add.rectangle(480,270,960,540,0x102f3d,.78).setInteractive(),paper=this.add.rectangle(480,280,850,470,0xfff6dc,.99).setStrokeStyle(8,COLORS.navy),title=this.add.text(95,62,'THE COOLER BOOK',{fontSize:'29px',fontStyle:'bold',color:'#153a4a'});
    const fishTab=this.add.rectangle(315,115,210,45,tab==='fish'?COLORS.coral:0xa9e5dc).setStrokeStyle(3,COLORS.navy).setInteractive({useHandCursor:true}),fishText=this.add.text(315,115,'FISH',{fontSize:'18px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5);
    const treasureTab=this.add.rectangle(545,115,210,45,tab==='treasures'?COLORS.coral:0xa9e5dc).setStrokeStyle(3,COLORS.navy).setInteractive({useHandCursor:true}),treasureText=this.add.text(545,115,'TREASURES',{fontSize:'18px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5);
    const close=this.add.text(866,65,'X',{fontSize:'24px',fontStyle:'bold',color:'#fff6dc',backgroundColor:'#ef6b4a'}).setPadding(12,7).setOrigin(.5).setInteractive({useHandCursor:true});
    fishTab.on('pointerdown',()=>this.openCollection('fish'));treasureTab.on('pointerdown',()=>this.openCollection('treasures'));close.on('pointerdown',()=>this.closeCollection());
    items.push(shade,paper,title,fishTab,fishText,treasureTab,treasureText,close);
    if(this.trip.catches.length||this.trip.treasures.length)items.push(this.add.text(865,105,'CURRENT TRIP INCLUDED',{fontSize:'10px',fontStyle:'bold',color:'#ef6b4a'}).setOrigin(1,.5));
    if(tab==='fish'){
      const discovered=FISH.filter(f=>saved.fishStats[f.id]).length;
      items.push(this.add.text(790,110,`${discovered} / ${FISH.length} FOUND`,{fontSize:'15px',fontStyle:'bold',color:'#153a4a'}).setOrigin(1,.5));
      FISH.forEach((fish,i)=>{
        const col=i%3,row=Math.floor(i/3),x=230+col*250,y=225+row*155,stat=saved.fishStats[fish.id],known=!!stat;
        const card=this.add.rectangle(x,y,224,130,known?0xe8f5e9:0xd7e1dd,.98).setStrokeStyle(3,known?fish.color:0x6f858a),icon=this.add.image(x-70,y-12,fish.id==='sardine'?'fish-sardine':'fish-minnow').setDisplaySize(68,42).setTint(known?fish.color:0x37505a).setAlpha(known?1:.55);
        const name=this.add.text(x-24,y-42,known?fish.name:'???',{fontSize:'16px',fontStyle:'bold',color:'#153a4a'}),rarity=this.add.text(x-24,y-18,known?fish.rarity:'UNDISCOVERED',{fontSize:'11px',fontStyle:'bold',color:known?'#4b6973':'#71858b'});
        const detail=this.add.text(x-94,y+27,known?`CAUGHT  ${stat.count}\nBEST  ${stat.bestWeight.toFixed(2)} kg` : fish.hint,{fontSize:'12px',fontStyle:'bold',color:'#153a4a',wordWrap:{width:185},align:'center'}).setOrigin(0,.5);
        items.push(card,icon,name,rarity,detail);
      });
    }else{
      items.push(this.add.text(790,110,`${saved.discoveredTreasures.length} / ${TREASURES.length} FOUND`,{fontSize:'15px',fontStyle:'bold',color:'#153a4a'}).setOrigin(1,.5));
      TREASURES.forEach((treasure,i)=>{
        const x=235+i*245,y=285,known=saved.discoveredTreasures.includes(treasure.id),card=this.add.rectangle(x,y,220,245,known?0xe8f5e9:0xd7e1dd,.98).setStrokeStyle(3,known?COLORS.gold:0x6f858a),icon=this.add.image(x,y-38,treasure.texture).setDisplaySize(92,92).setTint(known?0xffffff:0x37505a).setAlpha(known?1:.5);
        const name=this.add.text(x,y+35,known?treasure.name:'???',{fontSize:'17px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5),hint=this.add.text(x,y+78,known?'FOUND AT SUNNY PIER':treasure.hint,{fontSize:'12px',fontStyle:'bold',color:'#4b6973',align:'center',wordWrap:{width:175}}).setOrigin(.5);
        items.push(card,icon,name,hint);
      });
    }
    this.collectionModal=this.add.container(0,0,items).setDepth(220);
  }
  private closeCollection(){this.collectionModal?.destroy(true);this.collectionModal=undefined;this.modalOpen=false;if(this.phase==='CAST')this.help.setVisible(true)}
  private showToast(message:string){const tx=this.add.text(480,105,message,{fontSize:'18px',fontStyle:'bold',color:'#153a4a',backgroundColor:'#fff6dc'}).setPadding(12,7).setOrigin(.5).setDepth(90);this.tweens.add({targets:tx,y:85,alpha:0,delay:850,duration:350,onComplete:()=>tx.destroy()})}
  private clearOverlay(){this.overlay?.destroy(true);this.overlay=undefined}
  private hideCastMeter(){(this.children.getByName('cast-meter') as Phaser.GameObjects.Image|undefined)?.setVisible(false);this.meter.clear()}
  update(_:number,delta:number){
    if(!this.reducedMotion&&this.surface.visible)for(const cloud of this.surfaceClouds){
      cloud.sprite.x+=cloud.speed*delta/1000;
      if(cloud.sprite.x-cloud.sprite.displayWidth/2>960)cloud.sprite.x=-cloud.sprite.displayWidth/2;
    }
    if(this.phase==='CAST'){this.hideCastMeter()}
    else if(this.phase==='UNDERWATER')this.updateUnderwater(delta);else if(this.phase==='RETRACTING')this.updateRetract(delta);
  }
}
