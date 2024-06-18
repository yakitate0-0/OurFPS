import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export function initScene() {
    // シーンを作成する
    const scene = new THREE.Scene();

    // カメラを作成する
    const camera = new THREE.PerspectiveCamera(
        75, // 視野角
        window.innerWidth / window.innerHeight, // アスペクト比
        0.1, // ニアクリップ面
        1000 // ファークリップ面
    );
    camera.position.z = 5; // カメラの位置を設定する

    // レンダラーを作成する
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // OrbitControlsを追加する
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.zoomSpeed = 0.5;
    controls.update(); // 初期化時に一度だけ呼び出す

    // AmbientLightを追加する
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    // GLTFLoaderとDRACOLoaderを作成し、設定する
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader(); // DRACOLoaderのインスタンスを作成
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/');
    loader.setDRACOLoader(dracoLoader); // GLTFLoaderにDRACOLoaderのインスタンスを提供

    // 3Dモデルのロード
    loader.load(
        "assets/models/stage.glb",
        function (glb) {
            scene.add(gltf.scene);
        },
        undefined,
        function (error) {
            console.error(error);
        }
    );

    // イベントリスナーを追加してウィンドウリサイズに対応
    window.addEventListener('resize', () => onWindowResize(camera, renderer));

    return { scene, camera, renderer };
}

export function animate(renderer, scene, camera) {
    requestAnimationFrame(() => animate(renderer, scene, camera));
    renderer.render(scene, camera);
}

// ウィンドウのリサイズに対応するための関数
function onWindowResize(camera, renderer) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
