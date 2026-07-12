import { describe,it,expect } from 'vitest';
import { fishFlipXForDirection, pickFish } from '../src/gameplay/Fish';
import { TripState } from '../src/gameplay/TripState';
import { LEVEL_THRESHOLDS, SaveService } from '../src/core/SaveService';

describe('core logic',()=>{
  it('picks an allowed fish',()=>expect(pickFish(0,()=>.9).rarity).toBe('Common'));
  it('keeps the fish head on the leading side',()=>{
    expect(fishFlipXForDirection(-1)).toBe(false);
    expect(fishFlipXForDirection(1)).toBe(true);
  });
  it('ends after three casts',()=>{const t=new TripState();for(let i=0;i<3;i++)t.useCast();expect(t.complete).toBe(true)});
  it('includes treasure bonuses in trip coins',()=>{const t=new TripState();t.addBonus(25);expect(t.coins).toBe(25)});
  it('recovers from corrupt saves',()=>expect(SaveService.load({getItem:()=>'{bad'}).coins).toBe(0));

  it('migrates v1 progress without losing coins or xp',()=>{
    const save=SaveService.load({getItem:()=>JSON.stringify({version:1,coins:321,xp:88,tutorialComplete:true,muted:true})});
    expect(save).toMatchObject({version:2,coins:321,xp:88,tutorialComplete:true,muted:true});
    expect(save.fishStats).toEqual({});expect(save.discoveredTreasures).toEqual([]);
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
});
