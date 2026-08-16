import type Phaser from 'phaser';
import type { FishingLocationId } from '../gameplay/FishingLocation';
import { currentHighResolutionAssetPreference } from './RenderQuality';

interface ImageAsset { kind:'image'; key:string; url:string }
interface AudioAsset { kind:'audio'; key:string; url:string }
export type GameAsset=ImageAsset|AudioAsset;

const image=(key:string,url:URL):ImageAsset=>({kind:'image',key,url:url.href});
const audio=(key:string,url:URL):AudioAsset=>({kind:'audio',key,url:url.href});
const highResolutionAssets=currentHighResolutionAssetPreference();
const adaptiveImage=(key:string,standard:URL,highResolution:URL)=>image(key,highResolutionAssets?highResolution:standard);

export const MENU_ASSETS:GameAsset[]=[
  adaptiveImage('menu-ocean-morning',new URL('../assets/runtime/menu_ocean_morning_base.webp',import.meta.url),new URL('../assets/runtime/menu_ocean_morning_base_hq.webp',import.meta.url)),
  adaptiveImage('menu-water-shimmer',new URL('../assets/runtime/menu_water_shimmer.webp',import.meta.url),new URL('../assets/runtime/menu_water_shimmer_hq.webp',import.meta.url)),
  image('menu-gull-up',new URL('../assets/runtime/menu_gull_up.webp',import.meta.url)),
  image('menu-gull-glide',new URL('../assets/runtime/menu_gull_glide.webp',import.meta.url)),
  image('menu-gull-down',new URL('../assets/runtime/menu_gull_down.webp',import.meta.url)),
  image('bobber-basic',new URL('../assets/runtime/bobber_basic.webp',import.meta.url)),
  audio('sfx-ui-select',new URL('../assets/audio/runtime/ui_select.m4a',import.meta.url)),
  audio('ambient-harbor-waves',new URL('../assets/audio/runtime/ambient_harbor_waves.m4a',import.meta.url)),
  audio('ambient-seagull-1',new URL('../assets/audio/runtime/seagull_1.m4a',import.meta.url)),
  audio('ambient-seagull-2',new URL('../assets/audio/runtime/seagull_2.m4a',import.meta.url)),
  audio('ambient-seagull-3',new URL('../assets/audio/runtime/seagull_3.m4a',import.meta.url)),
  audio('ambient-seagull-4',new URL('../assets/audio/runtime/seagull_4.m4a',import.meta.url))
];

// The long music track loads behind the visible menu instead of extending the
// first mobile loading screen. Ambient waves and UI audio remain immediately ready.
export const OPTIONAL_MUSIC_ASSETS:GameAsset[]=[
  audio('music-sunset-plains',new URL('../assets/audio/runtime/music_sunset_plains.m4a',import.meta.url))
];

