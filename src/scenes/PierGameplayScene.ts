import Phaser from 'phaser';
import { AudioService } from '../core/AudioService';
import { COLORS, TRIP_CASTS } from '../core/GameConfig';
import { PortalBridge } from '../core/PortalBridge';
import { compactViewport, configureSceneRendering, safeAreaInsets, scaleToVisibleBounds, visibleGameBounds } from '../core/RenderQuality';
import { BOAT_REPAIR_COSTS, EQUIPMENT_COSTS, SaveService, type EquipmentId } from '../core/SaveService';
import { ACHIEVEMENTS, QuestService, questById } from '../gameplay/QuestService';
import { fishFlipXForDirection, type Fish } from '../gameplay/Fish';
import { captureDecayPerSecond, captureSeconds, fishBehavior, movementScale, verticalOffset } from '../gameplay/FishBehavior';
import type { TreasureId } from '../gameplay/Treasure';
import { TripState } from '../gameplay/TripState';
import { FISHING_LOCATIONS, locationById, type FishingLocation, type FishingLocationId } from '../gameplay/FishingLocation';
import { castQualityFromMarker, currentVector, obstaclesForLocation, pointHitsObstacle, treasureChance, treasureSpawnPoint } from '../gameplay/UnderwaterEnvironment';
import { joystickKnobPosition, virtualJoystickVector } from '../gameplay/TouchControls';
import { bobberStyle, cycleBobberStyle, unlockedBobberStyles } from '../gameplay/Cosmetics';

type Phase='CAST'|'FLIGHT'|'UNDERWATER'|'RETRACTING'|'RESULT';
type Target={fish:Fish;sprite:Phaser.GameObjects.Image;aura:Phaser.GameObjects.Arc;badge:Phaser.GameObjects.Text;slots:number;capture:number;direction:number;speed:number;baseY:number;phase:number;lastTouchAt:number};

export class PierGameplayScene extends Phaser.Scene {
  private phase:Phase='CAST'; private trip!:TripState; private castQuality=0; private marker=0; private markerDir=1;
  private surface!:Phaser.GameObjects.Container; private underwater?:Phaser.GameObjects.Container; private overlay?:Phaser.GameObjects.Container;
  private title!:Phaser.GameObjects.Text; private help!:Phaser.GameObjects.Text; private meter!:Phaser.GameObjects.Graphics; private castHint!:Phaser.GameObjects.Text; private progressText!:Phaser.GameObjects.Text; private locationText!:Phaser.GameObjects.Text;
  private angler!:Phaser.GameObjects.Image; private bobber!:Phaser.GameObjects.Image;
  private hookPos=new Phaser.Math.Vector2(480,92); private hookTarget=new Phaser.Math.Vector2(480,92); private anchor=new Phaser.Math.Vector2(480,70);
  private rope!:Phaser.GameObjects.Graphics; private hookArt!:Phaser.GameObjects.Graphics; private captureArt!:Phaser.GameObjects.Graphics;private captureLabel!:Phaser.GameObjects.Text;
  private hookSprite!:Phaser.GameObjects.Image;
  private lineHud!:Phaser.GameObjects.Container;private lineText!:Phaser.GameObjects.Text;private lineValueText!:Phaser.GameObjects.Text;private lineFill!:Phaser.GameObjects.Rectangle; private basketText!:Phaser.GameObjects.Text; private diveHint!:Phaser.GameObjects.Text; private reelBg!:Phaser.GameObjects.Rectangle; private reelTx!:Phaser.GameObjects.Text;
  private targets:Target[]=[]; private caught:{fish:Fish;sprite:Phaser.GameObjects.Image}[]=[]; private usedSlots=0; private maxSlots=2; private treasureFound=false;
  private treasure?:Phaser.GameObjects.Container; private maxLinePx=590; private lineMeters=22; private hookMoveSpeed=165; private reelSpeed=340; private basketDrag=.025; private baitLevel=0; private pointerSteering=false; private inputLockedUntil=0;
  private lineLevel=0;private reelLevel=0;private basketLevel=0;private baitGlow?:Phaser.GameObjects.Arc;private treasurePosition=new Phaser.Math.Vector2(802,447);private moonlitShade?:Phaser.GameObjects.Rectangle;private moonlitMaskSource?:Phaser.GameObjects.Graphics;private moonlitGlow?:Phaser.GameObjects.Arc;
  private trail:Phaser.Math.Vector2[]=[]; private retractIndex=0;
  private keys!:Record<string,Phaser.Input.Keyboard.Key>;
  private reducedMotion=false;
  private touchControls=false;private joystickPointerId?:number;private joystickOrigin=new Phaser.Math.Vector2();private joystickVector=new Phaser.Math.Vector2();private joystickBase?:Phaser.GameObjects.Arc;private joystickKnob?:Phaser.GameObjects.Arc;private controlOnboarding?:Phaser.GameObjects.Container;
  private safeTop=0;
  private surfaceClouds:{sprite:Phaser.GameObjects.Image;speed:number}[]=[];
  private hubTutorial?:Phaser.GameObjects.Container;private firstCastAssist=false;
  private cooler!:Phaser.GameObjects.Image;private tacklebox!:Phaser.GameObjects.Image;private boatSprite!:Phaser.GameObjects.Image;private boatZone!:Phaser.GameObjects.Zone;private noticeBoard!:Phaser.GameObjects.Zone;private spotsZone?:Phaser.GameObjects.Zone;private collectionModal?:Phaser.GameObjects.Container;private tackleModal?:Phaser.GameObjects.Container;private jobsModal?:Phaser.GameObjects.Container;private boatModal?:Phaser.GameObjects.Container;private spotsModal?:Phaser.GameObjects.Container;private modalOpen=false;
  private touchingTarget?:Target;
  private currentTreasureId?:TreasureId;
  private location!:FishingLocation;

