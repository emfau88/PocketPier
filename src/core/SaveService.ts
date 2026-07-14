import { nextLocation, type FishingLocationId } from '../gameplay/FishingLocation';

export interface FishStat { count:number; bestWeight:number }
export interface EquipmentLevels { line:number; reel:number; basket:number; bait:number }
export interface ActiveQuest { id:string; progress:number }
export type EquipmentId=keyof EquipmentLevels;
export const EQUIPMENT_COSTS=[150,250,400] as const;
export const BOAT_REPAIR_COSTS=[200,350,450] as const;
export interface BoatProgress { investedCoins:number; unlocked:boolean }
export interface SaveData {
  version:5;
  coins:number;
  xp:number;
  tutorialComplete:boolean;
  muted:boolean;
  fishStats:Record<string,FishStat>;
  discoveredTreasures:string[];
  equipment:EquipmentLevels;
  activeQuests:ActiveQuest[];
  questCycle:number;
  completedQuestIds:string[];
  achievementIds:string[];
  pendingAchievementIds:string[];
  coolerStickerTier:number;
  harborStickerCount:number;
  boat:BoatProgress;
  unlockedLocationIds:FishingLocationId[];
  completedLocationIds:FishingLocationId[];
  lastLocationId:FishingLocationId;
}

export const LEVEL_THRESHOLDS=[0,100,250,450,700] as const;
export interface LevelProgress { level:number; current:number; needed:number; maxed:boolean }

const fresh=():SaveData=>({
  version:5,coins:0,xp:0,tutorialComplete:false,muted:false,fishStats:{},discoveredTreasures:[],
  equipment:{line:0,reel:0,basket:0,bait:0},activeQuests:[],questCycle:0,completedQuestIds:[],achievementIds:[],pendingAchievementIds:[],coolerStickerTier:0,harborStickerCount:0,
  boat:{investedCoins:0,unlocked:false},unlockedLocationIds:['sunny-pier'],completedLocationIds:[],lastLocationId:'sunny-pier'
});

function finite(value:unknown,fallback=0){return typeof value==='number'&&Number.isFinite(value)?value:fallback}
function equipmentLevel(value:unknown){return Math.min(EQUIPMENT_COSTS.length,Math.max(0,Math.floor(finite(value))))}

export class SaveService {
  static readonly key='pocket-pier-save';

  static load(storage:Pick<Storage,'getItem'>=localStorage):SaveData{
    try{
      const value=JSON.parse(storage.getItem(this.key)??'null');
      if(value?.version===1)return {...fresh(),coins:finite(value.coins),xp:finite(value.xp),tutorialComplete:!!value.tutorialComplete,muted:!!value.muted};
      if(value?.version!==2&&value?.version!==3&&value?.version!==4&&value?.version!==5)return fresh();
      const base=fresh();
      const unlockedLocationIds=this.locationIds(value.unlockedLocationIds,true);
      const lastLocationId=this.locationId(value.lastLocationId);
      return {
        ...base,...value,version:5,coins:Math.max(0,finite(value.coins)),xp:Math.max(0,finite(value.xp)),
        fishStats:value.fishStats&&typeof value.fishStats==='object'?value.fishStats:{},
        discoveredTreasures:Array.isArray(value.discoveredTreasures)?[...new Set(value.discoveredTreasures.filter((x:unknown)=>typeof x==='string'))]:[],
        equipment:{
          line:equipmentLevel(value.equipment?.line),reel:equipmentLevel(value.equipment?.reel),
          basket:equipmentLevel(value.equipment?.basket),bait:equipmentLevel(value.equipment?.bait)
        },
        activeQuests:Array.isArray(value.activeQuests)?value.activeQuests.filter((quest:unknown)=>typeof quest==='object'&&quest!==null&&typeof (quest as ActiveQuest).id==='string').slice(0,3).map((quest:ActiveQuest)=>({id:quest.id,progress:Math.max(0,Math.floor(finite(quest.progress)))})):[],
        questCycle:Math.max(0,Math.floor(finite(value.questCycle))),
        completedQuestIds:Array.isArray(value.completedQuestIds)?value.completedQuestIds:[],
        achievementIds:Array.isArray(value.achievementIds)?value.achievementIds:[],
        pendingAchievementIds:Array.isArray(value.pendingAchievementIds)?value.pendingAchievementIds:[],
        harborStickerCount:Math.min(3,Math.max(0,Math.floor(finite(value.harborStickerCount)))),
        boat:{...base.boat,...value.boat},
        unlockedLocationIds,
        completedLocationIds:this.locationIds(value.completedLocationIds,false),
        lastLocationId:unlockedLocationIds.includes(lastLocationId)?lastLocationId:'sunny-pier'
      };
    }catch{return fresh()}
  }

  static save(data:SaveData,storage:Pick<Storage,'setItem'>=localStorage){storage.setItem(this.key,JSON.stringify(data))}

  private static locationIds(value:unknown,includeSunny:boolean){
    const allowed:FishingLocationId[]=['sunny-pier','rocky-cove','moonlit-trench'];
    const result=Array.isArray(value)?value.filter((id:unknown):id is FishingLocationId=>allowed.includes(id as FishingLocationId)):[];
    if(includeSunny&&!result.includes('sunny-pier'))result.unshift('sunny-pier');
    return [...new Set(result)];
  }

  private static locationId(value:unknown):FishingLocationId{
    return value==='rocky-cove'||value==='moonlit-trench'?value:'sunny-pier';
  }

  static isLocationUnlocked(data:SaveData,id:FishingLocationId){return data.unlockedLocationIds.includes(id)}

  static completeLocation(data:SaveData,id:FishingLocationId){
    if(!data.completedLocationIds.includes(id))data.completedLocationIds.push(id);
    const next=nextLocation(id);
    if(!next||data.unlockedLocationIds.includes(next.id))return undefined;
    data.unlockedLocationIds.push(next.id);return next.id;
  }

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

  static nextEquipmentCost(data:SaveData,id:EquipmentId){return EQUIPMENT_COSTS[data.equipment[id]]}

  static purchaseEquipment(data:SaveData,id:EquipmentId){
    const cost=this.nextEquipmentCost(data,id);
    if(cost===undefined||data.coins<cost)return false;
    data.coins-=cost;data.equipment[id]++;return true;
  }

  static boatStage(data:SaveData){
    let total=0,stage=0;for(const cost of BOAT_REPAIR_COSTS){total+=cost;if(data.boat.investedCoins>=total)stage++;}
    return stage;
  }

  static nextBoatRepairCost(data:SaveData){return BOAT_REPAIR_COSTS[this.boatStage(data)]}

  static repairBoat(data:SaveData){
    const cost=this.nextBoatRepairCost(data);if(cost===undefined||data.coins<cost)return false;
    data.coins-=cost;data.boat.investedCoins+=cost;data.boat.unlocked=this.boatStage(data)>=BOAT_REPAIR_COSTS.length;return true;
  }
}
