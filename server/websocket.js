let positions = {}; // クライアントごとのカメラ位置情報を保存するオブジェクト
let rotations = {};
let spotLightStates = {}; // スポットライトの状態を保存するオブジェクト

function setupWebSocket(io) {
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

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

        // クライアントが切断した場合、対応するカメラ位置情報を削除する
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            delete positions[socket.id];
            delete rotations[socket.id];
            delete spotLightStates[socket.id]; // スポットライトの状態を削除

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
