import { describe,it,expect } from 'vitest';
import { FISH, fishFlipXForDirection, pickFish } from '../src/gameplay/Fish';
import { TripState } from '../src/gameplay/TripState';
import { captureDecayPerSecond, captureSeconds, fishBehavior, movementScale, verticalOffset } from '../src/gameplay/FishBehavior';
import { castQualityFromMarker, currentVector, obstaclesForLocation, pointHitsObstacle, treasureChance, treasureSpawnPoint } from '../src/gameplay/UnderwaterEnvironment';
import { BOAT_REPAIR_COSTS, BOAT_REPAIR_TOTAL, EQUIPMENT_COSTS, LEVEL_REWARDS, LEVEL_THRESHOLDS, SaveService } from '../src/core/SaveService';
import { ACHIEVEMENTS, QUESTS, QuestService } from '../src/gameplay/QuestService';
import { contentCropInsets, scaleToVisibleBounds, selectRenderScale, shouldUseHighResolutionAssets } from '../src/core/RenderQuality';
import { LOCATION_ASSETS, MENU_ASSETS, OPTIONAL_MUSIC_ASSETS, PIER_ASSETS } from '../src/core/AssetManifest';
import { joystickKnobPosition, virtualJoystickVector } from '../src/gameplay/TouchControls';
import { bobberStyle, cycleBobberStyle, unlockedBobberStyles } from '../src/gameplay/Cosmetics';
import { FISHING_LOCATIONS } from '../src/gameplay/FishingLocation';
import { shouldUseCrazyGamesSdk } from '../src/core/PortalBridge';

