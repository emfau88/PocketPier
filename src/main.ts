import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { PierGameplayScene } from './scenes/PierGameplayScene';
import { TripSummaryScene } from './scenes/TripSummaryScene';
import { LoadingScene } from './scenes/LoadingScene';
import { RENDER_HEIGHT, RENDER_WIDTH } from './core/RenderQuality';
import { PortalBridge } from './core/PortalBridge';

void PortalBridge.init();
const game=new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#77cbd1',
  scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH, autoRound:true, width: RENDER_WIDTH, height: RENDER_HEIGHT },
  input: { activePointers: 3 },
  scene: [BootScene, MainMenuScene, LoadingScene, PierGameplayScene, TripSummaryScene],
  render: { antialias: true, antialiasGL:true, pixelArt: false, roundPixels:true }
});
window.addEventListener('pocketpier:ad-started',()=>game.loop.sleep());
window.addEventListener('pocketpier:ad-finished',()=>game.loop.wake());
