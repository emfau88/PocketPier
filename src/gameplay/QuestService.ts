import { SaveService, type ActiveQuest, type SaveData } from '../core/SaveService';
import { FISH } from './Fish';
import type { TripState } from './TripState';

export interface QuestDefinition { id:string; title:string; description:string; target:number; coins:number; xp:number; icon:string; sticker?:boolean }

const QUESTS:QuestDefinition[]=[
  {id:'two-fish',title:'Full Net',description:'Catch 2 fish.',target:2,coins:40,xp:12,icon:'FISH'},
  {id:'sardines',title:'Silver Service',description:'Catch 2 Silver Sardines.',target:2,coins:55,xp:15,icon:'SILVER'},
  {id:'new-fish',title:'New Neighbor',description:'Discover 1 new fish.',target:1,coins:65,xp:18,icon:'NEW',sticker:true},
  {id:'treasure',title:'Washed Ashore',description:'Find 1 treasure.',target:1,coins:70,xp:20,icon:'SECRET'},
  {id:'double-dive',title:'Double Dip',description:'Catch 2 fish in one dive.',target:1,coins:60,xp:16,icon:'2X'},
  {id:'record',title:'Harbor Record',description:'Set 1 weight record.',target:1,coins:75,xp:22,icon:'STAR',sticker:true}
];

export interface QuestReward { title:string; coins:number; xp:number; sticker:boolean }
export interface Achievement { id:string; title:string; description:string; coins:number; xp:number }

export const ACHIEVEMENTS:Achievement[]=[
  {id:'first-catch',title:'First Cast',description:'Bring home your first fish.',coins:30,xp:10},
  {id:'secret-finder',title:'Secret Finder',description:'Discover your first treasure.',coins:40,xp:12},
  {id:'ten-fish',title:'Pier Regular',description:'Catch 10 fish in total.',coins:60,xp:18},
  {id:'sunny-complete',title:'Sunny Scholar',description:'Discover every Sunny Pier fish.',coins:100,xp:30}
];

export function questById(id:string){return QUESTS.find(quest=>quest.id===id)}

function freshQuest(index:number):ActiveQuest{
  const definition=QUESTS[index%QUESTS.length];return {id:definition.id,progress:0};
}

export class QuestService {
  static ensureActive(save:SaveData){
    if(save.activeQuests.length===3)return;
    save.activeQuests=[0,1,2].map(index=>freshQuest(save.questCycle+index));save.questCycle+=3;
  }

  static applyTrip(save:SaveData,trip:TripState):QuestDefinition[]{
    this.ensureActive(save);const completed:QuestDefinition[]=[];
    save.activeQuests=save.activeQuests.map(active=>{
      const definition=questById(active.id);if(!definition)return freshQuest(save.questCycle++);
      if(active.progress>=definition.target)return active;
      const progress=Math.min(definition.target,active.progress+this.tripProgress(definition.id,trip));
      if(progress>=definition.target)completed.push(definition);
      return {...active,progress};
    });
    return completed;
  }

  static claimQuest(save:SaveData,id:string):QuestReward|undefined{
    const index=save.activeQuests.findIndex(active=>active.id===id);if(index<0)return;
    const active=save.activeQuests[index],definition=questById(active.id);if(!definition||active.progress<definition.target)return;
    save.coins+=definition.coins;const levelBonus=SaveService.awardXp(save,definition.xp).reduce((sum,reward)=>sum+reward.coins,0);save.completedQuestIds.push(definition.id);
    const sticker=!!definition.sticker&&save.harborStickerCount<3;if(sticker)save.harborStickerCount++;
    save.activeQuests[index]=freshQuest(save.questCycle++);
    return {title:definition.title,coins:definition.coins+levelBonus,xp:definition.xp,sticker};
  }

  static discoverAchievements(save:SaveData):Achievement[]{
    const totalFish=Object.values(save.fishStats).reduce((total,stat)=>total+stat.count,0);
    const known=new Set([...save.achievementIds,...save.pendingAchievementIds]),conditions:Record<string,boolean>={
      'first-catch':totalFish>=1,'secret-finder':save.discoveredTreasures.length>=1,
      'ten-fish':totalFish>=10,'sunny-complete':Object.keys(save.fishStats).length>=FISH.length
    };
    const fresh=ACHIEVEMENTS.filter(achievement=>conditions[achievement.id]&&!known.has(achievement.id));
    save.pendingAchievementIds.push(...fresh.map(achievement=>achievement.id));return fresh;
  }

  static claimAchievement(save:SaveData,id:string):Achievement|undefined{
    if(!save.pendingAchievementIds.includes(id))return;
    const achievement=ACHIEVEMENTS.find(candidate=>candidate.id===id);if(!achievement)return;
    save.pendingAchievementIds=save.pendingAchievementIds.filter(candidate=>candidate!==id);
    if(!save.achievementIds.includes(id))save.achievementIds.push(id);
    save.coins+=achievement.coins;const levelBonus=SaveService.awardXp(save,achievement.xp).reduce((sum,reward)=>sum+reward.coins,0);return {...achievement,coins:achievement.coins+levelBonus};
  }

  private static tripProgress(id:string,trip:TripState){
    if(id==='two-fish')return trip.catches.length;
    if(id==='sardines')return trip.catches.filter(catchRecord=>catchRecord.fish.id==='sardine').length;
    if(id==='new-fish')return trip.catches.filter(catchRecord=>catchRecord.isNew).length;
    if(id==='treasure')return trip.treasures.length;
    if(id==='double-dive')return trip.diveCatchCounts.some(count=>count>=2)?1:0;
    if(id==='record')return trip.catches.filter(catchRecord=>catchRecord.isRecord).length;
    return 0;
  }
}
