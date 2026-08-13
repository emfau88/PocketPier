import Phaser from 'phaser';
import { AudioService } from '../core/AudioService';
import { COLORS, GAME_WIDTH } from '../core/GameConfig';
import { compactViewport, configureSceneRendering, visibleGameBounds } from '../core/RenderQuality';
import { SaveService } from '../core/SaveService';
import { PortalBridge } from '../core/PortalBridge';

export class MainMenuScene extends Phaser.Scene {
  constructor(){super('Menu')}

  create(){
    configureSceneRendering(this);
    PortalBridge.gameplayStop();PortalBridge.clearGameContext();
    const w=GAME_WIDTH,reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const save=SaveService.load(),progress=SaveService.levelProgress(save.xp);
    const xpLabel=progress.maxed?`${save.xp} XP`:`${progress.current}/${progress.needed} XP`;

    this.cameras.main.setBackgroundColor(COLORS.water);
    this.add.image(w/2,270,'menu-ocean-morning').setDisplaySize(960,540);
    const shimmer=this.add.image(w/2,270,'menu-water-shimmer').setDisplaySize(960,540).setAlpha(.2);

    const eyebrow=this.add.text(w/2,43,'A COZY FISHING ADVENTURE',{
      fontFamily:'Arial, sans-serif',fontSize:'13px',fontStyle:'bold',color:'#153a4a'
    }).setOrigin(.5).setLetterSpacing(2).setDepth(20);
    const title=this.add.text(w/2,83,'POCKET PIER',{
      fontFamily:'Arial Black, Arial, sans-serif',fontSize:'60px',fontStyle:'bold',color:'#fff3ce',stroke:'#153a4a',strokeThickness:8
    }).setOrigin(.5).setDepth(20);
    const titleAccent=this.add.graphics().setDepth(19);
    const taglinePaper=this.add.graphics().setDepth(18);
    const tagline=this.add.text(w/2,143,'CAST   •   EXPLORE   •   COLLECT',{
      fontFamily:'Arial, sans-serif',fontSize:'15px',fontStyle:'bold',color:'#153a4a'
    }).setOrigin(.5).setLetterSpacing(.5).setDepth(20);

    if(!reducedMotion){
      this.tweens.add({targets:shimmer,alpha:{from:.12,to:.25},x:w/2+5,duration:4700,yoyo:true,repeat:-1,ease:'Sine.inOut'});
      this.scheduleGull(true);
    }

    const destinationLabel=this.add.text(w/2,351,'NEXT TRIP',{
      fontFamily:'Arial, sans-serif',fontSize:'11px',fontStyle:'bold',color:'#fff3ce',backgroundColor:'#153a4a'
    }).setPadding(10,5).setOrigin(.5).setLetterSpacing(1).setDepth(22);
    const destinationName=this.add.text(w/2,373,this.locationLabel(save.lastLocationId).toUpperCase(),{
      fontFamily:'Georgia, serif',fontSize:'24px',fontStyle:'bold',color:'#153a4a',backgroundColor:'#fff3ce'
    }).setPadding(18,7).setOrigin(.5).setDepth(21);
    const startButton=this.createPrimaryButton(w/2,438,'HEAD TO THE PIER',()=>this.startFishing(save.lastLocationId));
    const inputHint=this.add.text(w/2,488,'CLICK OR PRESS SPACE',{
      fontFamily:'Arial, sans-serif',fontSize:'12px',fontStyle:'bold',color:'#fff3ce',stroke:'#153a4a',strokeThickness:3
    }).setOrigin(.5).setLetterSpacing(1).setDepth(20);
    const progressHud=this.createProgressHud(progress.level,xpLabel,save.coins);

    const layout=()=>{
      const bounds=visibleGameBounds(this),compact=compactViewport(this),top=Math.max(bounds.top+(compact?39:52),compact?73:96),startY=Math.min(426,bounds.bottom-(compact?77:58));
      eyebrow.setPosition(bounds.centerX,top-37).setFontSize(compact?'11px':'13px');
      title.setPosition(bounds.centerX,top).setFontSize(compact?'46px':'60px');
      const taglineY=top+(compact?53:62);tagline.setPosition(bounds.centerX,taglineY).setFontSize(compact?'12px':'15px');
      titleAccent.clear().fillStyle(COLORS.coral,1).fillRoundedRect(bounds.centerX-(compact?64:78),top+(compact?27:37),compact?128:156,5,3);
      taglinePaper.clear().fillStyle(0xfff3ce,.93).lineStyle(2,COLORS.navy,.14)
        .fillRoundedRect(bounds.centerX-(compact?159:188),taglineY-(compact?15:18),compact?318:376,compact?30:36,9)
        .strokeRoundedRect(bounds.centerX-(compact?159:188),taglineY-(compact?15:18),compact?318:376,compact?30:36,9);
      destinationLabel.setPosition(bounds.centerX,startY-81);destinationName.setPosition(bounds.centerX,startY-51).setFontSize(compact?'20px':'24px');
      startButton.setPosition(bounds.centerX,startY+8).setScale(compact?.88:1);
      inputHint.setVisible(!compact).setPosition(bounds.centerX,startY+58).setFontSize('12px');
      progressHud.setScale(compact?.82:1).setPosition(bounds.left+(compact?105:128),bounds.top+(compact?23:36));
    };
    layout();this.events.on('render-quality-changed',layout);

    this.input.keyboard?.once('keydown-SPACE',()=>{
      AudioService.unlock();AudioService.uiSelect();this.startFishing(save.lastLocationId);
    });
  }

