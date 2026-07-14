import Phaser from 'phaser';
import { AudioService } from '../core/AudioService';
import { COLORS, TRIP_CASTS } from '../core/GameConfig';
import { PortalBridge } from '../core/PortalBridge';
import { BOAT_REPAIR_COSTS, SaveService, type EquipmentId } from '../core/SaveService';
import { ACHIEVEMENTS, QuestService, questById } from '../gameplay/QuestService';
import { fishFlipXForDirection, type Fish } from '../gameplay/Fish';
import type { TreasureId } from '../gameplay/Treasure';
import { TripState } from '../gameplay/TripState';
import { FISHING_LOCATIONS, locationById, type FishingLocation, type FishingLocationId } from '../gameplay/FishingLocation';

type Phase='CAST'|'FLIGHT'|'UNDERWATER'|'RETRACTING'|'RESULT';
type Target={fish:Fish;sprite:Phaser.GameObjects.Image;aura:Phaser.GameObjects.Arc;badge:Phaser.GameObjects.Text;slots:number;capture:number;direction:number;speed:number;baseY:number;phase:number};

export class PierGameplayScene extends Phaser.Scene {
  private phase:Phase='CAST'; private trip!:TripState; private castQuality=0; private marker=0; private markerDir=1;
  private surface!:Phaser.GameObjects.Container; private underwater?:Phaser.GameObjects.Container; private overlay?:Phaser.GameObjects.Container;
  private title!:Phaser.GameObjects.Text; private help!:Phaser.GameObjects.Text; private meter!:Phaser.GameObjects.Graphics; private progressText!:Phaser.GameObjects.Text;
  private angler!:Phaser.GameObjects.Image; private bobber!:Phaser.GameObjects.Image;
  private hookPos=new Phaser.Math.Vector2(480,92); private hookTarget=new Phaser.Math.Vector2(480,92); private anchor=new Phaser.Math.Vector2(480,70);
  private rope!:Phaser.GameObjects.Graphics; private hookArt!:Phaser.GameObjects.Graphics; private captureArt!:Phaser.GameObjects.Graphics;
  private hookSprite!:Phaser.GameObjects.Image;
  private lineText!:Phaser.GameObjects.Text; private basketText!:Phaser.GameObjects.Text; private diveHint!:Phaser.GameObjects.Text;
  private targets:Target[]=[]; private caught:{fish:Fish;sprite:Phaser.GameObjects.Image}[]=[]; private usedSlots=0; private maxSlots=2; private treasureFound=false;
  private treasure?:Phaser.GameObjects.Container; private maxLinePx=590; private lineMeters=22; private hookMoveSpeed=165; private reelSpeed=340; private basketDrag=.025; private baitLevel=0; private pointerSteering=false; private inputLockedUntil=0;
  private trail:Phaser.Math.Vector2[]=[]; private retractIndex=0;
  private keys!:Record<string,Phaser.Input.Keyboard.Key>;
  private reducedMotion=false;
  private surfaceClouds:{sprite:Phaser.GameObjects.Image;speed:number}[]=[];
  private cooler!:Phaser.GameObjects.Image;private tacklebox!:Phaser.GameObjects.Image;private boatSprite!:Phaser.GameObjects.Image;private boatZone!:Phaser.GameObjects.Zone;private noticeBoard!:Phaser.GameObjects.Zone;private spotsZone?:Phaser.GameObjects.Zone;private collectionModal?:Phaser.GameObjects.Container;private tackleModal?:Phaser.GameObjects.Container;private jobsModal?:Phaser.GameObjects.Container;private boatModal?:Phaser.GameObjects.Container;private spotsModal?:Phaser.GameObjects.Container;private modalOpen=false;
  private touchingTarget?:Target;
  private currentTreasureId?:TreasureId;
  private location!:FishingLocation;