export const PIER_ASSETS:GameAsset[]=[
  adaptiveImage('bg-pier-remaster',new URL('../assets/runtime/bg_sunny_pier_remaster.webp',import.meta.url),new URL('../assets/runtime/bg_sunny_pier_remaster_hq.webp',import.meta.url)),
  image('surface-clouds',new URL('../assets/runtime/surface_clouds.webp',import.meta.url)),
  image('angler-chair-perspective',new URL('../assets/runtime/character_angler_chair_perspective.webp',import.meta.url)),
  image('hub-cooler',new URL('../assets/runtime/hub_cooler.webp',import.meta.url)),
  image('hub-tacklebox-closed',new URL('../assets/runtime/hub_tacklebox_closed.webp',import.meta.url)),
  image('hub-tacklebox-open',new URL('../assets/runtime/hub_tacklebox_open.webp',import.meta.url)),
  image('upgrade-icons',new URL('../assets/runtime/ui_upgrade_icons.webp',import.meta.url)),
  image('equipment-progression',new URL('../assets/runtime/ui_equipment_progression.webp',import.meta.url)),
  adaptiveImage('fishbook-open',new URL('../assets/runtime/ui_fishbook_open.webp',import.meta.url),new URL('../assets/runtime/ui_fishbook_open_hq.webp',import.meta.url)),
  image('badge-collection',new URL('../assets/runtime/ui_badge_collection.webp',import.meta.url)),
  image('menu-decorations',new URL('../assets/runtime/ui_menu_decorations.webp',import.meta.url)),
  image('boat-repair-steps',new URL('../assets/runtime/ui_boat_repair_steps.webp',import.meta.url)),
  image('hub-jobs-notice',new URL('../assets/runtime/hub_jobs_notice.webp',import.meta.url)),
  image('harbor-notes',new URL('../assets/runtime/ui_harbor_notes.webp',import.meta.url)),
  image('hub-boat-states',new URL('../assets/runtime/hub_boat_side_states.webp',import.meta.url)),
  image('hook-basic',new URL('../assets/runtime/hook_basic.webp',import.meta.url)),
  image('splash',new URL('../assets/runtime/fx_water_splash.webp',import.meta.url)),
  image('fx-perfect-hook',new URL('../assets/runtime/fx_perfect_hook.webp',import.meta.url)),
  adaptiveImage('ui-fishing-spots-map',new URL('../assets/runtime/ui_fishing_spots_map.webp',import.meta.url),new URL('../assets/runtime/ui_fishing_spots_map_hq.webp',import.meta.url)),
  image('ui-spot-sunny',new URL('../assets/runtime/ui_spot_sunny.webp',import.meta.url)),
  image('ui-spot-rocky',new URL('../assets/runtime/ui_spot_rocky.webp',import.meta.url)),
  image('ui-spot-moonlit',new URL('../assets/runtime/ui_spot_moonlit.webp',import.meta.url)),
  audio('sfx-ui-cancel',new URL('../assets/audio/runtime/ui_cancel.m4a',import.meta.url)),
  audio('sfx-ui-pop',new URL('../assets/audio/runtime/ui_pop.m4a',import.meta.url)),
  audio('sfx-book-open',new URL('../assets/audio/runtime/book_open.m4a',import.meta.url)),
  audio('sfx-book-close',new URL('../assets/audio/runtime/book_close.m4a',import.meta.url)),
  audio('sfx-jobs-open',new URL('../assets/audio/runtime/jobs_open.m4a',import.meta.url)),
  audio('sfx-gear-equip',new URL('../assets/audio/runtime/gear_equip.m4a',import.meta.url)),
  audio('sfx-coins',new URL('../assets/audio/runtime/coins.m4a',import.meta.url)),
  audio('sfx-boat-knock',new URL('../assets/audio/runtime/boat_knock.m4a',import.meta.url)),
  audio('sfx-cast',new URL('../assets/audio/runtime/cast_twang.m4a',import.meta.url)),
  audio('sfx-splash',new URL('../assets/audio/runtime/water_splash.m4a',import.meta.url)),
  audio('sfx-bite',new URL('../assets/audio/runtime/bite_plop.m4a',import.meta.url)),
  audio('sfx-reel',new URL('../assets/audio/runtime/reel.m4a',import.meta.url)),
  audio('ambient-bubble-1',new URL('../assets/audio/runtime/bubble_1.m4a',import.meta.url)),
  audio('ambient-bubble-2',new URL('../assets/audio/runtime/bubble_2.m4a',import.meta.url)),
  audio('ambient-bubble-3',new URL('../assets/audio/runtime/bubble_3.m4a',import.meta.url)),
  audio('sfx-catch',new URL('../assets/audio/runtime/catch_chime.m4a',import.meta.url)),
  audio('sfx-treasure',new URL('../assets/audio/runtime/treasure_mystery.m4a',import.meta.url)),
  audio('sfx-claim',new URL('../assets/audio/runtime/claim_chime.m4a',import.meta.url)),
  audio('sfx-level-up',new URL('../assets/audio/runtime/level_up.m4a',import.meta.url))
];

