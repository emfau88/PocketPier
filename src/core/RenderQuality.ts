import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './GameConfig';

export type RenderScale=1|1.5|2;
export interface RenderMetrics { scale:RenderScale;width:number;height:number }
export interface SafeAreaInsets { top:number;right:number;bottom:number;left:number }
export interface ViewportRect { left:number;top:number;right:number;bottom:number }
export interface VisibleGameBounds extends ViewportRect { width:number;height:number;centerX:number;centerY:number }

export function selectRenderScale(viewportWidth:number,viewportHeight:number,devicePixelRatio:number,coarsePointer:boolean):RenderScale{
  const fitScale=Math.min(viewportWidth/GAME_WIDTH,viewportHeight/GAME_HEIGHT);
  const pixelDemand=Math.max(1,fitScale*Math.max(1,devicePixelRatio));
  const capped=Math.min(coarsePointer?1.5:2,pixelDemand);
  if(capped>=1.75)return 2;
  if(capped>=1.25)return 1.5;
  return 1;
}

export function currentRenderMetrics():RenderMetrics{
  const viewportWidth=typeof window==='undefined'?GAME_WIDTH:window.innerWidth;
  const viewportHeight=typeof window==='undefined'?GAME_HEIGHT:window.innerHeight;
  const devicePixelRatio=typeof window==='undefined'?1:window.devicePixelRatio||1;
  const coarsePointer=typeof window!=='undefined'&&(window.matchMedia?.('(pointer: coarse)').matches??false);
  const scale=selectRenderScale(viewportWidth,viewportHeight,devicePixelRatio,coarsePointer);
  return {scale,width:Math.round(GAME_WIDTH*scale),height:Math.round(GAME_HEIGHT*scale)};
}

const initial=currentRenderMetrics();
export const RENDER_SCALE=initial.scale;
export const RENDER_WIDTH=initial.width;
export const RENDER_HEIGHT=initial.height;

export function contentCropInsets(canvas:ViewportRect,viewport:ViewportRect):SafeAreaInsets{
  return {
    top:Math.max(0,viewport.top-canvas.top),
    right:Math.max(0,canvas.right-viewport.right),
    bottom:Math.max(0,canvas.bottom-viewport.bottom),
    left:Math.max(0,viewport.left-canvas.left)
  };
}

export function safeAreaInsets(scene:Phaser.Scene):SafeAreaInsets{
  if(typeof window==='undefined')return {top:0,right:0,bottom:0,left:0};
  const style=getComputedStyle(document.documentElement),rect=scene.game.canvas.getBoundingClientRect();
  const xScale=rect.width>0?GAME_WIDTH/rect.width:1,yScale=rect.height>0?GAME_HEIGHT/rect.height:1;
  const visual=window.visualViewport,viewport={
    left:visual?.offsetLeft??0,top:visual?.offsetTop??0,
    right:(visual?.offsetLeft??0)+(visual?.width??window.innerWidth),
    bottom:(visual?.offsetTop??0)+(visual?.height??window.innerHeight)
  };
  const crop=contentCropInsets(rect,viewport);
  const px=(name:string)=>Math.max(0,Number.parseFloat(style.getPropertyValue(name))||0);
  return {
    top:(crop.top+px('--safe-area-top'))*yScale,right:(crop.right+px('--safe-area-right'))*xScale,
    bottom:(crop.bottom+px('--safe-area-bottom'))*yScale,left:(crop.left+px('--safe-area-left'))*xScale
  };
}

export function visibleGameBounds(scene:Phaser.Scene):VisibleGameBounds{
  const safe=safeAreaInsets(scene),left=safe.left,top=safe.top,right=GAME_WIDTH-safe.right,bottom=GAME_HEIGHT-safe.bottom;
  return {left,top,right,bottom,width:Math.max(1,right-left),height:Math.max(1,bottom-top),centerX:(left+right)/2,centerY:(top+bottom)/2};
}

export function scaleToVisibleBounds(bounds:Pick<VisibleGameBounds,'width'|'height'>,contentWidth:number,contentHeight:number,maxScale=1){
  return Math.min(maxScale,bounds.width/contentWidth,bounds.height/contentHeight);
}

export function compactViewport(scene:Phaser.Scene){
  const rect=scene.game.canvas.getBoundingClientRect();return rect.width<=900||rect.height<=500;
}

export function configureSceneRendering(scene:Phaser.Scene){
  let currentScale:RenderScale=currentRenderMetrics().scale,scheduled=0;
  const applyTextResolution=(gameObject:Phaser.GameObjects.GameObject)=>{
    if(gameObject.type==='Text')(gameObject as Phaser.GameObjects.Text).setResolution(currentScale);
  };
  const apply=()=>{
    scheduled=0;const metrics=currentRenderMetrics();currentScale=metrics.scale;
    if(scene.scale.gameSize.width!==metrics.width||scene.scale.gameSize.height!==metrics.height)scene.scale.resize(metrics.width,metrics.height);
    scene.cameras.main.setViewport(0,0,metrics.width,metrics.height).setZoom(metrics.scale).centerOn(GAME_WIDTH/2,GAME_HEIGHT/2);
    scene.children.list.forEach(applyTextResolution);scene.events.emit('render-quality-changed',metrics);
  };
  const schedule=()=>{if(!scheduled)scheduled=window.requestAnimationFrame(apply)};

  scene.events.on('addedtoscene',applyTextResolution);
  if(typeof window!=='undefined'){
    window.addEventListener('resize',schedule,{passive:true});window.addEventListener('orientationchange',schedule,{passive:true});document.addEventListener('fullscreenchange',schedule);
  }
  scene.events.once('shutdown',()=>{
    scene.events.off('addedtoscene',applyTextResolution);
    if(typeof window!=='undefined'){
      window.removeEventListener('resize',schedule);window.removeEventListener('orientationchange',schedule);document.removeEventListener('fullscreenchange',schedule);
      if(scheduled)window.cancelAnimationFrame(scheduled);
    }
  });
  apply();
}
