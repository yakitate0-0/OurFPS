import { initScene, animate } from './game.js';

// Three.jsシーンを初期化する
const { scene, camera, renderer } = initScene();

// アニメーションループを開始する
animate(renderer, scene, camera);
