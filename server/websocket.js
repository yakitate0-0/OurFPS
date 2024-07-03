let positions = {}; // クライアントごとのカメラ位置情報を保存するオブジェクト
let rotations = {};

function setupWebSocket(io) {
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        // クライアントからカメラ位置情報を受信して更新する
        socket.on('enemyPosition', (data) => {
            console.log('Received enemyPosition from:', socket.id);
            console.log('Camera position:', data.position);
            console.log('Camera rotation:', data.rotation);

            // データを保存
            positions = data.position;
            rotations = data.rotation;

            // 全てのクライアントにブロードキャスト
            io.emit('corectPositions', {
                positions,
                rotations
            });
        });

        // クライアントが切断した場合、対応するカメラ位置情報を削除する
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            delete positions[socket.id];
            delete rotations[socket.id];

            // クライアント切断後のデータをブロードキャスト
            io.emit('corectPositions', {
                positions,
                rotations
            });
        });
    });
}

module.exports = { setupWebSocket };
