let positions = {}; // クライアントごとのカメラ位置情報を保存するオブジェクト
let rotations = {};
let spotLightStates = {}; // スポットライトの状態を保存するオブジェクト
let playerHps = {}; // プレイヤーごとのHPを保存するオブジェクト
let playersInGame = {}; // ゲームに参加中のプレイヤーを保存するオブジェクト
const spawnPositions = [
    { x: 8, y: 0, z: -5 }, // 左端のスポーン位置
    { x: 8, y: 0, z: 5 }   // 右端のスポーン位置
];

function setupWebSocket(io) {
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        // 初期HPを設定
        playerHps[socket.id] = 100;

        // プレイヤーのスポーン位置を決定
        const playerCount = Object.keys(playersInGame).length;
        const spawnPosition = spawnPositions[playerCount % spawnPositions.length];
        positions[socket.id] = spawnPosition;
        rotations[socket.id] = { x: 0, y: 0, z: 0 };
        playersInGame[socket.id] = true;

        // クライアントにスポーン位置を送信
        socket.emit('spawn', {
            position: spawnPosition,
            rotation: rotations[socket.id]
        });

        // クライアントからカメラ位置情報を受信して更新する
        socket.on('enemyPosition', (data) => {
            // データを保存
            positions[socket.id] = data.position;
            rotations[socket.id] = data.rotation;
            spotLightStates[socket.id] = data.spotLightVisible; // スポットライトの状態を保存

            // 全てのクライアントにブロードキャスト
            io.emit('corectPositions', {
                positions: positions,
                rotations: rotations,
                spotLightStates: spotLightStates // スポットライトの状態を送信
            });
        });

        socket.on('gunsound',() => {
            io.emit('soundofgun');
        });

        // ダメージを受けた場合の処理
        socket.on('hit', (data) => {
            const enemyId = data.enemyId;
            const damage = data.damage;

            if (playerHps[enemyId] !== undefined) {
                playerHps[enemyId] -= damage;
                if (playerHps[enemyId] < 0) playerHps[enemyId] = 0;

                // ダメージを受けたクライアントにHPを送信
                io.to(enemyId).emit('damage', {
                    enemyId: enemyId,
                    damage: damage
                });

                // 全てのクライアントにHPを更新
                io.emit('updateHP', {
                    playerId: enemyId,
                    hp: playerHps[enemyId]
                });

                // ゲームオーバーの判定
                if (playerHps[enemyId] <= 0) {
                    const winnerId = Object.keys(playerHps).find(id => id !== enemyId);
                    io.emit('gameOver', {
                        winnerId: winnerId
                    });
                }
            }
        });

        // クライアントが切断した場合、対応するカメラ位置情報を削除する
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            delete positions[socket.id];
            delete rotations[socket.id];
            delete spotLightStates[socket.id]; // スポットライトの状態を削除
            delete playerHps[socket.id]; // プレイヤーのHPを削除
            delete playersInGame[socket.id]; // ゲームからプレイヤーを削除

            // クライアント切断後のデータをブロードキャスト
            io.emit('corectPositions', {
                positions: positions,
                rotations: rotations,
                spotLightStates: spotLightStates // スポットライトの状態を送信
            });
        });
    });
}

module.exports = { setupWebSocket };
