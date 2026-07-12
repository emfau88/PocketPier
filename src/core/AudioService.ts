export class AudioService {
  private static ctx?: AudioContext;
  private static context(){ return this.ctx ??= new AudioContext(); }
  static unlock(){ const c=this.context(); if(c.state==='suspended') void c.resume(); }
  static tone(frequency:number,duration=.12,type:OscillatorType='sine',gain=.045,delay=0){
    const c=this.context(),o=c.createOscillator(),g=c.createGain(),start=c.currentTime+delay;
    o.type=type;o.frequency.setValueAtTime(frequency,start);g.gain.setValueAtTime(gain,start);g.gain.exponentialRampToValueAtTime(.001,start+duration);o.connect(g).connect(c.destination);o.start(start);o.stop(start+duration);
  }
  static cast(){this.tone(260,.18,'sine',.035);this.tone(390,.14,'sine',.025,.08)}
  static splash(){this.tone(150,.13,'triangle',.05);this.tone(90,.2,'sine',.03,.04)}
  static bite(){this.tone(660,.08,'square',.04);this.tone(880,.12,'square',.035,.09)}
  static perfect(){[660,880,1100].forEach((f,i)=>this.tone(f,.18,'sine',.04,i*.07))}
  static catch(){[392,523,659].forEach((f,i)=>this.tone(f,.28,'triangle',.045,i*.09))}
  static fail(){this.tone(210,.25,'sawtooth',.025);this.tone(140,.3,'sine',.03,.12)}
}
