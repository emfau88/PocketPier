import Phaser from 'phaser';
import { COLORS } from '../core/GameConfig';
export function button(scene: Phaser.Scene,x:number,y:number,label:string,action:()=>void,width=250){
 const bg=scene.add.rectangle(x,y,width,58,COLORS.coral).setStrokeStyle(3,COLORS.cream).setInteractive({useHandCursor:true});
 const tx=scene.add.text(x,y,label,{fontFamily:'system-ui',fontSize:'24px',fontStyle:'bold',color:'#fff6dc'}).setOrigin(.5);
 bg.on('pointerdown',()=>{bg.setScale(.96);action()}).on('pointerup',()=>bg.setScale(1)).on('pointerout',()=>bg.setScale(1)); return scene.add.container(0,0,[bg,tx]);
}
