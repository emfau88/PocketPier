import { FISHING_LOCATIONS, locationById, type FishingLocationId } from '../gameplay/FishingLocation';

export interface FishStat { count:number; bestWeight:number }
export interface EquipmentLevels { line:number; reel:number; basket:number; bait:number }
export interface ActiveQuest { id:string; progress:number }
export interface LocationProgress { trips:number;catches:number;treasures:number }
export type EquipmentId=keyof EquipmentLevels;
export const EQUIPMENT_COSTS=[100,180,300] as const;
export const BOAT_REPAIR_COSTS=[120,200,280] as const;
export const BOAT_REPAIR_TOTAL=BOAT_REPAIR_COSTS.reduce((sum,cost)=>sum+cost,0);
export interface BoatProgress { investedCoins:number; unlocked:boolean }
export interface SaveData {
  version:7;
  coins:number;
  xp:number;
  tutorialComplete:boolean;
  underwaterControlsSeen:boolean;
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
  locationProgress:Record<FishingLocationId,LocationProgress>;
  claimedLevelRewards:number[];
}

export const LEVEL_THRESHOLDS=[0,100,250,450,700,1000,1350,1750,2200,2700,3250,3850,4500,5200,6000] as const;
export const LEVEL_REWARDS=[
  {level:2,coins:40},{level:3,coins:60},{level:4,coins:75},{level:5,coins:90},{level:6,coins:110},{level:7,coins:130},{level:8,coins:150},
  {level:9,coins:175},{level:10,coins:200},{level:11,coins:225},{level:12,coins:250},{level:13,coins:275},{level:14,coins:300},{level:15,coins:350}
] as const;
export interface LevelReward { level:number;coins:number }
export interface LevelProgress { level:number; current:number; needed:number; maxed:boolean }

const freshLocationProgress=():Record<FishingLocationId,LocationProgress>=>({
  'sunny-pier':{trips:0,catches:0,treasures:0},'rocky-cove':{trips:0,catches:0,treasures:0},'moonlit-trench':{trips:0,catches:0,treasures:0}
});

const fresh=():SaveData=>({
  version:7,coins:0,xp:0,tutorialComplete:false,underwaterControlsSeen:false,muted:false,fishStats:{},discoveredTreasures:[],
  equipment:{line:0,reel:0,basket:0,bait:0},activeQuests:[],questCycle:0,completedQuestIds:[],achievementIds:[],pendingAchievementIds:[],coolerStickerTier:0,harborStickerCount:0,
  boat:{investedCoins:0,unlocked:false},unlockedLocationIds:['sunny-pier'],completedLocationIds:[],lastLocationId:'sunny-pier',locationProgress:freshLocationProgress(),claimedLevelRewards:[1]
});

function finite(value:unknown,fallback=0){return typeof value==='number'&&Number.isFinite(value)?value:fallback}
function equipmentLevel(value:unknown){return Math.min(EQUIPMENT_COSTS.length,Math.max(0,Math.floor(finite(value))))}

export class SaveService {
  static readonly key='pocket-pier-save';

