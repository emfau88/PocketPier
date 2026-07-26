import { describe,it,expect } from 'vitest';
import { FISH, fishFlipXForDirection, pickFish } from '../src/gameplay/Fish';
import { TripState } from '../src/gameplay/TripState';
import { BOAT_REPAIR_COSTS, EQUIPMENT_COSTS, LEVEL_THRESHOLDS, SaveService } from '../src/core/SaveService';
import { QuestService } from '../src/gameplay/QuestService';
import { selectRenderScale } from '../src/core/RenderQuality';

describe('core logic',()=>{
  it('picks an allowed fish',()=>expect(pickFish(0,()=>.9).rarity).toBe('Common'));
  it('keeps the fish head on the leading side',()=>{
    expect(fishFlipXForDirection(-1)).toBe(false);
    expect(fishFlipXForDirection(1)).toBe(true);
  });
  it('ends after three casts',()=>{const t=new TripState();for(let i=0;i<3;i++)t.useCast();expect(t.complete).toBe(true)});
  it('includes treasure bonuses in trip coins',()=>{const t=new TripState();t.addBonus(25);expect(t.coins).toBe(25)});
  it('recovers from corrupt saves',()=>expect(SaveService.load({getItem:()=>'{bad'}).coins).toBe(0));

  it('selects capped render tiers for desktop and mobile displays',()=>{
    expect(selectRenderScale(1920,1080,1,false)).toBe(2);
    expect(selectRenderScale(1366,768,1,false)).toBe(1.5);
    expect(selectRenderScale(844,390,3,true)).toBe(1.5);
    expect(selectRenderScale(667,375,1,true)).toBe(1);
  });

  it('migrates v1 progress without losing coins or xp',()=>{
    const save=SaveService.load({getItem:()=>JSON.stringify({version:1,coins:321,xp:88,tutorialComplete:true,muted:true})});
    expect(save).toMatchObject({version:5,coins:321,xp:88,tutorialComplete:true,muted:true,unlockedLocationIds:['sunny-pier'],completedLocationIds:[],lastLocationId:'sunny-pier'});
    expect(save.fishStats).toEqual({});expect(save.discoveredTreasures).toEqual([]);
  });

  it('migrates v2 saves with empty pending badge claims',()=>{
    const save=SaveService.load({getItem:()=>JSON.stringify({version:2,coins:77,xp:44,achievementIds:['first-catch']})});
    expect(save).toMatchObject({version:5,coins:77,xp:44,achievementIds:['first-catch'],pendingAchievementIds:[],unlockedLocationIds:['sunny-pier'],lastLocationId:'sunny-pier'});
  });

  it('unlocks new areas in order while keeping completed areas playable',()=>{
    const save=SaveService.load({getItem:()=>null});
    expect(SaveService.isLocationUnlocked(save,'sunny-pier')).toBe(true);
    expect(SaveService.isLocationUnlocked(save,'rocky-cove')).toBe(false);
    expect(SaveService.completeLocation(save,'sunny-pier')).toBe('rocky-cove');
    expect(save.unlockedLocationIds).toEqual(['sunny-pier','rocky-cove']);
    expect(SaveService.completeLocation(save,'sunny-pier')).toBeUndefined();
    expect(SaveService.completeLocation(save,'rocky-cove')).toBe('moonlit-trench');
    expect(save.completedLocationIds).toEqual(['sunny-pier','rocky-cove']);
    expect(save.unlockedLocationIds).toEqual(['sunny-pier','rocky-cove','moonlit-trench']);
  });

  it('migrates v3 saves without unlocking later areas early',()=>{
    const save=SaveService.load({getItem:()=>JSON.stringify({version:3,coins:42,xp:210,fishStats:{minnow:{count:2,bestWeight:.3}}})});
    expect(save).toMatchObject({version:5,coins:42,xp:210,unlockedLocationIds:['sunny-pier'],completedLocationIds:[],lastLocationId:'sunny-pier'});
    expect(save.fishStats.minnow.count).toBe(2);
  });

  it('restores only a last fishing area that is already unlocked',()=>{
    const rocky=SaveService.load({getItem:()=>JSON.stringify({version:4,unlockedLocationIds:['sunny-pier','rocky-cove'],lastLocationId:'rocky-cove'})});
    const locked=SaveService.load({getItem:()=>JSON.stringify({version:4,unlockedLocationIds:['sunny-pier'],lastLocationId:'moonlit-trench'})});
    expect(rocky.lastLocationId).toBe('rocky-cove');
    expect(locked.lastLocationId).toBe('sunny-pier');
  });

  it('records catches without replacing a better record',()=>{
    const save=SaveService.load({getItem:()=>null});SaveService.recordCatch(save,'minnow',.4);SaveService.recordCatch(save,'minnow',.2);
    expect(save.fishStats.minnow).toEqual({count:2,bestWeight:.4});
  });

  it('keeps treasure discoveries unique',()=>{
    const save=SaveService.load({getItem:()=>null});SaveService.discoverTreasure(save,'bottle');SaveService.discoverTreasure(save,'bottle');
    expect(save.discoveredTreasures).toEqual(['bottle']);
  });

  it('maps every level threshold deterministically',()=>{
    LEVEL_THRESHOLDS.forEach((xp,index)=>expect(SaveService.levelProgress(xp).level).toBe(index+1));
    expect(SaveService.levelProgress(249)).toMatchObject({level:2,current:149,needed:150,maxed:false});
    expect(SaveService.levelProgress(700)).toMatchObject({level:5,maxed:true});
  });

  it('unlocks cooler sticker tiers from total discoveries',()=>{
    const save=SaveService.load({getItem:()=>null});
    SaveService.recordCatch(save,'minnow',.2);SaveService.discoverTreasure(save,'bottle');expect(save.coolerStickerTier).toBe(1);
    ['sardine','perch','bluegill'].forEach(id=>SaveService.recordCatch(save,id,.5));expect(save.coolerStickerTier).toBe(2);
    ['carp','trout'].forEach(id=>SaveService.recordCatch(save,id,1));SaveService.discoverTreasure(save,'pearl');expect(save.coolerStickerTier).toBe(3);
  });

  it('only purchases equipment with enough coins and caps every path at three tiers',()=>{
    const save=SaveService.load({getItem:()=>null});save.coins=EQUIPMENT_COSTS.reduce((sum,cost)=>sum+cost,0);
    expect(SaveService.purchaseEquipment(save,'line')).toBe(true);expect(save.equipment.line).toBe(1);
    expect(save.coins).toBe(650);expect(SaveService.purchaseEquipment(save,'line')).toBe(true);expect(SaveService.purchaseEquipment(save,'line')).toBe(true);
    expect(SaveService.nextEquipmentCost(save,'line')).toBeUndefined();expect(SaveService.purchaseEquipment(save,'line')).toBe(false);
    expect(SaveService.purchaseEquipment(save,'reel')).toBe(false);expect(save.coins).toBe(0);
  });

  it('persists purchased equipment levels',()=>{
    let raw:string|null=null;const storage={getItem:()=>raw,setItem:(_:string,value:string)=>{raw=value}};
    const save=SaveService.load(storage);save.coins=150;expect(SaveService.purchaseEquipment(save,'bait')).toBe(true);SaveService.save(save,storage);
    expect(SaveService.load(storage).equipment.bait).toBe(1);
  });

  it('repairs the boat in three paid stages and unlocks it only at the end',()=>{
    const save=SaveService.load({getItem:()=>null});save.coins=BOAT_REPAIR_COSTS.reduce((sum,cost)=>sum+cost,0);
    BOAT_REPAIR_COSTS.forEach((cost,index)=>{expect(SaveService.nextBoatRepairCost(save)).toBe(cost);expect(SaveService.repairBoat(save)).toBe(true);expect(SaveService.boatStage(save)).toBe(index+1);});
    expect(save.boat).toEqual({investedCoins:1000,unlocked:true});expect(save.coins).toBe(0);expect(SaveService.repairBoat(save)).toBe(false);
  });

  it('holds completed harbor jobs until they are manually claimed',()=>{
    const save=SaveService.load({getItem:()=>null}),trip=new TripState();QuestService.ensureActive(save);
    trip.add({fish:FISH[0],weight:.2,coins:2,xp:5,isNew:true,isRecord:false});trip.add({fish:FISH[1],weight:.4,coins:5,xp:6,isNew:false,isRecord:false});
    const completed=QuestService.applyTrip(save,trip),coinsBefore=save.coins;
    expect(completed.map(job=>job.title)).toContain('Full Net');expect(completed.map(job=>job.title)).toContain('New Neighbor');
    expect(save.coins).toBe(coinsBefore);expect(save.activeQuests[0].progress).toBe(2);
    const reward=QuestService.claimQuest(save,'two-fish');expect(reward?.coins).toBe(40);expect(save.coins).toBe(coinsBefore+40);expect(save.activeQuests[0].id).not.toBe('two-fish');
  });

  it('holds new badges until they are manually claimed',()=>{
    const save=SaveService.load({getItem:()=>null});SaveService.recordCatch(save,'minnow',.3);
    const ready=QuestService.discoverAchievements(save);expect(ready.map(badge=>badge.id)).toContain('first-catch');expect(save.achievementIds).not.toContain('first-catch');
    const reward=QuestService.claimAchievement(save,'first-catch');expect(reward?.coins).toBe(30);expect(save.achievementIds).toContain('first-catch');expect(save.pendingAchievementIds).not.toContain('first-catch');
  });
});
