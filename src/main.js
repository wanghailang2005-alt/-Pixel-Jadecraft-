import Phaser from 'phaser';

class SetupScene extends Phaser.Scene {
  create() {
    this.add.text(480, 230, '玉石游戏 · 开发环境已就绪', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '30px',
      color: '#b6ebc7',
    }).setOrigin(0.5);
    this.add.text(480, 295, `Phaser ${Phaser.VERSION}`, {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#d5c69e',
    }).setOrigin(0.5);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  backgroundColor: '#101c1b',
  pixelArt: true,
  scene: SetupScene,
});
