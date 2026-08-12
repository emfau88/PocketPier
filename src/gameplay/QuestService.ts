import { SaveService, type ActiveQuest, type SaveData } from '../core/SaveService';
import { FISH } from './Fish';
import { FISHING_LOCATIONS, type FishingLocationId } from './FishingLocation';
import type { TripState } from './TripState';

export interface QuestDefinition { id:string;title:string;description:string;target:number;coins:number;xp:number;icon:string;sticker?:boolean;unlocksWith?:FishingLocationId }

export const QUESTS:QuestDefinition[]=[
  {id:'two-fish',title:'Full Net',description:'Catch 2 fish in one trip.',target:2,coins:40,xp:12,icon:'FISH'},
  {id:'sardines',title:'Silver Service',description:'Catch 2 Silver Sardines.',target:2,coins:55,xp:15,icon:'SILVER'},
  {id:'new-fish',title:'New Neighbor',description:'Discover a new fish species.',target:1,coins:65,xp:18,icon:'NEW',sticker:true},
  {id:'treasure',title:'Washed Ashore',description:'Find a treasure.',target:1,coins:70,xp:20,icon:'SECRET'},
  {id:'double-dive',title:'Double Dip',description:'Catch 2 fish in one dive.',target:1,coins:60,xp:16,icon:'2X'},
  {id:'record',title:'Harbor Record',description:'Set a new weight record.',target:1,coins:75,xp:22,icon:'STAR',sticker:true},
  {id:'sunny-haul',title:'Sunny Sampler',description:'Catch 3 fish at Sunny Pier.',target:3,coins:55,xp:15,icon:'SUN'},
  {id:'rare-catch',title:'Fancy Company',description:'Catch a rare fish.',target:1,coins:85,xp:24,icon:'RARE'},
  {id:'heavy-catch',title:'Heavy Lifting',description:'Catch a fish weighing 1.5 kg.',target:1,coins:65,xp:18,icon:'KG'},
  {id:'three-dives',title:'Clean Sweep',description:'Catch fish in all 3 dives.',target:3,coins:80,xp:22,icon:'3/3'},
  {id:'rocky-haul',title:'Cove Courier',description:'Catch 3 fish at Rocky Cove.',target:3,coins:75,xp:20,icon:'COVE',unlocksWith:'rocky-cove'},
  {id:'rocky-treasure',title:'Brass Business',description:'Find treasure at Rocky Cove.',target:1,coins:90,xp:25,icon:'BRASS',unlocksWith:'rocky-cove'},
  {id:'moonlit-haul',title:'Night Shift',description:'Catch 3 fish in Moonlit Trench.',target:3,coins:95,xp:26,icon:'MOON',unlocksWith:'moonlit-trench'},
  {id:'moonlit-rare',title:'Royal Audience',description:'Catch a rare trench fish.',target:1,coins:125,xp:34,icon:'CROWN',sticker:true,unlocksWith:'moonlit-trench'},
  {id:'two-treasures',title:'Pocket Archaeology',description:'Find 2 treasures in one trip.',target:2,coins:115,xp:30,icon:'2X',unlocksWith:'rocky-cove'}
];

export interface QuestReward { title:string;coins:number;xp:number;sticker:boolean }
export interface Achievement { id:string;title:string;description:string;coins:number;xp:number;target:number;secret?:boolean }
export interface AchievementProgress { current:number;target:number;complete:boolean }

export const ACHIEVEMENTS:Achievement[]=[
  {id:'first-catch',title:'First Catch',description:'Bring home your first fish.',coins:30,xp:10,target:1},
  {id:'secret-finder',title:'Secret Finder',description:'Discover your first treasure.',coins:40,xp:12,target:1},
  {id:'ten-fish',title:'Pier Regular',description:'Catch 10 fish in total.',coins:60,xp:18,target:10},
  {id:'fifty-fish',title:'Harbor Fixture',description:'Catch 50 fish in total.',coins:180,xp:45,target:50},
  {id:'sunny-complete',title:'Sunny Scholar',description:'Discover all Sunny Pier fish.',coins:100,xp:30,target:FISH.length},
  {id:'sunny-master',title:'Shallow Water Pro',description:'Complete Sunny Pier mastery.',coins:120,xp:34,target:1},
  {id:'boat-ready',title:'Probably Seaworthy',description:'Finish all boat repairs.',coins:130,xp:36,target:1},
  {id:'cove-catch',title:'Rock Hopper',description:'Catch your first Rocky Cove fish.',coins:70,xp:22,target:1},
  {id:'cove-complete',title:'Cove Curator',description:'Discover all Rocky Cove fish.',coins:130,xp:38,target:FISHING_LOCATIONS[1].fish.length},
  {id:'moonlit-catch',title:'Night Fisher',description:'Catch your first Moonlit Trench fish.',coins:90,xp:28,target:1},
  {id:'trench-complete',title:'Deep Sea Scholar',description:'Discover all Moonlit Trench fish.',coins:160,xp:44,target:FISHING_LOCATIONS[2].fish.length},
  {id:'treasure-five',title:'Pocket Museum',description:'Discover 5 different treasures.',coins:140,xp:40,target:5},
  {id:'master-angler',title:'Pocket Pier Legend',description:'Master all fishing areas.',coins:300,xp:80,target:FISHING_LOCATIONS.length}
];

export function questById(id:string){return QUESTS.find(quest=>quest.id===id)}

export class QuestService {
  static ensureActive(save:SaveData){
    const eligible=this.eligibleQuests(save);save.activeQuests=save.activeQuests.filter(active=>eligible.some(quest=>quest.id===active.id)).slice(0,3);
    let attempts=0;
    while(save.activeQuests.length<3&&attempts<eligible.length*2){
      const definition=eligible[save.questCycle%eligible.length];save.questCycle++;attempts++;
      if(!save.activeQuests.some(active=>active.id===definition.id))save.activeQuests.push({id:definition.id,progress:0});
    }
  }

