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
let spotLight;
let loadedModels = 0;
let gunModel;
let isShooting = false;
let ammo = 50;
let isReloading = false;
let lastShotTime = 0;
const fireRate = 100; // 連射の間隔（ミリ秒）
const reloadTime = 2000; // リロード時間（ミリ秒）
const totalModels = 5; // 読み込むモデルの総数
const jumpSpeed = 9.0;
const gravity = 30.0;
const clock = new THREE.Clock();
const pitchObject = new THREE.Object3D();
const yawObject = new THREE.Object3D();
const normalSpeed = 60.0;
const crouchSpeed = 20.0; // しゃがみ時の速度
const normalHeight = 1.5; // 通常時の高さ
const crouchHeight = 1.1; // しゃがみ時の高さ
const lightSize = 6;
const FLOOR_SIZE_x = 26;
const FLOOR_SIZE_z = 20;
const nomalLight = 1;
const shoot_sound = new Audio("/assets/sounds/shoot.mp3");
const reload_sound = new Audio("/assets/sounds/reload.mp3");

let wallBoxes = []; // 壁のバウンディングボックスを格納する配列

// 初期化関数
export function init() {
    // ロード画面の表示
    showLoadingScreen();
    document.getElementById('aiming').style.display = 'none';

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // スポットライトの初期化
    spotLight = new THREE.SpotLight(0xffffff, 3.5, 100, Math.PI / lightSize, 0.1, 1);
    spotLight.position.set(0, 0, 0);
    spotLight.target.position.set(0, 0, -1);
    spotLight.visible = false; // 初期状態はオフ

    camera.add(spotLight);
    camera.add(spotLight.target);

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
    renderer.domElement.style.position = 'absolute'; // 追加: canvasの位置を絶対位置に設定
    renderer.domElement.style.top = '0'; // 追加: canvasのトップ位置を0に設定

    const ambientLight = new THREE.AmbientLight(0xffffff, nomalLight);
    scene.add(ambientLight);

    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/');
    loader.setDRACOLoader(dracoLoader);

    function onProgress(xhr) {
        if (xhr.lengthComputable) {
            const percentComplete = Math.round((xhr.loaded / xhr.total) * 100);
            document.getElementById('loading-text').innerText = `Loading: ${percentComplete}%`;
        }
    }

    function modelLoaded() {
        loadedModels++;
        if (loadedModels === totalModels) {
            hideLoadingScreen();
            document.getElementById('aiming').style.display = 'block';
        }
    }

    loader.load(
        'assets/models/wall.glb',
        function (gltf) {
            const wall1 = gltf.scene.clone();
            wall1.position.set(4, 1, 6); // 壁1の位置を設定
            scene.add(wall1);
            wall1.updateMatrixWorld(); // 位置を更新
            wall1.traverse(child => {
                if (child.isMesh) {
                    const box = new THREE.Box3().setFromObject(child);
                    wallBoxes.push(box);

                    // バウンディングボックスの可視化用
                    // const boxHelper = new THREE.BoxHelper(child, 0xffff00);
                    // scene.add(boxHelper);

                    // マテリアルの設定を確認
                    child.material = new THREE.MeshStandardMaterial({
                        map: child.material.map,
                        color: child.material.color,
                        metalness: 0.5,
                        roughness: 0.5
                    });
                }
            });

            const wall2 = gltf.scene.clone();
            wall2.position.set(-4, 1, -6); // 壁2の位置を設定
            scene.add(wall2);
            wall2.updateMatrixWorld(); // 位置を更新
            wall2.traverse(child => {
                if (child.isMesh) {
                    const box = new THREE.Box3().setFromObject(child);
                    wallBoxes.push(box);

                    // バウンディングボックスの可視化用
                    // const boxHelper = new THREE.BoxHelper(child, 0xffff00);
                    // scene.add(boxHelper);

                    // マテリアルの設定を確認
                    child.material = new THREE.MeshStandardMaterial({
                        map: child.material.map,
                        color: child.material.color,
                        metalness: 0.5,
                        roughness: 0.5
                    });
                }
            });
            modelLoaded();
        },
        onProgress
    );

    loader.load(
        'assets/models/warehouse.glb',
        function (gltf) {
            gltf.scene.position.set(8, 0, 1.5); // warahouseの位置を設定
            scene.add(gltf.scene);
            gltf.scene.updateMatrixWorld(); // 位置を更新
            gltf.scene.traverse(child => {
                if (child.isMesh) {
                    const box = new THREE.Box3().setFromObject(child);
                    wallBoxes.push(box);

                    // バウンディングボックスの可視化用
                    // const boxHelper = new THREE.BoxHelper(child, 0xffff00);
                    // scene.add(boxHelper);

                    // マテリアルの設定を確認
                    child.material = new THREE.MeshStandardMaterial({
                        map: child.material.map,
                        color: child.material.color,
                        metalness: 0.5,
                        roughness: 0.5
                    });
                }
            });
            modelLoaded();
        },
        onProgress
    );

    loader.load(
        'assets/models/house2.glb',
        function (gltf) {
            gltf.scene.position.set(5, 0.01, -4); // house2の位置を設定
            scene.add(gltf.scene);
            gltf.scene.updateMatrixWorld(); // 位置を更新
            gltf.scene.traverse(child => {
                if (child.isMesh) {
                    const box = new THREE.Box3().setFromObject(child);
                    wallBoxes.push(box);

                    // バウンディングボックスの可視化用
                    // const boxHelper = new THREE.BoxHelper(child, 0xffff00);
                    // scene.add(boxHelper);

                    // マテリアルの設定を確認
                    child.material = new THREE.MeshStandardMaterial({
                        map: child.material.map,
                        color: child.material.color,
                        metalness: 0.5,
                        roughness: 0.5
                    });
                }
            });
            modelLoaded();
        },
        onProgress
    );

    loader.load(
        'assets/models/house1.glb',
        function (gltf) {
            gltf.scene.position.set(-4, 0.01, 2); // house1の位置を設定
            scene.add(gltf.scene);
            gltf.scene.updateMatrixWorld(); // 位置を更新
            gltf.scene.traverse(child => {
                if (child.isMesh) {
                    const box = new THREE.Box3().setFromObject(child);
                    wallBoxes.push(box);

                    // バウンディングボックスの可視化用
                    // const boxHelper = new THREE.BoxHelper(child, 0xffff00);
                    // scene.add(boxHelper);

                    // マテリアルの設定を確認
                    child.material = new THREE.MeshStandardMaterial({
                        map: child.material.map,
                        color: child.material.color,
                        metalness: 0.5,
                        roughness: 0.5
                    });
                }
            });
            modelLoaded();
        },
        onProgress
    );

    loader.load(
        'assets/models/floor.glb',
        function (gltf) {
            gltf.scene.position.set(0, 0, 0); // floorの位置を設定
            scene.add(gltf.scene);
            // ロード完了後にロード画面を非表示にする
            modelLoaded();
        },
        onProgress
    );

    loader.load(
        'assets/models/bear_nomal.glb',
        function (gltf) {
            gltf.scene.position.set(3, 1.4, 2);
            gltf.scene.scale.set(0.5, 0.5, 0.5);
            scene.add(gltf.scene);
            // ロード完了後にロード画面を非表示にする
            modelLoaded();
        },
        onProgress
    );

    loader.load(
        'assets/models/gun.glb',
        function (gltf) {
            gunModel = gltf.scene;
            gunModel.scale.set(0.5, 0.5, 0.5);

            gunModel.traverse((child) => {
                if (child.isMesh) {
                    // 現在のマテリアルのテクスチャを取得
                    const texture = child.material.map;

                    // 光の影響を受けないマテリアルに変更
                    child.material = new THREE.MeshStandardMaterial({
                        map: texture,
                        color: 0x005243, // 黒色
                        metalness: 1.0, // 金属っぽさ
                        roughness: 0.2 // 表面の粗さを調整
                    });
                }
            });

            // カメラに追加してプレイヤー視点にする
            camera.add(gunModel);
            gunModel.position.set(1, -0.5, -1); // カメラからの相対位置を設定
            gunModel.rotation.set(0, Math.PI * 3 / 2, 0); // 銃の向きを調整（必要に応じて調整）
            modelLoaded();
        },
        onProgress
    );


    const SIZE = 3000;
    const LENGTH = 1000;
    const vertices = [];
    for (let i = 0; i < LENGTH; i++) {
        const x = SIZE * (Math.random() - 0.5);
        const y = SIZE * (Math.random() - 0.5);
        const z = SIZE * (Math.random() - 0.5);

        vertices.push(x, y, z);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const material = new THREE.PointsMaterial({
        size: 10,
        color: 0xffffff,
    });

    const mesh = new THREE.Points(geometry, material);
    scene.add(mesh);
    document.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    document.addEventListener('mousedown', onMouseDown, false);
    document.addEventListener('mouseup', onMouseUp, false);

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
    document.getElementById('aiming').style.display = 'block';
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
}

function onMouseDown(event) {
    if (event.button === 0) { // 左クリック
        isShooting = true;
        shoot(); // 即座に1発目を発射
    } else if (event.button === 2) { // 右クリック
        spotLight.visible = !spotLight.visible;
    }
}

function onMouseUp(event) {
    if (event.button === 0) { // 左クリック
        isShooting = false;
    }
}

function shoot() {
    if (ammo > 0 && !isReloading) {
        shoot_sound.currentTime = 0;
        shoot_sound.play();
        console.log("Bang!"); // 実際の発砲処理をここに追加
        ammo--;
        applyRecoil();
        if (ammo === 0) {
            reload();
        }
    }
}

function applyRecoil() {
    // リコイルの実装（上向きに修正）
    const recoilAmount = 0.05;
    pitchObject.rotation.x += recoilAmount; // マイナスからプラスに変更
    yawObject.rotation.y += (Math.random() - 0.5) * recoilAmount * 0.5; // 左右のブレを少し小さくする
}

function reload() {
    if (!isReloading) {
        isReloading = true;
        console.log("Reloading...");
        reload_sound.currentTime = 0;
        reload_sound.play();
        setTimeout(() => {
            ammo = 50;
            isReloading = false;
            console.log("Reload complete!");
        }, reloadTime);
    }
}

function updateGunPosition() {

    console.log("called");
    console.log(`Gun Position - X: ${gunModel.position.x}, Y: ${gunModel.position.y}, Z: ${gunModel.position.z}`);


    gunModel.updateMatrixWorld();
}

// アニメーションループ
export function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const currentTime = Date.now();

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveLeft) - Number(moveRight);
    direction.normalize();

    const currentSpeed = isCrouching ? crouchSpeed : normalSpeed;

    if (moveForward || moveBackward) velocity.z -= direction.z * currentSpeed * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * currentSpeed * delta;

    velocity.y -= gravity * delta;

    const oldPosition = yawObject.position.clone();

    yawObject.translateX(velocity.x * delta);
    yawObject.translateZ(velocity.z * delta);
    yawObject.position.y += velocity.y * delta;

    const halfFloorSize_x = FLOOR_SIZE_x / 2;
    const halfFloorSize_z = FLOOR_SIZE_z / 2;
    if (Math.abs(yawObject.position.x) > halfFloorSize_x || Math.abs(yawObject.position.z) > halfFloorSize_z) {
        yawObject.position.copy(oldPosition);
        velocity.x = 0;
        velocity.z = 0;
    }


    // 衝突検出
    const playerBox = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(yawObject.position.x, yawObject.position.y - normalHeight / 2, yawObject.position.z),
        new THREE.Vector3(1, normalHeight, 1)
    );

    let collisionDetected = false;

    for (const box of wallBoxes) {
        if (playerBox.intersectsBox(box)) {
            collisionDetected = true;
            break;
        }
    }

    if (collisionDetected) {
        yawObject.position.copy(oldPosition);
        velocity.y = Math.min(0, velocity.y); // 落下を止める
    }

    if (yawObject.position.y < normalHeight && velocity.y < 0) {
        yawObject.position.y = Math.max(crouchHeight, normalHeight);
        velocity.y = 0;
        canJump = true;
        isJumping = false;
    }

    // しゃがみ状態を反映する
    if (isCrouching && !isJumping) {
        yawObject.position.y = crouchHeight;
    } else if (!isJumping) {
        yawObject.position.y = normalHeight;
    }

    if (isShooting && currentTime - lastShotTime > fireRate) {
        shoot();
        lastShotTime = currentTime;
    }

    updateGunPosition()// 銃の位置を更新

    renderer.render(scene, camera);
}
