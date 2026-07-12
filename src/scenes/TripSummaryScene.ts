import Phaser from 'phaser';
import { COLORS, TRIP_CASTS } from '../core/GameConfig';
import { SaveService } from '../core/SaveService';
import { PortalBridge } from '../core/PortalBridge';
import type { TripState } from '../gameplay/TripState';
import { treasureById } from '../gameplay/Treasure';
import { button } from '../ui/Button';

export class TripSummaryScene extends Phaser.Scene {
  private trip!:TripState;
  constructor(){super('Summary')}
  init(data:{trip:TripState}){this.trip=data.trip}

  create(){
    this.cameras.main.setBackgroundColor(COLORS.navy);
    const save=SaveService.load(),previousLevel=SaveService.levelProgress(save.xp).level;
    save.coins+=this.trip.coins;save.xp+=this.trip.xp;save.tutorialComplete=true;
    this.trip.catches.forEach(c=>SaveService.recordCatch(save,c.fish.id,c.weight));
    this.trip.treasures.forEach(t=>SaveService.discoverTreasure(save,t.id));
    SaveService.save(save);
    const progress=SaveService.levelProgress(save.xp),levelUp=progress.level>previousLevel;

    this.add.text(480,55,'FISHING TRIP COMPLETE',{fontSize:'36px',fontStyle:'bold',color:'#fff6dc'}).setOrigin(.5);
    this.add.text(480,105,`${this.trip.catches.length} fish from ${TRIP_CASTS} dives   •   +${this.trip.coins} coins   •   +${this.trip.xp} XP`,{fontSize:'20px',color:'#ffd166'}).setOrigin(.5);
    if(levelUp)this.add.text(480,140,`LEVEL UP!  LEVEL ${progress.level}`,{fontSize:'19px',fontStyle:'bold',color:'#ef8d72'}).setOrigin(.5);

    this.trip.catches.slice(0,6).forEach((c,i)=>{
      const y=180+i*34,badge=c.isNew?'NEW':c.isRecord?'RECORD':'';
      this.add.text(210,y,`${c.fish.name}${badge?`  •  ${badge}`:''}`,{fontSize:'17px',fontStyle:badge?'bold':'normal',color:badge?'#ffd166':'#fff6dc'}).setOrigin(0,.5);
      this.add.text(750,y,`${c.weight.toFixed(2)} kg   ${c.coins} coins`,{fontSize:'17px',color:'#a9e5dc'}).setOrigin(1,.5);
    });
    if(this.trip.treasures.length){
      const names=this.trip.treasures.map(t=>`${treasureById(t.id)?.name??'Treasure'}${t.isNew?' (NEW)':''}`).join('  •  ');
      this.add.text(480,390,names,{fontSize:'15px',fontStyle:'bold',color:'#ffd166'}).setOrigin(.5);
    }
    button(this,480,440,'NEXT TRIP',()=>this.scene.start('Pier'));
    button(this,480,500,'MAIN MENU',()=>this.scene.start('Menu'),210);
    PortalBridge.requestInterstitial('trip_summary');
  }
}
