export type Rarity = 'Common' | 'Uncommon' | 'Rare';
export interface Fish { id:string;name:string;rarity:Rarity;value:number;xp:number;hookMs:number;difficulty:number;color:number;weightMin:number;weightMax:number;description:string;hint:string }
export const FISH: Fish[] = [
  {id:'minnow',name:'Tiny Minnow',rarity:'Common',value:8,xp:5,hookMs:1150,difficulty:1,color:0xa9e5dc,weightMin:.12,weightMax:.42,description:'Small, fearless, and always hungry.',hint:'Look near the bright upper water.'},
  {id:'sardine',name:'Silver Sardine',rarity:'Common',value:12,xp:6,hookMs:1050,difficulty:1,color:0xc9d6df,weightMin:.25,weightMax:.7,description:'A quick flash of silver in the sun.',hint:'Often cruises across open water.'},
  {id:'perch',name:'Stripe Perch',rarity:'Common',value:15,xp:7,hookMs:1000,difficulty:2,color:0xffd166,weightMin:.45,weightMax:1.1,description:'Striped like a tiny harbor tiger.',hint:'Search the middle depths.'},
  {id:'bluegill',name:'Bluegill',rarity:'Uncommon',value:28,xp:11,hookMs:850,difficulty:2,color:0x639fab,weightMin:.55,weightMax:1.35,description:'Calm until a hook gets close.',hint:'Likes the quieter rocky side.'},
  {id:'carp',name:'Copper Carp',rarity:'Uncommon',value:34,xp:13,hookMs:780,difficulty:3,color:0xc97b63,weightMin:1.1,weightMax:2.6,description:'A burnished old soul of the pier.',hint:'Stay low and follow the seabed.'},
  {id:'trout',name:'Glass Trout',rarity:'Rare',value:68,xp:22,hookMs:650,difficulty:4,color:0xc4f1f9,weightMin:1.4,weightMax:3.4,description:'Almost invisible until it turns.',hint:'Rarely appears in the deep water.'}
];
export function pickFish(quality: number, random = Math.random): Fish {
  const rare = Math.min(.14, .03 + quality * .08), uncommon = .22 + quality * .12, roll = random();
  const pool = roll < rare ? FISH.filter(f=>f.rarity==='Rare') : roll < rare + uncommon ? FISH.filter(f=>f.rarity==='Uncommon') : FISH.filter(f=>f.rarity==='Common');
  return pool[Math.floor(random() * pool.length)];
}
// Both source fish assets face left. Flip only while travelling right so the
// head, never the tail, is the leading edge.
export function fishFlipXForDirection(direction:number){return direction>0}
