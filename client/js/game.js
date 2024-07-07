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
let nowEnemyPositions = {};
let bearModel;
let enemySpotLight; // 敵のスポットライト
let bullets = []; // 弾丸を格納する配列
let collisionBoxes = []; // 衝突判定の対象となるオブジェクトのバウンディングボックス配列
let playerHp = 100; // 初期HP
const bulletSpeed = 100;//　弾丸スピード
const socket = io();
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
const nomalLight = 0.1; //太陽の強さ
const shoot_sound = new Audio("/assets/sounds/shoot.mp3");
const shoot1_sound = new Audio("/assets/sounds/shoot.mp3");
const reload_sound = new Audio("/assets/sounds/reload.mp3");
const ready_sound = new Audio("/assets/sounds/ready.mp3");
const set_sound = new Audio("/assets/sounds/set.mp3");

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
            animate();
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
                    collisionBoxes.push(box); // 配列に追加
                    wallBoxes.push(box); // 床のバウンディングボックスを追加

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
                    collisionBoxes.push(box); // 配列に追加
                    wallBoxes.push(box); // 床のバウンディングボックスを追加

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
        'assets/models/warahouse.glb',
        function (gltf) {
            gltf.scene.position.set(8, 0, 1.5); // 倉庫の位置を設定
            scene.add(gltf.scene);
            gltf.scene.updateMatrixWorld(); // 位置を更新
            gltf.scene.traverse(child => {
                if (child.isMesh) {
                    const box = new THREE.Box3().setFromObject(child);
                    collisionBoxes.push(box); // 配列に追加
                    wallBoxes.push(box); // 床のバウンディングボックスを追加

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
                    collisionBoxes.push(box); // 配列に追加
                    wallBoxes.push(box); // 床のバウンディングボックスを追加

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
                    collisionBoxes.push(box); // 配列に追加
                    wallBoxes.push(box); // 床のバウンディングボックスを追加

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
            bearModel = gltf.scene;
            bearModel.position.set(3, 1.4, 2);
            bearModel.scale.set(0.5, 0.5, 0.5);
            scene.add(bearModel);

            // 敵のスポットライトを初期化
            enemySpotLight = new THREE.SpotLight(0xffffff, 3.5, 100, Math.PI / lightSize, 0.1, 1);
            enemySpotLight.visible = false; // 初期状態はオフ
            scene.add(enemySpotLight);
            scene.add(enemySpotLight.target);

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

    updateHpBar();//HPの初期化

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
        case 'KeyR':
            reload();
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
        socket.emit('gunsound');
    } else if (event.button === 2) { // 右クリック
        spotLight.visible = !spotLight.visible;
        // スポットライトの状態をサーバーに送信
        updatePlayerPosition();
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
        // 実際の発砲処理をここに追加
        createBullet();
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
        set_sound.play();
        setTimeout(() => {
            ammo = 50;
            isReloading = false;
            console.log("Reload complete!");
            ready_sound.play();
        }, reloadTime);
    }
}

socket.on('soundofgun', () => {
    shoot1_sound.currentTime = 0;
    shoot1_sound.play();
});

socket.on('corectPositions', (data) => {
    nowEnemyPositions = data.positions; // 追加：nowEnemyPositionsを更新

    // 敵の位置情報をBearモデルに反映
    const enemyId = Object.keys(data.positions).find(id => id !== socket.id); // 自分のID以外のIDを取得
    if (bearModel && enemyId) {
        const enemyPosition = data.positions[enemyId];
        const enemyRotation = data.rotations[enemyId];

        bearModel.position.set(enemyPosition.x, enemyPosition.y, enemyPosition.z);
        bearModel.rotation.set(enemyRotation.x, enemyRotation.y + Math.PI, enemyRotation.z);

        // 敵のスポットライトの位置と方向をBearモデルと同期
        enemySpotLight.position.copy(bearModel.position);
        enemySpotLight.target.position.set(
            enemyPosition.x + Math.sin(enemyRotation.y + Math.PI),
            enemyPosition.y,
            enemyPosition.z + Math.cos(enemyRotation.y + Math.PI)
        );
        enemySpotLight.target.updateMatrixWorld();

        // サーバーから受信したスポットライトの状態を反映
        enemySpotLight.visible = data.spotLightStates[enemyId];
    }
});


function createBullet() {
    const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.scale.set(0.1, 0.1, 0.1);

    // 弾丸の初期位置をカメラに設定
    bullet.position.copy(camera.position);

    // カメラの方向を取得
    const bulletDirection = new THREE.Vector3();
    camera.getWorldDirection(bulletDirection);
    bullet.userData.velocity = bulletDirection.clone().multiplyScalar(bulletSpeed);

    // カメラに弾丸を追加
    camera.add(bullet);
    bullets.push(bullet);
}



function moveBullets(delta) {
    bullets.forEach((bullet, index) => {
        // カメラの位置に基づいて弾丸を移動
        const worldPosition = new THREE.Vector3();
        bullet.getWorldPosition(worldPosition);
        const direction = new THREE.Vector3();
        direction.copy(bullet.userData.velocity).multiplyScalar(delta);

        worldPosition.add(direction);

        bullet.position.copy(camera.worldToLocal(worldPosition));

        // 弾丸が一定距離を超えたら削除
        if (worldPosition.length() > 500) {
            camera.remove(bullet);
            bullets.splice(index, 1);
        }
    });
}



function checkCollisions() {
    bullets.forEach((bullet, bulletIndex) => {
        const bulletBox = new THREE.Box3().setFromObject(bullet);
        let bulletRemoved = false;

        // 各衝突対象オブジェクトのバウンディングボックスに対して判定を行う
        collisionBoxes.forEach((objectBox) => {
            if (bulletBox.intersectsBox(objectBox) && !bulletRemoved) {
                console.log('Bullet hit an object!');
                // 弾丸を削除
                bullet.parent.remove(bullet); // カメラ以外に追加された場合に対応
                bullets.splice(bulletIndex, 1);
                bulletRemoved = true; // すでに衝突した弾丸についてはこれ以上処理しない
            }
        });

        // Bearモデルとの衝突判定
        if (!bulletRemoved && bearModel) {
            const bearBox = new THREE.Box3().setFromObject(bearModel);
            if (bulletBox.intersectsBox(bearBox)) {
                showHitIndicator();
                // 弾丸を削除
                bullet.parent.remove(bullet); // カメラ以外に追加された場合に対応
                bullets.splice(bulletIndex, 1);
                bulletRemoved = true; // すでに衝突した弾丸についてはこれ以上処理しない

                // 敵にダメージを通告
                const enemyId = Object.keys(nowEnemyPositions).find(id => id !== socket.id);
                if (enemyId) {
                    console.log('Hit bear! Sending hit to enemyId:', enemyId); // デバッグログを追加
                    socket.emit('hit', {
                        enemyId: enemyId,
                        damage: 10 // ダメージ量を指定
                    });
                } else {
                    console.log("Do not have enemyID");
                }
            }
        }
    });
}

function updateHpBar() {
    const hpBar = document.getElementById('hp-bar');
    if (hpBar) {
        hpBar.style.width = playerHp + '%';
    } else {
        console.error("HP bar element not found");
    }
}

socket.on('damage', (data) => {
    if (data.enemyId === socket.id) { // playerIdからenemyIdに変更
        playerHp -= data.damage;
        showDamageOverlay();
        if (playerHp < 0) playerHp = 0;
        updateHpBar();
    }
});

function showHitIndicator() {
    const hitIndicator = document.getElementById('hit-indicator');
    hitIndicator.style.display = 'block';
    hitIndicator.style.opacity = '1';
    hitIndicator.style.animation = 'none'; // アニメーションをリセット
    requestAnimationFrame(() => {
        hitIndicator.style.animation = '';
    });
    setTimeout(() => {
        hitIndicator.style.display = 'none';
    }, 500); // 0.5秒後に非表示にする
}

function showDamageOverlay() {
    const damageOverlay = document.getElementById('damage-overlay');
    damageOverlay.style.display = 'block';
    damageOverlay.style.opacity = '1';
    damageOverlay.style.animation = 'none'; // アニメーションをリセット
    requestAnimationFrame(() => {
        damageOverlay.style.animation = '';
    });
    setTimeout(() => {
        damageOverlay.style.display = 'none';
    }, 500); // 0.5秒後に非表示にする
}


socket.on('updateHP', (data) => {
    const playerId = data.playerId;
    const hp = data.hp;
    console.log(`Player ${playerId} HP updated: ${hp}`);
    // 他のプレイヤーのHPが更新された場合の処理を追加することもできます
});

// プレイヤの位置を送信する
function updatePlayerPosition() {
    let playerPosition = {
        x: yawObject.position.x,
        y: yawObject.position.y,
        z: yawObject.position.z
    };

    let playerRotation = {
        x: yawObject.rotation.x,
        y: yawObject.rotation.y,
        z: yawObject.rotation.z
    };

    socket.emit('enemyPosition', {
        position: playerPosition,
        rotation: playerRotation,
        spotLightVisible: spotLight.visible // スポットライトの状態を送信
    });
}


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

    // プレイヤーのバウンディングボックスを作成
    const playerBox = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(yawObject.position.x, yawObject.position.y - normalHeight / 2, yawObject.position.z),
        new THREE.Vector3(1, normalHeight, 1)
    );

    // 衝突判定
    let collisionDetected = false;
    for (const box of collisionBoxes) {
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

    updatePlayerPosition(); // プレイヤーの位置情報を送信

    moveBullets(delta); // 弾丸を移動
    checkCollisions(); // 当たり判定

    if (gunModel) {
        gunModel.updateMatrixWorld(); // 銃の位置を更新
    }

    renderer.render(scene, camera);
}

socket.on('gameOver', (data) => {
    const message = data.winnerId === socket.id ? 'You Win!' : 'You Lose!';
    alert(message);
});
