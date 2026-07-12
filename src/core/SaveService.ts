export interface FishStat { count:number; bestWeight:number }
export interface EquipmentLevels { line:number; reel:number; basket:number; bait:number }
export interface BoatProgress { investedCoins:number; unlocked:boolean }
export interface SaveData {
  version:2;
  coins:number;
  xp:number;
  tutorialComplete:boolean;
  muted:boolean;
  fishStats:Record<string,FishStat>;
  discoveredTreasures:string[];
  equipment:EquipmentLevels;
  completedQuestIds:string[];
  achievementIds:string[];
  coolerStickerTier:number;
  boat:BoatProgress;
}

export const LEVEL_THRESHOLDS=[0,100,250,450,700] as const;
export interface LevelProgress { level:number; current:number; needed:number; maxed:boolean }

const fresh=():SaveData=>({
  version:2,coins:0,xp:0,tutorialComplete:false,muted:false,fishStats:{},discoveredTreasures:[],
  equipment:{line:0,reel:0,basket:0,bait:0},completedQuestIds:[],achievementIds:[],coolerStickerTier:0,
  boat:{investedCoins:0,unlocked:false}
});

function finite(value:unknown,fallback=0){return typeof value==='number'&&Number.isFinite(value)?value:fallback}

export class SaveService {
  static readonly key='pocket-pier-save';

  static load(storage:Pick<Storage,'getItem'>=localStorage):SaveData{
    try{
      const value=JSON.parse(storage.getItem(this.key)??'null');
      if(value?.version===1)return {...fresh(),coins:finite(value.coins),xp:finite(value.xp),tutorialComplete:!!value.tutorialComplete,muted:!!value.muted};
      if(value?.version!==2)return fresh();
      const base=fresh();
      return {
        ...base,...value,version:2,coins:Math.max(0,finite(value.coins)),xp:Math.max(0,finite(value.xp)),
        fishStats:value.fishStats&&typeof value.fishStats==='object'?value.fishStats:{},
        discoveredTreasures:Array.isArray(value.discoveredTreasures)?[...new Set(value.discoveredTreasures.filter((x:unknown)=>typeof x==='string'))]:[],
        equipment:{...base.equipment,...value.equipment},
        completedQuestIds:Array.isArray(value.completedQuestIds)?value.completedQuestIds:[],
        achievementIds:Array.isArray(value.achievementIds)?value.achievementIds:[],
        boat:{...base.boat,...value.boat}
      };
    }catch{return fresh()}
  }

  static save(data:SaveData,storage:Pick<Storage,'setItem'>=localStorage){storage.setItem(this.key,JSON.stringify(data))}

  static levelProgress(xp:number):LevelProgress{
    const safe=Math.max(0,finite(xp));let index=0;
    while(index<LEVEL_THRESHOLDS.length-1&&safe>=LEVEL_THRESHOLDS[index+1])index++;
    const maxed=index===LEVEL_THRESHOLDS.length-1;
    return {level:index+1,current:maxed?safe-LEVEL_THRESHOLDS[index]:safe-LEVEL_THRESHOLDS[index],needed:maxed?0:LEVEL_THRESHOLDS[index+1]-LEVEL_THRESHOLDS[index],maxed};
  }

  static recordCatch(data:SaveData,fishId:string,weight:number){
    const previous=data.fishStats[fishId];
    data.fishStats[fishId]={count:(previous?.count??0)+1,bestWeight:Math.max(previous?.bestWeight??0,weight)};
    this.refreshStickerTier(data);
  }

  static discoverTreasure(data:SaveData,treasureId:string){
    if(!data.discoveredTreasures.includes(treasureId))data.discoveredTreasures.push(treasureId);
    this.refreshStickerTier(data);
  }

  static refreshStickerTier(data:SaveData){
    const discoveries=Object.keys(data.fishStats).length+data.discoveredTreasures.length;
    data.coolerStickerTier=discoveries>=8?3:discoveries>=5?2:discoveries>=2?1:0;
  }
}
