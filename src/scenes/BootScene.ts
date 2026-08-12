import Phaser from 'phaser';
import { PortalBridge } from '../core/PortalBridge';
import { AudioService } from '../core/AudioService';
import { MENU_ASSETS, queueMissingAssets } from '../core/AssetManifest';
import { COLORS } from '../core/GameConfig';
import { configureSceneRendering } from '../core/RenderQuality';
export class BootScene extends Phaser.Scene {
  constructor(){ super('Boot'); }
  preload(){
    configureSceneRendering(this);this.cameras.main.setBackgroundColor(COLORS.navy);
    const title=this.add.text(480,220,'POCKET PIER',{fontSize:'42px',fontStyle:'bold',color:'#fff6dc'}).setOrigin(.5);
    const track=this.add.rectangle(480,305,420,28,0x0f2935).setStrokeStyle(3,COLORS.cream),bar=this.add.rectangle(275,305,0,18,COLORS.coral).setOrigin(0,.5);
    const status=this.add.text(480,350,'FOLLOWING THE TIDE…',{fontSize:'15px',fontStyle:'bold',color:'#a9e5dc'}).setOrigin(.5);
    this.load.on('progress',(value:number)=>bar.width=410*value);this.load.on('loaderror',()=>status.setText('SOMETHING WASHED OVERBOARD'));
    queueMissingAssets(this,MENU_ASSETS);void title;void track;
  }
  async create(){
    AudioService.bind(this.sound);
    await PortalBridge.init();
    const system=PortalBridge.systemInfo();
    PortalBridge.submitAnalyticsEvent('system_ready',{
      device:system?.device?.type??'unknown',os:system?.os?.name??'unknown',browser:system?.browser?.name??'unknown',application:system?.applicationType??'web',locale:system?.locale??'unknown'
    });
    PortalBridge.loadingStop();this.scene.start('Menu');
  }
}
