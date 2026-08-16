import type Phaser from 'phaser';
import { SaveService } from './SaveService';
import type { FishingLocationId } from '../gameplay/FishingLocation';

type SfxKey=
  'sfx-ui-select'|'sfx-ui-cancel'|'sfx-ui-pop'|'sfx-book-open'|'sfx-book-close'|'sfx-jobs-open'|'sfx-gear-equip'|'sfx-coins'|
  'sfx-boat-knock'|'sfx-cast'|'sfx-splash'|'sfx-bite'|'sfx-catch'|'sfx-treasure'|'sfx-claim'|'sfx-level-up'|'sfx-reel';
type AmbientContext='menu'|'harbor'|'underwater-sunny'|'underwater-rocky'|'underwater-moonlit'|'quiet';
type Layer={key:string;volume:number};
type VolumeSound=Phaser.Sound.BaseSound&{volume:number;setVolume(value:number):unknown};

export class AudioService {
  private static ctx?:AudioContext;
  private static manager?:Phaser.Sound.BaseSoundManager;
  private static ambientContext:AmbientContext='quiet';
  private static loops=new Map<string,Phaser.Sound.BaseSound>();
  private static fades=new Map<string,ReturnType<typeof setInterval>>();
  private static reelSound?:Phaser.Sound.BaseSound;

  static bind(manager:Phaser.Sound.BaseSoundManager){this.manager=manager;this.applyAmbientContext()}
  static isMuted(){return SaveService.load().muted}
  private static context(){return this.ctx??=new AudioContext()}
  static unlock(){
    if(this.isMuted())return;
    const c=this.context();if(c.state==='suspended')void c.resume();
    this.applyAmbientContext();
  }
  static toggleMuted(){
    const save=SaveService.load();save.muted=!save.muted;SaveService.save(save);
    if(save.muted){this.stopReel();this.stopAllAmbience()}else this.applyAmbientContext();
    return save.muted;
  }

  static enterMenu(){this.ambientContext='menu';this.applyAmbientContext()}
  static enterHarbor(){this.ambientContext='harbor';this.stopReel();this.applyAmbientContext()}
  static enterUnderwater(locationId:FishingLocationId){
    this.ambientContext=locationId==='rocky-cove'?'underwater-rocky':locationId==='moonlit-trench'?'underwater-moonlit':'underwater-sunny';
    this.applyAmbientContext();
  }
  static quiet(){this.ambientContext='quiet';this.stopReel();this.applyAmbientContext()}
  static pauseAll(){this.manager?.pauseAll()}
  static resumeAll(){if(!this.isMuted()){this.manager?.resumeAll();this.applyAmbientContext()}}

  private static layers():Layer[]{
    if(this.ambientContext==='menu')return [{key:'music-sunset-plains',volume:.0805},{key:'ambient-harbor-waves',volume:.15}];
    if(this.ambientContext==='harbor')return [{key:'music-sunset-plains',volume:.06325},{key:'ambient-harbor-waves',volume:.2}];
    if(this.ambientContext==='underwater-sunny')return [{key:'ambient-underwater-sunny',volume:.3}];
    if(this.ambientContext==='underwater-rocky')return [{key:'ambient-underwater-rocky',volume:.34}];
    if(this.ambientContext==='underwater-moonlit')return [{key:'ambient-underwater-moonlit',volume:.4}];
    return [];
  }
  private static applyAmbientContext(){
    if(!this.manager||this.isMuted()){this.stopAllAmbience();return}
    const desired=this.layers(),desiredKeys=new Set(desired.map(layer=>layer.key));
    for(const [key,sound] of this.loops)if(!desiredKeys.has(key))this.fade(key,sound,0,true);
    for(const layer of desired)this.startLoop(layer);
  }
  private static startLoop(layer:Layer){
    if(!this.manager)return;
    let sound=this.loops.get(layer.key);
    try{
      if(!sound){sound=this.manager.add(layer.key,{loop:true,volume:0});this.loops.set(layer.key,sound)}
      if(!sound.isPlaying)sound.play();
      this.fade(layer.key,sound,layer.volume);
    }catch{this.loops.delete(layer.key)}
  }
  private static fade(key:string,sound:Phaser.Sound.BaseSound,target:number,destroyAfter=false){
    const prior=this.fades.get(key);if(prior)clearInterval(prior);
    const volumeSound=sound as VolumeSound,start=volumeSound.volume,steps=12;let step=0;
    const timer=setInterval(()=>{
      step++;volumeSound.setVolume(start+(target-start)*(step/steps));
      if(step<steps)return;
      clearInterval(timer);this.fades.delete(key);
      if(destroyAfter){sound.stop();sound.destroy();if(this.loops.get(key)===sound)this.loops.delete(key)}
    },40);
    this.fades.set(key,timer);
  }
  private static stopAllAmbience(){
    for(const timer of this.fades.values())clearInterval(timer);this.fades.clear();
    for(const sound of this.loops.values()){sound.stop();sound.destroy()}this.loops.clear();
  }

