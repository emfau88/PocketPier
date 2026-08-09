import Phaser from 'phaser';
import { LOCATION_ASSETS, PIER_ASSETS, configurePierTextureFrames, queueMissingAssets } from '../core/AssetManifest';
import { COLORS } from '../core/GameConfig';
import { PortalBridge } from '../core/PortalBridge';
import { configureSceneRendering } from '../core/RenderQuality';
import type { FishingLocationId } from '../gameplay/FishingLocation';

export class LoadingScene extends Phaser.Scene {
  private locationId:FishingLocationId='sunny-pier';
  private failed=false;
  private bar?:Phaser.GameObjects.Rectangle;
  private status?:Phaser.GameObjects.Text;

  constructor(){super('Loading')}
  init(data:{locationId?:FishingLocationId}={}){this.locationId=data.locationId??'sunny-pier';this.failed=false}

  preload(){
    configureSceneRendering(this);PortalBridge.loadingStart();
    this.cameras.main.setBackgroundColor(COLORS.navy);
    this.add.text(480,205,'PACKING THE TACKLE BOX…',{fontSize:'28px',fontStyle:'bold',color:'#fff6dc'}).setOrigin(.5);
    this.add.rectangle(480,280,520,34,0x0f2935).setStrokeStyle(3,COLORS.cream);
    this.bar=this.add.rectangle(225,280,0,24,COLORS.coral).setOrigin(0,.5);
    this.status=this.add.text(480,330,'LOADING  0%',{fontSize:'16px',fontStyle:'bold',color:'#a9e5dc'}).setOrigin(.5);
    const queued=queueMissingAssets(this,PIER_ASSETS)+queueMissingAssets(this,LOCATION_ASSETS[this.locationId]);
    if(queued===0){this.bar.width=510;this.status.setText('READY');}
    this.load.on('progress',(value:number)=>{if(this.bar)this.bar.width=510*value;this.status?.setText(`LOADING  ${Math.round(value*100)}%`)});
    this.load.on('loaderror',()=>{this.failed=true;this.status?.setText('THE TIDE DROPPED A FILE…')});
  }

  create(){
    PortalBridge.loadingStop();
    if(this.failed){
      const retry=this.add.text(480,390,'TRY AGAIN',{fontSize:'18px',fontStyle:'bold',color:'#fff6dc',backgroundColor:'#ef6b4a'}).setPadding(18,11).setOrigin(.5).setInteractive({useHandCursor:true});
      retry.on('pointerdown',()=>this.scene.restart({locationId:this.locationId}));return;
    }
    configurePierTextureFrames(this);this.scene.start('Pier',{locationId:this.locationId});
  }
}
