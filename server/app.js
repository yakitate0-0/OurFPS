const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const { setupWebSocket } = require('./websocket');
const { initializeGameLogic } = require('./gamelogic');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// ポートの設定
const port = process.env.PORT || 3000;

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, '../client')));

// Socket.ioクライアントライブラリの提供
app.get('/socket.io/socket.io.js', (req, res) => {
    res.sendFile(path.join(__dirname, '../node_modules/socket.io/client-dist/socket.io.js'));
});

// サーバーのルートアクセスでindex.htmlを返す
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// WebSocketの設定
setupWebSocket(io);

// ゲームロジックの初期化
initializeGameLogic();

// サーバーの起動
server.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
