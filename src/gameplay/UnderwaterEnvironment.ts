import type { FishingLocationId } from './FishingLocation';

export interface EnvironmentObstacle { kind:'kelp'|'rock';x:number;y:number;width:number;height:number }

const ROCKY_OBSTACLES:EnvironmentObstacle[]=[
  {kind:'kelp',x:118,y:305,width:76,height:150},
  {kind:'kelp',x:520,y:365,width:72,height:112},
  {kind:'rock',x:748,y:408,width:118,height:72}
];

export function obstaclesForLocation(id:FishingLocationId){return id==='rocky-cove'?ROCKY_OBSTACLES:[]}

export function pointHitsObstacle(id:FishingLocationId,x:number,y:number){
  return obstaclesForLocation(id).some(obstacle=>Math.abs(x-obstacle.x)<=obstacle.width/2&&Math.abs(y-obstacle.y)<=obstacle.height/2);
}

export function currentVector(id:FishingLocationId,x:number,y:number,timeMs:number){
  if(id!=='rocky-cove')return {x:0,y:0};
  const lane=Math.sin(y*.025+timeMs*.0014),gust=Math.sin(timeMs*.003+x*.012);
  return {x:22+lane*7+gust*4,y:Math.sin(timeMs*.0018+x*.009)*5};
}