  private startFishing(locationId:'sunny-pier'|'rocky-cove'|'moonlit-trench'){
    this.scene.start('Loading',{locationId});
  }

  private locationLabel(locationId:'sunny-pier'|'rocky-cove'|'moonlit-trench'){
    if(locationId==='rocky-cove')return 'Rocky Cove';
    if(locationId==='moonlit-trench')return 'Moonlit Trench';
    return 'Sunny Pier';
  }

  private createPrimaryButton(x:number,y:number,label:string,action:()=>void){
    const width=338,height=68,art=this.add.graphics();
    const text=this.add.text(0,-2,label,{fontFamily:'Arial, sans-serif',fontSize:'22px',fontStyle:'bold',color:'#fff6dc'}).setOrigin(.5).setLetterSpacing(.5);
    const draw=(hover=false,pressed=false)=>{
      art.clear().fillStyle(COLORS.navy,.24).fillRoundedRect(-width/2+5,-height/2+7,width,height,16)
        .fillStyle(pressed?0xe76f56:hover?0xff9e83:0xff8369,1).fillRoundedRect(-width/2,-height/2,width,height,16)
        .lineStyle(3,0xfff3ce,1).strokeRoundedRect(-width/2,-height/2,width,height,16)
        .lineStyle(1,0xffffff,.26).strokeRoundedRect(-width/2+6,-height/2+6,width-12,height-12,11);
    };
    draw();
    const container=this.add.container(x,y,[art,text]).setSize(width,height).setDepth(30).setInteractive({useHandCursor:true});
    container.on('pointerover',()=>draw(true)).on('pointerout',()=>draw()).on('pointerdown',()=>draw(false,true)).on('pointerup',()=>{draw(true);AudioService.unlock();AudioService.uiSelect();action()});
    return container;
  }

  private createProgressHud(level:number,xp:string,coins:number){
    const width=240,height=50,art=this.add.graphics();
    art.fillStyle(COLORS.navy,.22).fillRoundedRect(-width/2+4,-height/2+5,width,height,13)
      .fillStyle(0xfff3ce,.95).fillRoundedRect(-width/2,-height/2,width,height,13)
      .lineStyle(2,COLORS.navy,.5).strokeRoundedRect(-width/2,-height/2,width,height,13)
      .lineStyle(1,COLORS.navy,.22).lineBetween(-40,-16,-40,16).lineBetween(42,-16,42,16);
    const cell=(x:number,label:string,value:string)=>[
      this.add.text(x,-10,label,{fontFamily:'Arial, sans-serif',fontSize:'9px',fontStyle:'bold',color:'#54717a'}).setOrigin(.5).setLetterSpacing(.5),
      this.add.text(x,8,value,{fontFamily:'Arial, sans-serif',fontSize:'15px',fontStyle:'bold',color:'#153a4a'}).setOrigin(.5)
    ];
    return this.add.container(0,0,[art,...cell(-80,'LEVEL',String(level)),...cell(1,'XP',xp.replace(' XP','')),...cell(81,'COINS',String(coins))]).setDepth(31);
  }

  private scheduleGull(firstFlight=false){
    const delay=firstFlight?Phaser.Math.Between(3500,6500):Phaser.Math.Between(14000,26000);
    this.time.delayedCall(delay,()=>{if(this.scene.isActive())this.flyGull()});
  }

  private flyGull(){
    const keys=['menu-gull-up','menu-gull-glide','menu-gull-down'],y=Phaser.Math.Between(168,230);
    const gull=this.add.image(-80,y,keys[0]).setDisplaySize(115,115).setDepth(4);
    let frame=0;
    const flap=this.time.addEvent({delay:165,loop:true,callback:()=>{frame=(frame+1)%keys.length;gull.setTexture(keys[frame]).setDisplaySize(115,115)}});
    this.tweens.add({targets:gull,x:1040,y:y-Phaser.Math.Between(6,20),duration:Phaser.Math.Between(8200,9800),ease:'Sine.inOut',onComplete:()=>{flap.destroy();gull.destroy();this.scheduleGull()}});
  }
}
