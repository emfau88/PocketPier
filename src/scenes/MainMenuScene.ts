import Phaser from 'phaser';
import { AudioService } from '../core/AudioService';
import { COLORS } from '../core/GameConfig';
import { SaveService } from '../core/SaveService';
import { button } from '../ui/Button';

export class MainMenuScene extends Phaser.Scene {
  constructor(){super('Menu')}

  create(){
    const w=this.scale.width,reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const save=SaveService.load(),progress=SaveService.levelProgress(save.xp);
    const xpLabel=progress.maxed?`${save.xp} XP`:`${progress.current}/${progress.needed} XP`;

    this.cameras.main.setBackgroundColor(COLORS.water);
    this.add.image(w/2,270,'menu-ocean-morning').setDisplaySize(960,540);
    const shimmer=this.add.image(w/2,270,'menu-water-shimmer').setDisplaySize(960,540).setAlpha(.2);

    this.add.text(w/2,83,'POCKET PIER',{
      fontFamily:'system-ui',fontSize:'58px',fontStyle:'bold',color:'#fff6dc',stroke:'#153a4a',strokeThickness:8
    }).setOrigin(.5).setDepth(20);
    this.add.text(w/2,139,'CAST  •  EXPLORE  •  COLLECT',{
      fontFamily:'system-ui',fontSize:'17px',fontStyle:'bold',color:'#153a4a',backgroundColor:'#fff6dc'
    }).setPadding(14,7).setOrigin(.5).setDepth(20);

    const bobber=this.add.image(w/2,322,'bobber-basic').setDisplaySize(58,60).setDepth(12);
    this.add.ellipse(w/2,347,64,13,0x153a4a,.12).setDepth(10);
    this.add.ellipse(w/2,347,54,10).setStrokeStyle(2,0xfff6dc,.55).setDepth(11);
    if(!reducedMotion){
      this.tweens.add({targets:shimmer,alpha:{from:.12,to:.25},x:w/2+5,duration:4700,yoyo:true,repeat:-1,ease:'Sine.inOut'});
      this.tweens.add({targets:bobber,y:318,angle:{from:-1.2,to:1.2},duration:2100,yoyo:true,repeat:-1,ease:'Sine.inOut'});
      this.time.addEvent({delay:2450,loop:true,callback:()=>this.spawnRipple(w/2,348)});
      this.scheduleGull(true);
    }

    button(this,w/2,438,'START FISHING',()=>this.startFishing(save.lastLocationId),290,68).setDepth(30);
    this.add.text(w/2,484,`Next stop: ${this.locationLabel(save.lastLocationId)}`,{
      fontFamily:'system-ui',fontSize:'14px',fontStyle:'bold',color:'#fff6dc',stroke:'#153a4a',strokeThickness:4
    }).setOrigin(.5).setDepth(20);
    this.add.text(w-18,18,`LEVEL ${progress.level}   ${xpLabel}   COINS ${save.coins}`,{
      fontFamily:'system-ui',fontSize:'15px',fontStyle:'bold',color:'#fff6dc',backgroundColor:'#153a4a'
    }).setOrigin(1,0).setPadding(9,7).setDepth(30);

    this.input.keyboard?.once('keydown-SPACE',()=>{
      AudioService.unlock();AudioService.uiSelect();this.startFishing(save.lastLocationId);
    });
  }

  private startFishing(locationId:'sunny-pier'|'rocky-cove'|'moonlit-trench'){
    this.scene.start('Pier',{locationId});
  }

  private locationLabel(locationId:'sunny-pier'|'rocky-cove'|'moonlit-trench'){
    if(locationId==='rocky-cove')return 'Rocky Cove';
    if(locationId==='moonlit-trench')return 'Moonlit Trench';
    return 'Sunny Pier';
  }

  private spawnRipple(x:number,y:number){
    const ripple=this.add.ellipse(x,y,48,10).setStrokeStyle(2,0xfff6dc,.48).setDepth(9);
    this.tweens.add({targets:ripple,scaleX:2.1,scaleY:1.55,alpha:0,duration:1450,ease:'Sine.easeOut',onComplete:()=>ripple.destroy()});
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
    this.tweens.add({
      targets:gull,x:1040,y:y-Phaser.Math.Between(6,20),duration:Phaser.Math.Between(8200,9800),ease:'Sine.inOut',
      onComplete:()=>{flap.destroy();gull.destroy();this.scheduleGull()}
    });
  }
}