  constructor(){super('Pier')}
  init(data:{locationId?:FishingLocationId}={}){this.location=locationById(data.locationId);this.trip=new TripState(this.location.id);this.phase='CAST';this.inputLockedUntil=0}
  create(){
    configureSceneRendering(this);
    this.reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.touchControls=window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const contextSave=SaveService.load(),contextLevel=SaveService.levelProgress(contextSave.xp).level;
    PortalBridge.setGameContext({area:this.location.name,level:String(contextLevel),coins:String(contextSave.coins)});PortalBridge.gameplayStart();this.surface=this.add.container(0,0);this.drawSurface();
    this.title=this.add.text(480,28,'',{fontSize:'25px',fontStyle:'bold',color:'#fff6dc',stroke:'#153a4a',strokeThickness:6}).setOrigin(.5).setDepth(100);
    this.help=this.add.text(480,500,'',{fontSize:'20px',fontStyle:'bold',color:'#153a4a',backgroundColor:'#fff6dc',align:'center'}).setPadding(14,9).setOrigin(.5).setDepth(100);
    this.meter=this.add.graphics().setDepth(90);this.castHint=this.add.text(480,92,'TAP TO CAST · GREEN = BONUS',{fontSize:'12px',fontStyle:'bold',color:'#fff6dc',stroke:'#153a4a',strokeThickness:4}).setOrigin(.5).setDepth(100).setVisible(false);
    this.keys=this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE') as Record<string,Phaser.Input.Keyboard.Key>;
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{
      AudioService.unlock();
      if(this.hubTutorial?.active)return;
      if(this.modalOpen)return;
      if(this.phase==='CAST'&&this.cooler?.getBounds().contains(p.worldX,p.worldY)){AudioService.bookOpen();this.openCollection('fish');return}
      if(this.phase==='CAST'&&this.tacklebox?.getBounds().contains(p.worldX,p.worldY)){AudioService.tackleOpen();this.openTackleBox();return}
      if(this.phase==='CAST'&&this.noticeBoard?.getBounds().contains(p.worldX,p.worldY)){AudioService.jobsOpen();this.openJobs('jobs');return}
      if(this.phase==='CAST'&&this.boatZone?.getBounds().contains(p.worldX,p.worldY)){AudioService.boatOpen();this.openBoatRepair();return}
      if(this.phase==='CAST'&&this.angler?.input?.enabled&&(this.angler.getBounds().contains(p.worldX,p.worldY)||this.spotsZone?.getBounds().contains(p.worldX,p.worldY))){if(this.trip.castsLeft!==TRIP_CASTS){AudioService.fail();this.showToast('Finish this trip before changing fishing spots.');return}AudioService.bookOpen();this.openFishingSpots();return}
      if(this.phase==='UNDERWATER'&&this.touchControls){if(this.reelBg?.getBounds().contains(p.worldX,p.worldY))return;this.beginTouchSteering(p);return}
      this.pointerSteering=this.phase==='UNDERWATER';this.hookTarget.set(p.worldX,p.worldY);this.press();
    });
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(this.touchControls&&this.joystickPointerId!==undefined)this.updateTouchSteering(p);else if(this.pointerSteering)this.hookTarget.set(p.worldX,p.worldY)});
    this.input.on('pointerup',(p:Phaser.Input.Pointer)=>{this.pointerSteering=false;this.endTouchSteering(p)});
    this.layoutSafeArea();this.events.on('render-quality-changed',()=>this.layoutSafeArea());this.beginCast();this.showHubTutorial();
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
    const save=SaveService.load(),stickers:Phaser.GameObjects.Arc[]=[];QuestService.ensureActive(save);
    if(SaveService.isLocationUnlocked(save,this.location.id)&&save.lastLocationId!==this.location.id){save.lastLocationId=this.location.id;SaveService.save(save)}
    this.boatSprite=this.add.image(620,315,'hub-boat-states',this.boatFrame(save)).setDisplaySize(180,180).setOrigin(.5,this.boatOriginY(save)).setDepth(4);
    this.boatZone=this.add.zone(620,335,175,82).setInteractive({useHandCursor:true}).setDepth(6);
    const stickerColors=[0xffd166,0xef6b4a,0x69d6c5];
    for(let i=0;i<Math.min(3,save.coolerStickerTier+save.harborStickerCount);i++)stickers.push(this.add.circle(141+i*11,426,4,stickerColors[i]).setStrokeStyle(1,0xfff6dc).setDepth(5));
    this.angler=this.add.image(330,350,'angler-chair-perspective').setDisplaySize(315,210).setDepth(5);
    const hotspotCues=[
      this.add.text(160,384,'FISHBOOK',{fontSize:'10px',fontStyle:'bold',color:'#fff6dc',backgroundColor:'#153a4a'}).setPadding(6,3).setOrigin(.5).setDepth(7),
      this.add.text(225,414,'TACKLE',{fontSize:'10px',fontStyle:'bold',color:'#fff6dc',backgroundColor:'#153a4a'}).setPadding(6,3).setOrigin(.5).setDepth(7),
      this.add.text(620,382,SaveService.boatStage(save)>=3?'BOAT':'REPAIR BOAT',{fontSize:'10px',fontStyle:'bold',color:'#fff6dc',backgroundColor:'#153a4a'}).setPadding(6,3).setOrigin(.5).setDepth(7)
    ];
    const jobReady=save.activeQuests.some(active=>{const quest=questById(active.id);return !!quest&&active.progress>=quest.target})||save.pendingAchievementIds.length>0;
    const gearReady=(Object.keys(save.equipment) as EquipmentId[]).some(id=>{const cost=SaveService.nextEquipmentCost(save,id);return cost!==undefined&&save.coins>=cost});
    const boatCost=SaveService.nextBoatRepairCost(save),attentionDots=[
      ...(jobReady?[this.add.circle(91,207,7,COLORS.coral).setStrokeStyle(2,COLORS.cream).setDepth(8)]:[]),
      ...(gearReady?[this.add.circle(258,423,7,COLORS.coral).setStrokeStyle(2,COLORS.cream).setDepth(8)]:[]),
      ...(boatCost!==undefined&&save.coins>=boatCost?[this.add.circle(675,292,7,COLORS.coral).setStrokeStyle(2,COLORS.cream).setDepth(8)]:[])
    ];
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
    this.bobber.setTint(bobberStyle(save).tint);
    this.locationText=this.add.text(22,22,this.location.name.toUpperCase(),{fontSize:'18px',fontStyle:'bold',color:'#fff6dc'}).setDepth(11);
    const level=SaveService.levelProgress(save.xp),xpLabel=level.maxed?`${save.xp} XP`:`${level.current}/${level.needed} XP`;
    this.progressText=this.add.text(938,22,`LEVEL ${level.level}   ${xpLabel}   COINS ${save.coins}`,{fontSize:'15px',fontStyle:'bold',color:'#fff6dc'}).setOrigin(1,0).setDepth(11);
    this.surface.add([bg,cloudA,cloudB,cloudC,foregroundOccluder,shade,...rearPostRipples,jobsNoticeArt,this.noticeBoard,this.cooler,this.tacklebox,this.boatSprite,this.boatZone,...stickers,this.angler,...hotspotCues,...attentionDots,...spotCue,...frontPostRipples,this.bobber,this.locationText,this.progressText]);
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
    this.clearOverlay();this.clearMoonlitVisibility();this.surface.setVisible(true);this.underwater?.destroy(true);this.underwater=undefined;this.phase='CAST';this.marker=0;this.markerDir=1;this.inputLockedUntil=this.time.now+250;
    const save=SaveService.load();this.firstCastAssist=!save.castTutorialSeen&&this.trip.castsLeft===TRIP_CASTS;
    this.title.setText(`DIVE ${TRIP_CASTS-this.trip.castsLeft+1} OF ${TRIP_CASTS}`);this.help.setVisible(false);this.bobber.setVisible(false);this.castHint.setText(this.firstCastAssist?'TAP ANYWHERE TO CAST  •  GREEN ONLY ADDS A BONUS':'TAP TO CAST  •  GREEN = BONUS').setVisible(true);this.drawCastMeter();
  }
  private press(){
    if(this.modalOpen||this.time.now<this.inputLockedUntil)return;AudioService.unlock();
    if(this.phase==='CAST')this.cast();else if(this.phase==='RESULT')this.nextDive();
  }
  private cast(){
    const save=SaveService.load();if(!save.castTutorialSeen){save.castTutorialSeen=true;SaveService.save(save)}
    this.castQuality=castQualityFromMarker(this.marker);this.trip.useCast();this.phase='FLIGHT';this.hideCastMeter();AudioService.cast();this.help.setText('CASTING…');if(this.castQuality>=.88){this.showToast('PERFECT CAST!');this.showPerfectCastFx()}else if(this.castQuality>=.58)this.showToast('GOOD CAST');
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
    this.phase='UNDERWATER';this.surface.setVisible(false);this.help.setVisible(false);this.title.setText('');this.hookPos.set(480,92);this.hookTarget.copy(this.hookPos);this.usedSlots=0;this.caught=[];this.treasureFound=false;this.currentTreasureId=undefined;this.targets=[];this.touchingTarget=undefined;this.joystickPointerId=undefined;this.joystickVector.set(0,0);this.joystickBase=undefined;this.joystickKnob=undefined;this.controlOnboarding=undefined;
    const save=SaveService.load(),equipment=save.equipment;
    this.lineLevel=equipment.line;this.reelLevel=equipment.reel;this.basketLevel=equipment.basket;this.maxLinePx=590+equipment.line*45+this.castQuality*30;this.lineMeters=22+equipment.line*2;
    this.hookMoveSpeed=165*(1+equipment.reel*.07);this.reelSpeed=340*(1+equipment.reel*.08);
    this.maxSlots=2+(equipment.basket>=3?1:0);this.basketDrag=Math.max(.01,.025-equipment.basket*.005);this.baitLevel=equipment.bait;
    const c=this.underwater=this.add.container(0,0);c.setDepth(20);
    c.add(this.add.image(480,270,this.location.underwaterTexture).setDisplaySize(960,540));
    for(const [x,y,s] of [[80,440,1],[180,475,.8],[720,485,.9],[875,430,.75]] as number[][]){const weed=this.add.graphics();weed.lineStyle(10,0x3f9b83,.9);for(let j=0;j<3;j++)weed.beginPath().moveTo(x+j*13,y+80).lineTo(x-8+j*14,y+25-j*7).strokePath();weed.setScale(s);c.add(weed)}
    if(this.location.id==='rocky-cove')this.drawRockyEnvironment(c);
    this.addLocationDepthLayers(c);
    this.rope=this.add.graphics().setDepth(35);this.hookArt=this.add.graphics().setVisible(false);this.captureArt=this.add.graphics().setDepth(39);this.captureLabel=this.add.text(0,0,'',{fontSize:'12px',fontStyle:'bold',color:'#153a4a',backgroundColor:'#ffd166'}).setPadding(6,3).setOrigin(.5).setVisible(false).setDepth(42);this.baitGlow=this.add.circle(this.hookPos.x,this.hookPos.y,17+this.baitLevel*4,0xffd166,.04+this.baitLevel*.035).setStrokeStyle(1+this.baitLevel*.6,0xffd166,.18+this.baitLevel*.12).setVisible(this.baitLevel>0).setDepth(39);this.hookSprite=this.add.image(this.hookPos.x,this.hookPos.y,'hook-basic').setDisplaySize(52,66).setDepth(40);c.add([this.rope,this.hookArt,this.captureArt,this.captureLabel,this.baitGlow,this.hookSprite]);this.trail=[this.anchor.clone(),this.hookPos.clone()];
    const linePanel=this.add.rectangle(0,0,224,54,0x153a4a,.94).setStrokeStyle(2,0xfff6dc,.55).setOrigin(0),lineTrack=this.add.rectangle(12,40,200,10,0xfff6dc,.24).setOrigin(0,.5);
    this.lineFill=this.add.rectangle(12,40,200,10,0x69d6c5,1).setOrigin(0,.5);this.lineText=this.add.text(12,7,`LINE · T${this.lineLevel}`,{fontSize:'14px',fontStyle:'bold',color:'#fff6dc'});this.lineValueText=this.add.text(212,7,'',{fontSize:'14px',fontStyle:'bold',color:'#fff6dc'}).setOrigin(1,0);this.lineHud=this.add.container(24,18,[linePanel,lineTrack,this.lineFill,this.lineText,this.lineValueText]).setDepth(60);
    this.basketText=this.add.text(480,18,'',{fontSize:'18px',fontStyle:'bold',color:'#fff6dc',backgroundColor:'#153a4a'}).setPadding(12,8).setOrigin(.5,0).setDepth(60);
    const reelAccent=[0xfff6dc,0xa9e5dc,0x69d6c5,0xffd166][this.reelLevel];
    this.reelBg=this.add.rectangle(860,39,150,48,0xef6b4a).setStrokeStyle(3,reelAccent).setInteractive({useHandCursor:true}).setDepth(60);
    this.reelTx=this.add.text(860,39,`REEL IN · T${this.reelLevel}`,{fontSize:'16px',fontStyle:'bold',color:'#fff6dc'}).setOrigin(.5).setDepth(61);
    this.reelBg.on('pointerdown',()=>this.startRetract());
    const controlHint=this.touchControls?'HOLD & DRAG TO STEER':'DRAG THE MOUSE OR USE WASD / ARROWS',hint=this.location.id==='rocky-cove'?`${controlHint}  •  CURRENT PUSHES RIGHT`:this.location.id==='moonlit-trench'?`${controlHint}  •  KEEP THE HOOK LIGHT CLOSE`:`${controlHint}  •  STAY ON A FISH  •  REEL IN ANYTIME`;
    this.diveHint=this.add.text(480,505,hint,{fontSize:'16px',fontStyle:'bold',color:'#153a4a',backgroundColor:'#fff6dc'}).setPadding(10,6).setOrigin(.5).setDepth(60);
    this.spawnTargets(c);this.spawnTreasure(c);if(this.location.id==='moonlit-trench')this.setupMoonlitVisibility(c);c.add([this.lineHud,this.basketText,this.reelBg,this.reelTx,this.diveHint]);if(this.touchControls&&!save.underwaterControlsSeen)this.showTouchOnboarding(save,c);c.sort('depth');this.refreshHud();this.layoutSafeArea();
    this.time.delayedCall(4500,()=>this.diveHint?.setVisible(false));PortalBridge.submitAnalyticsEvent('underwater_start');
  }
  private drawRockyEnvironment(c:Phaser.GameObjects.Container){
    for(const obstacle of obstaclesForLocation('rocky-cove')){
      const art=this.add.graphics().setDepth(34);
      if(obstacle.kind==='rock'){
        const points=[new Phaser.Geom.Point(obstacle.x-obstacle.width/2,obstacle.y+obstacle.height/2),new Phaser.Geom.Point(obstacle.x-obstacle.width*.42,obstacle.y-obstacle.height*.12),new Phaser.Geom.Point(obstacle.x-obstacle.width*.18,obstacle.y-obstacle.height/2),new Phaser.Geom.Point(obstacle.x+obstacle.width*.28,obstacle.y-obstacle.height*.38),new Phaser.Geom.Point(obstacle.x+obstacle.width/2,obstacle.y+obstacle.height*.08),new Phaser.Geom.Point(obstacle.x+obstacle.width*.4,obstacle.y+obstacle.height/2)];
        art.fillStyle(0x315b5d,.58).fillPoints(points,true).lineStyle(2,0x88aaa0,.55).strokePoints(points,true,true);
      }else{
        art.lineStyle(5,0x246f60,.72);
        for(let index=-1;index<=1;index++){const x=obstacle.x+index*18,lean=index*8;art.beginPath().moveTo(x,obstacle.y+obstacle.height/2).lineTo(x-6,obstacle.y+obstacle.height*.18).lineTo(x+8+lean,obstacle.y-obstacle.height*.18).lineTo(x-3+lean,obstacle.y-obstacle.height/2).strokePath();art.fillStyle(0x4b9a78,.42).fillEllipse(x-10,obstacle.y+15+index*10,22,8).fillEllipse(x+9,obstacle.y-28-index*8,20,7);}
      }
      c.add(art);
    }
    for(let index=0;index<9;index++){const flow=this.add.ellipse(70+index*105,135+(index%4)*82,24,3,0xa9e5dc,.35).setDepth(25);c.add(flow);if(!this.reducedMotion)this.tweens.add({targets:flow,x:flow.x+150,duration:2400+(index%3)*350,delay:index*120,repeat:-1,ease:'Linear'});}
  }
  private addLocationDepthLayers(c:Phaser.GameObjects.Container){
    const key=this.location.id==='sunny-pier'?'fg-underwater-sunny':this.location.id==='rocky-cove'?'fg-underwater-rocky':'fg-underwater-moonlit';
    const foreground=this.add.image(480,270,key).setDisplaySize(960,540).setDepth(29).setAlpha(.96);c.add(foreground);
    if(!this.reducedMotion)this.tweens.add({targets:foreground,x:483,duration:4200,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    const color=this.location.id==='sunny-pier'?0xdff7ef:this.location.id==='rocky-cove'?0xd6c79b:0x67dfff;
    const drift=this.location.id==='rocky-cove'?110:this.location.id==='moonlit-trench'?18:-12;
    for(let index=0;index<12;index++){
      const particle=this.add.circle(55+index*79,130+(index%5)*72,1.5+(index%3),color,this.location.id==='moonlit-trench'?.42:.24).setDepth(26);c.add(particle);
      if(!this.reducedMotion)this.tweens.add({targets:particle,x:particle.x+drift,y:particle.y-95,alpha:this.location.id==='moonlit-trench'?.08:.04,duration:2800+(index%4)*520,delay:index*140,yoyo:true,repeat:-1,ease:'Sine.inOut'});
    }
  }
  private spawnTargets(c:Phaser.GameObjects.Container){
    const fish=this.location.fish;
    const specs=[
      {fish:fish[0],x:280,y:195,slots:1,speed:32}, {fish:fish[1],x:690,y:175,slots:1,speed:40},
      {fish:fish[fish.length>=6?2:0],x:420,y:330,slots:1,speed:46}, {fish:fish[fish.length>=6?3:1],x:745,y:350,slots:1,speed:54},
      {fish:fish.length>=6?(Math.random()<.06+this.castQuality*.14+this.baitLevel*.04?fish[5]:fish[4]):(Math.random()<.12+this.castQuality*.18+this.baitLevel*.04?fish[2]:fish[1]),x:310,y:445,slots:2,speed:58}
    ];
    specs.forEach((s,i)=>{const rarityColor=s.fish.rarity==='Rare'?0xffd166:s.fish.rarity==='Uncommon'?0x69d6c5:0xfff6dc;const direction=i%2===0?1:-1;const aura=this.add.circle(s.x,s.y,s.slots===2?47:34,rarityColor,s.fish.rarity==='Common'?.08:.2).setDepth(29);const sprite=this.add.image(s.x,s.y,s.fish.texture).setDisplaySize(s.slots===2?112:76,s.slots===2?68:48).setTint(s.fish.color).setFlipX(fishFlipXForDirection(direction)).setDepth(30);const badge=this.add.text(s.x,s.y-37,s.fish.rarity==='Rare'?'★':s.fish.rarity==='Uncommon'?'◆':'•',{fontSize:s.fish.rarity==='Rare'?'18px':'14px',fontStyle:'bold',color:`#${rarityColor.toString(16).padStart(6,'0')}`}).setOrigin(.5).setDepth(31);const target:Target={...s,sprite,aura,badge,capture:0,direction,baseY:s.y,phase:i*1.2,lastTouchAt:0};this.targets.push(target);c.add([aura,sprite,badge])});
  }
  private spawnTreasure(c:Phaser.GameObjects.Container){
    if(Math.random()>treasureChance(this.location.id,this.castQuality,this.baitLevel)){this.currentTreasureId=undefined;this.treasure=undefined;return;}
    const treasure=this.location.treasures[Math.floor(Math.random()*this.location.treasures.length)];this.currentTreasureId=treasure.id;
    const position=treasureSpawnPoint(this.location.id,Math.random());this.treasurePosition.set(position.x,position.y);
    const glow=this.add.circle(position.x,position.y,38,0xffd166,.12+this.castQuality*.08),item=this.add.image(position.x,position.y,treasure.texture).setDisplaySize(68,68),label=this.add.text(position.x,position.y+43,'SECRET',{fontSize:'12px',fontStyle:'bold',color:'#fff6dc'}).setOrigin(.5);
    this.treasure=this.add.container(0,0,[glow,item,label]).setDepth(28);c.add(this.treasure);this.tweens.add({targets:glow,scale:1.2,alpha:.05,duration:750,yoyo:true,repeat:-1})
  }
  private setupMoonlitVisibility(c:Phaser.GameObjects.Container){
    const radius=145+this.baitLevel*16;this.moonlitMaskSource=this.add.graphics().setVisible(false);this.moonlitMaskSource.fillStyle(0xffffff,1).fillCircle(0,0,radius).setPosition(this.hookPos.x,this.hookPos.y);
    const mask=this.moonlitMaskSource.createGeometryMask();mask.setInvertAlpha(true);this.moonlitShade=this.add.rectangle(480,270,960,540,0x041426,.66).setDepth(45).setMask(mask);this.moonlitGlow=this.add.circle(this.hookPos.x,this.hookPos.y,radius,0x7bd9ff,.07).setStrokeStyle(2,0xa9e5dc,.22).setDepth(44);c.add([this.moonlitGlow,this.moonlitShade]);
  }
  private clearMoonlitVisibility(){this.moonlitShade?.destroy();this.moonlitMaskSource?.destroy();this.moonlitGlow?.destroy();this.moonlitShade=undefined;this.moonlitMaskSource=undefined;this.moonlitGlow=undefined;}
  private beginTouchSteering(pointer:Phaser.Input.Pointer){
    if(!this.underwater||(this.joystickPointerId!==undefined&&this.joystickPointerId!==pointer.id))return;
    const save=SaveService.load();if(!save.underwaterControlsSeen){save.underwaterControlsSeen=true;SaveService.save(save)}
    this.dismissTouchOnboarding();this.joystickPointerId=pointer.id;const safe=safeAreaInsets(this);
    this.joystickOrigin.set(Phaser.Math.Clamp(pointer.worldX,58+safe.left,902-safe.right),Phaser.Math.Clamp(pointer.worldY,105+safe.top,475-safe.bottom));
    if(!this.joystickBase?.active){
      this.joystickBase=this.add.circle(this.joystickOrigin.x,this.joystickOrigin.y,46,0x153a4a,.38).setStrokeStyle(3,0xfff6dc,.72).setDepth(72);
      this.joystickKnob=this.add.circle(this.joystickOrigin.x,this.joystickOrigin.y,20,0xfff6dc,.82).setStrokeStyle(2,0x153a4a,.8).setDepth(73);
      this.underwater.add([this.joystickBase,this.joystickKnob]);this.underwater.sort('depth');
    }
    this.joystickBase.setPosition(this.joystickOrigin.x,this.joystickOrigin.y).setVisible(true);this.joystickKnob?.setPosition(this.joystickOrigin.x,this.joystickOrigin.y).setVisible(true);this.updateTouchSteering(pointer);
  }
  private updateTouchSteering(pointer:Phaser.Input.Pointer){
    if(pointer.id!==this.joystickPointerId)return;const point={x:pointer.worldX,y:pointer.worldY},vector=virtualJoystickVector(this.joystickOrigin,point),knob=joystickKnobPosition(this.joystickOrigin,point);
    this.joystickVector.set(vector.x,vector.y);this.joystickKnob?.setPosition(knob.x,knob.y);
  }
  private endTouchSteering(pointer?:Phaser.Input.Pointer){
    if(pointer&&pointer.id!==this.joystickPointerId)return;this.joystickPointerId=undefined;this.joystickVector.set(0,0);this.joystickBase?.setVisible(false);this.joystickKnob?.setVisible(false);
  }
  private showTouchOnboarding(save:ReturnType<typeof SaveService.load>,c:Phaser.GameObjects.Container){
    const panel=this.add.rectangle(480,282,500,176,0x153a4a,.94).setStrokeStyle(4,0xfff6dc,.9),title=this.add.text(480,226,'DRAG ANYWHERE TO STEER',{fontSize:'22px',fontStyle:'bold',color:'#fff6dc'}).setOrigin(.5);
    const base=this.add.circle(350,292,39,0xfff6dc,.18).setStrokeStyle(3,0xfff6dc,.7),knob=this.add.circle(350,292,16,0xfff6dc,.86).setStrokeStyle(2,0x153a4a),copy=this.add.text(430,276,'Keep holding the finger.\nStay on a fish to catch it.',{fontSize:'15px',fontStyle:'bold',color:'#a9e5dc',lineSpacing:5}),reel=this.add.text(480,344,'REEL IN WHEN YOU ARE READY TO RETURN',{fontSize:'13px',fontStyle:'bold',color:'#ffd166'}).setOrigin(.5);
    this.controlOnboarding=this.add.container(0,0,[panel,title,base,knob,copy,reel]).setDepth(96);c.add(this.controlOnboarding);
    if(!this.reducedMotion)this.tweens.add({targets:knob,x:382,duration:620,yoyo:true,repeat:2,ease:'Sine.inOut'});
    this.time.delayedCall(4300,()=>this.dismissTouchOnboarding());
  }
  private dismissTouchOnboarding(){
    const onboarding=this.controlOnboarding;if(!onboarding?.active)return;this.controlOnboarding=undefined;this.tweens.add({targets:onboarding,alpha:0,duration:180,onComplete:()=>onboarding.destroy(true)});
  }
  private updateUnderwater(delta:number){
    if(Phaser.Input.Keyboard.JustDown(this.keys.E)||Phaser.Input.Keyboard.JustDown(this.keys.SPACE)){this.startRetract();return}
    const d=delta/1000,move=new Phaser.Math.Vector2(),before=this.hookPos.clone();
    if(this.keys.A.isDown||this.keys.LEFT.isDown)move.x--;if(this.keys.D.isDown||this.keys.RIGHT.isDown)move.x++;if(this.keys.W.isDown||this.keys.UP.isDown)move.y--;if(this.keys.S.isDown||this.keys.DOWN.isDown)move.y++;
    const tinySlowdown=1-Math.min(this.caught.length*this.basketDrag,.05),speed=this.hookMoveSpeed*tinySlowdown;if(move.lengthSq()===0&&this.joystickVector.lengthSq()>0)move.copy(this.joystickVector);
    if(move.lengthSq()>0){const strength=Math.min(1,move.length());this.hookPos.add(move.normalize().scale(speed*d*strength))}else if(this.pointerSteering)this.hookPos.add(this.hookTarget.clone().subtract(this.hookPos).limit(speed*d));
    const current=currentVector(this.location.id,this.hookPos.x,this.hookPos.y,this.time.now);this.hookPos.add(new Phaser.Math.Vector2(current.x,current.y).scale(d));
    this.hookPos.x=Phaser.Math.Clamp(this.hookPos.x,42,918);this.hookPos.y=Phaser.Math.Clamp(this.hookPos.y,82,502);
    if(this.isBlocked(this.hookPos))this.hookPos.copy(before);
    const laid=this.routeLength(),step=before.distance(this.hookPos),remaining=this.maxLinePx-laid;if(step>remaining)this.hookPos.copy(before.clone().add(this.hookPos.clone().subtract(before).setLength(Math.max(0,remaining))));
    const last=this.trail[this.trail.length-1];if(last.distance(this.hookPos)>=7)this.trail.push(this.hookPos.clone());
    this.updateFish(d);this.checkTreasure();this.drawHookAndRope();this.refreshHud();
  }
  private isBlocked(p:Phaser.Math.Vector2){
    // Sunny Pier starts intentionally open: only the natural map edges and
    // seabed are solid. Decorative plants and distant rocks remain passable.
    return p.y>478||p.x<82||p.x>878||pointHitsObstacle(this.location.id,p.x,p.y);
  }
  private routeLength(){let total=0;for(let i=1;i<this.trail.length;i++)total+=this.trail[i-1].distance(this.trail[i]);total+=this.trail[this.trail.length-1].distance(this.hookPos);return total}
  private updateFish(d:number){
    let touching:Target|undefined;
    for(const t of this.targets){if(!t.sprite.visible)continue;const distance=Phaser.Math.Distance.Between(t.sprite.x,t.sprite.y,this.hookPos.x,this.hookPos.y),behavior=fishBehavior(t.fish);if((behavior==='skittish'||behavior==='flee')&&distance<105){const away=this.hookPos.x<t.sprite.x?1:-1;if(away!==t.direction){t.direction=away;t.sprite.setFlipX(fishFlipXForDirection(t.direction));}}t.sprite.x+=t.direction*t.speed*(.86+t.fish.difficulty*.07)*movementScale(t.fish,this.time.now,t.phase,distance)*d;if(t.sprite.x<90||t.sprite.x>870){t.direction*=-1;t.sprite.x=Phaser.Math.Clamp(t.sprite.x,90,870);t.sprite.setFlipX(fishFlipXForDirection(t.direction))}t.sprite.y=t.baseY+verticalOffset(t.fish,this.time.now,t.phase);t.aura.setPosition(t.sprite.x,t.sprite.y);t.badge.setPosition(t.sprite.x,t.sprite.y-37);if(Phaser.Math.Distance.Between(t.sprite.x,t.sprite.y,this.hookPos.x,this.hookPos.y)<42)touching=t}
    if(touching&&touching!==this.touchingTarget)AudioService.bite();this.touchingTarget=touching;
    this.captureArt.clear();this.captureLabel.setVisible(false).setBackgroundColor('#ffd166').setColor('#153a4a');
    for(const t of this.targets){const needed=captureSeconds(t.fish,t.slots);if(t===touching&&this.usedSlots+t.slots<=this.maxSlots){t.lastTouchAt=this.time.now;t.capture+=d;const progress=Math.min(t.capture/needed,1);this.captureArt.lineStyle(10,0x153a4a,.62).strokeCircle(t.sprite.x,t.sprite.y,42).lineStyle(7,0xffd166,1).beginPath().arc(t.sprite.x,t.sprite.y,42,-Math.PI/2,-Math.PI/2+Math.PI*2*progress).strokePath();this.captureLabel.setText(`CATCH  ${Math.round(progress*100)}%`).setPosition(t.sprite.x,t.sprite.y+52).setVisible(true);if(t.capture>=needed)this.catchTarget(t)}else if(t===touching){this.captureArt.lineStyle(8,0xef6b4a,.9).strokeCircle(t.sprite.x,t.sprite.y,42);this.captureLabel.setText('BASKET FULL').setPosition(t.sprite.x,t.sprite.y+52).setBackgroundColor('#ef6b4a').setColor('#fff6dc').setVisible(true)}else if(this.time.now-t.lastTouchAt>t.fish.hookMs)t.capture=Math.max(0,t.capture-d*captureDecayPerSecond(t.fish))}
  }
  private catchTarget(t:Target){
    t.sprite.setVisible(false);t.aura.setVisible(false);t.badge.setVisible(false);this.captureLabel.setVisible(false);this.usedSlots+=t.slots;AudioService.catch();const mini=this.add.image(this.hookPos.x-18,this.hookPos.y+20,t.fish.texture).setDisplaySize(42,27).setTint(t.fish.color).setDepth(38);this.underwater!.add(mini);this.underwater!.sort('depth');this.caught.push({fish:t.fish,sprite:mini});this.refreshHud();this.showToast(`${t.fish.name} caught!`);if(this.usedSlots>=this.maxSlots)this.time.delayedCall(500,()=>this.showToast('Basket full — reel in!'));
  }
  private checkTreasure(){
    if(this.treasureFound||!this.treasure||!this.currentTreasureId)return;
    if(Phaser.Math.Distance.Between(this.hookPos.x,this.hookPos.y,this.treasurePosition.x,this.treasurePosition.y)<38){
      this.treasureFound=true;this.treasure.setVisible(false);this.trip.addBonus(25);
      const saved=SaveService.load(),isNew=!saved.discoveredTreasures.includes(this.currentTreasureId)&&!this.trip.treasures.some(t=>t.id===this.currentTreasureId);
      this.trip.addTreasure({id:this.currentTreasureId,isNew});AudioService.perfect();
      const treasure=this.location.treasures.find(t=>t.id===this.currentTreasureId);this.showToast(`${isNew?'NEW SECRET':'Secret'}: ${treasure?.name??'Treasure'}  +25 coins`);
    }
  }
  private drawHookAndRope(){
    const lineColor=[0xfff6dc,0xdff7ef,0xa9e5dc,0xffd166][this.lineLevel];this.rope.clear().lineStyle(2.5+this.lineLevel*.45,lineColor,.92).beginPath().moveTo(this.trail[0].x,this.trail[0].y);for(let i=1;i<this.trail.length;i++)this.rope.lineTo(this.trail[i].x,this.trail[i].y);this.rope.lineTo(this.hookPos.x,this.hookPos.y).strokePath();
    this.hookSprite.setPosition(this.hookPos.x,this.hookPos.y+13).setRotation(Math.sin(this.time.now*.004)*.04);
    this.baitGlow?.setPosition(this.hookPos.x,this.hookPos.y);this.moonlitMaskSource?.setPosition(this.hookPos.x,this.hookPos.y);this.moonlitGlow?.setPosition(this.hookPos.x,this.hookPos.y);
    this.caught.forEach((c,i)=>{const p=this.pointBehind(26+i*34);c.sprite.setPosition(p.x+Math.sin(this.time.now*.006+i)*3,p.y+8).setRotation(Math.sin(this.time.now*.005+i)*.12)});
  }
  private pointBehind(distance:number){const pts=[...this.trail,this.hookPos];let left=distance;for(let i=pts.length-1;i>0;i--){const len=pts[i].distance(pts[i-1]);if(left<=len)return pts[i].clone().lerp(pts[i-1],left/len);left-=len}return pts[0].clone()}
  private refreshHud(){if(!this.lineText)return;const used=Math.min(1,this.routeLength()/this.maxLinePx),remaining=1-used,meters=this.lineMeters*remaining,color=remaining>.45?0x69d6c5:remaining>.2?0xffd166:0xef6b4a;this.lineText.setText(`LINE · T${this.lineLevel}`);this.lineValueText.setText(`${meters.toFixed(1)} m`);this.lineFill.setDisplaySize(Math.max(.5,200*remaining),10).setFillStyle(color).setVisible(remaining>.001);this.basketText.setText(`BASKET  ${this.usedSlots} / ${this.maxSlots} · T${this.basketLevel}${this.treasureFound?'   ★':''}`)}
  private startRetract(){if(this.phase!=='UNDERWATER')return;AudioService.reel();this.phase='RETRACTING';this.pointerSteering=false;this.endTouchSteering();this.dismissTouchOnboarding();this.diveHint?.setVisible(false);if(this.trail[this.trail.length-1].distance(this.hookPos)>1)this.trail.push(this.hookPos.clone());this.retractIndex=this.trail.length-2;this.showToast('Following the line home…')}
  private updateRetract(delta:number){
    const step=this.reelSpeed*delta/1000;if(this.retractIndex<0){this.hookPos.copy(this.anchor);this.finishDive();return}const target=this.trail[this.retractIndex],v=target.clone().subtract(this.hookPos);if(v.length()<=step){this.hookPos.copy(target);this.trail.length=this.retractIndex+1;this.retractIndex--}else this.hookPos.add(v.setLength(step));this.drawHookAndRope();this.refreshHud();
  }
  private finishDive(){
    this.phase='RESULT';this.clearMoonlitVisibility();this.underwater?.destroy(true);this.underwater=undefined;this.surface.setVisible(true);this.help.setVisible(false);let totalCoins=0,totalXp=0;
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
  private showPerfectCastFx(){
    const fx=this.add.image(480,215,'fx-perfect-hook').setDisplaySize(112,112).setDepth(145),scaleX=fx.scaleX,scaleY=fx.scaleY;fx.setScale(scaleX*.45,scaleY*.45).setAlpha(.95);AudioService.perfect();
    this.tweens.add({targets:fx,scaleX,scaleY,y:190,duration:this.reducedMotion?220:420,ease:'Back.easeOut'});
    this.tweens.add({targets:fx,alpha:0,delay:this.reducedMotion?180:420,duration:260,onComplete:()=>fx.destroy()});
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
  private createMenuChrome(title:string,subtitle:string,onClose:()=>void){
    const compact=compactViewport(this),items:Phaser.GameObjects.GameObject[]=[];
    const shade=this.add.rectangle(480,270,960,540,0x102f3d,.78).setInteractive();
    const shadow=this.add.rectangle(486,286,856,476,0x071e29,.3);
    const paper=this.add.rectangle(480,280,850,470,0xfff6dc,.995).setStrokeStyle(7,COLORS.navy);
    const header=this.add.rectangle(480,88,850,86,COLORS.navy,.99);
    const accent=this.add.rectangle(480,133,850,6,COLORS.coral,1);
    const heading=this.add.text(88,55,title,{fontSize:'27px',fontStyle:'bold',color:'#fff6dc'});
    const subheading=this.add.text(89,93,subtitle,{fontSize:compact?'13px':'12px',fontStyle:'bold',color:'#a9e5dc'});
    const closeRing=this.add.circle(848,78,24,COLORS.coral,1).setStrokeStyle(3,0xfff6dc).setInteractive({useHandCursor:true});
    const closeMark=this.add.text(848,78,'×',{fontSize:'31px',fontStyle:'bold',color:'#fff6dc'}).setOrigin(.5,.54).setInteractive({useHandCursor:true});
    closeRing.on('pointerdown',onClose);closeMark.on('pointerdown',onClose);
    items.push(shade,shadow,paper,header,accent,heading,subheading,closeRing,closeMark);return items;
  }
  private createMenuTab(x:number,label:string,active:boolean,onSelect:()=>void,width=205){
    const back=this.add.rectangle(x,154,width,40,active?COLORS.coral:0xa9e5dc,.98).setStrokeStyle(3,COLORS.navy).setInteractive({useHandCursor:true});
    const text=this.add.text(x,154,label,{fontSize:'15px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5).setInteractive({useHandCursor:true});
    const select=()=>{AudioService.uiSelect();onSelect()};back.on('pointerdown',select);text.on('pointerdown',select);return [back,text];
  }
  private createMenuButton(x:number,y:number,label:string,enabled:boolean,onSelect?:()=>void,width?:number){
    const color=enabled?COLORS.coral:0x71858b,back=this.add.rectangle(x,y,width??Math.max(104,label.length*8+30),36,color,1).setStrokeStyle(2,COLORS.navy);
    const text=this.add.text(x,y,label,{fontSize:'13px',fontStyle:'bold',color:'#fff6dc'}).setOrigin(.5);
    if(enabled&&onSelect){back.setInteractive({useHandCursor:true});text.setInteractive({useHandCursor:true});const select=()=>{AudioService.uiPop();onSelect()};back.on('pointerdown',select);text.on('pointerdown',select)}
    return [back,text];
  }
  private addTierPips(items:Phaser.GameObjects.GameObject[],x:number,y:number,level:number,max=3){
    for(let tier=0;tier<max;tier++)items.push(this.add.circle(x+(tier-(max-1)/2)*17,y,5,tier<level?COLORS.gold:0xc1ccc8,1).setStrokeStyle(1,COLORS.navy));
  }
  private spotBadgeTexture(id:FishingLocationId){return id==='rocky-cove'?'ui-spot-rocky':id==='moonlit-trench'?'ui-spot-moonlit':'ui-spot-sunny'}
  private openFishingSpots(){
    PortalBridge.gameplayStop();
    this.modalOpen=true;this.pointerSteering=false;this.help.setVisible(false);this.spotsModal?.destroy(true);
    const save=SaveService.load(),items:Phaser.GameObjects.GameObject[]=[],compact=compactViewport(this);
    items.push(...this.createMenuChrome('FISHING SPOTS','CHOOSE YOUR NEXT WATER',()=>this.closeFishingSpots()));
    const map=this.add.image(480,330,'ui-fishing-spots-map').setDisplaySize(820,342).setAlpha(.14),pin=this.add.image(111,167,'menu-decorations','decor-map-pin').setDisplaySize(42,42);items.push(map,pin);
    FISHING_LOCATIONS.forEach((location,index)=>{
      const x=205+index*275,unlocked=SaveService.isLocationUnlocked(save,location.id),current=location.id===this.location.id,completed=save.completedLocationIds.includes(location.id);
      const card=this.add.rectangle(x,330,238,314,unlocked?0xfff6dc:0xc8d2cf,.94).setStrokeStyle(4,current?COLORS.coral:unlocked?COLORS.navy:0x71858b);
      const area=this.add.text(x,191,`AREA ${location.level}${current?'  •  CURRENT':''}`,{fontSize:compact?'14px':'12px',fontStyle:'bold',color:current?'#ef6b4a':unlocked?'#153a4a':'#71858b'}).setOrigin(.5);
      const emblem=this.add.image(x,249,this.spotBadgeTexture(location.id)).setDisplaySize(96,96).setTint(unlocked?0xffffff:0x71858b).setAlpha(unlocked?1:.52);
      const name=this.add.text(x,313,unlocked?location.name.toUpperCase():'LOCKED',{fontSize:'19px',fontStyle:'bold',color:'#153a4a',align:'center',wordWrap:{width:210}}).setOrigin(.5);
      const description=this.add.text(x,358,compact?location.subtitle:location.description,{fontSize:compact?'13px':'11px',fontStyle:'bold',color:'#4b6973',align:'center',wordWrap:{width:195}}).setOrigin(.5);
      const status=current?'CURRENT SPOT':unlocked?(completed?'FISH HERE AGAIN':'FISH HERE'):location.id==='rocky-cove'?'BOAT + AREA 1 MASTERY':'AREA 2 MASTERY';
      const actionItems=this.createMenuButton(x,454,status,unlocked,()=>this.chooseFishingSpot(location.id),210);
      if(unlocked)card.setInteractive({useHandCursor:true}).on('pointerdown',()=>this.chooseFishingSpot(location.id));items.push(card,area,emblem,name,description,...actionItems);
    });
    this.spotsModal=this.createResponsiveModal(items,220);
  }
  private chooseFishingSpot(id:FishingLocationId){
    AudioService.uiSelect();
    if(id===this.location.id){this.closeFishingSpots(false);return}
    const save=SaveService.load();save.lastLocationId=id;SaveService.save(save);
    this.spotsModal?.destroy(true);this.spotsModal=undefined;this.modalOpen=false;PortalBridge.gameplayStop();this.scene.start('Loading',{locationId:id});
  }
  private closeFishingSpots(playSound=true){if(playSound)AudioService.uiCancel();this.spotsModal?.destroy(true);this.spotsModal=undefined;this.finishModalClose()}
  private openCollection(tab:'fish'|'treasures'){
    PortalBridge.gameplayStop();
    this.modalOpen=true;this.pointerSteering=false;this.help.setVisible(false);this.collectionModal?.destroy(true);
    const saved=SaveService.load(),items:Phaser.GameObjects.GameObject[]=[],compact=compactViewport(this);
    this.trip.catches.forEach(c=>SaveService.recordCatch(saved,c.fish.id,c.weight));
    this.trip.treasures.forEach(t=>SaveService.discoverTreasure(saved,t.id));
    items.push(...this.createMenuChrome(`${this.location.name.toUpperCase()} FIELD BOOK`,'YOUR DISCOVERIES, RECORDS & TREASURES',()=>this.closeCollection()));
    const book=this.add.image(480,343,'fishbook-open').setDisplaySize(790,330).setAlpha(.46);items.push(book,...this.createMenuTab(350,'FISH',tab==='fish',()=>this.openCollection('fish')),...this.createMenuTab(570,'TREASURES',tab==='treasures',()=>this.openCollection('treasures')));
    if(this.trip.catches.length||this.trip.treasures.length)items.push(this.add.text(790,110,'CURRENT TRIP INCLUDED',{fontSize:'10px',fontStyle:'bold',color:'#ffd166'}).setOrigin(1,.5));
    if(tab==='fish'){
      const discovered=this.location.fish.filter(f=>saved.fishStats[f.id]).length;
      items.push(this.add.text(790,110,`${discovered} / ${this.location.fish.length} FOUND`,{fontSize:'15px',fontStyle:'bold',color:'#ffd166'}).setOrigin(1,.5));
      this.location.fish.forEach((fish,i)=>{
        const col=i%3,row=Math.floor(i/3),x=230+col*250,y=246+row*137,stat=saved.fishStats[fish.id],known=!!stat;
        const card=this.add.rectangle(x,y,224,116,known?0xe8f5e9:0xd7e1dd,.94).setStrokeStyle(3,known?fish.color:0x6f858a),icon=this.add.image(x-70,y-12,fish.texture).setDisplaySize(68,42).setTint(known?fish.color:0x37505a).setAlpha(known?1:.55);
        const name=this.add.text(x-24,y-42,known?fish.name:'???',{fontSize:'16px',fontStyle:'bold',color:'#153a4a'}),rarity=this.add.text(x-24,y-18,known?fish.rarity:'UNDISCOVERED',{fontSize:compact?'13px':'11px',fontStyle:'bold',color:known?'#4b6973':'#71858b'});
        const detail=this.add.text(x-94,y+27,known?`CAUGHT  ${stat.count}\nBEST  ${stat.bestWeight.toFixed(2)} kg` : fish.hint,{fontSize:compact?'14px':'12px',fontStyle:'bold',color:'#153a4a',wordWrap:{width:185},align:'center'}).setOrigin(0,.5);
        items.push(card,icon,name,rarity,detail);
      });
    }else{
      const discovered=this.location.treasures.filter(t=>saved.discoveredTreasures.includes(t.id)).length;
      items.push(this.add.text(790,110,`${discovered} / ${this.location.treasures.length} FOUND`,{fontSize:'15px',fontStyle:'bold',color:'#ffd166'}).setOrigin(1,.5));
      this.location.treasures.forEach((treasure,i)=>{
        const x=235+i*245,y=330,known=saved.discoveredTreasures.includes(treasure.id),card=this.add.rectangle(x,y,220,225,known?0xe8f5e9:0xd7e1dd,.94).setStrokeStyle(3,known?COLORS.gold:0x6f858a),icon=this.add.image(x,y-38,treasure.texture).setDisplaySize(92,92).setTint(known?0xffffff:0x37505a).setAlpha(known?1:.5);
        const name=this.add.text(x,y+35,known?treasure.name:'???',{fontSize:'17px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5),hint=this.add.text(x,y+78,known?`FOUND AT ${this.location.name.toUpperCase()}`:treasure.hint,{fontSize:compact?'14px':'12px',fontStyle:'bold',color:'#4b6973',align:'center',wordWrap:{width:175}}).setOrigin(.5);
        items.push(card,icon,name,hint);
      });
    }
    this.collectionModal=this.createResponsiveModal(items,220);
  }
  private finishModalClose(){
    this.inputLockedUntil=Math.max(this.inputLockedUntil,this.time.now+150);
    this.modalOpen=false;PortalBridge.gameplayStart();
    if(this.phase==='CAST')this.help.setVisible(false);
  }
  private showHubTutorial(){
    const save=SaveService.load();this.hubTutorial?.destroy(true);this.hubTutorial=undefined;
    const trips=Object.values(save.locationProgress).reduce((sum,progress)=>sum+progress.trips,0);
    if(save.hubIntroStep>=3||trips===0)return;
    const steps=[
      {x:160,y:388,title:'FISHBOOK',copy:'Tap the cooler to inspect fish and treasures.'},
      {x:225,y:416,title:'TACKLE BOX',copy:'Spend coins here to improve your equipment.'},
      {x:73,y:238,title:'HARBOR JOBS',copy:'Complete jobs, then return to claim rewards.'}
    ],step=steps[save.hubIntroStep]??steps[0],items:Phaser.GameObjects.GameObject[]=[];
    const pulse=this.add.circle(step.x,step.y,45,0xffd166,.12).setStrokeStyle(4,0xffd166,.95),cardX=Phaser.Math.Clamp(step.x+205,190,760),cardY=Phaser.Math.Clamp(step.y-42,105,430),card=this.add.rectangle(cardX,cardY,330,94,0xfff6dc,.98).setStrokeStyle(4,COLORS.navy).setInteractive(),title=this.add.text(cardX,cardY-22,step.title,{fontSize:'18px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5),copy=this.add.text(cardX,cardY+5,step.copy,{fontSize:'13px',fontStyle:'bold',color:'#4b6973',align:'center',wordWrap:{width:292}}).setOrigin(.5),next=this.add.text(cardX,cardY+50,save.hubIntroStep===2?'GOT IT':'NEXT',{fontSize:'14px',fontStyle:'bold',color:'#fff6dc',backgroundColor:'#ef6b4a'}).setPadding(14,7).setOrigin(.5).setInteractive({useHandCursor:true});
    items.push(pulse,card,title,copy,next);this.hubTutorial=this.add.container(0,0,items).setDepth(210);if(!this.reducedMotion)this.tweens.add({targets:pulse,scale:{from:.9,to:1.15},alpha:{from:1,to:.35},duration:900,yoyo:true,repeat:-1});
    next.on('pointerdown',()=>{save.hubIntroStep++;SaveService.save(save);this.showHubTutorial()});
  }
  private closeCollection(){AudioService.bookClose();this.collectionModal?.destroy(true);this.collectionModal=undefined;this.finishModalClose()}
  private openTackleBox(){
    PortalBridge.gameplayStop();
    this.modalOpen=true;this.pointerSteering=false;this.help.setVisible(false);this.tackleModal?.destroy(true);
    const saved=SaveService.load(),items:Phaser.GameObjects.GameObject[]=[],compact=compactViewport(this);
    items.push(...this.createMenuChrome('THE TACKLE BOX','PREPARE YOUR GEAR FOR THE NEXT CATCH',()=>this.closeTackleBox()));
    const coins=this.add.text(790,112,`COINS  ${saved.coins}`,{fontSize:'15px',fontStyle:'bold',color:'#ffd166'}).setOrigin(1,.5);
    const caseArt=this.add.image(245,245,'hub-tacklebox-open').setDisplaySize(270,205);
    const intro=this.add.text(245,370,'Every upgrade is gentle:\nmore comfort, never a guaranteed catch.',{fontSize:'13px',fontStyle:'bold',align:'center',color:'#153a4a',wordWrap:{width:270}}).setOrigin(.5);
    const style=bobberStyle(saved),styleCount=unlockedBobberStyles(saved).length,styleLabel=this.add.text(245,417,`BOBBER  ${style.name.toUpperCase()}\n${styleCount} / 4 STYLES UNLOCKED`,{fontSize:'12px',fontStyle:'bold',align:'center',color:'#153a4a'}).setOrigin(.5),styleButton=this.add.text(245,462,styleCount>1?'CHANGE STYLE':'EARN 3 BADGES',{fontSize:'12px',fontStyle:'bold',color:'#fff6dc',backgroundColor:styleCount>1?'#ef6b4a':'#71858b'}).setPadding(10,6).setOrigin(.5);
    if(styleCount>1)styleButton.setInteractive({useHandCursor:true}).on('pointerdown',()=>{cycleBobberStyle(saved);SaveService.save(saved);this.bobber.setTint(bobberStyle(saved).tint);this.openTackleBox()});
    items.push(coins,caseArt,intro,styleLabel,styleButton);
    const cards:[string,EquipmentId,string,string][]=[
      ['line-icon','line','LINE','More range: +2 m per tier.'],
      ['reel-icon','reel','REEL','Faster hook and reel-in.'],
      ['basket-icon','basket','BASKET','Less drag; tier 3 adds a slot.'],
      ['bait-icon','bait','BAIT','Slightly better rare-fish odds.']
    ];
    cards.forEach(([frame,id,name,description],i)=>{
      const col=i%2,row=Math.floor(i/2),x=555+col*155,y=180+row*190;
      const level=saved.equipment[id],tierAccent=[COLORS.navy,0x7fbf9a,0x49a99a,COLORS.gold][level];
      const card=this.add.rectangle(x,y,140,190,0xe8f5e9,.98).setStrokeStyle(level===3?5:3,tierAccent);
      const icon=this.add.image(x,y-36,'equipment-progression',`${id}-tier-${level}`).setDisplaySize(76,76);
      const label=this.add.text(x,y+20,name,{fontSize:'16px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5);
      const detail=this.add.text(x,y+42,description,{fontSize:compact?'12px':'10px',fontStyle:'bold',align:'center',color:'#4b6973',wordWrap:{width:124}}).setOrigin(.5);
      const cost=SaveService.nextEquipmentCost(saved,id),buttonText=cost===undefined?'MAXED':`BUY  ${cost}`;
      const tier=this.add.text(x,y+58,level===3?'MASTERED':`TIER ${level} / 3`,{fontSize:compact?'13px':'11px',fontStyle:'bold',color:level===3?'#55a86f':'#ef6b4a'}).setOrigin(.5);
      const button=this.add.text(x,y+96,buttonText,{fontSize:compact?'14px':'12px',fontStyle:'bold',color:'#fff6dc',backgroundColor:cost===undefined?'#71858b':saved.coins>=cost?'#ef6b4a':'#9aa8a3'}).setPadding(compact?11:8,compact?7:5).setOrigin(.5);
      if(cost!==undefined){button.setInteractive({useHandCursor:true});button.on('pointerdown',()=>{AudioService.uiPop();this.confirmEquipmentPurchase(id,name,cost)});}
      items.push(card,icon,label,detail,tier,button);this.addTierPips(items,x,y+75,level);
    });
    const note=this.add.text(670,490,`Prices: ${EQUIPMENT_COSTS.join('  •  ')} coins`,{fontSize:compact?'14px':'12px',fontStyle:'bold',color:'#4b6973'}).setOrigin(.5);
    items.push(note);this.tackleModal=this.createResponsiveModal(items,220);
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
  private openJobs(tab:'jobs'|'badges',badgePage=0){
    PortalBridge.gameplayStop();
    this.modalOpen=true;this.pointerSteering=false;this.help.setVisible(false);this.jobsModal?.destroy(true);
    const save=SaveService.load();QuestService.ensureActive(save);SaveService.save(save);const items:Phaser.GameObjects.GameObject[]=[],compact=compactViewport(this);
    items.push(...this.createMenuChrome('HARBOR JOBS','COMPLETE TRIPS • EARN COINS, XP & STICKERS',()=>this.closeJobs()),...this.createMenuTab(330,'JOBS',tab==='jobs',()=>this.openJobs('jobs')),...this.createMenuTab(550,'BADGES',tab==='badges',()=>this.openJobs('badges')));
    const notes=this.add.image(205,296,'harbor-notes').setDisplaySize(220,238);
    items.push(notes);
    if(tab==='jobs'){
      items.push(this.add.text(205,435,'New jobs arrive\nafter completed trips.',{fontSize:'14px',fontStyle:'bold',align:'center',color:'#153a4a'}).setOrigin(.5));
      save.activeQuests.forEach((active,index)=>{
        const quest=questById(active.id);if(!quest)return;const x=590,y=205+index*115,progress=Math.min(active.progress,quest.target),done=progress>=quest.target;
        const card=this.add.rectangle(x,y,370,96,done?0xd9eedc:0xe8f5e9,.98).setStrokeStyle(3,done?COLORS.green:COLORS.navy);
        const emblem=this.add.circle(x-150,y,26,done?COLORS.green:COLORS.gold).setStrokeStyle(2,COLORS.navy);
        const icon=this.add.text(x-150,y,done?'✓':quest.icon,{fontSize:done?'26px':'10px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5);
        const questTitle=this.add.text(x-111,y-28,quest.title,{fontSize:'16px',fontStyle:'bold',color:'#153a4a'});
        const description=this.add.text(x-111,y-5,quest.description,{fontSize:compact?'14px':'12px',fontStyle:'bold',color:'#4b6973'});
        const reward=this.add.text(x-111,y+22,`+${quest.coins} COINS   +${quest.xp} XP${quest.sticker?'   +STICKER':''}`,{fontSize:compact?'13px':'11px',fontStyle:'bold',color:'#ef6b4a'});
        const amount=this.add.text(x+154,y+24,done?'CLAIM':`${progress} / ${quest.target}`,{fontSize:compact?'16px':'15px',fontStyle:'bold',color:done?'#fff6dc':'#153a4a',backgroundColor:done?'#55a86f':undefined}).setPadding(done?(compact?12:9):0,done?(compact?7:5):0).setOrigin(1);
        if(done){amount.setInteractive({useHandCursor:true});amount.on('pointerdown',()=>this.claimJob(active.id,x+120,y));}
        items.push(card,emblem,icon,questTitle,description,reward,amount);
      });
    }else{
      const pageSize=5,totalPages=Math.ceil(ACHIEVEMENTS.length/pageSize),page=Phaser.Math.Clamp(badgePage,0,totalPages-1),unlocked=new Set(save.achievementIds),pending=new Set(save.pendingAchievementIds);items.push(this.add.text(790,110,`${unlocked.size} / ${ACHIEVEMENTS.length} CLAIMED`,{fontSize:'14px',fontStyle:'bold',color:'#ffd166'}).setOrigin(1,.5));
      ACHIEVEMENTS.slice(page*pageSize,(page+1)*pageSize).forEach((achievement,index)=>{
        const progress=QuestService.achievementProgress(save,achievement.id),x=565,y=170+index*66,known=unlocked.has(achievement.id),ready=pending.has(achievement.id),card=this.add.rectangle(x,y,430,58,known?0xe8f5e9:ready?0xffedbd:0xd7e1dd,.98).setStrokeStyle(3,known?COLORS.green:ready?COLORS.gold:0x6f858a);
        const seal=this.add.image(x-182,y,'badge-collection',`badge-${achievement.id}`).setDisplaySize(48,48).setTint(known||ready?0xffffff:0x71858b).setAlpha(known?1:ready?.92:.42);
        const mark=this.add.text(x-161,y+15,ready?'!':known?'✓':`${progress.current}/${progress.target}`,{fontSize:'10px',fontStyle:'bold',color:'#fff6dc',backgroundColor:ready?'#ef6b4a':known?'#55a86f':'#71858b'}).setPadding(4,2).setOrigin(.5);
        const name=this.add.text(x-145,y-13,achievement.title,{fontSize:'15px',fontStyle:'bold',color:'#153a4a'});
        const description=this.add.text(x-145,y+9,ready?`READY  +${achievement.coins} COINS  +${achievement.xp} XP`:`${achievement.description}  ${progress.current}/${progress.target}`,{fontSize:compact?'12px':'10px',fontStyle:'bold',color:ready?'#ef6b4a':'#4b6973'});
        items.push(card,seal,mark,name,description);
        if(ready){const claim=this.add.text(x+188,y,'CLAIM',{fontSize:compact?'14px':'12px',fontStyle:'bold',color:'#fff6dc',backgroundColor:'#55a86f'}).setPadding(compact?11:8,compact?7:5).setOrigin(1,.5).setInteractive({useHandCursor:true});claim.on('pointerdown',()=>this.claimBadge(achievement.id,x+150,y));items.push(claim);}
      });
      const pageText=this.add.text(565,490,`PAGE ${page+1} / ${totalPages}`,{fontSize:'12px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5),previous=this.add.text(430,490,'‹ PREV',{fontSize:'13px',fontStyle:'bold',color:'#fff6dc',backgroundColor:page>0?'#ef6b4a':'#71858b'}).setPadding(10,6).setOrigin(.5),next=this.add.text(700,490,'NEXT ›',{fontSize:'13px',fontStyle:'bold',color:'#fff6dc',backgroundColor:page<totalPages-1?'#ef6b4a':'#71858b'}).setPadding(10,6).setOrigin(.5);items.push(previous,pageText,next);
      if(page>0)previous.setInteractive({useHandCursor:true}).on('pointerdown',()=>this.openJobs('badges',page-1));if(page<totalPages-1)next.setInteractive({useHandCursor:true}).on('pointerdown',()=>this.openJobs('badges',page+1));
    }
    this.jobsModal=this.createResponsiveModal(items,220);
  }
  private closeJobs(){AudioService.bookClose();this.jobsModal?.destroy(true);this.jobsModal=undefined;this.finishModalClose()}
  private boatFrame(save=SaveService.load()){
    return ['boat-broken','boat-hull','boat-motor','boat-ready'][SaveService.boatStage(save)];
  }
  private boatOriginY(save=SaveService.load()){return SaveService.boatStage(save)>=2?.26:.5}
  private applyBoatFrame(save=SaveService.load()){this.boatSprite.setFrame(this.boatFrame(save)).setOrigin(.5,this.boatOriginY(save))}
  private openBoatRepair(){
    PortalBridge.gameplayStop();
    this.modalOpen=true;this.pointerSteering=false;this.help.setVisible(false);this.boatModal?.destroy(true);
    const save=SaveService.load(),stage=SaveService.boatStage(save),nextCost=SaveService.nextBoatRepairCost(save),items:Phaser.GameObjects.GameObject[]=[],compact=compactViewport(this);
    items.push(...this.createMenuChrome('THE QUESTIONABLY SEAWORTHY BOAT',stage===3?'IT FLOATS. THE HARBOR MASTER IS STUNNED.':'TECHNICAL STATUS: FLOATS. MOSTLY.',()=>this.closeBoatRepair()));
    const art=this.add.image(270,285,'hub-boat-states',this.boatFrame(save)).setDisplaySize(330,330),repairArt=this.add.image(630,171,'boat-repair-steps',stage===0?'repair-hull':stage===1?'repair-motor':'repair-outfitting').setDisplaySize(120,40),stageNames=['HULL PATCHED','MOTOR PERSUADED','GULL EVICTED'];
    items.push(art,repairArt);
    stageNames.forEach((name,index)=>{const done=index<stage,y=235+index*65,card=this.add.rectangle(630,y,330,52,done?0xd9eedc:0xe8f5e9,.98).setStrokeStyle(3,done?COLORS.green:COLORS.navy),mark=this.add.text(490,y,done?'✓':String(index+1),{fontSize:'18px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5),label=this.add.text(525,y-10,name,{fontSize:'15px',fontStyle:'bold',color:'#153a4a'}),cost=this.add.text(525,y+12,done?'COMPLETE':`${BOAT_REPAIR_COSTS[index]} COINS`,{fontSize:'12px',fontStyle:'bold',color:done?'#55a86f':'#ef6b4a'});items.push(card,mark,label,cost);});
    const routeReady=SaveService.isLocationUnlocked(save,'rocky-cove'),status=stage<3?`REPAIR ${stage+1} OF 3` : routeReady?'ROCKY COVE ROUTE READY':'BOAT READY • FINISH SUNNY PIER MASTERY',statusText=this.add.text(630,425,status,{fontSize:'15px',fontStyle:'bold',color:routeReady?'#55a86f':'#153a4a'}).setOrigin(.5);
    items.push(statusText,this.add.text(270,455,`INVESTED  ${save.boat.investedCoins} / ${BOAT_REPAIR_COSTS.reduce((sum,cost)=>sum+cost,0)} COINS`,{fontSize:'14px',fontStyle:'bold',color:'#4b6973'}).setOrigin(.5));
    if(nextCost!==undefined){const canAfford=save.coins>=nextCost,repair=this.add.text(630,475,canAfford?`REPAIR  ${nextCost}`:`NEED ${nextCost-save.coins} MORE COINS`,{fontSize:'15px',fontStyle:'bold',color:'#fff6dc',backgroundColor:canAfford?'#ef6b4a':'#71858b'}).setPadding(14,8).setOrigin(.5);if(canAfford){repair.setInteractive({useHandCursor:true});repair.on('pointerdown',()=>this.repairCurrentBoat());}items.push(repair);}
    else items.push(this.add.text(630,475,routeReady?'TALK TO THE ANGLER FOR ROUTES':'MASTER SUNNY PIER TO SET SAIL',{fontSize:'14px',fontStyle:'bold',color:'#fff6dc',backgroundColor:routeReady?'#55a86f':'#71858b'}).setPadding(14,8).setOrigin(.5));
    this.boatModal=this.createResponsiveModal(items,220);
  }
  private repairCurrentBoat(){
    const save=SaveService.load(),before=SaveService.boatStage(save),rockyBefore=SaveService.isLocationUnlocked(save,'rocky-cove');if(!SaveService.repairBoat(save)){AudioService.fail();return}AudioService.repair();SaveService.save(save);this.applyBoatFrame(save);this.refreshProgressHud();this.openBoatRepair();const rockyUnlocked=!rockyBefore&&SaveService.isLocationUnlocked(save,'rocky-cove');this.showToast(rockyUnlocked?'Rocky Cove unlocked!':before===2?'Boat repaired! Finish Sunny Pier mastery to sail.':'Repair complete!');
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
  private createResponsiveModal(items:Phaser.GameObjects.GameObject[],depth:number){
    const modal=this.add.container(0,0,items).setDepth(depth);
    const layout=()=>{
      if(!modal.active)return;
      const bounds=visibleGameBounds(this),scale=scaleToVisibleBounds(bounds,960,540);
      modal.setScale(scale).setPosition(bounds.centerX-480*scale,bounds.centerY-270*scale);
    };
    layout();this.events.on('render-quality-changed',layout);modal.once('destroy',()=>this.events.off('render-quality-changed',layout));return modal;
  }
  private layoutSafeArea(){
    const safe=safeAreaInsets(this),bounds=visibleGameBounds(this),compact=compactViewport(this);
    this.safeTop=safe.top;
    if(this.title?.active)this.title.setY(28+safe.top);
    if(this.castHint?.active)this.castHint.setY(92+safe.top);
    if(this.help?.active)this.help.setY(500-safe.bottom);
    if(this.locationText?.active)this.locationText.setPosition(22+safe.left,22+safe.top).setFontSize(compact?'14px':'18px');
    if(this.progressText?.active){
      const save=SaveService.load(),level=SaveService.levelProgress(save.xp),xp=level.maxed?`${save.xp} XP`:`${level.current}/${level.needed} XP`;
      this.progressText.setText(compact?`LV ${level.level}   ${xp}   ${save.coins} COINS`:`LEVEL ${level.level}   ${xp}   COINS ${save.coins}`)
        .setPosition(Math.min(bounds.right-(compact?14:60),compact?800:830),22+safe.top).setFontSize(compact?'13px':'15px');
    }
    if(this.lineHud?.active)this.lineHud.setPosition(24+safe.left,18+safe.top);
    if(this.basketText?.active)this.basketText.setY(18+safe.top);
    if(this.reelBg?.active)this.reelBg.setPosition(860-safe.right,39+safe.top);
    if(this.reelTx?.active)this.reelTx.setPosition(860-safe.right,39+safe.top);
    if(this.diveHint?.active)this.diveHint.setY(505-safe.bottom);
    if(this.phase==='CAST')this.drawCastMeter();
  }
  private clearOverlay(){this.overlay?.destroy(true);this.overlay=undefined}
  private hideCastMeter(){(this.children.getByName('cast-meter') as Phaser.GameObjects.Image|undefined)?.setVisible(false);this.meter.clear();this.castHint.setVisible(false)}
  private drawCastMeter(){
    const y=67+this.safeTop;
    this.meter.clear().fillStyle(0x153a4a,.86).fillRoundedRect(350,y,260,15,7).fillStyle(0x55a86f,.95).fillRoundedRect(455,y,50,15,6).lineStyle(3,0xfff6dc,1).beginPath().moveTo(350+this.marker*260,y-4).lineTo(350+this.marker*260,y+19).strokePath();
  }
  update(_:number,delta:number){
    if(!this.reducedMotion&&this.surface.visible){
      this.boatSprite.y=315+Math.round(Math.sin(this.time.now*.0016)*2);
      for(const cloud of this.surfaceClouds){
        cloud.sprite.x+=cloud.speed*delta/1000;
        if(cloud.sprite.x-cloud.sprite.displayWidth/2>960)cloud.sprite.x=-cloud.sprite.displayWidth/2;
      }
    }
    if(this.phase==='CAST'){const step=delta/1000*(this.firstCastAssist?.42:.72)*this.markerDir;this.marker+=step;if(this.marker>=1){this.marker=1;this.markerDir=-1}else if(this.marker<=0){this.marker=0;this.markerDir=1}this.drawCastMeter()}
    else if(this.phase==='UNDERWATER')this.updateUnderwater(delta);else if(this.phase==='RETRACTING')this.updateRetract(delta);
  }
}