  constructor(){super('Pier')}
  init(data:{locationId?:FishingLocationId}={}){this.location=locationById(data.locationId);this.trip=new TripState(this.location.id);this.phase='CAST';this.inputLockedUntil=0}
  create(){
    this.reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    PortalBridge.gameplayStart();this.surface=this.add.container(0,0);this.drawSurface();
    this.title=this.add.text(480,28,'',{fontSize:'25px',fontStyle:'bold',color:'#fff6dc',stroke:'#153a4a',strokeThickness:6}).setOrigin(.5).setDepth(100);
    this.help=this.add.text(480,500,'',{fontSize:'20px',fontStyle:'bold',color:'#153a4a',backgroundColor:'#fff6dc',align:'center'}).setPadding(14,9).setOrigin(.5).setDepth(100);
    this.meter=this.add.graphics().setDepth(90);
    this.keys=this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE') as Record<string,Phaser.Input.Keyboard.Key>;
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{
      AudioService.unlock();
      if(this.modalOpen)return;
      if(this.phase==='CAST'&&this.angler?.input?.enabled&&(this.angler.getBounds().contains(p.worldX,p.worldY)||this.spotsZone?.getBounds().contains(p.worldX,p.worldY))){if(this.trip.castsLeft!==TRIP_CASTS){AudioService.fail();this.showToast('Finish this trip before changing fishing spots.');return}AudioService.bookOpen();this.openFishingSpots();return}
      if(this.phase==='CAST'&&this.cooler?.getBounds().contains(p.worldX,p.worldY)){AudioService.bookOpen();this.openCollection('fish');return}
      if(this.phase==='CAST'&&this.tacklebox?.getBounds().contains(p.worldX,p.worldY)){AudioService.tackleOpen();this.openTackleBox();return}
      if(this.phase==='CAST'&&this.noticeBoard?.getBounds().contains(p.worldX,p.worldY)){AudioService.jobsOpen();this.openJobs('jobs');return}
      if(this.phase==='CAST'&&this.boatZone?.getBounds().contains(p.worldX,p.worldY)){AudioService.boatOpen();this.openBoatRepair();return}
      this.pointerSteering=true;this.hookTarget.set(p.worldX,p.worldY);this.press();
    });
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(this.pointerSteering)this.hookTarget.set(p.worldX,p.worldY)});
    this.input.on('pointerup',()=>this.pointerSteering=false);
    this.beginCast();
  }
  private drawSurface(){
    const bg=this.add.image(480,270,'bg-pier-remaster').setDisplaySize(960,540);
    const shade=this.add.rectangle(480,270,960,540,0x153a4a,.06);
    const cloudA=this.add.image(165,66,'surface-clouds','cloud-a').setDisplaySize(216,88);
    const cloudB=this.add.image(486,82,'surface-clouds','cloud-b').setDisplaySize(188,87);
    const cloudC=this.add.image(820,102,'surface-clouds','cloud-c').setDisplaySize(208,85);
    this.surfaceClouds=[{sprite:cloudA,speed:1.45},{sprite:cloudB,speed:1.05},{sprite:cloudC,speed:1.25}];
    const foregroundMaskSource=this.add.graphics().setVisible(false);
    foregroundMaskSource.fillStyle(0xffffff,1)
      .fillRect(43,113,32,240)
      .beginPath().moveTo(43,120).lineTo(166,136).lineTo(166,157).lineTo(43,143).closePath().fillPath()
      .fillRect(107,139,8,25)
      .beginPath().moveTo(105,157).lineTo(121,157).lineTo(128,175).lineTo(124,210).lineTo(96,210).lineTo(92,175).closePath().fillPath()
      .beginPath().moveTo(914,183).lineTo(925,183).lineTo(931,193).lineTo(928,203).lineTo(926,258).lineTo(903,258).lineTo(906,203).lineTo(903,193).closePath().fillPath();
    const foregroundOccluder=this.add.image(480,270,'bg-pier-remaster').setDisplaySize(960,540).setMask(foregroundMaskSource.createGeometryMask());
    const rearPostRipples=this.makePostRipples(false);
    const jobsNoticeArt=this.add.image(73,270,'hub-jobs-notice').setDisplaySize(130,160).setDepth(3);
    this.noticeBoard=this.add.zone(73,270,92,125).setInteractive({useHandCursor:true}).setDepth(6);
    this.cooler=this.add.image(160,420,'hub-cooler').setDisplaySize(82,59).setInteractive({useHandCursor:true}).setDepth(4);
    this.tacklebox=this.add.image(225,448,'hub-tacklebox-closed').setDisplaySize(82,59).setInteractive({useHandCursor:true}).setDepth(4);
    const save=SaveService.load(),stickers:Phaser.GameObjects.Arc[]=[];
    if(SaveService.isLocationUnlocked(save,this.location.id)&&save.lastLocationId!==this.location.id){save.lastLocationId=this.location.id;SaveService.save(save)}
    this.boatSprite=this.add.image(620,315,'hub-boat-states',this.boatFrame(save)).setDisplaySize(180,180).setOrigin(.5,this.boatOriginY(save)).setDepth(4);
    this.boatZone=this.add.zone(620,335,175,82).setInteractive({useHandCursor:true}).setDepth(6);
    const stickerColors=[0xffd166,0xef6b4a,0x69d6c5];
    for(let i=0;i<Math.min(3,save.coolerStickerTier+save.harborStickerCount);i++)stickers.push(this.add.circle(141+i*11,426,4,stickerColors[i]).setStrokeStyle(1,0xfff6dc).setDepth(5));
    this.angler=this.add.image(330,350,'angler-chair-perspective').setDisplaySize(315,210).setDepth(5);
    const spotCue:Phaser.GameObjects.GameObject[]=[];
    if(save.unlockedLocationIds.length>1){
      this.angler.setInteractive({useHandCursor:true}).on('pointerover',()=>this.angler.setTint(0xfff2d4)).on('pointerout',()=>this.angler.clearTint());
      const cueBg=this.add.rectangle(318,250,116,45,0xfff6dc,.96).setStrokeStyle(3,COLORS.navy).setDepth(7);
      const cueIcon=this.add.image(279,250,this.spotBadgeTexture(this.location.id)).setDisplaySize(38,38).setDepth(8);
      const cueText=this.add.text(337,250,'SPOTS',{fontSize:'13px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5).setDepth(8);
      this.spotsZone=this.add.zone(318,250,120,50).setInteractive({useHandCursor:true}).setDepth(9);
      spotCue.push(cueBg,cueIcon,cueText,this.spotsZone);
    }else this.spotsZone=undefined;
    const frontPostRipples=this.makePostRipples(true);
    this.bobber=this.add.image(585,315,'bobber-basic').setDisplaySize(52,54).setVisible(false).setDepth(8);
    const zone=this.add.text(22,22,this.location.name.toUpperCase(),{fontSize:'18px',fontStyle:'bold',color:'#fff6dc'}).setDepth(11);
    const level=SaveService.levelProgress(save.xp),xpLabel=level.maxed?`${save.xp} XP`:`${level.current}/${level.needed} XP`;
    this.progressText=this.add.text(938,22,`LEVEL ${level.level}   ${xpLabel}   COINS ${save.coins}`,{fontSize:'15px',fontStyle:'bold',color:'#fff6dc'}).setOrigin(1,0).setDepth(11);
    this.surface.add([bg,cloudA,cloudB,cloudC,foregroundOccluder,shade,...rearPostRipples,jobsNoticeArt,this.noticeBoard,this.cooler,this.tacklebox,this.boatSprite,this.boatZone,...stickers,this.angler,...spotCue,...frontPostRipples,this.bobber,zone,this.progressText]);
    if(!this.reducedMotion){
      this.scheduleSurfaceGull(true);
    }
  }
  private makePostRipples(front:boolean){
    const posts=[{x:390,y:442,w:35,delay:0,duration:3100},{x:500,y:374,w:27,delay:900,duration:3700}];
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
    this.title.setText(`DIVE ${TRIP_CASTS-this.trip.castsLeft+1} OF ${TRIP_CASTS}`);this.help.setVisible(false);this.bobber.setVisible(false);
  }
  private press(){
    if(this.modalOpen||this.time.now<this.inputLockedUntil)return;AudioService.unlock();
    if(this.phase==='CAST')this.cast();else if(this.phase==='RESULT')this.nextDive();
  }
  private cast(){
    this.castQuality=1;this.trip.useCast();this.phase='FLIGHT';this.hideCastMeter();AudioService.cast();this.help.setText('CASTING…');
    this.bobber.setDisplaySize(52,54);const bobberScaleX=this.bobber.scaleX,bobberScaleY=this.bobber.scaleY;
    this.bobber.setVisible(true).setPosition(555,278).setScale(bobberScaleX*.5,bobberScaleY*.5);
    this.tweens.add({targets:this.bobber,x:760,y:430,scaleX:bobberScaleX,scaleY:bobberScaleY,duration:500,ease:'Quad.easeOut',onComplete:()=>{
      AudioService.splash();this.smallSplash(760,430);this.waterRing(760,433);
      if(!this.reducedMotion)this.tweens.add({targets:this.bobber,y:426,scaleX:bobberScaleX*.92,scaleY:bobberScaleY*1.08,duration:145,yoyo:true,repeat:1,ease:'Sine.inOut'});
      this.time.delayedCall(240,()=>this.waterRing(760,433,.7));
      this.time.delayedCall(620,()=>this.startUnderwater());
    }});
  }
  private startUnderwater(){
    this.phase='UNDERWATER';this.surface.setVisible(false);this.help.setVisible(false);this.title.setText('');this.hookPos.set(480,92);this.hookTarget.copy(this.hookPos);this.usedSlots=0;this.caught=[];this.treasureFound=false;this.currentTreasureId=undefined;this.targets=[];this.touchingTarget=undefined;
    const equipment=SaveService.load().equipment;
    this.maxLinePx=590+equipment.line*45;this.lineMeters=22+equipment.line*2;
    this.hookMoveSpeed=165*(1+equipment.reel*.07);this.reelSpeed=340*(1+equipment.reel*.08);
    this.maxSlots=2+(equipment.basket>=3?1:0);this.basketDrag=Math.max(.01,.025-equipment.basket*.005);this.baitLevel=equipment.bait;
    const c=this.underwater=this.add.container(0,0);c.setDepth(20);
    c.add(this.add.image(480,270,this.location.underwaterTexture).setDisplaySize(960,540));
    for(let i=0;i<13;i++)c.add(this.add.circle(60+i*78,105+(i%3)*38,3+(i%2)*2,0xb9f0e8,.4));
    for(const [x,y,s] of [[80,440,1],[180,475,.8],[720,485,.9],[875,430,.75]] as number[][]){const weed=this.add.graphics();weed.lineStyle(10,0x3f9b83,.9);for(let j=0;j<3;j++)weed.beginPath().moveTo(x+j*13,y+80).lineTo(x-8+j*14,y+25-j*7).strokePath();weed.setScale(s);c.add(weed)}
    this.rope=this.add.graphics().setDepth(35);this.hookArt=this.add.graphics().setVisible(false);this.captureArt=this.add.graphics().setDepth(39);this.hookSprite=this.add.image(this.hookPos.x,this.hookPos.y,'hook-basic').setDisplaySize(52,66).setDepth(40);c.add([this.rope,this.hookArt,this.captureArt,this.hookSprite]);this.trail=[this.anchor.clone(),this.hookPos.clone()];
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
    const fish=this.location.fish;
    const specs=[
      {fish:fish[0],x:280,y:195,slots:1,speed:32}, {fish:fish[1],x:690,y:175,slots:1,speed:40},
      {fish:fish[fish.length>=6?2:0],x:420,y:330,slots:1,speed:46}, {fish:fish[fish.length>=6?3:1],x:745,y:350,slots:1,speed:54},
      {fish:fish.length>=6?(Math.random()<.18+this.baitLevel*.04?fish[5]:fish[4]):(Math.random()<.28+this.baitLevel*.04?fish[2]:fish[1]),x:310,y:445,slots:2,speed:58}
    ];
    specs.forEach((s,i)=>{const rarityColor=s.fish.rarity==='Rare'?0xffd166:s.fish.rarity==='Uncommon'?0x69d6c5:0xfff6dc;const direction=i%2===0?1:-1;const aura=this.add.circle(s.x,s.y,s.slots===2?47:34,rarityColor,s.fish.rarity==='Common'?.08:.2).setDepth(29);const sprite=this.add.image(s.x,s.y,s.fish.texture).setDisplaySize(s.slots===2?112:76,s.slots===2?68:48).setTint(s.fish.color).setFlipX(fishFlipXForDirection(direction)).setDepth(30);const badge=this.add.text(s.x,s.y-37,s.fish.rarity==='Rare'?'★':s.fish.rarity==='Uncommon'?'◆':'•',{fontSize:s.fish.rarity==='Rare'?'18px':'14px',fontStyle:'bold',color:`#${rarityColor.toString(16).padStart(6,'0')}`}).setOrigin(.5).setDepth(31);const target:Target={...s,sprite,aura,badge,capture:0,direction,baseY:s.y,phase:i*1.2};this.targets.push(target);c.add([aura,sprite,badge])});
  }
  private spawnTreasure(c:Phaser.GameObjects.Container){
    const treasure=this.location.treasures[Math.floor(Math.random()*this.location.treasures.length)];this.currentTreasureId=treasure.id;
    const glow=this.add.circle(802,447,38,0xffd166,.16),item=this.add.image(802,447,treasure.texture).setDisplaySize(68,68),label=this.add.text(802,490,'SECRET',{fontSize:'12px',fontStyle:'bold',color:'#fff6dc'}).setOrigin(.5);
    this.treasure=this.add.container(0,0,[glow,item,label]).setDepth(28);c.add(this.treasure);this.tweens.add({targets:glow,scale:1.2,alpha:.05,duration:750,yoyo:true,repeat:-1})
  }
  private updateUnderwater(delta:number){
    if(Phaser.Input.Keyboard.JustDown(this.keys.E)||Phaser.Input.Keyboard.JustDown(this.keys.SPACE)){this.startRetract();return}
    const d=delta/1000,move=new Phaser.Math.Vector2(),before=this.hookPos.clone();
    if(this.keys.A.isDown||this.keys.LEFT.isDown)move.x--;if(this.keys.D.isDown||this.keys.RIGHT.isDown)move.x++;if(this.keys.W.isDown||this.keys.UP.isDown)move.y--;if(this.keys.S.isDown||this.keys.DOWN.isDown)move.y++;
    const tinySlowdown=1-Math.min(this.caught.length*this.basketDrag,.05),speed=this.hookMoveSpeed*tinySlowdown;
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
    if(touching&&touching!==this.touchingTarget)AudioService.bite();this.touchingTarget=touching;
    this.captureArt.clear();
    for(const t of this.targets){if(t===touching&&this.usedSlots+t.slots<=this.maxSlots){t.capture+=d;const needed=t.slots===2?1.25:.78;this.captureArt.lineStyle(6,0xffd166,1).beginPath().arc(t.sprite.x,t.sprite.y,36,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(t.capture/needed,1)).strokePath();if(t.capture>=needed)this.catchTarget(t)}else t.capture=Math.max(0,t.capture-d*.65)}
  }
  private catchTarget(t:Target){
    t.sprite.setVisible(false);t.aura.setVisible(false);t.badge.setVisible(false);this.usedSlots+=t.slots;AudioService.catch();const mini=this.add.image(this.hookPos.x-18,this.hookPos.y+20,t.fish.texture).setDisplaySize(42,27).setTint(t.fish.color).setDepth(38);this.underwater!.add(mini);this.caught.push({fish:t.fish,sprite:mini});this.refreshHud();this.showToast(`${t.fish.name} caught!`);if(this.usedSlots>=this.maxSlots)this.time.delayedCall(500,()=>this.showToast('Basket full — reel in!'));
  }
  private checkTreasure(){
    if(this.treasureFound||!this.treasure||!this.currentTreasureId)return;
    if(Phaser.Math.Distance.Between(this.hookPos.x,this.hookPos.y,802,447)<38){
      this.treasureFound=true;this.treasure.setVisible(false);this.trip.addBonus(25);
      const saved=SaveService.load(),isNew=!saved.discoveredTreasures.includes(this.currentTreasureId)&&!this.trip.treasures.some(t=>t.id===this.currentTreasureId);
      this.trip.addTreasure({id:this.currentTreasureId,isNew});AudioService.perfect();
      const treasure=this.location.treasures.find(t=>t.id===this.currentTreasureId);this.showToast(`${isNew?'NEW SECRET':'Secret'}: ${treasure?.name??'Treasure'}  +25 coins`);
    }
  }
  private drawHookAndRope(){
    this.rope.clear().lineStyle(3,0xfff6dc,.92).beginPath().moveTo(this.trail[0].x,this.trail[0].y);for(let i=1;i<this.trail.length;i++)this.rope.lineTo(this.trail[i].x,this.trail[i].y);this.rope.lineTo(this.hookPos.x,this.hookPos.y).strokePath();
    this.hookSprite.setPosition(this.hookPos.x,this.hookPos.y+13).setRotation(Math.sin(this.time.now*.004)*.04);
    this.caught.forEach((c,i)=>{const p=this.pointBehind(26+i*34);c.sprite.setPosition(p.x+Math.sin(this.time.now*.006+i)*3,p.y+8).setRotation(Math.sin(this.time.now*.005+i)*.12)});
  }
  private pointBehind(distance:number){const pts=[...this.trail,this.hookPos];let left=distance;for(let i=pts.length-1;i>0;i--){const len=pts[i].distance(pts[i-1]);if(left<=len)return pts[i].clone().lerp(pts[i-1],left/len);left-=len}return pts[0].clone()}
  private refreshHud(){if(!this.lineText)return;const meters=this.routeLength()/this.maxLinePx*this.lineMeters;this.lineText.setText(`LINE  ${(this.lineMeters-meters).toFixed(1)} m LEFT`);this.basketText.setText(`BASKET  ${this.usedSlots} / ${this.maxSlots}${this.treasureFound?'   ★':''}`)}
  private startRetract(){if(this.phase!=='UNDERWATER')return;AudioService.reel();this.phase='RETRACTING';this.pointerSteering=false;this.diveHint?.setVisible(false);if(this.trail[this.trail.length-1].distance(this.hookPos)>1)this.trail.push(this.hookPos.clone());this.retractIndex=this.trail.length-2;this.showToast('Following the line home…')}
  private updateRetract(delta:number){
    const step=this.reelSpeed*delta/1000;if(this.retractIndex<0){this.hookPos.copy(this.anchor);this.finishDive();return}const target=this.trail[this.retractIndex],v=target.clone().subtract(this.hookPos);if(v.length()<=step){this.hookPos.copy(target);this.trail.length=this.retractIndex+1;this.retractIndex--}else this.hookPos.add(v.setLength(step));this.drawHookAndRope();this.refreshHud();
  }
  private finishDive(){
    this.phase='RESULT';this.underwater?.destroy(true);this.underwater=undefined;this.surface.setVisible(true);this.help.setVisible(false);let totalCoins=0,totalXp=0;
    this.trip.addDiveCatchCount(this.caught.length);
    const saved=SaveService.load(),records:{fish:Fish;weight:number;isNew:boolean;isRecord:boolean}[]=[];
    this.caught.forEach(({fish})=>{
      const weight=Phaser.Math.FloatBetween(fish.weightMin,fish.weightMax),coins=Math.round(fish.value*weight),earlier=this.trip.catches.filter(c=>c.fish.id===fish.id),best=Math.max(saved.fishStats[fish.id]?.bestWeight??0,...earlier.map(c=>c.weight),0);
      const isNew=!saved.fishStats[fish.id]&&earlier.length===0,isRecord=weight>best;totalCoins+=coins;totalXp+=fish.xp;records.push({fish,weight,isNew,isRecord});this.trip.add({fish,weight,coins,xp:fish.xp,isNew,isRecord});
    });
    const shade=this.add.rectangle(480,270,960,540,0x102f3d,.7).setInteractive(),card=this.add.rectangle(480,280,540,360,0xfff6dc,.98).setStrokeStyle(8,COLORS.navy),heading=this.add.text(480,125,this.caught.length?'DIVE HAUL':'EMPTY HOOK',{fontSize:'34px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5);
    const icons=records.map((r,i)=>this.add.image(420+i*120,220,r.fish.texture).setDisplaySize(100,62).setTint(r.fish.color));
    const names=records.map((r,i)=>this.add.text(420+i*120,280,`${r.fish.name}\n${r.weight.toFixed(2)} kg${r.isNew?'  NEW!':r.isRecord?'  RECORD!':''}`,{fontSize:'14px',fontStyle:'bold',align:'center',color:r.isNew?'#ef6b4a':'#153a4a'}).setOrigin(.5));
    const newSecret=this.trip.treasures.at(-1)?.isNew?'   NEW SECRET!':this.treasureFound?'   SECRET':'';
    const reward=this.add.text(480,350,`${this.caught.length} fish   +${totalCoins+(this.treasureFound?25:0)} coins   +${totalXp} XP${newSecret}`,{fontSize:'17px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5),next=this.add.text(480,420,'TAP TO CONTINUE',{fontSize:'18px',fontStyle:'bold',color:'#fff6dc',backgroundColor:'#ef6b4a'}).setPadding(18,10).setOrigin(.5);
    if(this.caught.length||this.treasureFound)AudioService.coins();else AudioService.fail();
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
    const count=Phaser.Math.Between(2,4),startY=Phaser.Math.Between(76,102),birds:Phaser.GameObjects.Graphics[]=[];
    for(let i=0;i<count;i++){
      const bird=this.add.graphics().setPosition(i*Phaser.Math.Between(18,31),Phaser.Math.Between(-6,6));
      const size=Phaser.Math.Between(4,7);bird.lineStyle(2,0x153a4a,1).beginPath().moveTo(-size,0).lineTo(0,-Math.max(2,size*.45)).lineTo(size,0).strokePath();birds.push(bird);
    }
    const flock=this.add.container(-45,startY,birds);this.surface.addAt(flock,4);
    birds.forEach((bird,i)=>this.tweens.add({targets:bird,y:bird.y+(i%2?2:-2),duration:Phaser.Math.Between(900,1500),yoyo:true,repeat:-1,ease:'Sine.inOut'}));
    this.tweens.add({targets:flock,x:1010,y:startY-Phaser.Math.Between(3,14),duration:Phaser.Math.Between(16000,21000),ease:'Linear',onComplete:()=>{flock.destroy(true);this.scheduleSurfaceGull()}});
  }
  private spotBadgeTexture(id:FishingLocationId){return id==='rocky-cove'?'ui-spot-rocky':id==='moonlit-trench'?'ui-spot-moonlit':'ui-spot-sunny'}
  private openFishingSpots(){
    this.modalOpen=true;this.pointerSteering=false;this.help.setVisible(false);this.spotsModal?.destroy(true);
    const save=SaveService.load(),items:Phaser.GameObjects.GameObject[]=[];
    const shade=this.add.rectangle(480,270,960,540,0x102f3d,.8).setInteractive();
    const paper=this.add.rectangle(480,270,910,500,0xfff6dc,.99).setStrokeStyle(8,COLORS.navy);
    const map=this.add.image(480,305,'ui-fishing-spots-map').setDisplaySize(840,390).setAlpha(.22);
    const title=this.add.text(480,55,'FISHING SPOTS',{fontSize:'30px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5);
    const subtitle=this.add.text(480,91,'Talk to the angler whenever you want to fish somewhere else.',{fontSize:'13px',fontStyle:'bold',color:'#4b6973'}).setOrigin(.5);
    const close=this.add.text(888,55,'X',{fontSize:'23px',fontStyle:'bold',color:'#fff6dc',backgroundColor:'#ef6b4a'}).setPadding(12,7).setOrigin(.5).setInteractive({useHandCursor:true});
    close.on('pointerdown',()=>this.closeFishingSpots());items.push(shade,paper,map,title,subtitle,close);
    FISHING_LOCATIONS.forEach((location,index)=>{
      const x=205+index*275,unlocked=SaveService.isLocationUnlocked(save,location.id),current=location.id===this.location.id,completed=save.completedLocationIds.includes(location.id);
      const card=this.add.rectangle(x,305,238,344,unlocked?0xfff6dc:0xc8d2cf,.92).setStrokeStyle(4,current?COLORS.coral:unlocked?COLORS.navy:0x71858b);
      const area=this.add.text(x,147,`AREA ${location.level}${current?'  •  CURRENT':''}`,{fontSize:'12px',fontStyle:'bold',color:current?'#ef6b4a':unlocked?'#153a4a':'#71858b'}).setOrigin(.5);
      const emblem=this.add.image(x,215,this.spotBadgeTexture(location.id)).setDisplaySize(112,112).setTint(unlocked?0xffffff:0x71858b).setAlpha(unlocked?1:.52);
      const name=this.add.text(x,285,unlocked?location.name.toUpperCase():'LOCKED',{fontSize:'20px',fontStyle:'bold',color:'#153a4a',align:'center',wordWrap:{width:210}}).setOrigin(.5);
      const description=this.add.text(x,337,location.description,{fontSize:'12px',fontStyle:'bold',color:'#4b6973',align:'center',wordWrap:{width:195}}).setOrigin(.5);
      const status=current?'CURRENT SPOT':unlocked?(completed?'FISH HERE AGAIN':'FISH HERE'):`Complete Area ${location.level-1}`;
      const action=this.add.text(x,435,status,{fontSize:'12px',fontStyle:'bold',color:'#fff6dc',backgroundColor:current?'#153a4a':unlocked?'#ef6b4a':'#71858b',align:'center'}).setPadding(11,7).setOrigin(.5);
      if(unlocked){card.setInteractive({useHandCursor:true});action.setInteractive({useHandCursor:true});const choose=()=>this.chooseFishingSpot(location.id);card.on('pointerdown',choose);action.on('pointerdown',choose);}
      items.push(card,area,emblem,name,description,action);
    });
    this.spotsModal=this.add.container(0,0,items).setDepth(220);
  }
  private chooseFishingSpot(id:FishingLocationId){
    AudioService.uiSelect();
    if(id===this.location.id){this.closeFishingSpots(false);return}
    const save=SaveService.load();save.lastLocationId=id;SaveService.save(save);
    this.spotsModal?.destroy(true);this.spotsModal=undefined;this.modalOpen=false;PortalBridge.gameplayStop();this.scene.restart({locationId:id});
  }
  private closeFishingSpots(playSound=true){if(playSound)AudioService.uiCancel();this.spotsModal?.destroy(true);this.spotsModal=undefined;this.finishModalClose()}
  private openCollection(tab:'fish'|'treasures'){
    this.modalOpen=true;this.pointerSteering=false;this.help.setVisible(false);this.collectionModal?.destroy(true);
    const saved=SaveService.load(),items:Phaser.GameObjects.GameObject[]=[];
    this.trip.catches.forEach(c=>SaveService.recordCatch(saved,c.fish.id,c.weight));
    this.trip.treasures.forEach(t=>SaveService.discoverTreasure(saved,t.id));
    const shade=this.add.rectangle(480,270,960,540,0x102f3d,.78).setInteractive(),paper=this.add.rectangle(480,280,850,470,0xfff6dc,.99).setStrokeStyle(8,COLORS.navy),title=this.add.text(95,62,`${this.location.name.toUpperCase()} FIELD BOOK`,{fontSize:'25px',fontStyle:'bold',color:'#153a4a'});
    const fishTab=this.add.rectangle(315,115,210,45,tab==='fish'?COLORS.coral:0xa9e5dc).setStrokeStyle(3,COLORS.navy).setInteractive({useHandCursor:true}),fishText=this.add.text(315,115,'FISH',{fontSize:'18px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5);
    const treasureTab=this.add.rectangle(545,115,210,45,tab==='treasures'?COLORS.coral:0xa9e5dc).setStrokeStyle(3,COLORS.navy).setInteractive({useHandCursor:true}),treasureText=this.add.text(545,115,'TREASURES',{fontSize:'18px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5);
    const close=this.add.text(866,65,'X',{fontSize:'24px',fontStyle:'bold',color:'#fff6dc',backgroundColor:'#ef6b4a'}).setPadding(12,7).setOrigin(.5).setInteractive({useHandCursor:true});
    fishTab.on('pointerdown',()=>{AudioService.uiSelect();this.openCollection('fish')});treasureTab.on('pointerdown',()=>{AudioService.uiSelect();this.openCollection('treasures')});close.on('pointerdown',()=>this.closeCollection());
    items.push(shade,paper,title,fishTab,fishText,treasureTab,treasureText,close);
    if(this.trip.catches.length||this.trip.treasures.length)items.push(this.add.text(865,105,'CURRENT TRIP INCLUDED',{fontSize:'10px',fontStyle:'bold',color:'#ef6b4a'}).setOrigin(1,.5));
    if(tab==='fish'){
      const discovered=this.location.fish.filter(f=>saved.fishStats[f.id]).length;
      items.push(this.add.text(790,110,`${discovered} / ${this.location.fish.length} FOUND`,{fontSize:'15px',fontStyle:'bold',color:'#153a4a'}).setOrigin(1,.5));
      this.location.fish.forEach((fish,i)=>{
        const col=i%3,row=Math.floor(i/3),x=230+col*250,y=225+row*155,stat=saved.fishStats[fish.id],known=!!stat;
        const card=this.add.rectangle(x,y,224,130,known?0xe8f5e9:0xd7e1dd,.98).setStrokeStyle(3,known?fish.color:0x6f858a),icon=this.add.image(x-70,y-12,fish.texture).setDisplaySize(68,42).setTint(known?fish.color:0x37505a).setAlpha(known?1:.55);
        const name=this.add.text(x-24,y-42,known?fish.name:'???',{fontSize:'16px',fontStyle:'bold',color:'#153a4a'}),rarity=this.add.text(x-24,y-18,known?fish.rarity:'UNDISCOVERED',{fontSize:'11px',fontStyle:'bold',color:known?'#4b6973':'#71858b'});
        const detail=this.add.text(x-94,y+27,known?`CAUGHT  ${stat.count}\nBEST  ${stat.bestWeight.toFixed(2)} kg` : fish.hint,{fontSize:'12px',fontStyle:'bold',color:'#153a4a',wordWrap:{width:185},align:'center'}).setOrigin(0,.5);
        items.push(card,icon,name,rarity,detail);
      });
    }else{
      const discovered=this.location.treasures.filter(t=>saved.discoveredTreasures.includes(t.id)).length;
      items.push(this.add.text(790,110,`${discovered} / ${this.location.treasures.length} FOUND`,{fontSize:'15px',fontStyle:'bold',color:'#153a4a'}).setOrigin(1,.5));
      this.location.treasures.forEach((treasure,i)=>{
        const x=235+i*245,y=285,known=saved.discoveredTreasures.includes(treasure.id),card=this.add.rectangle(x,y,220,245,known?0xe8f5e9:0xd7e1dd,.98).setStrokeStyle(3,known?COLORS.gold:0x6f858a),icon=this.add.image(x,y-38,treasure.texture).setDisplaySize(92,92).setTint(known?0xffffff:0x37505a).setAlpha(known?1:.5);
        const name=this.add.text(x,y+35,known?treasure.name:'???',{fontSize:'17px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5),hint=this.add.text(x,y+78,known?`FOUND AT ${this.location.name.toUpperCase()}`:treasure.hint,{fontSize:'12px',fontStyle:'bold',color:'#4b6973',align:'center',wordWrap:{width:175}}).setOrigin(.5);
        items.push(card,icon,name,hint);
      });
    }
    this.collectionModal=this.add.container(0,0,items).setDepth(220);
  }
  private finishModalClose(){
    this.inputLockedUntil=Math.max(this.inputLockedUntil,this.time.now+150);
    this.modalOpen=false;
    if(this.phase==='CAST')this.help.setVisible(false);
  }
  private closeCollection(){AudioService.bookClose();this.collectionModal?.destroy(true);this.collectionModal=undefined;this.finishModalClose()}
  private openTackleBox(){
    this.modalOpen=true;this.pointerSteering=false;this.help.setVisible(false);this.tackleModal?.destroy(true);
    const saved=SaveService.load(),items:Phaser.GameObjects.GameObject[]=[];
    const shade=this.add.rectangle(480,270,960,540,0x102f3d,.78).setInteractive();
    const paper=this.add.rectangle(480,280,850,470,0xfff6dc,.99).setStrokeStyle(8,COLORS.navy);
    const title=this.add.text(95,62,'THE TACKLE BOX',{fontSize:'29px',fontStyle:'bold',color:'#153a4a'});
    const subtitle=this.add.text(95,96,'PREPARE YOUR GEAR FOR THE NEXT CATCH',{fontSize:'13px',fontStyle:'bold',color:'#4b6973'});
    const coins=this.add.text(815,78,`COINS  ${saved.coins}`,{fontSize:'16px',fontStyle:'bold',color:'#153a4a'}).setOrigin(1,.5);
    const close=this.add.text(866,65,'X',{fontSize:'24px',fontStyle:'bold',color:'#fff6dc',backgroundColor:'#ef6b4a'}).setPadding(12,7).setOrigin(.5).setInteractive({useHandCursor:true});
    close.on('pointerdown',()=>this.closeTackleBox());
    const caseArt=this.add.image(245,245,'hub-tacklebox-open').setDisplaySize(270,205);
    const intro=this.add.text(245,370,'Every upgrade is gentle:\nmore comfort, never a guaranteed catch.',{fontSize:'13px',fontStyle:'bold',align:'center',color:'#153a4a',wordWrap:{width:270}}).setOrigin(.5);
    items.push(shade,paper,title,subtitle,coins,close,caseArt,intro);
    const cards:[string,EquipmentId,string,string][]=[
      ['line-icon','line','LINE','More range: +2 m per tier.'],
      ['reel-icon','reel','REEL','Faster hook and reel-in.'],
      ['basket-icon','basket','BASKET','Less drag; tier 3 adds a slot.'],
      ['bait-icon','bait','BAIT','Slightly better rare-fish odds.']
    ];
    cards.forEach(([frame,id,name,description],i)=>{
      const col=i%2,row=Math.floor(i/2),x=555+col*155,y=185+row*180;
      const card=this.add.rectangle(x,y,140,150,0xe8f5e9,.98).setStrokeStyle(3,COLORS.navy);
      const icon=this.add.image(x,y-36,'upgrade-icons',frame).setDisplaySize(68,68);
      const label=this.add.text(x,y+20,name,{fontSize:'16px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5);
      const detail=this.add.text(x,y+42,description,{fontSize:'10px',fontStyle:'bold',align:'center',color:'#4b6973',wordWrap:{width:120}}).setOrigin(.5);
      const level=saved.equipment[id],cost=SaveService.nextEquipmentCost(saved,id),buttonText=cost===undefined?'MAXED':`BUY  ${cost}`;
      const tier=this.add.text(x,y+61,`TIER ${level} / 3`,{fontSize:'11px',fontStyle:'bold',color:'#ef6b4a'}).setOrigin(.5);
      const button=this.add.text(x,y+84,buttonText,{fontSize:'12px',fontStyle:'bold',color:'#fff6dc',backgroundColor:cost===undefined?'#71858b':saved.coins>=cost?'#ef6b4a':'#9aa8a3'}).setPadding(8,5).setOrigin(.5);
      if(cost!==undefined){button.setInteractive({useHandCursor:true});button.on('pointerdown',()=>{AudioService.uiPop();this.confirmEquipmentPurchase(id,name,cost)});}
      items.push(card,icon,label,detail,tier,button);
    });
    const note=this.add.text(670,490,'Prices: 150  •  250  •  400 coins',{fontSize:'12px',fontStyle:'bold',color:'#4b6973'}).setOrigin(.5);
    items.push(note);this.tackleModal=this.add.container(0,0,items).setDepth(220);
  }
  private confirmEquipmentPurchase(id:EquipmentId,name:string,cost:number){
    const save=SaveService.load(),items:Phaser.GameObjects.GameObject[]=[];
    const shade=this.add.rectangle(480,270,960,540,0x102f3d,.2).setInteractive();
    const card=this.add.rectangle(480,270,370,195,0xfff6dc,1).setStrokeStyle(6,COLORS.navy);
    const heading=this.add.text(480,220,`UPGRADE ${name}?`,{fontSize:'22px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5);
    const copy=this.add.text(480,258,`Spend ${cost} coins?\nYou have ${save.coins}.`,{fontSize:'15px',fontStyle:'bold',align:'center',color:'#4b6973'}).setOrigin(.5);
    const cancel=this.add.text(400,322,'CANCEL',{fontSize:'14px',fontStyle:'bold',color:'#153a4a',backgroundColor:'#a9e5dc'}).setPadding(11,7).setOrigin(.5).setInteractive({useHandCursor:true});
    const confirm=this.add.text(560,322,`BUY  ${cost}`,{fontSize:'14px',fontStyle:'bold',color:'#fff6dc',backgroundColor:save.coins>=cost?'#ef6b4a':'#9aa8a3'}).setPadding(11,7).setOrigin(.5).setInteractive({useHandCursor:true});
    const prompt=this.add.container(0,0,[shade,card,heading,copy,cancel,confirm]).setDepth(230);cancel.on('pointerdown',()=>{AudioService.uiCancel();prompt.destroy(true)});
    confirm.on('pointerdown',()=>{if(!SaveService.purchaseEquipment(save,id)){AudioService.fail();this.showToast('Not enough coins.');prompt.destroy(true);return}AudioService.purchase();SaveService.save(save);prompt.destroy(true);this.openTackleBox();this.showToast(`${name} upgraded!`)});
  }
  private closeTackleBox(){AudioService.uiCancel();this.tackleModal?.destroy(true);this.tackleModal=undefined;this.finishModalClose()}
  private openJobs(tab:'jobs'|'badges'){
    this.modalOpen=true;this.pointerSteering=false;this.help.setVisible(false);this.jobsModal?.destroy(true);
    const save=SaveService.load();QuestService.ensureActive(save);SaveService.save(save);const items:Phaser.GameObjects.GameObject[]=[];
    const shade=this.add.rectangle(480,270,960,540,0x102f3d,.78).setInteractive();
    const paper=this.add.rectangle(480,280,850,470,0xfff6dc,.99).setStrokeStyle(8,COLORS.navy);
    const title=this.add.text(95,62,'HARBOR JOBS',{fontSize:'29px',fontStyle:'bold',color:'#153a4a'});
    const subtitle=this.add.text(95,88,'COMPLETE TRIPS • EARN COINS, XP & STICKERS',{fontSize:'13px',fontStyle:'bold',color:'#4b6973'});
    const close=this.add.text(866,65,'X',{fontSize:'24px',fontStyle:'bold',color:'#fff6dc',backgroundColor:'#ef6b4a'}).setPadding(12,7).setOrigin(.5).setInteractive({useHandCursor:true});
    close.on('pointerdown',()=>this.closeJobs());
    const jobsTab=this.add.rectangle(330,128,205,42,tab==='jobs'?COLORS.coral:0xa9e5dc).setStrokeStyle(3,COLORS.navy).setInteractive({useHandCursor:true});
    const jobsText=this.add.text(330,128,'JOBS',{fontSize:'17px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5);
    const badgesTab=this.add.rectangle(550,128,205,42,tab==='badges'?COLORS.coral:0xa9e5dc).setStrokeStyle(3,COLORS.navy).setInteractive({useHandCursor:true});
    const badgesText=this.add.text(550,128,'BADGES',{fontSize:'17px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5);
    jobsTab.on('pointerdown',()=>{AudioService.jobsOpen();this.openJobs('jobs')});badgesTab.on('pointerdown',()=>{AudioService.jobsOpen();this.openJobs('badges')});
    const notes=this.add.image(205,296,'harbor-notes').setDisplaySize(220,238);
    items.push(shade,paper,title,subtitle,close,jobsTab,jobsText,badgesTab,badgesText,notes);
    if(tab==='jobs'){
      items.push(this.add.text(205,435,'New jobs arrive\nafter completed trips.',{fontSize:'14px',fontStyle:'bold',align:'center',color:'#153a4a'}).setOrigin(.5));
      save.activeQuests.forEach((active,index)=>{
        const quest=questById(active.id);if(!quest)return;const x=590,y=205+index*115,progress=Math.min(active.progress,quest.target),done=progress>=quest.target;
        const card=this.add.rectangle(x,y,370,96,done?0xd9eedc:0xe8f5e9,.98).setStrokeStyle(3,done?COLORS.green:COLORS.navy);
        const emblem=this.add.circle(x-150,y,26,done?COLORS.green:COLORS.gold).setStrokeStyle(2,COLORS.navy);
        const icon=this.add.text(x-150,y,done?'✓':quest.icon,{fontSize:done?'26px':'10px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5);
        const questTitle=this.add.text(x-111,y-28,quest.title,{fontSize:'16px',fontStyle:'bold',color:'#153a4a'});
        const description=this.add.text(x-111,y-5,quest.description,{fontSize:'12px',fontStyle:'bold',color:'#4b6973'});
        const reward=this.add.text(x-111,y+22,`+${quest.coins} COINS   +${quest.xp} XP${quest.sticker?'   +STICKER':''}`,{fontSize:'11px',fontStyle:'bold',color:'#ef6b4a'});
        const amount=this.add.text(x+154,y+24,done?'CLAIM':`${progress} / ${quest.target}`,{fontSize:'15px',fontStyle:'bold',color:done?'#fff6dc':'#153a4a',backgroundColor:done?'#55a86f':undefined}).setPadding(done?9:0,done?5:0).setOrigin(1);
        if(done){amount.setInteractive({useHandCursor:true});amount.on('pointerdown',()=>this.claimJob(active.id,x+120,y));}
        items.push(card,emblem,icon,questTitle,description,reward,amount);
      });
    }else{
      const unlocked=new Set(save.achievementIds),pending=new Set(save.pendingAchievementIds);items.push(this.add.text(790,110,`${unlocked.size} / ${ACHIEVEMENTS.length} CLAIMED`,{fontSize:'14px',fontStyle:'bold',color:'#153a4a'}).setOrigin(1,.5));
      ACHIEVEMENTS.forEach((achievement,index)=>{
        const x=565,y=180+index*82,known=unlocked.has(achievement.id),ready=pending.has(achievement.id),card=this.add.rectangle(x,y,430,65,known?0xe8f5e9:ready?0xffedbd:0xd7e1dd,.98).setStrokeStyle(3,known?COLORS.green:ready?COLORS.gold:0x6f858a);
        const seal=this.add.circle(x-182,y,20,known?COLORS.gold:ready?COLORS.coral:0x71858b).setStrokeStyle(2,COLORS.navy);
        const mark=this.add.text(x-182,y,known?'★':ready?'!':'?',{fontSize:'18px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5);
        const name=this.add.text(x-145,y-14,known||ready?achievement.title:'???',{fontSize:'16px',fontStyle:'bold',color:'#153a4a'});
        const description=this.add.text(x-145,y+11,known?achievement.description:ready?`READY  +${achievement.coins} COINS  +${achievement.xp} XP`:'Keep exploring Sunny Pier.',{fontSize:'11px',fontStyle:'bold',color:ready?'#ef6b4a':'#4b6973'});
        items.push(card,seal,mark,name,description);
        if(ready){const claim=this.add.text(x+188,y,'CLAIM',{fontSize:'12px',fontStyle:'bold',color:'#fff6dc',backgroundColor:'#55a86f'}).setPadding(8,5).setOrigin(1,.5).setInteractive({useHandCursor:true});claim.on('pointerdown',()=>this.claimBadge(achievement.id,x+150,y));items.push(claim);}
      });
    }
    this.jobsModal=this.add.container(0,0,items).setDepth(220);
  }
  private closeJobs(){AudioService.bookClose();this.jobsModal?.destroy(true);this.jobsModal=undefined;this.finishModalClose()}
  private boatFrame(save=SaveService.load()){
    return ['boat-broken','boat-hull','boat-motor','boat-ready'][SaveService.boatStage(save)];
  }
  private boatOriginY(save=SaveService.load()){return SaveService.boatStage(save)>=2?.26:.5}
  private applyBoatFrame(save=SaveService.load()){this.boatSprite.setFrame(this.boatFrame(save)).setOrigin(.5,this.boatOriginY(save))}
  private openBoatRepair(){
    this.modalOpen=true;this.pointerSteering=false;this.help.setVisible(false);this.boatModal?.destroy(true);
    const save=SaveService.load(),stage=SaveService.boatStage(save),nextCost=SaveService.nextBoatRepairCost(save),level=SaveService.levelProgress(save.xp).level,items:Phaser.GameObjects.GameObject[]=[];
    const shade=this.add.rectangle(480,270,960,540,0x102f3d,.78).setInteractive(),paper=this.add.rectangle(480,280,850,470,0xfff6dc,.99).setStrokeStyle(8,COLORS.navy);
    const title=this.add.text(95,62,'THE QUESTIONABLY SEAWORTHY BOAT',{fontSize:'27px',fontStyle:'bold',color:'#153a4a'}),subtitle=this.add.text(95,97,stage===3?'IT FLOATS. THE HARBOR MASTER IS STUNNED.':'TECHNICAL STATUS: FLOATS. MOSTLY.',{fontSize:'13px',fontStyle:'bold',color:'#4b6973'});
    const close=this.add.text(866,65,'X',{fontSize:'24px',fontStyle:'bold',color:'#fff6dc',backgroundColor:'#ef6b4a'}).setPadding(12,7).setOrigin(.5).setInteractive({useHandCursor:true});close.on('pointerdown',()=>this.closeBoatRepair());
    const art=this.add.image(270,285,'hub-boat-states',this.boatFrame(save)).setDisplaySize(330,330),stageNames=['HULL PATCHED','MOTOR PERSUADED','MÖWE EVICTED'];
    items.push(shade,paper,title,subtitle,close,art);
    stageNames.forEach((name,index)=>{const done=index<stage,y=180+index*78,card=this.add.rectangle(630,y,330,58,done?0xd9eedc:0xe8f5e9,.98).setStrokeStyle(3,done?COLORS.green:COLORS.navy),mark=this.add.text(490,y,done?'✓':String(index+1),{fontSize:'18px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5),label=this.add.text(525,y-10,name,{fontSize:'15px',fontStyle:'bold',color:'#153a4a'}),cost=this.add.text(525,y+12,done?'COMPLETE':`${BOAT_REPAIR_COSTS[index]} COINS`,{fontSize:'12px',fontStyle:'bold',color:done?'#55a86f':'#ef6b4a'});items.push(card,mark,label,cost);});
    const routeReady=stage===3&&level>=3,status=stage<3?`REPAIR ${stage+1} OF 3` : routeReady?'ROCKY COVE ROUTE READY':'BOAT READY • REACH LEVEL 3',statusText=this.add.text(630,425,status,{fontSize:'15px',fontStyle:'bold',color:routeReady?'#55a86f':'#153a4a'}).setOrigin(.5);
    items.push(statusText,this.add.text(270,455,`INVESTED  ${save.boat.investedCoins} / 1000 COINS`,{fontSize:'14px',fontStyle:'bold',color:'#4b6973'}).setOrigin(.5));
    if(nextCost!==undefined){const canAfford=save.coins>=nextCost,repair=this.add.text(630,475,canAfford?`REPAIR  ${nextCost}`:`NEED ${nextCost-save.coins} MORE COINS`,{fontSize:'15px',fontStyle:'bold',color:'#fff6dc',backgroundColor:canAfford?'#ef6b4a':'#71858b'}).setPadding(14,8).setOrigin(.5);if(canAfford){repair.setInteractive({useHandCursor:true});repair.on('pointerdown',()=>this.repairCurrentBoat());}items.push(repair);}
    else items.push(this.add.text(630,475,routeReady?'TRAVEL MAP COMING NEXT':'THE BOAT IS READY. YOU ARE NOT.',{fontSize:'14px',fontStyle:'bold',color:'#fff6dc',backgroundColor:routeReady?'#55a86f':'#71858b'}).setPadding(14,8).setOrigin(.5));
    this.boatModal=this.add.container(0,0,items).setDepth(220);
  }
  private repairCurrentBoat(){
    const save=SaveService.load(),before=SaveService.boatStage(save);if(!SaveService.repairBoat(save)){AudioService.fail();return}AudioService.repair();SaveService.save(save);this.applyBoatFrame(save);this.refreshProgressHud();this.openBoatRepair();this.showToast(before===2?'Boat repaired! The gull has filed an appeal.':'Repair complete!');
  }
  private closeBoatRepair(){AudioService.uiCancel();this.boatModal?.destroy(true);this.boatModal=undefined;this.finishModalClose()}
  private claimJob(id:string,x:number,y:number){
    const save=SaveService.load(),levelBefore=SaveService.levelProgress(save.xp).level,reward=QuestService.claimQuest(save,id);if(!reward)return;
    AudioService.claim();SaveService.save(save);this.jobsModal?.destroy(true);this.jobsModal=undefined;this.finishModalClose();this.animateClaimReward(reward.title,reward.coins,reward.xp,x,y,levelBefore,reward.sticker?'  + STICKER':'');
  }
  private claimBadge(id:string,x:number,y:number){
    const save=SaveService.load(),levelBefore=SaveService.levelProgress(save.xp).level,reward=QuestService.claimAchievement(save,id);if(!reward)return;
    AudioService.claim();SaveService.save(save);this.jobsModal?.destroy(true);this.jobsModal=undefined;this.finishModalClose();this.animateClaimReward(reward.title,reward.coins,reward.xp,x,y,levelBefore,'  BADGE CLAIMED');
  }
  private refreshProgressHud(){
    const save=SaveService.load(),level=SaveService.levelProgress(save.xp),xpLabel=level.maxed?`${save.xp} XP`:`${level.current}/${level.needed} XP`;
    this.progressText.setText(`LEVEL ${level.level}   ${xpLabel}   COINS ${save.coins}`);
  }
  private animateClaimReward(label:string,coins:number,xp:number,x:number,y:number,levelBefore:number,extra:string){
    for(let i=0;i<8;i++){const coin=i%2===0,particle=this.add.text(x+(i%3)*8,y+(i%2)*7,coin?'●':'✦',{fontSize:coin?'17px':'15px',fontStyle:'bold',color:coin?'#ffd166':'#69d6c5',stroke:'#153a4a',strokeThickness:3}).setOrigin(.5).setDepth(260);this.tweens.add({targets:particle,x:900+(i%3)*12,y:28,alpha:{from:1,to:.75},duration:430+i*45,delay:i*35,ease:'Cubic.easeIn',onComplete:()=>particle.destroy()});}
    const message=this.add.text(480,105,`${label.toUpperCase()}  +${coins} COINS  +${xp} XP${extra}`,{fontSize:'17px',fontStyle:'bold',color:'#153a4a',backgroundColor:'#ffd166'}).setPadding(13,8).setOrigin(.5).setDepth(255).setScale(.65);
    this.tweens.add({targets:message,scale:1,duration:220,ease:'Back.easeOut'});
    this.time.delayedCall(850,()=>{this.refreshProgressHud();this.tweens.add({targets:this.progressText,scale:1.14,duration:130,yoyo:true});const level=SaveService.levelProgress(SaveService.load().xp).level;if(level>levelBefore){AudioService.levelUp();message.setText(`LEVEL UP!  LEVEL ${level}`).setBackgroundColor('#ef6b4a').setColor('#fff6dc');this.tweens.add({targets:message,scale:1.18,duration:150,yoyo:true});this.time.delayedCall(1000,()=>message.destroy());}else this.tweens.add({targets:message,alpha:0,y:85,duration:350,onComplete:()=>message.destroy()});});
  }
  private showToast(message:string){const tx=this.add.text(480,105,message,{fontSize:'18px',fontStyle:'bold',color:'#153a4a',backgroundColor:'#fff6dc'}).setPadding(12,7).setOrigin(.5).setDepth(90);this.tweens.add({targets:tx,y:85,alpha:0,delay:850,duration:350,onComplete:()=>tx.destroy()})}
  private clearOverlay(){this.overlay?.destroy(true);this.overlay=undefined}
  private hideCastMeter(){(this.children.getByName('cast-meter') as Phaser.GameObjects.Image|undefined)?.setVisible(false);this.meter.clear()}
  update(_:number,delta:number){
    if(!this.reducedMotion&&this.surface.visible){
      this.boatSprite.y=315+Math.round(Math.sin(this.time.now*.0016)*2);
      for(const cloud of this.surfaceClouds){
        cloud.sprite.x+=cloud.speed*delta/1000;
        if(cloud.sprite.x-cloud.sprite.displayWidth/2>960)cloud.sprite.x=-cloud.sprite.displayWidth/2;
      }
    }
    if(this.phase==='CAST'){this.hideCastMeter()}
    else if(this.phase==='UNDERWATER')this.updateUnderwater(delta);else if(this.phase==='RETRACTING')this.updateRetract(delta);
  }
}
