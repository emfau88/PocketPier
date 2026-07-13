import type Phaser from 'phaser';
import { SaveService } from './SaveService';

type SfxKey=
  'sfx-ui-select'|'sfx-ui-cancel'|'sfx-ui-pop'|'sfx-book-open'|'sfx-book-close'|'sfx-jobs-open'|'sfx-gear-equip'|'sfx-coins'|
  'sfx-boat-knock'|'sfx-cast'|'sfx-splash'|'sfx-bite'|'sfx-catch'|'sfx-treasure'|'sfx-claim'|'sfx-level-up';

export class AudioService {
  private static ctx?:AudioContext;
  private static manager?:Phaser.Sound.BaseSoundManager;
  static bind(manager:Phaser.Sound.BaseSoundManager){this.manager=manager}
  private static muted(){return SaveService.load().muted}
  private static context(){return this.ctx??=new AudioContext()}
  static unlock(){if(this.muted())return;const c=this.context();if(c.state==='suspended')void c.resume()}
  private static sample(key:SfxKey,volume=.3,rate=1){
    if(this.muted()||!this.manager)return false;
    try{return this.manager.play(key,{volume,rate})}catch{return false}
  }
  static tone(frequency:number,duration=.12,type:OscillatorType='sine',gain=.045,delay=0){
    if(this.muted())return;const c=this.context(),o=c.createOscillator(),g=c.createGain(),start=c.currentTime+delay;
    o.type=type;o.frequency.setValueAtTime(frequency,start);g.gain.setValueAtTime(gain,start);g.gain.exponentialRampToValueAtTime(.001,start+duration);o.connect(g).connect(c.destination);o.start(start);o.stop(start+duration);
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
  static reel(){this.uiPop()}
  static perfect(){if(!this.sample('sfx-treasure',.28))[660,880,1100].forEach((f,i)=>this.tone(f,.18,'sine',.04,i*.07))}
  static catch(){if(!this.sample('sfx-catch',.3))[392,523,659].forEach((f,i)=>this.tone(f,.28,'triangle',.045,i*.09))}
  static coins(){if(!this.sample('sfx-coins',.26))this.tone(740,.12,'triangle',.03)}
  static purchase(){if(!this.sample('sfx-gear-equip',.27))this.uiSelect()}
  static repair(){if(!this.sample('sfx-boat-knock',.28,.86))this.purchase()}
  static claim(){if(!this.sample('sfx-claim',.3))this.catch()}
  static levelUp(){if(!this.sample('sfx-level-up',.32))this.perfect()}
  static fail(){if(!this.sample('sfx-ui-cancel',.25)){this.tone(210,.25,'sawtooth',.025);this.tone(140,.3,'sine',.03,.12)}}
}
