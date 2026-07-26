import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './GameConfig';

export type RenderScale=1|1.5|2;

export function selectRenderScale(viewportWidth:number,viewportHeight:number,devicePixelRatio:number,coarsePointer:boolean):RenderScale{
  const fitScale=Math.min(viewportWidth/GAME_WIDTH,viewportHeight/GAME_HEIGHT);
  const pixelDemand=Math.max(1,fitScale*Math.max(1,devicePixelRatio));
  const capped=Math.min(coarsePointer?1.5:2,pixelDemand);
  if(capped>=1.75)return 2;
  if(capped>=1.25)return 1.5;
  return 1;
}

const viewportWidth=typeof window==='undefined'?GAME_WIDTH:window.innerWidth;
const viewportHeight=typeof window==='undefined'?GAME_HEIGHT:window.innerHeight;
const devicePixelRatio=typeof window==='undefined'?1:window.devicePixelRatio||1;
const coarsePointer=typeof window!=='undefined'&&(window.matchMedia?.('(pointer: coarse)').matches??false);

export const RENDER_SCALE=selectRenderScale(viewportWidth,viewportHeight,devicePixelRatio,coarsePointer);
export const RENDER_WIDTH=Math.round(GAME_WIDTH*RENDER_SCALE);
export const RENDER_HEIGHT=Math.round(GAME_HEIGHT*RENDER_SCALE);

export function configureSceneRendering(scene:Phaser.Scene){
  scene.cameras.main.setViewport(0,0,RENDER_WIDTH,RENDER_HEIGHT).setZoom(RENDER_SCALE).centerOn(GAME_WIDTH/2,GAME_HEIGHT/2);

  const applyTextResolution=(gameObject:Phaser.GameObjects.GameObject)=>{
    if(gameObject.type==='Text')(gameObject as Phaser.GameObjects.Text).setResolution(RENDER_SCALE);
  };
  scene.events.on('addedtoscene',applyTextResolution);
  scene.events.once('shutdown',()=>scene.events.off('addedtoscene',applyTextResolution));
}