export const LOCATION_ASSETS:Record<FishingLocationId,GameAsset[]>={
  'sunny-pier':[
    audio('ambient-underwater-sunny',new URL('../assets/audio/runtime/ambient_underwater_sunny.m4a',import.meta.url)),
    adaptiveImage('bg-underwater',new URL('../assets/runtime/bg_underwater_sunny_pier.webp',import.meta.url),new URL('../assets/runtime/bg_underwater_sunny_pier_hq.webp',import.meta.url)),
    adaptiveImage('fg-underwater-sunny',new URL('../assets/runtime/fg_underwater_sunny.webp',import.meta.url),new URL('../assets/runtime/fg_underwater_sunny_hq.webp',import.meta.url)),
    image('fish-minnow',new URL('../assets/runtime/fish_minnow_hero.webp',import.meta.url)),
    image('fish-sardine',new URL('../assets/runtime/fish_sardine_hero.webp',import.meta.url)),
    image('fish-stripe-perch',new URL('../assets/runtime/fish_stripe_perch.webp',import.meta.url)),
    image('fish-bluegill',new URL('../assets/runtime/fish_bluegill.webp',import.meta.url)),
    image('fish-copper-carp',new URL('../assets/runtime/fish_copper_carp.webp',import.meta.url)),
    image('fish-glass-trout',new URL('../assets/runtime/fish_glass_trout.webp',import.meta.url)),
    image('secret-bottle',new URL('../assets/runtime/secret_bottle.webp',import.meta.url)),
    image('secret-pearl',new URL('../assets/runtime/secret_pearl.webp',import.meta.url)),
    image('secret-compass',new URL('../assets/runtime/secret_compass.webp',import.meta.url))
  ],
  'rocky-cove':[
    audio('ambient-underwater-rocky',new URL('../assets/audio/runtime/ambient_underwater_rocky.m4a',import.meta.url)),
    adaptiveImage('bg-pier-rocky',new URL('../assets/runtime/bg_rocky_cove_surface.webp',import.meta.url),new URL('../assets/runtime/bg_rocky_cove_surface_hq.webp',import.meta.url)),
    adaptiveImage('fg-pier-rocky',new URL('../assets/runtime/fg_rocky_cove_surface.webp',import.meta.url),new URL('../assets/runtime/fg_rocky_cove_surface_hq.webp',import.meta.url)),
    adaptiveImage('bg-underwater-rocky',new URL('../assets/runtime/bg_underwater_rocky_cove.webp',import.meta.url),new URL('../assets/runtime/bg_underwater_rocky_cove_hq.webp',import.meta.url)),
    adaptiveImage('fg-underwater-rocky',new URL('../assets/runtime/fg_underwater_rocky.webp',import.meta.url),new URL('../assets/runtime/fg_underwater_rocky_hq.webp',import.meta.url)),
    image('fish-kelp-wrasse',new URL('../assets/runtime/fish_kelp_wrasse.webp',import.meta.url)),
    image('fish-tide-mackerel',new URL('../assets/runtime/fish_tide_mackerel.webp',import.meta.url)),
    image('fish-ember-rockfish',new URL('../assets/runtime/fish_ember_rockfish.webp',import.meta.url)),
    image('fish-pebble-goby',new URL('../assets/runtime/fish_pebble_goby.webp',import.meta.url)),
    image('fish-storm-snapper',new URL('../assets/runtime/fish_storm_snapper.webp',import.meta.url)),
    image('treasure-barnacle-bell',new URL('../assets/runtime/treasure_barnacle_bell.webp',import.meta.url)),
    image('treasure-lost-spyglass',new URL('../assets/runtime/treasure_lost_spyglass.webp',import.meta.url)),
    image('treasure-sea-glass-charm',new URL('../assets/runtime/treasure_sea_glass_charm.webp',import.meta.url))
  ],
  'moonlit-trench':[
    audio('ambient-underwater-moonlit',new URL('../assets/audio/runtime/ambient_underwater_moonlit.m4a',import.meta.url)),
    adaptiveImage('bg-underwater-moonlit',new URL('../assets/runtime/bg_underwater_moonlit_trench.webp',import.meta.url),new URL('../assets/runtime/bg_underwater_moonlit_trench_hq.webp',import.meta.url)),
    adaptiveImage('fg-underwater-moonlit',new URL('../assets/runtime/fg_underwater_moonlit.webp',import.meta.url),new URL('../assets/runtime/fg_underwater_moonlit_hq.webp',import.meta.url)),
    image('fish-lantern-fin',new URL('../assets/runtime/fish_lantern_fin.webp',import.meta.url)),
    image('fish-midnight-eel',new URL('../assets/runtime/fish_midnight_eel.webp',import.meta.url)),
    image('fish-royal-starfin',new URL('../assets/runtime/fish_royal_starfin.webp',import.meta.url)),
    image('fish-velvet-lantern',new URL('../assets/runtime/fish_velvet_lantern.webp',import.meta.url)),
    image('fish-crescent-ray',new URL('../assets/runtime/fish_crescent_ray.webp',import.meta.url)),
    image('treasure-glow-crystal',new URL('../assets/runtime/treasure_glow_crystal.webp',import.meta.url)),
    image('treasure-captain-locket',new URL('../assets/runtime/treasure_captain_locket.webp',import.meta.url)),
    image('treasure-ancient-idol',new URL('../assets/runtime/treasure_ancient_idol.webp',import.meta.url))
  ]
};

