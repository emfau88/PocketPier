import Phaser from 'phaser';
import { PortalBridge } from '../core/PortalBridge';
export class BootScene extends Phaser.Scene {
  constructor(){ super('Boot'); }
  preload(){
    this.load.image('bg-pier',new URL('../assets/generated/bg_sunny_pier.png',import.meta.url).href);
    this.load.image('bg-pier-cloudless',new URL('../assets/generated/bg_sunny_pier_cloudless.png',import.meta.url).href);
    this.load.image('surface-clouds',new URL('../assets/generated/surface_clouds.png',import.meta.url).href);
    this.load.image('fish-minnow',new URL('../assets/generated/fish_minnow_hero.png',import.meta.url).href);
    this.load.image('fish-sardine',new URL('../assets/generated/fish_sardine_hero.png',import.meta.url).href);
    this.load.image('splash',new URL('../assets/generated/fx_water_splash.png',import.meta.url).href);
    this.load.image('bg-underwater',new URL('../assets/generated/bg_underwater_sunny_pier.png',import.meta.url).href);
    this.load.image('hook-spool',new URL('../assets/generated/hook_spool.png',import.meta.url).href);
    this.load.image('angler-holding-rod',new URL('../assets/generated/character_angler_holding_rod.png',import.meta.url).href);
    this.load.image('angler-chair-perspective',new URL('../assets/generated/character_angler_chair_perspective.png',import.meta.url).href);
    this.load.image('hub-cooler',new URL('../assets/generated/hub_cooler.png',import.meta.url).href);
    this.load.image('hook-seadragon',new URL('../assets/generated/hook_seadragon.png',import.meta.url).href);
    this.load.image('secret-bottle',new URL('../assets/generated/secret_bottle.png',import.meta.url).href);
    this.load.image('secret-pearl',new URL('../assets/generated/secret_pearl.png',import.meta.url).href);
    this.load.image('secret-compass',new URL('../assets/generated/secret_compass.png',import.meta.url).href);
    this.load.image('menu-sky',new URL('../assets/generated/menu_sky_base.png',import.meta.url).href);
    this.load.image('menu-water',new URL('../assets/generated/menu_water_base.png',import.meta.url).href);
    this.load.image('menu-horizon',new URL('../assets/generated/menu_horizon_islands.png',import.meta.url).href);
    this.load.image('menu-pier',new URL('../assets/generated/menu_pier_foreground.png',import.meta.url).href);
    this.load.image('menu-wave-far',new URL('../assets/generated/menu_wave_far.png',import.meta.url).href);
    this.load.image('menu-wave-mid',new URL('../assets/generated/menu_wave_mid.png',import.meta.url).href);
    this.load.image('menu-wave-near',new URL('../assets/generated/menu_wave_near.png',import.meta.url).href);
    this.load.image('menu-clouds',new URL('../assets/generated/menu_clouds.png',import.meta.url).href);
    this.load.image('menu-gull-up',new URL('../assets/generated/menu_gull_up.png',import.meta.url).href);
    this.load.image('menu-gull-glide',new URL('../assets/generated/menu_gull_glide.png',import.meta.url).href);
    this.load.image('menu-gull-down',new URL('../assets/generated/menu_gull_down.png',import.meta.url).href);
  }
  async create(){
    const clouds=this.textures.get('surface-clouds');
    clouds.add('cloud-a',0,70,375,430,175);
    clouds.add('cloud-b',0,585,365,410,190);
    clouds.add('cloud-c',0,1060,378,430,175);
    await PortalBridge.init();this.scene.start('Menu');
  }
}
