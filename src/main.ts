import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { PierGameplayScene } from './scenes/PierGameplayScene';
import { TripSummaryScene } from './scenes/TripSummaryScene';
import { RENDER_HEIGHT, RENDER_WIDTH } from './core/RenderQuality';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#77cbd1',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: RENDER_WIDTH, height: RENDER_HEIGHT },
  input: { activePointers: 3 },
  scene: [BootScene, MainMenuScene, PierGameplayScene, TripSummaryScene],
  render: { antialias: true, pixelArt: false }
});
