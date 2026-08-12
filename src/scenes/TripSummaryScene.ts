import Phaser from 'phaser';
import { COLORS, TRIP_CASTS } from '../core/GameConfig';
import { SaveService } from '../core/SaveService';
import { PortalBridge } from '../core/PortalBridge';
import type { TripState } from '../gameplay/TripState';
import { FISHING_LOCATIONS, locationById, treasureAcrossLocations } from '../gameplay/FishingLocation';
import { QuestService } from '../gameplay/QuestService';
import { button } from '../ui/Button';
import { AudioService } from '../core/AudioService';
import { compactViewport, configureSceneRendering, safeAreaInsets, visibleGameBounds } from '../core/RenderQuality';
import type { Fish } from '../gameplay/Fish';

export class TripSummaryScene extends Phaser.Scene {
  private trip!:TripState;
  constructor(){super('Summary')}
  init(data:{trip:TripState}){this.trip=data.trip}

  create(){
    configureSceneRendering(this);
    this.cameras.main.setBackgroundColor(COLORS.navy);
    const safe=safeAreaInsets(this),bounds=visibleGameBounds(this),compact=compactViewport(this);
    const save=SaveService.load(),startingCoins=save.coins,startingXp=save.xp,previousLevel=SaveService.levelProgress(save.xp).level;
    save.coins+=this.trip.coins;const levelRewards=SaveService.awardXp(save,this.trip.xp);save.tutorialComplete=true;
    this.trip.catches.forEach(c=>SaveService.recordCatch(save,c.fish.id,c.weight));
    this.trip.treasures.forEach(t=>SaveService.discoverTreasure(save,t.id));
    const completedJobs=QuestService.applyTrip(save,this.trip),location=locationById(this.trip.locationId),masteredBefore=save.completedLocationIds.includes(location.id);
    const unlockedLocationIds=SaveService.recordTripProgress(save,this.trip.locationId,this.trip.catches.length,this.trip.treasures.length),newAchievements=QuestService.discoverAchievements(save),unlockedLocation=unlockedLocationIds[0]?locationById(unlockedLocationIds[0]):undefined,mastery=SaveService.masteryStatus(save,this.trip.locationId);
    SaveService.save(save);
    PortalBridge.reportCompletion(save.completedLocationIds.length/FISHING_LOCATIONS.length*100);
    if(!masteredBefore&&save.completedLocationIds.length===FISHING_LOCATIONS.length)PortalBridge.celebrate();
    const progress=SaveService.levelProgress(save.xp),levelUp=progress.level>previousLevel;

    this.add.text(480,55+safe.top*.45,`${location.name.toUpperCase()} TRIP SUMMARY`,{fontSize:'34px',fontStyle:'bold',color:'#fff6dc'}).setOrigin(.5);
    this.add.text(480,105,`${this.trip.catches.length} FISH   •   ${TRIP_CASTS} DIVES   •   +${this.trip.coins} COINS   •   +${this.trip.xp} XP`,{fontSize:compact?'16px':'20px',fontStyle:'bold',color:'#ffd166'}).setOrigin(.5);
    if(unlockedLocation){const unlock=this.add.text(480,145,`NEW AREA UNLOCKED: ${unlockedLocation.name.toUpperCase()}`,{fontSize:'17px',fontStyle:'bold',color:'#153a4a',backgroundColor:'#ffd166'}).setPadding(14,7).setOrigin(.5).setScale(.4);this.tweens.add({targets:unlock,scale:1,duration:420,ease:'Back.easeOut'});}
    else this.drawMasteryProgress(mastery);
    if(levelRewards.length)this.add.text(480,445,`LEVEL REWARD  +${levelRewards.reduce((sum,reward)=>sum+reward.coins,0)} COINS`,{fontSize:'13px',fontStyle:'bold',color:'#ffd166'}).setOrigin(.5);
    const progressHud=this.add.text(Math.min(bounds.right-(compact?14:60),compact?800:830),22+safe.top,compact?`LV ${previousLevel}   ${startingXp} XP   ${startingCoins} COINS`:`LEVEL ${previousLevel}   XP ${startingXp}   COINS ${startingCoins}`,{fontSize:compact?'13px':'16px',fontStyle:'bold',color:'#fff6dc'}).setOrigin(1,0).setDepth(100);

    const catchRows=[...this.trip.catches.reduce((rows,c)=>{
      const row=rows.get(c.fish.id)??{fish:c.fish,count:0,bestWeight:0,coins:0,isNew:false,isRecord:false};
      row.count++;row.bestWeight=Math.max(row.bestWeight,c.weight);row.coins+=c.coins;row.isNew ||= c.isNew;row.isRecord ||= c.isRecord;rows.set(c.fish.id,row);return rows;
    },new Map<string,{fish:Fish;count:number;bestWeight:number;coins:number;isNew:boolean;isRecord:boolean}>()).values()];
    catchRows.forEach((c,i)=>{
      const y=190+i*34,badge=c.isNew?'NEW':c.isRecord?'RECORD':'';
      this.add.circle(182,y,17,0xfff6dc,.1).setStrokeStyle(2,badge?COLORS.gold:0x69d6c5,.75);this.add.image(182,y,c.fish.texture).setDisplaySize(42,30);
      this.add.text(210,y,`${c.fish.name}${c.count>1?`  ×${c.count}`:''}${badge?`  •  ${badge}`:''}`,{fontSize:'17px',fontStyle:badge?'bold':'normal',color:badge?'#ffd166':'#fff6dc'}).setOrigin(0,.5);
      this.add.text(750,y,`best ${c.bestWeight.toFixed(2)} kg   ${c.coins} coins`,{fontSize:'17px',color:'#a9e5dc'}).setOrigin(1,.5);
    });
    if(this.trip.treasures.length){
      const names=this.trip.treasures.map(t=>`${treasureAcrossLocations(t.id)?.name??'Treasure'}${t.isNew?' (NEW)':''}`).join('  •  ');
      this.add.text(480,365,names,{fontSize:'15px',fontStyle:'bold',color:'#ffd166'}).setOrigin(.5);
    }
    if(completedJobs.length)this.add.text(480,395,`JOBS READY TO CLAIM  •  ${completedJobs.map(job=>job.title).join(', ')}`,{fontSize:'13px',fontStyle:'bold',color:'#153a4a',backgroundColor:'#a9e5dc'}).setPadding(10,5).setOrigin(.5);
    if(newAchievements.length)this.add.text(480,420,`BADGES READY TO CLAIM  •  ${newAchievements.map(achievement=>achievement.title).join(', ')}`,{fontSize:'13px',fontStyle:'bold',color:'#153a4a',backgroundColor:'#ffd166'}).setPadding(10,5).setOrigin(.5);
    button(this,315,500-safe.bottom,'BACK TO PIER',()=>this.scene.start('Pier',{locationId:this.trip.locationId}),300);
    button(this,665,500-safe.bottom,'MAIN MENU',()=>this.scene.start('Menu'),230);
    this.animateRunRewards(progressHud,startingCoins,startingXp,save.coins,save.xp,levelUp,progress.level);
    PortalBridge.requestInterstitial('trip_summary');
  }

