import Phaser from 'phaser';
import { COLORS } from '../core/GameConfig';
import { SaveService } from '../core/SaveService';
import { button } from '../ui/Button';

export class MainMenuScene extends Phaser.Scene {
  constructor(){ super('Menu'); }

  create(){
    const w=this.scale.width;
    this.cameras.main.setBackgroundColor(COLORS.water);
    const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    this.add.image(w/2,270,'menu-sky').setDisplaySize(960,540);
    const clouds=this.add.image(w/2,128,'menu-clouds').setDisplaySize(970,546).setAlpha(.72);
    const horizon=this.add.image(w/2,257,'menu-horizon').setDisplaySize(980,551);
    const water=this.add.image(w/2,390,'menu-water').setDisplaySize(990,330);
    const farWave=this.add.image(w/2,286,'menu-wave-far').setDisplaySize(990,557).setAlpha(.48);
    const midWave=this.add.image(w/2,330,'menu-wave-mid').setDisplaySize(990,557).setAlpha(.58);
    const nearWave=this.add.image(w/2,398,'menu-wave-near').setDisplaySize(1010,568).setAlpha(.7);
    this.add.image(w/2,270,'menu-pier').setDisplaySize(960,540);

    if(!reducedMotion){
      this.tweens.add({targets:clouds,x:w/2+24,duration:12000,yoyo:true,repeat:-1,ease:'Sine.inOut'});
      this.tweens.add({targets:horizon,x:w/2-4,duration:7600,yoyo:true,repeat:-1,ease:'Sine.inOut'});
      this.tweens.add({targets:water,y:394,duration:4600,yoyo:true,repeat:-1,ease:'Sine.inOut'});
      this.tweens.add({targets:farWave,x:w/2+8,y:289,duration:5200,yoyo:true,repeat:-1,ease:'Sine.inOut'});
      this.tweens.add({targets:midWave,x:w/2-14,y:334,duration:3700,yoyo:true,repeat:-1,ease:'Sine.inOut'});
      this.tweens.add({targets:nearWave,x:w/2+20,y:403,duration:2700,yoyo:true,repeat:-1,ease:'Sine.inOut'});
      this.scheduleGull(true);
    }

    this.add.rectangle(w/2,95,580,126,0x153a4a,.2).setStrokeStyle(2,0xfff6dc,.3);
    this.add.text(w/2,78,'POCKET PIER',{fontFamily:'system-ui',fontSize:'58px',fontStyle:'bold',color:'#fff6dc',stroke:'#153a4a',strokeThickness:8}).setOrigin(.5);
    this.add.text(w/2,139,'Cast  •  Explore  •  Collect',{fontSize:'20px',fontStyle:'bold',color:'#153a4a',backgroundColor:'#fff6dc'}).setPadding(12,6).setOrigin(.5);
    button(this,w/2,238,'START FISHING',()=>this.scene.start('Pier'));
    const s=SaveService.load(),progress=SaveService.levelProgress(s.xp);
    const xpLabel=progress.maxed?`${s.xp} XP`:`${progress.current}/${progress.needed} XP`;
    this.add.text(w-25,25,`LEVEL ${progress.level}   ${xpLabel}   COINS ${s.coins}`,{fontSize:'18px',color:'#fff6dc',backgroundColor:'#153a4a'}).setOrigin(1,0).setPadding(10);
    this.input.keyboard?.once('keydown-SPACE',()=>this.scene.start('Pier'));
  }

  private scheduleGull(firstFlight=false){
    const delay=firstFlight ? Phaser.Math.Between(3000,6000) : Phaser.Math.Between(12000,25000);
    this.time.delayedCall(delay,()=>{
      if(this.scene.isActive()) this.flyGull();
    });
  }

  private flyGull(){
    const keys=['menu-gull-up','menu-gull-glide','menu-gull-down'];
    const y=Phaser.Math.Between(88,190);
    const gull=this.add.image(-105,y,keys[0]).setDisplaySize(185,185).setDepth(4);
    let frame=0;
    const flap=this.time.addEvent({delay:150,loop:true,callback:()=>{
      frame=(frame+1)%keys.length;
      gull.setTexture(keys[frame]).setDisplaySize(185,185);
    }});
    this.tweens.add({
      targets:gull,
      x:1065,
      y:y-Phaser.Math.Between(8,30),
      duration:Phaser.Math.Between(7500,9500),
      ease:'Sine.inOut',
      onComplete:()=>{
        flap.destroy();
        gull.destroy();
        this.scheduleGull();
      }
    });
  }
}
