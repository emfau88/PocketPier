import type { SaveData } from '../core/SaveService';

export interface BobberStyle { id:string;name:string;tint:number;badges:number }
export const BOBBER_STYLES:BobberStyle[]=[
  {id:'classic',name:'Classic Coral',tint:0xffffff,badges:0},
  {id:'seafoam',name:'Seafoam Scout',tint:0xa9e5dc,badges:3},
  {id:'sunset',name:'Sunset Stripe',tint:0xffb27d,badges:7},
  {id:'legend',name:'Harbor Gold',tint:0xffd166,badges:13}
];

export function unlockedBobberStyles(save:SaveData){return BOBBER_STYLES.filter(style=>save.achievementIds.length>=style.badges)}
export function bobberStyle(save:SaveData){return BOBBER_STYLES.find(style=>style.id===save.bobberStyleId&&style.badges<=save.achievementIds.length)??BOBBER_STYLES[0]}
export function cycleBobberStyle(save:SaveData){const unlocked=unlockedBobberStyles(save),current=Math.max(0,unlocked.findIndex(style=>style.id===save.bobberStyleId)),next=unlocked[(current+1)%unlocked.length];save.bobberStyleId=next.id;return next}