  private drawMasteryProgress(mastery:ReturnType<typeof SaveService.masteryStatus>){
    const values=[['TRIPS',mastery.progress.trips,mastery.requirement.trips],['FISH',mastery.progress.catches,mastery.requirement.catches],['SPECIES',mastery.progress.uniqueFish,mastery.requirement.uniqueFish],['TREASURE',mastery.progress.treasures,mastery.requirement.treasures]] as const;
    values.forEach(([label,current,target],index)=>{const x=225+index*170,ratio=Math.min(1,current/target);this.add.text(x,137,`${label}  ${current}/${target}`,{fontSize:'11px',fontStyle:'bold',color:ratio>=1?'#ffd166':'#a9e5dc'}).setOrigin(.5);this.add.rectangle(x,158,142,8,0xfff6dc,.18);this.add.rectangle(x-71,158,142*ratio,8,ratio>=1?COLORS.gold:0x69d6c5,1).setOrigin(0,.5)});
  }

  private animateRunRewards(hud:Phaser.GameObjects.Text,fromCoins:number,fromXp:number,toCoins:number,toXp:number,levelUp:boolean,level:number){
    if(toCoins===fromCoins&&toXp===fromXp){hud.setText(`LEVEL ${level}   XP ${toXp}   COINS ${toCoins}`);return;}
    AudioService.coins();
    const particles:Phaser.GameObjects.Text[]=[];
    for(let i=0;i<10;i++){
      const coin=i%2===0,particle=this.add.text(420+i*13,112+(i%3)*8,coin?'●':'✦',{fontSize:coin?'18px':'16px',fontStyle:'bold',color:coin?'#ffd166':'#69d6c5',stroke:'#153a4a',strokeThickness:3}).setOrigin(.5).setDepth(110).setAlpha(0);
      particles.push(particle);this.tweens.add({targets:particle,alpha:1,x:900+(i%3)*12,y:30,duration:520+i*35,delay:250+i*35,ease:'Cubic.easeIn',onComplete:()=>particle.destroy()});
    }
    this.time.delayedCall(1150,()=>{
      hud.setText(`LEVEL ${level}   XP ${toXp}   COINS ${toCoins}`);this.tweens.add({targets:hud,scale:1.12,duration:120,yoyo:true,ease:'Sine.easeOut'});
      if(levelUp){AudioService.levelUp();const banner=this.add.text(480,142,`LEVEL UP!  LEVEL ${level}`,{fontSize:'25px',fontStyle:'bold',color:'#fff6dc',backgroundColor:'#ef6b4a',stroke:'#153a4a',strokeThickness:4}).setPadding(18,9).setOrigin(.5).setDepth(120).setScale(.5);this.tweens.add({targets:banner,scale:1,duration:260,ease:'Back.easeOut'});}
      else if(toCoins>fromCoins||toXp>fromXp){const gained=this.add.text(790,53,`+${toCoins-fromCoins} COINS   +${toXp-fromXp} XP`,{fontSize:'13px',fontStyle:'bold',color:'#ffd166'}).setOrigin(.5).setDepth(100);this.tweens.add({targets:gained,alpha:0,y:43,delay:850,duration:300,onComplete:()=>gained.destroy()});}
    });
  }
}
