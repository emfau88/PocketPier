import type { Fish } from './Fish';

export type FishBehavior='school'|'skittish'|'dart'|'flee'|'eel';

export function fishBehavior(fish:Fish):FishBehavior{
  if(fish.id.includes('eel'))return 'eel';
  if(fish.difficulty>=4)return 'flee';
  if(fish.difficulty>=3)return 'dart';
  if(fish.difficulty>=2)return 'skittish';
  return 'school';
}

export function captureSeconds(fish:Fish,slots:number){return .55+fish.difficulty*.13+(slots>=2?.25:0)}
export function captureDecayPerSecond(fish:Fish){return .45+fish.difficulty*.18}

export function movementScale(fish:Fish,timeMs:number,phase:number,distanceToHook:number){
  const behavior=fishBehavior(fish),pulse=Math.max(0,Math.sin(timeMs/650+phase))**6;
  if(behavior==='flee')return (distanceToHook<120?1.7:1.08)+pulse*.65;
  if(behavior==='dart')return 1+pulse*.9;
  if(behavior==='skittish')return distanceToHook<105?1.4:1;
  if(behavior==='eel')return 1.22+pulse*.25;
  return 1+Math.sin(timeMs/1000)*.06;
}

export function verticalOffset(fish:Fish,timeMs:number,phase:number){
  if(fishBehavior(fish)==='eel')return Math.sin(timeMs/250+phase)*25+Math.sin(timeMs/570+phase*.5)*8;
  const amplitude=11+fish.difficulty*2,period=Math.max(900,1900-fish.difficulty*150),movementPhase=fishBehavior(fish)==='school'?0:phase;
  return Math.sin(timeMs/period*Math.PI*2+movementPhase)*amplitude;
}
