const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// ポートの設定
const port = process.env.PORT || 3000;

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, '../client')));

// サーバーのルートアクセスでindex.htmlを返す
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// WebSocketの設定
io.on('connection', (socket) => {
    console.log('New client connected');
    socket.on('message', (message) => {
        console.log('Received message:', message);
        io.emit('message', message);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// サーバーの起動
server.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
