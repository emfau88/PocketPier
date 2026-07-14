import { FISH, type Fish } from './Fish';
import { TREASURES, type Treasure } from './Treasure';

export type FishingLocationId='sunny-pier'|'rocky-cove'|'moonlit-trench';
export interface FishingLocation {
  id:FishingLocationId;
  name:string;
  level:number;
  subtitle:string;
  description:string;
  underwaterTexture:string;
  fish:Fish[];
  treasures:Treasure[];
  unlockAfter?:FishingLocationId;
}

const ROCKY_COVE_FISH:Fish[]=[
  {id:'kelp-wrasse',name:'Kelp Wrasse',texture:'fish-kelp-wrasse',rarity:'Common',value:18,xp:8,hookMs:980,difficulty:2,color:0xffffff,weightMin:.4,weightMax:1.1,description:'A green streak with excellent camouflage.',hint:'Search between the tall kelp leaves.'},
  {id:'tide-mackerel',name:'Tide Mackerel',texture:'fish-tide-mackerel',rarity:'Uncommon',value:34,xp:13,hookMs:790,difficulty:3,color:0xffffff,weightMin:.8,weightMax:1.9,description:'Fast, striped, and powered by the current.',hint:'It patrols the open water by the rocks.'},
  {id:'ember-rockfish',name:'Ember Rockfish',texture:'fish-ember-rockfish',rarity:'Rare',value:82,xp:27,hookMs:610,difficulty:4,color:0xffffff,weightMin:1.2,weightMax:3.2,description:'A fiery little monarch of the cove.',hint:'A rare orange glow near the seabed.'}
];

const MOONLIT_TRENCH_FISH:Fish[]=[
  {id:'lantern-fin',name:'Lantern Fin',texture:'fish-lantern-fin',rarity:'Common',value:28,xp:11,hookMs:900,difficulty:2,color:0xffffff,weightMin:.35,weightMax:1.0,description:'Carries its own tiny night-light.',hint:'Follow the blue lights in the upper trench.'},
  {id:'midnight-eel',name:'Midnight Eel',texture:'fish-midnight-eel',rarity:'Uncommon',value:55,xp:18,hookMs:720,difficulty:4,color:0xffffff,weightMin:1.1,weightMax:2.8,description:'A ribbon of darkness with bright eyes.',hint:'It winds between the deep stone shelves.'},
  {id:'starfin',name:'Royal Starfin',texture:'fish-royal-starfin',rarity:'Rare',value:120,xp:36,hookMs:540,difficulty:5,color:0xffffff,weightMin:1.4,weightMax:3.8,description:'The trench wears a crown when this fish appears.',hint:'Look for a golden shimmer at the deepest edge.'}
];

const ROCKY_COVE_TREASURES:Treasure[]=[
  {id:'barnacle-bell',name:'Barnacled Bell',texture:'treasure-barnacle-bell',hint:'A dull bronze shape rests under the kelp.'},
  {id:'lost-spyglass',name:'Lost Spyglass',texture:'treasure-lost-spyglass',hint:'A brass glint points toward the horizon.'},
  {id:'sea-glass-charm',name:'Sea-glass Charm',texture:'treasure-sea-glass-charm',hint:'Green glass catches the current light.'}
];

const MOONLIT_TRENCH_TREASURES:Treasure[]=[
  {id:'glow-crystal',name:'Glow Crystal',texture:'treasure-glow-crystal',hint:'A blue pulse shines from the trench floor.'},
  {id:'captain-locket',name:"Captain's Locket",texture:'treasure-captain-locket',hint:'A golden keepsake waits in the dark.'},
  {id:'ancient-idol',name:'Ancient Tide Idol',texture:'treasure-ancient-idol',hint:'Old stone eyes watch the deepest ledge.'}
];

export const FISHING_LOCATIONS:FishingLocation[]=[
  {id:'sunny-pier',name:'Sunny Pier',level:1,subtitle:'The familiar shallows',description:'Bright water, friendly fish, and secrets close to home.',underwaterTexture:'bg-underwater',fish:FISH,treasures:TREASURES},
  {id:'rocky-cove',name:'Rocky Cove',level:2,subtitle:'Kelp, currents, and old brass',description:'A lively cove hidden behind weathered sea cliffs.',underwaterTexture:'bg-underwater-rocky',fish:ROCKY_COVE_FISH,treasures:ROCKY_COVE_TREASURES,unlockAfter:'sunny-pier'},
  {id:'moonlit-trench',name:'Moonlit Trench',level:3,subtitle:'A gentle glow in the deep',description:'Bioluminescent life and forgotten relics below the moon.',underwaterTexture:'bg-underwater-moonlit',fish:MOONLIT_TRENCH_FISH,treasures:MOONLIT_TRENCH_TREASURES,unlockAfter:'rocky-cove'}
];

export function locationById(id:FishingLocationId='sunny-pier'){return FISHING_LOCATIONS.find(location=>location.id===id)??FISHING_LOCATIONS[0]}
export function nextLocation(id:FishingLocationId){const index=FISHING_LOCATIONS.findIndex(location=>location.id===id);return FISHING_LOCATIONS[index+1]}
export function allFish(){return FISHING_LOCATIONS.flatMap(location=>location.fish)}
export function allTreasures(){return FISHING_LOCATIONS.flatMap(location=>location.treasures)}
export function treasureAcrossLocations(id:string){return allTreasures().find(treasure=>treasure.id===id)}