export function queueMissingAssets(scene:Phaser.Scene,assets:GameAsset[]){
  let queued=0;
  for(const asset of assets){
    const exists=asset.kind==='image'?scene.textures.exists(asset.key):scene.cache.audio.exists(asset.key);
    if(exists)continue;
    if(asset.kind==='image')scene.load.image(asset.key,asset.url);else scene.load.audio(asset.key,asset.url);
    queued++;
  }
  return queued;
}

export function configurePierTextureFrames(scene:Phaser.Scene){
  const clouds=scene.textures.get('surface-clouds');
  if(!clouds.has('cloud-a')){
    clouds.add('cloud-a',0,70,375,430,175);
    clouds.add('cloud-b',0,585,365,410,190);
    clouds.add('cloud-c',0,1060,378,430,175);
  }
  const icons=scene.textures.get('upgrade-icons');
  if(!icons.has('line-icon')){
    const source=icons.getSourceImage() as HTMLImageElement,halfWidth=Math.floor(source.width/2),halfHeight=Math.floor(source.height/2);
    icons.add('line-icon',0,0,0,halfWidth,halfHeight);
    icons.add('reel-icon',0,halfWidth,0,source.width-halfWidth,halfHeight);
    icons.add('basket-icon',0,0,halfHeight,halfWidth,source.height-halfHeight);
    icons.add('bait-icon',0,halfWidth,halfHeight,source.width-halfWidth,source.height-halfHeight);
  }
  const boats=scene.textures.get('hub-boat-states');
  if(!boats.has('boat-broken')){
    const source=boats.getSourceImage() as HTMLImageElement,width=Math.floor(source.width/2),height=Math.floor(source.height/2);
    boats.add('boat-broken',0,0,0,width,height);
    boats.add('boat-hull',0,width,0,source.width-width,height);
    boats.add('boat-motor',0,0,height,width,source.height-height);
    boats.add('boat-ready',0,width,height,source.width-width,source.height-height);
  }
  const equipment=scene.textures.get('equipment-progression');
  if(!equipment.has('line-tier-0')){
    const source=equipment.getSourceImage() as HTMLImageElement,cellWidth=Math.floor(source.width/4),cellHeight=Math.floor(source.height/4),names=['line','reel','basket','bait'];
    for(let tier=0;tier<4;tier++)for(let column=0;column<4;column++)equipment.add(`${names[column]}-tier-${tier}`,0,column*cellWidth,tier*cellHeight,column===3?source.width-column*cellWidth:cellWidth,tier===3?source.height-tier*cellHeight:cellHeight);
  }
  const badges=scene.textures.get('badge-collection');
  if(!badges.has('badge-first-catch')){
    const source=badges.getSourceImage() as HTMLImageElement,cellWidth=Math.floor(source.width/4),cellHeight=Math.floor(source.height/4),ids=['first-catch','secret-finder','ten-fish','fifty-fish','sunny-complete','sunny-master','boat-ready','cove-catch','cove-complete','moonlit-catch','trench-complete','treasure-five','master-angler'];
    ids.forEach((id,index)=>{const column=index%4,row=Math.floor(index/4);badges.add(`badge-${id}`,0,column*cellWidth,row*cellHeight,column===3?source.width-column*cellWidth:cellWidth,row===3?source.height-row*cellHeight:cellHeight)});
  }
  const decorations=scene.textures.get('menu-decorations');
  if(!decorations.has('decor-wax-seal')){
    const source=decorations.getSourceImage() as HTMLImageElement,cellWidth=Math.floor(source.width/3),cellHeight=Math.floor(source.height/3),names=['wax-seal','ribbon','mastery','tape','paperclip','map-pin','repair-check','rope-tab','compass'];
    names.forEach((name,index)=>{const column=index%3,row=Math.floor(index/3);decorations.add(`decor-${name}`,0,column*cellWidth,row*cellHeight,column===2?source.width-column*cellWidth:cellWidth,row===2?source.height-row*cellHeight:cellHeight)});
  }
  const repairs=scene.textures.get('boat-repair-steps');
  if(!repairs.has('repair-hull')){
    const source=repairs.getSourceImage() as HTMLImageElement,cellWidth=Math.floor(source.width/3),names=['hull','motor','outfitting'];
    names.forEach((name,index)=>repairs.add(`repair-${name}`,0,index*cellWidth,0,index===2?source.width-index*cellWidth:cellWidth,source.height));
  }
}