  private static sample(key:SfxKey,volume=.3,rate=1){
    if(this.isMuted()||!this.manager)return false;
    try{return this.manager.play(key,{volume,rate})}catch{return false}
  }
  static tone(frequency:number,duration=.12,type:OscillatorType='sine',gain=.045,delay=0){
    if(this.isMuted())return;const c=this.context(),o=c.createOscillator(),g=c.createGain(),start=c.currentTime+delay;
    o.type=type;o.frequency.setValueAtTime(frequency,start);g.gain.setValueAtTime(gain,start);g.gain.exponentialRampToValueAtTime(.001,start+duration);o.connect(g).connect(c.destination);o.start(start);o.stop(start+duration);
  }
  static seagull(){
    if(this.isMuted()||!this.manager||!['menu','harbor'].includes(this.ambientContext))return;
    const key=`ambient-seagull-${Math.floor(Math.random()*4)+1}`;
    try{this.manager.play(key,{volume:.09,rate:.94+Math.random()*.1})}catch{/* Ambient detail is optional. */}
  }
  static bubble(){
    if(this.isMuted()||!this.manager||!this.ambientContext.startsWith('underwater'))return;
    const key=`ambient-bubble-${Math.floor(Math.random()*3)+1}`;
    try{this.manager.play(key,{volume:.1,rate:.92+Math.random()*.16})}catch{/* Ambient detail is optional. */}
  }
  static uiSelect(){if(!this.sample('sfx-ui-select',.22))this.tone(520,.08,'sine',.025)}
  static uiCancel(){if(!this.sample('sfx-ui-cancel',.2))this.tone(260,.1,'triangle',.02)}
  static uiPop(){if(!this.sample('sfx-ui-pop',.22))this.tone(430,.08,'sine',.02)}
  static bookOpen(){if(!this.sample('sfx-book-open',.3))this.uiPop()}
  static bookClose(){if(!this.sample('sfx-book-close',.25))this.uiCancel()}
  static jobsOpen(){if(!this.sample('sfx-jobs-open',.28))this.bookOpen()}
  static tackleOpen(){if(!this.sample('sfx-gear-equip',.24,.92))this.uiPop()}
  static boatOpen(){if(!this.sample('sfx-boat-knock',.25))this.uiPop()}
  static cast(){if(!this.sample('sfx-cast',.28)){this.tone(260,.18,'sine',.035);this.tone(390,.14,'sine',.025,.08)}}
  static splash(){if(!this.sample('sfx-splash',.3)){this.tone(150,.13,'triangle',.05);this.tone(90,.2,'sine',.03,.04)}}
  static bite(){if(!this.sample('sfx-bite',.26)){this.tone(660,.08,'square',.04);this.tone(880,.12,'square',.035,.09)}}
  static reel(){
    this.stopReel();if(this.isMuted()||!this.manager)return;
    try{this.reelSound=this.manager.add('sfx-reel',{volume:.38});this.reelSound.play()}catch{this.uiPop()}
  }
  static stopReel(){if(!this.reelSound)return;this.reelSound.stop();this.reelSound.destroy();this.reelSound=undefined}
  static perfect(){if(!this.sample('sfx-treasure',.28))[660,880,1100].forEach((f,i)=>this.tone(f,.18,'sine',.04,i*.07))}
  static catch(){if(!this.sample('sfx-catch',.3))[392,523,659].forEach((f,i)=>this.tone(f,.28,'triangle',.045,i*.09))}
  static coins(){if(!this.sample('sfx-coins',.26))this.tone(740,.12,'triangle',.03)}
  static purchase(){if(!this.sample('sfx-gear-equip',.27))this.uiSelect()}
  static repair(){if(!this.sample('sfx-boat-knock',.28,.86))this.purchase()}
  static claim(){if(!this.sample('sfx-claim',.3))this.catch()}
  static levelUp(){if(!this.sample('sfx-level-up',.32))this.perfect()}
  static fail(){if(!this.sample('sfx-ui-cancel',.25)){this.tone(210,.25,'sawtooth',.025);this.tone(140,.3,'sine',.03,.12)}}
}
