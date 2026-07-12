export const TREASURES=[
  {id:'bottle',name:'Message Bottle',texture:'secret-bottle',hint:'Something glassy rests near the seabed.'},
  {id:'pearl',name:'Moon Pearl',texture:'secret-pearl',hint:'A pale glimmer hides by the rocks.'},
  {id:'compass',name:'Old Compass',texture:'secret-compass',hint:'An explorer once lost their way here.'}
] as const;
export type TreasureId=typeof TREASURES[number]['id'];
export function treasureById(id:string){return TREASURES.find(t=>t.id===id)}
