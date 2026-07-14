export interface Treasure { id:string;name:string;texture:string;hint:string }
export const TREASURES:Treasure[]=[
  {id:'bottle',name:'Message Bottle',texture:'secret-bottle',hint:'Something glassy rests near the seabed.'},
  {id:'pearl',name:'Moon Pearl',texture:'secret-pearl',hint:'A pale glimmer hides by the rocks.'},
  {id:'compass',name:'Old Compass',texture:'secret-compass',hint:'An explorer once lost their way here.'}
];
export type TreasureId=string;
export function treasureById(id:string){return TREASURES.find(t=>t.id===id)}
