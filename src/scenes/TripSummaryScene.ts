import Phaser from 'phaser';
import { COLORS, TRIP_CASTS } from '../core/GameConfig';
import { SaveService } from '../core/SaveService';
import { PortalBridge } from '../core/PortalBridge';
import type { TripState } from '../gameplay/TripState';
import { treasureById } from '../gameplay/Treasure';
import { QuestService } from '../gameplay/QuestService';
import { button } from '../ui/Button';

export class TripSummaryScene extends Phaser.Scene {
  private trip!:TripState;
  constructor(){super('Summary')}
  init(data:{trip:TripState}){this.trip=data.trip}

  create(){
    this.cameras.main.setBackgroundColor(COLORS.navy);
    const save=SaveService.load(),startingCoins=save.coins,startingXp=save.xp,previousLevel=SaveService.levelProgress(save.xp).level;
    save.coins+=this.trip.coins;save.xp+=this.trip.xp;save.tutorialComplete=true;
    this.trip.catches.forEach(c=>SaveService.recordCatch(save,c.fish.id,c.weight));
    this.trip.treasures.forEach(t=>SaveService.discoverTreasure(save,t.id));
    const completedJobs=QuestService.applyTrip(save,this.trip),newAchievements=QuestService.discoverAchievements(save);
    SaveService.save(save);
    const progress=SaveService.levelProgress(save.xp),levelUp=progress.level>previousLevel;

    this.add.text(480,55,'FISHING TRIP COMPLETE',{fontSize:'36px',fontStyle:'bold',color:'#fff6dc'}).setOrigin(.5);
    this.add.text(480,105,`${this.trip.catches.length} fish from ${TRIP_CASTS} dives   •   +${this.trip.coins} coins   •   +${this.trip.xp} XP`,{fontSize:'20px',color:'#ffd166'}).setOrigin(.5);
    const progressHud=this.add.text(938,22,`LEVEL ${previousLevel}   XP ${startingXp}   COINS ${startingCoins}`,{fontSize:'15px',fontStyle:'bold',color:'#fff6dc'}).setOrigin(1,0).setDepth(100);

    this.trip.catches.slice(0,6).forEach((c,i)=>{
      const y=180+i*34,badge=c.isNew?'NEW':c.isRecord?'RECORD':'';
      this.add.text(210,y,`${c.fish.name}${badge?`  •  ${badge}`:''}`,{fontSize:'17px',fontStyle:badge?'bold':'normal',color:badge?'#ffd166':'#fff6dc'}).setOrigin(0,.5);
      this.add.text(750,y,`${c.weight.toFixed(2)} kg   ${c.coins} coins`,{fontSize:'17px',color:'#a9e5dc'}).setOrigin(1,.5);
    });
    if(this.trip.treasures.length){
      const names=this.trip.treasures.map(t=>`${treasureById(t.id)?.name??'Treasure'}${t.isNew?' (NEW)':''}`).join('  •  ');
      this.add.text(480,390,names,{fontSize:'15px',fontStyle:'bold',color:'#ffd166'}).setOrigin(.5);
    }
    if(completedJobs.length)this.add.text(480,420,`HARBOR JOB READY: ${completedJobs.map(job=>job.title).join(', ')}`,{fontSize:'13px',fontStyle:'bold',color:'#a9e5dc'}).setOrigin(.5);
    if(newAchievements.length)this.add.text(480,445,`BADGE READY: ${newAchievements.map(achievement=>achievement.title).join(', ')}`,{fontSize:'13px',fontStyle:'bold',color:'#ffd166'}).setOrigin(.5);
    button(this,480,480,'NEXT TRIP',()=>this.scene.start('Pier'));
    button(this,480,530,'MAIN MENU',()=>this.scene.start('Menu'),210);
    this.animateRunRewards(progressHud,startingCoins,startingXp,save.coins,save.xp,levelUp,progress.level);
    PortalBridge.requestInterstitial('trip_summary');
  }

  private animateRunRewards(hud:Phaser.GameObjects.Text,fromCoins:number,fromXp:number,toCoins:number,toXp:number,levelUp:boolean,level:number){
    if(toCoins===fromCoins&&toXp===fromXp){hud.setText(`LEVEL ${level}   XP ${toXp}   COINS ${toCoins}`);return;}
    const particles:Phaser.GameObjects.Text[]=[];
    for(let i=0;i<10;i++){
      const coin=i%2===0,particle=this.add.text(420+i*13,112+(i%3)*8,coin?'●':'✦',{fontSize:coin?'18px':'16px',fontStyle:'bold',color:coin?'#ffd166':'#69d6c5',stroke:'#153a4a',strokeThickness:3}).setOrigin(.5).setDepth(110).setAlpha(0);
      particles.push(particle);this.tweens.add({targets:particle,alpha:1,x:900+(i%3)*12,y:30,duration:520+i*35,delay:250+i*35,ease:'Cubic.easeIn',onComplete:()=>particle.destroy()});
    }
    this.time.delayedCall(1150,()=>{
      hud.setText(`LEVEL ${level}   XP ${toXp}   COINS ${toCoins}`);this.tweens.add({targets:hud,scale:1.12,duration:120,yoyo:true,ease:'Sine.easeOut'});
      if(levelUp){const banner=this.add.text(480,142,`LEVEL UP!  LEVEL ${level}`,{fontSize:'25px',fontStyle:'bold',color:'#fff6dc',backgroundColor:'#ef6b4a',stroke:'#153a4a',strokeThickness:4}).setPadding(18,9).setOrigin(.5).setDepth(120).setScale(.5);this.tweens.add({targets:banner,scale:1,duration:260,ease:'Back.easeOut'});}
      else if(toCoins>fromCoins||toXp>fromXp){const gained=this.add.text(790,53,`+${toCoins-fromCoins} COINS   +${toXp-fromXp} XP`,{fontSize:'13px',fontStyle:'bold',color:'#ffd166'}).setOrigin(.5).setDepth(100);this.tweens.add({targets:gained,alpha:0,y:43,delay:850,duration:300,onComplete:()=>gained.destroy()});}
    });
  }
}