  static load(storage:Pick<Storage,'getItem'>=localStorage):SaveData{
    try{
      const value=JSON.parse(storage.getItem(this.key)??'null');
      if(value?.version===1){const xp=Math.max(0,finite(value.xp)),currentLevel=this.levelProgress(xp).level;return {...fresh(),coins:finite(value.coins),xp,tutorialComplete:!!value.tutorialComplete,muted:!!value.muted,claimedLevelRewards:Array.from({length:currentLevel},(_,index)=>index+1)};}
      if(value?.version!==2&&value?.version!==3&&value?.version!==4&&value?.version!==5&&value?.version!==6&&value?.version!==7)return fresh();
      const base=fresh();
      const unlockedLocationIds=this.locationIds(value.unlockedLocationIds,true);
      const lastLocationId=this.locationId(value.lastLocationId);
      const xp=Math.max(0,finite(value.xp)),currentLevel=this.levelProgress(xp).level;
      const claimedLevelRewards=value.version>=6&&Array.isArray(value.claimedLevelRewards)
        ?[...new Set([1,...value.claimedLevelRewards.filter((level:unknown)=>Number.isInteger(level)&&finite(level)>=2&&finite(level)<=LEVEL_THRESHOLDS.length)])]
        :Array.from({length:currentLevel},(_,index)=>index+1);
      return {
        ...base,...value,version:7,coins:Math.max(0,finite(value.coins)),xp,underwaterControlsSeen:!!value.underwaterControlsSeen,
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
        boat:{investedCoins:Math.min(BOAT_REPAIR_TOTAL,Math.max(0,finite(value.boat?.investedCoins))),unlocked:!!value.boat?.unlocked},
        unlockedLocationIds,
        completedLocationIds:this.locationIds(value.completedLocationIds,false),
        lastLocationId:unlockedLocationIds.includes(lastLocationId)?lastLocationId:'sunny-pier',
        locationProgress:this.sanitizeLocationProgress(value.locationProgress),claimedLevelRewards
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

  private static sanitizeLocationProgress(value:unknown){
    const result=freshLocationProgress(),source=value&&typeof value==='object'?value as Partial<Record<FishingLocationId,Partial<LocationProgress>>>:{};
    for(const location of FISHING_LOCATIONS){const progress=source[location.id];result[location.id]={trips:Math.max(0,Math.floor(finite(progress?.trips))),catches:Math.max(0,Math.floor(finite(progress?.catches))),treasures:Math.max(0,Math.floor(finite(progress?.treasures)))};}
    return result;
  }

  static isLocationUnlocked(data:SaveData,id:FishingLocationId){return data.unlockedLocationIds.includes(id)}

  static masteryStatus(data:SaveData,id:FishingLocationId){
    const location=locationById(id),stored=data.locationProgress[id],fishIds=new Set(location.fish.map(fish=>fish.id)),treasureIds=new Set(location.treasures.map(treasure=>treasure.id));
    const progress={trips:stored.trips,catches:stored.catches,uniqueFish:Object.keys(data.fishStats).filter(fishId=>fishIds.has(fishId)).length,treasures:data.discoveredTreasures.filter(treasureId=>treasureIds.has(treasureId)).length};
    const requirement=location.mastery,complete=progress.trips>=requirement.trips&&progress.catches>=requirement.catches&&progress.uniqueFish>=requirement.uniqueFish&&progress.treasures>=requirement.treasures;
    return {progress,requirement,complete};
  }

  static recordTripProgress(data:SaveData,id:FishingLocationId,catches:number,treasures:number){
    const progress=data.locationProgress[id];progress.trips++;progress.catches+=Math.max(0,Math.floor(catches));progress.treasures+=Math.max(0,Math.floor(treasures));
    return this.refreshLocationUnlocks(data);
  }

  static refreshLocationUnlocks(data:SaveData){
    const unlocked:FishingLocationId[]=[];
    for(let index=0;index<FISHING_LOCATIONS.length;index++){
      const location=FISHING_LOCATIONS[index];
      if(!this.masteryStatus(data,location.id).complete)continue;
      if(!data.completedLocationIds.includes(location.id))data.completedLocationIds.push(location.id);
      const next=FISHING_LOCATIONS[index+1];if(!next||data.unlockedLocationIds.includes(next.id))continue;
      if(next.id==='rocky-cove'&&!data.boat.unlocked)continue;
      data.unlockedLocationIds.push(next.id);unlocked.push(next.id);
    }
    return unlocked;
  }

  static levelProgress(xp:number):LevelProgress{
    const safe=Math.max(0,finite(xp));let index=0;
    while(index<LEVEL_THRESHOLDS.length-1&&safe>=LEVEL_THRESHOLDS[index+1])index++;
    const maxed=index===LEVEL_THRESHOLDS.length-1;
    return {level:index+1,current:maxed?safe-LEVEL_THRESHOLDS[index]:safe-LEVEL_THRESHOLDS[index],needed:maxed?0:LEVEL_THRESHOLDS[index+1]-LEVEL_THRESHOLDS[index],maxed};
  }

  static awardXp(data:SaveData,xp:number){
    data.xp+=Math.max(0,finite(xp));const level=this.levelProgress(data.xp).level,rewards:LevelReward[]=[];
    for(const reward of LEVEL_REWARDS){if(reward.level>level||data.claimedLevelRewards.includes(reward.level))continue;data.claimedLevelRewards.push(reward.level);data.coins+=reward.coins;rewards.push({...reward});}
    return rewards;
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
    data.coins-=cost;data.boat.investedCoins+=cost;data.boat.unlocked=this.boatStage(data)>=BOAT_REPAIR_COSTS.length;this.refreshLocationUnlocks(data);return true;
  }
}