describe('core logic',()=>{
  it('keeps the CrazyGames SDK optional outside its own and local test hosts',()=>{
    expect(shouldUseCrazyGamesSdk('emfau88.github.io')).toBe(false);
    expect(shouldUseCrazyGamesSdk('example.com')).toBe(false);
    expect(shouldUseCrazyGamesSdk('localhost')).toBe(false);
    expect(shouldUseCrazyGamesSdk('127.0.0.1')).toBe(false);
    expect(shouldUseCrazyGamesSdk('localhost','?crazygames=1')).toBe(true);
    expect(shouldUseCrazyGamesSdk('www.crazygames.com')).toBe(true);
  });
  it('picks an allowed fish',()=>expect(pickFish(0,()=>.9).rarity).toBe('Common'));
  it('keeps the fish head on the leading side',()=>{
    expect(fishFlipXForDirection(-1)).toBe(false);
    expect(fishFlipXForDirection(1)).toBe(true);
  });
  it('maps fish difficulty to distinct movement and capture behavior',()=>{
    const easy=FISH[0],hard=FISH[5],eel={...hard,id:'test-eel'};
    expect(fishBehavior(easy)).toBe('school');expect(fishBehavior(hard)).toBe('flee');expect(fishBehavior(eel)).toBe('eel');
    expect(captureSeconds(hard,2)).toBeGreaterThan(captureSeconds(easy,1));
    expect(captureDecayPerSecond(hard)).toBeGreaterThan(captureDecayPerSecond(easy));
    expect(movementScale(hard,500,0,50)).toBeGreaterThan(movementScale(easy,500,0,50));
    expect(verticalOffset(eel,300,0)).not.toBe(verticalOffset(easy,300,0));
  });
  it('uses a distinct authored texture for every Sunny Pier fish',()=>{
    expect(new Set(FISH.map(fish=>fish.texture)).size).toBe(FISH.length);
  });
  it('adds current and solid kelp only to Rocky Cove',()=>{
    expect(currentVector('sunny-pier',400,300,1000)).toEqual({x:0,y:0});
    expect(currentVector('rocky-cove',400,300,1000).x).toBeGreaterThan(0);
    const obstacle=obstaclesForLocation('rocky-cove')[0];expect(pointHitsObstacle('rocky-cove',obstacle.x,obstacle.y)).toBe(true);
    expect(pointHitsObstacle('sunny-pier',obstacle.x,obstacle.y)).toBe(false);
  });
  it('turns cast timing into quality and deterministic treasure rules',()=>{
    expect(castQualityFromMarker(.5)).toBe(1);expect(castQualityFromMarker(0)).toBe(0);expect(castQualityFromMarker(1)).toBe(0);
    expect(treasureChance('moonlit-trench',1,3)).toBeGreaterThan(treasureChance('sunny-pier',0,0));
    expect(treasureSpawnPoint('rocky-cove',0)).not.toEqual(treasureSpawnPoint('rocky-cove',.99));
  });
  it('ends after three casts',()=>{const t=new TripState();for(let i=0;i<3;i++)t.useCast();expect(t.complete).toBe(true)});
  it('includes treasure bonuses in trip coins',()=>{const t=new TripState();t.addBonus(25);expect(t.coins).toBe(25)});
  it('recovers from corrupt saves',()=>expect(SaveService.load({getItem:()=>'{bad'}).coins).toBe(0));

  it('selects capped render tiers for desktop and mobile displays',()=>{
    expect(selectRenderScale(1920,1080,1,false)).toBe(2);
    expect(selectRenderScale(1366,768,1,false)).toBe(2);
    expect(selectRenderScale(1536,864,1,false)).toBe(2);
    expect(selectRenderScale(844,390,3,true)).toBe(2);
    expect(selectRenderScale(667,375,1,true)).toBe(1);
    expect(selectRenderScale(2560,1440,1,false)).toBe(3);
    expect(selectRenderScale(3840,2160,1,false)).toBe(4);
    expect(selectRenderScale(2133,1200,1,false)).toBe(2.5);
    expect(shouldUseHighResolutionAssets(1920,1080,false)).toBe(true);
    expect(shouldUseHighResolutionAssets(1366,768,false)).toBe(false);
    expect(shouldUseHighResolutionAssets(844,390,true)).toBe(false);
  });

  it('keeps HUD content inside a cover-scaled mobile landscape viewport',()=>{
    expect(contentCropInsets(
      {left:0,top:-42,right:844,bottom:432},
      {left:0,top:0,right:844,bottom:390}
    )).toEqual({top:42,right:0,bottom:42,left:0});
    expect(contentCropInsets(
      {left:-80,top:0,right:1040,bottom:540},
      {left:0,top:0,right:960,bottom:540}
    )).toEqual({top:0,right:80,bottom:0,left:80});
    expect(scaleToVisibleBounds({width:960,height:444},940,520)).toBeCloseTo(444/520);
    expect(scaleToVisibleBounds({width:960,height:540},940,520)).toBe(1);
  });

  it('turns a floating touch joystick into clamped analog steering',()=>{
    expect(virtualJoystickVector({x:100,y:100},{x:104,y:102})).toEqual({x:0,y:0});
    const right=virtualJoystickVector({x:100,y:100},{x:160,y:100});
    expect(right.x).toBe(1);expect(right.y).toBe(0);
    expect(joystickKnobPosition({x:100,y:100},{x:200,y:100})).toEqual({x:142,y:100});
  });

  it('migrates v1 progress without losing coins or xp',()=>{
    const save=SaveService.load({getItem:()=>JSON.stringify({version:1,coins:321,xp:88,tutorialComplete:true,muted:true})});
    expect(save).toMatchObject({version:10,coins:321,xp:88,tutorialComplete:true,underwaterControlsSeen:false,hubIntroStep:0,castTutorialSeen:false,bobberStyleId:'classic',muted:true,unlockedLocationIds:['sunny-pier'],pendingLocationIds:[],completedLocationIds:[],lastLocationId:'sunny-pier',claimedLevelRewards:[1]});
    expect(save.fishStats).toEqual({});expect(save.discoveredTreasures).toEqual([]);
  });

  it('migrates v2 saves with empty pending badge claims',()=>{
    const save=SaveService.load({getItem:()=>JSON.stringify({version:2,coins:77,xp:44,achievementIds:['first-catch']})});
    expect(save).toMatchObject({version:10,coins:77,xp:44,achievementIds:['first-catch'],pendingAchievementIds:[],unlockedLocationIds:['sunny-pier'],pendingLocationIds:[],lastLocationId:'sunny-pier'});
  });

  it('persists the one-time underwater touch tutorial flag',()=>{
    const save=SaveService.load({getItem:()=>JSON.stringify({version:7,underwaterControlsSeen:true,hubIntroStep:2,castTutorialSeen:true})});
    expect(save).toMatchObject({version:10,underwaterControlsSeen:true,hubIntroStep:2,castTutorialSeen:true});
  });

  it('migrates v6 progress and shows the new touch tutorial once',()=>{
    const save=SaveService.load({getItem:()=>JSON.stringify({version:6,coins:25,claimedLevelRewards:[1,2]})});
    expect(save).toMatchObject({version:10,coins:25,claimedLevelRewards:[1,2],underwaterControlsSeen:false,hubIntroStep:0,castTutorialSeen:false});
  });

  it('requires area mastery and a repaired boat before unlocking new routes',()=>{
    const save=SaveService.load({getItem:()=>null});
    expect(SaveService.isLocationUnlocked(save,'sunny-pier')).toBe(true);
    expect(SaveService.isLocationUnlocked(save,'rocky-cove')).toBe(false);
    ['minnow','sardine','perch'].forEach(id=>SaveService.recordCatch(save,id,.5));SaveService.discoverTreasure(save,'bottle');
    SaveService.recordTripProgress(save,'sunny-pier',2,1);SaveService.recordTripProgress(save,'sunny-pier',3,0);
    expect(save.completedLocationIds).toContain('sunny-pier');expect(SaveService.isLocationUnlocked(save,'rocky-cove')).toBe(false);
    save.coins=BOAT_REPAIR_TOTAL;BOAT_REPAIR_COSTS.forEach(()=>expect(SaveService.repairBoat(save)).toBe(true));
    expect(save.unlockedLocationIds).toEqual(['sunny-pier','rocky-cove']);
    expect(save.pendingLocationIds).toEqual(['rocky-cove']);
    ['kelp-wrasse','tide-mackerel'].forEach(id=>SaveService.recordCatch(save,id,.8));SaveService.discoverTreasure(save,'barnacle-bell');
    SaveService.recordTripProgress(save,'rocky-cove',3,1);SaveService.recordTripProgress(save,'rocky-cove',2,0);SaveService.recordTripProgress(save,'rocky-cove',2,0);
    expect(save.completedLocationIds).toEqual(['sunny-pier','rocky-cove']);
    expect(save.unlockedLocationIds).toEqual(['sunny-pier','rocky-cove','moonlit-trench']);
    expect(save.pendingLocationIds).toEqual(['rocky-cove','moonlit-trench']);
  });

  it('migrates v3 saves without unlocking later areas early',()=>{
    const save=SaveService.load({getItem:()=>JSON.stringify({version:3,coins:42,xp:210,fishStats:{minnow:{count:2,bestWeight:.3}}})});
    expect(save).toMatchObject({version:10,coins:42,xp:210,unlockedLocationIds:['sunny-pier'],completedLocationIds:[],lastLocationId:'sunny-pier'});
    expect(save.fishStats.minnow.count).toBe(2);
  });

  it('restores only a last fishing area that is already unlocked',()=>{
    const rocky=SaveService.load({getItem:()=>JSON.stringify({version:4,unlockedLocationIds:['sunny-pier','rocky-cove'],lastLocationId:'rocky-cove'})});
    const locked=SaveService.load({getItem:()=>JSON.stringify({version:4,unlockedLocationIds:['sunny-pier'],lastLocationId:'moonlit-trench'})});
    expect(rocky.lastLocationId).toBe('rocky-cove');
    expect(locked.lastLocationId).toBe('sunny-pier');
  });

  it('migrates v5 progress without replaying old level rewards',()=>{
    const save=SaveService.load({getItem:()=>JSON.stringify({version:5,coins:90,xp:450,boat:{investedCoins:350,unlocked:false},unlockedLocationIds:['sunny-pier','rocky-cove'],completedLocationIds:['sunny-pier'],lastLocationId:'rocky-cove'})});
    expect(save).toMatchObject({version:10,coins:90,xp:450,claimedLevelRewards:[1,2,3,4],unlockedLocationIds:['sunny-pier','rocky-cove'],lastLocationId:'rocky-cove'});
    expect(save.boat.investedCoins).toBe(350);expect(SaveService.awardXp(save,0)).toEqual([]);
    expect(save.locationProgress['sunny-pier']).toEqual({trips:0,catches:0,treasures:0});
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
    expect(SaveService.levelProgress(700)).toMatchObject({level:5,maxed:false});
    expect(SaveService.levelProgress(6000)).toMatchObject({level:15,maxed:true});
  });

  it('grants each level coin reward once',()=>{
    const save=SaveService.load({getItem:()=>null}),rewards=SaveService.awardXp(save,250);
    expect(rewards.map(reward=>reward.level)).toEqual([2,3]);
    expect(save.coins).toBe(LEVEL_REWARDS[0].coins+LEVEL_REWARDS[1].coins);
    expect(SaveService.awardXp(save,0)).toEqual([]);
  });

  it('unlocks cooler sticker tiers from total discoveries',()=>{
    const save=SaveService.load({getItem:()=>null});
    SaveService.recordCatch(save,'minnow',.2);SaveService.discoverTreasure(save,'bottle');expect(save.coolerStickerTier).toBe(1);
    ['sardine','perch','bluegill'].forEach(id=>SaveService.recordCatch(save,id,.5));expect(save.coolerStickerTier).toBe(2);
    ['carp','trout'].forEach(id=>SaveService.recordCatch(save,id,1));SaveService.discoverTreasure(save,'pearl');expect(save.coolerStickerTier).toBe(3);
  });

  it('unlocks and cycles cosmetic bobber styles from claimed badges',()=>{
    const save=SaveService.load({getItem:()=>null});expect(unlockedBobberStyles(save).map(style=>style.id)).toEqual(['classic']);
    save.achievementIds=['a','b','c'];expect(unlockedBobberStyles(save).map(style=>style.id)).toEqual(['classic','seafoam']);
    expect(cycleBobberStyle(save).id).toBe('seafoam');expect(bobberStyle(save).id).toBe('seafoam');
  });

  it('only purchases equipment with enough coins and caps every path at three tiers',()=>{
    const save=SaveService.load({getItem:()=>null});save.coins=EQUIPMENT_COSTS.reduce((sum,cost)=>sum+cost,0);
    expect(SaveService.purchaseEquipment(save,'line')).toBe(true);expect(save.equipment.line).toBe(1);
    expect(save.coins).toBe(EQUIPMENT_COSTS[1]+EQUIPMENT_COSTS[2]);expect(SaveService.purchaseEquipment(save,'line')).toBe(true);expect(SaveService.purchaseEquipment(save,'line')).toBe(true);
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
    expect(save.boat).toEqual({investedCoins:BOAT_REPAIR_TOTAL,unlocked:true});expect(save.coins).toBe(0);expect(SaveService.repairBoat(save)).toBe(false);
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

  it('ships a varied job pool and substantial badge goals',()=>{
    expect(QUESTS.length).toBeGreaterThanOrEqual(12);expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(10);
    expect(FISHING_LOCATIONS.slice(1).every(location=>location.fish.length>=5)).toBe(true);
  });

  it('tracks Sunny Scholar only from Sunny Pier discoveries',()=>{
    const save=SaveService.load({getItem:()=>null}),nonSunny=FISHING_LOCATIONS.slice(1).flatMap(location=>location.fish).slice(0,FISH.length);
    nonSunny.forEach(fish=>SaveService.recordCatch(save,fish.id,.8));QuestService.discoverAchievements(save);
    expect(save.pendingAchievementIds).not.toContain('sunny-complete');expect(QuestService.achievementProgress(save,'sunny-complete').current).toBe(0);
    FISH.forEach(fish=>SaveService.recordCatch(save,fish.id,.8));QuestService.discoverAchievements(save);expect(save.pendingAchievementIds).toContain('sunny-complete');
  });
});

describe('runtime asset pipeline',()=>{
  const locationAssets=Object.values(LOCATION_ASSETS).flat();
  const allAssets=[...MENU_ASSETS,...OPTIONAL_MUSIC_ASSETS,...PIER_ASSETS,...locationAssets];

  it('keeps the boot payload separate from pier and location content',()=>{
    expect(MENU_ASSETS.length).toBeLessThan(PIER_ASSETS.length);
    expect(Object.values(LOCATION_ASSETS).every(assets=>assets.length>=6)).toBe(true);
    expect(MENU_ASSETS.some(asset=>asset.key==='bg-pier-remaster')).toBe(false);
    expect(MENU_ASSETS.some(asset=>asset.key==='music-sunset-plains')).toBe(false);
  });

  it('loads the Rocky Cove surface theme only with area 2',()=>{
    const rockyKeys=LOCATION_ASSETS['rocky-cove'].map(asset=>asset.key);
    const sunnyKeys=LOCATION_ASSETS['sunny-pier'].map(asset=>asset.key);
    expect(rockyKeys).toEqual(expect.arrayContaining(['bg-pier-rocky','fg-pier-rocky']));
    expect(sunnyKeys).not.toEqual(expect.arrayContaining(['bg-pier-rocky','fg-pier-rocky']));
  });

  it('uses unique cache keys across every staged asset group',()=>{
    const keys=allAssets.map(asset=>asset.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('serves images from the compressed runtime set',()=>{
    const images=allAssets.filter(asset=>asset.kind==='image');
    expect(images.length).toBeGreaterThan(30);
    expect(images.every(asset=>asset.url.endsWith('.webp')&&asset.url.includes('/assets/runtime/'))).toBe(true);
  });

  it('serves sounds from the compact runtime set',()=>{
    const sounds=allAssets.filter(asset=>asset.kind==='audio');
    expect(sounds.length).toBeGreaterThan(10);
    expect(sounds.every(asset=>asset.url.endsWith('.m4a')&&asset.url.includes('/audio/runtime/'))).toBe(true);
  });
});
