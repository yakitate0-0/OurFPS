let cameraPositions = {}; // クライアントごとのカメラ位置情報を保存するオブジェクト

function setupWebSocket(io) {
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        // クライアントからカメラ位置情報を受信して更新する
        socket.on('enemyPosition', (data) => {
            
        });

        // クライアントが切断した場合、対応するカメラ位置情報を削除する
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            delete cameraPositions[socket.id];
        });
    });
}

module.exports = { setupWebSocket };
