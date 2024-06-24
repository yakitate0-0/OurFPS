import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

let camera, scene, renderer;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let canJump = true;
let isJumping = false;
let isCrouching = false; // しゃがみ状態のフラグ
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let walls = []; // 壁のバウンディングボックスを格納する配列
const jumpSpeed = 9.0;
const gravity = 30.0;
const clock = new THREE.Clock();
const pitchObject = new THREE.Object3D();
const yawObject = new THREE.Object3D();
const normalSpeed = 50.0;
const crouchSpeed = 20.0; // しゃがみ時の速度
const normalHeight = 1.5; // 通常時の高さ
const crouchHeight = 1.1; // しゃがみ時の高さ

// 初期化関数
export function init() {
    // ロード画面の表示
    showLoadingScreen();

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    pitchObject.add(camera);
    yawObject.add(pitchObject);
    scene.add(yawObject);

    yawObject.position.y = normalHeight;

    renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#FPSCanvas'),
        antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 3.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/');
    loader.setDRACOLoader(dracoLoader);

    loader.load(
        'assets/models/stage.glb',
        function (gltf) {
            // walls 配列をクリア
            walls.length = 0;
    
            scene.add(gltf.scene);
            gltf.scene.traverse(function (child) {
                if (child.isMesh) {
                    child.geometry.computeBoundingBox();
                    // メッシュが見える場合のみバウンディングボックスを設定
                    if (child.visible && child.material.opacity !== 0 && !child.name.toLowerCase().includes('floor')) {
                        let box = new THREE.Box3().setFromObject(child);
                        // 重複するバウンディングボックスを追加しない
                        if (!walls.some(existingBox => existingBox.equals(box))) {
                            walls.push(box);
                            createBoundingBoxHelper(box, 0x00ff00); // 壁のバウンディングボックスを視覚化
                        }
                    }
                }
            });
            hideLoadingScreen();
        },
        undefined,
        function (error) {
            console.error(error);
            hideLoadingScreen();
        }
    );
    

    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);

    window.addEventListener('resize', onWindowResize, false);

    const canvas = document.querySelector('#FPSCanvas');
    canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
    canvas.addEventListener('click', () => {
        canvas.requestPointerLock();
    });

    animate(); // アニメーションループの開始
}

// ロード画面を表示する関数
function showLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex'; // 表示
    }
}

// ロード画面を非表示にする関数
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none'; // 非表示
    }
}

// ウィンドウサイズ変更の処理
export function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// マウス移動の処理
export function onMouseMove(event) {
    if (document.pointerLockElement === document.querySelector('#FPSCanvas')) {
        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        yawObject.rotation.y -= movementX * 0.002;
        pitchObject.rotation.x -= movementY * 0.002;

        pitchObject.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitchObject.rotation.x));
    }
}

// キーボードの押下処理
export function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW':
            moveForward = true;
            break;
        case 'KeyA':
            moveLeft = true;
            break;
        case 'KeyS':
            moveBackward = true;
            break;
        case 'KeyD':
            moveRight = true;
            break;
        case 'Space':
            if (canJump) {
                velocity.y = jumpSpeed;
                canJump = false;
                isJumping = true;
            }
            break;
        case 'ShiftLeft':
            if (!isJumping) {
                isCrouching = true; // しゃがみ状態を有効化
                yawObject.position.y = crouchHeight; // 直接高さを変更
            }
            break;
    }
    console.log(`KeyDown: ${event.code}`); // デバッグ: キー押下イベント
}

// キーボードの解放処理
export function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW':
            moveForward = false;
            break;
        case 'KeyA':
            moveLeft = false;
            break;
        case 'KeyS':
            moveBackward = false;
            break;
        case 'KeyD':
            moveRight = false;
            break;
        case 'ShiftLeft':
            isCrouching = false; // しゃがみ状態を解除
            if (!isJumping) {
                yawObject.position.y = normalHeight; // 直接高さを変更
            }
            break;
    }
    console.log(`KeyUp: ${event.code}`); // デバッグ: キー解放イベント
}

// 衝突チェック関数
function checkCollision(position) {
    // キャラクターのバウンディングボックスのサイズと位置を調整
    let playerBox = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(position.x, position.y + normalHeight / 2, position.z), 
        new THREE.Vector3(0.5, normalHeight, 0.5) // サイズを調整
    );

    // 視覚化を一時的に除外
    // createBoundingBoxHelper(playerBox, 0xff0000);

    for (let wall of walls) {
        let wallBox = wall.clone(); // バウンディングボックスをコピー
        // Y軸の高さを無視するためにY方向の範囲を広げる
        wallBox.min.y = -Infinity;
        wallBox.max.y = Infinity;
        
        if (playerBox.intersectsBox(wallBox)) {
            console.log('Collision detected:', playerBox, wallBox); // デバッグ: 衝突の詳細をログ出力
            return true; // 衝突あり
        }
    }
    console.log('No collision:', playerBox); // デバッグ: 衝突なしの詳細をログ出力
    return false; // 衝突なし
}

// バウンディングボックスを視覚化する関数
function createBoundingBoxHelper(box3, color) {
    const helper = new THREE.Box3Helper(box3, color);
    scene.add(helper);
    return helper;
}

// アニメーションループ
export function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveLeft) - Number(moveRight);
    direction.normalize();

    const currentSpeed = isCrouching ? crouchSpeed : normalSpeed;

    if (moveForward || moveBackward) velocity.z -= direction.z * currentSpeed * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * currentSpeed * delta;

    velocity.y -= gravity * delta;

    // 仮想的に移動先の位置を計算
    let newPositionX = yawObject.position.clone().add(new THREE.Vector3(velocity.x * delta, 0, 0));
    let newPositionZ = yawObject.position.clone().add(new THREE.Vector3(0, 0, velocity.z * delta));

    // 衝突チェック
    let canMoveX = !checkCollision(newPositionX);
    let canMoveZ = !checkCollision(newPositionZ);

    console.log(`canMoveX: ${canMoveX}, canMoveZ: ${canMoveZ}, yawObject.position: ${yawObject.position.x}, ${yawObject.position.y}, ${yawObject.position.z}`); // デバッグ: 衝突チェック

    if (canMoveX) {
        yawObject.translateX(velocity.x * delta); // X軸の移動
    }
    if (canMoveZ) {
        yawObject.translateZ(velocity.z * delta); // Z軸の移動
    }

    yawObject.position.y += velocity.y * delta;

    if (yawObject.position.y < normalHeight && velocity.y < 0) {
        yawObject.position.y = Math.max(crouchHeight, normalHeight);
        velocity.y = 0;
        canJump = true;
        isJumping = false;
    }

    renderer.render(scene, camera);
}
