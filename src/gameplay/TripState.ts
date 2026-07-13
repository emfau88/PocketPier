import { TRIP_CASTS } from '../core/GameConfig';
import type { Fish } from './Fish';
import type { TreasureId } from './Treasure';
export interface CatchRecord { fish:Fish;weight:number;coins:number;xp:number;isNew:boolean;isRecord:boolean }
export interface TreasureRecord { id:TreasureId;isNew:boolean }
export class TripState {
  castsLeft=TRIP_CASTS;catches:CatchRecord[]=[];treasures:TreasureRecord[]=[];diveCatchCounts:number[]=[];bonusCoins=0;
  useCast(){this.castsLeft=Math.max(0,this.castsLeft-1)}
  add(x:CatchRecord){this.catches.push(x)}
  addTreasure(x:TreasureRecord){this.treasures.push(x)}
  addDiveCatchCount(count:number){this.diveCatchCounts.push(count)}
  addBonus(coins:number){this.bonusCoins+=coins}
  get complete(){return this.castsLeft===0}
  get coins(){return this.catches.reduce((n,c)=>n+c.coins,0)+this.bonusCoins}
  get xp(){return this.catches.reduce((n,c)=>n+c.xp,0)}
}