  static applyTrip(save:SaveData,trip:TripState):QuestDefinition[]{
    this.ensureActive(save);const completed:QuestDefinition[]=[];
    save.activeQuests=save.activeQuests.flatMap(active=>{
      const definition=questById(active.id);if(!definition)return [];
      if(active.progress>=definition.target)return [active];
      const progress=Math.min(definition.target,active.progress+this.tripProgress(definition.id,trip));
      if(progress>=definition.target)completed.push(definition);return [{...active,progress}];
    });
    this.ensureActive(save);return completed;
  }

  static claimQuest(save:SaveData,id:string):QuestReward|undefined{
    const index=save.activeQuests.findIndex(active=>active.id===id);if(index<0)return;
    const active=save.activeQuests[index],definition=questById(active.id);if(!definition||active.progress<definition.target)return;
    save.coins+=definition.coins;const levelBonus=SaveService.awardXp(save,definition.xp).reduce((sum,reward)=>sum+reward.coins,0);save.completedQuestIds.push(definition.id);
    const sticker=!!definition.sticker&&save.harborStickerCount<3;if(sticker)save.harborStickerCount++;
    save.activeQuests.splice(index,1);this.ensureActive(save);return {title:definition.title,coins:definition.coins+levelBonus,xp:definition.xp,sticker};
  }

  static achievementProgress(save:SaveData,id:string):AchievementProgress{
    const achievement=ACHIEVEMENTS.find(candidate=>candidate.id===id),totalFish=Object.values(save.fishStats).reduce((total,stat)=>total+stat.count,0),known=(fishIds:string[])=>fishIds.filter(fishId=>save.fishStats[fishId]).length;
    const rockyIds=FISHING_LOCATIONS[1].fish.map(fish=>fish.id),moonlitIds=FISHING_LOCATIONS[2].fish.map(fish=>fish.id);
    const values:Record<string,number>={
      'first-catch':totalFish,'secret-finder':save.discoveredTreasures.length,'ten-fish':totalFish,'fifty-fish':totalFish,
      'sunny-complete':known(FISH.map(fish=>fish.id)),'sunny-master':Number(save.completedLocationIds.includes('sunny-pier')),
      'boat-ready':Number(save.boat.unlocked),'cove-catch':Number(known(rockyIds)>0),'cove-complete':known(rockyIds),
      'moonlit-catch':Number(known(moonlitIds)>0),'trench-complete':known(moonlitIds),'treasure-five':save.discoveredTreasures.length,
      'master-angler':save.completedLocationIds.length
    };
    const target=achievement?.target??1,current=Math.min(target,values[id]??0);return {current,target,complete:current>=target};
  }

  static discoverAchievements(save:SaveData):Achievement[]{
    const known=new Set([...save.achievementIds,...save.pendingAchievementIds]),fresh=ACHIEVEMENTS.filter(achievement=>this.achievementProgress(save,achievement.id).complete&&!known.has(achievement.id));
    save.pendingAchievementIds.push(...fresh.map(achievement=>achievement.id));return fresh;
  }

  static claimAchievement(save:SaveData,id:string):Achievement|undefined{
    if(!save.pendingAchievementIds.includes(id))return;const achievement=ACHIEVEMENTS.find(candidate=>candidate.id===id);if(!achievement)return;
    save.pendingAchievementIds=save.pendingAchievementIds.filter(candidate=>candidate!==id);if(!save.achievementIds.includes(id))save.achievementIds.push(id);
    save.coins+=achievement.coins;const levelBonus=SaveService.awardXp(save,achievement.xp).reduce((sum,reward)=>sum+reward.coins,0);return {...achievement,coins:achievement.coins+levelBonus};
  }

  private static eligibleQuests(save:SaveData){return QUESTS.filter(quest=>!quest.unlocksWith||save.unlockedLocationIds.includes(quest.unlocksWith))}
  private static tripProgress(id:string,trip:TripState){
    if(id==='two-fish')return trip.catches.length;
    if(id==='sardines')return trip.catches.filter(catchRecord=>catchRecord.fish.id==='sardine').length;
    if(id==='new-fish')return trip.catches.filter(catchRecord=>catchRecord.isNew).length;
    if(id==='treasure')return trip.treasures.length;
    if(id==='double-dive')return trip.diveCatchCounts.some(count=>count>=2)?1:0;
    if(id==='record')return trip.catches.filter(catchRecord=>catchRecord.isRecord).length;
    if(id==='sunny-haul')return trip.locationId==='sunny-pier'?trip.catches.length:0;
    if(id==='rare-catch')return trip.catches.filter(catchRecord=>catchRecord.fish.rarity==='Rare').length;
    if(id==='heavy-catch')return trip.catches.filter(catchRecord=>catchRecord.weight>=1.5).length;
    if(id==='three-dives')return trip.diveCatchCounts.filter(count=>count>0).length;
    if(id==='rocky-haul')return trip.locationId==='rocky-cove'?trip.catches.length:0;
    if(id==='rocky-treasure')return trip.locationId==='rocky-cove'?trip.treasures.length:0;
    if(id==='moonlit-haul')return trip.locationId==='moonlit-trench'?trip.catches.length:0;
    if(id==='moonlit-rare')return trip.locationId==='moonlit-trench'?trip.catches.filter(catchRecord=>catchRecord.fish.rarity==='Rare').length:0;
    if(id==='two-treasures')return trip.treasures.length;return 0;
  }
}
