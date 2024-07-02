function setupWebSocket(io) {
    io.on('connection', (socket) => {
        console.log('A user connected');

        socket.on('updateCamera', (data) => {
            console.log('Camera position:', data.position);
            console.log('Camera rotation:', data.rotation);
            // ここでデータを適切に処理
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });
}

module.exports = { setupWebSocket };
