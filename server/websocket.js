let players = {}; // プレイヤー情報を保持するオブジェクト
let waitingPlayer = null; // マッチング待機中のプレイヤー名を保持

function setupWebSocket(io) {
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        socket.on('change_port_to_8080', () => {
            console.log("Port change to 8080 requested");
            // クライアントにポート8080にリダイレクトする指示を送信
            socket.emit('redirect');
        });

        socket.on('register', name => {
            if (Object.values(players).some(player => player.name === name)) {
                socket.emit('error', 'Name already taken');
                return;
            }
            players[name] = { name, hp: 100, position: {}, rotation: {}, spotLightState: false, inGame: false, socketId: socket.id };
            socket.emit('registered', { name });
        });

        socket.on('joinMatchmaking', name => {
            if (!players[name]) {
                socket.emit('error', 'Player not registered');
                return;
            }
            if (waitingPlayer && waitingPlayer !== name) {
                const gameId = `${name}-${waitingPlayer}`;
                socket.join(gameId);
                io.sockets.sockets.get(players[waitingPlayer].socketId).join(gameId); // 修正点
                io.to(gameId).emit('matchFound', { gameId, opponentName: waitingPlayer, playerName: name });
                players[name].inGame = true;
                players[waitingPlayer].inGame = true;

                io.emit('spawn', {
                    name: name,
                    position: { x: 9, y: 1.5, z: -8 },
                    rotation: { x: 0, y: Math.PI / 4, z: 0 }
                });
                io.emit('spawn', {
                    name: waitingPlayer,
                    position: { x: -9, y: 1.5, z: 8 },
                    rotation: { x: 0, y: Math.PI / 4, z: 0 }
                });

                waitingPlayer = null; // マッチングが成立したのでリセット
            } else {
                waitingPlayer = name;
                socket.emit('waiting', 'Waiting for an opponent...');
            }
        });


        socket.on('gunsound', () => {
            io.emit('soundofgun');
        });

        socket.on('positionUpdate', data => {
            const { name, position, rotation, spotLightState } = data;
            if (players[name]) {
                players[name].position = position;
                players[name].rotation = rotation;
                players[name].spotLightState = spotLightState;
                // console.log(`Position updated for ${name}`, position, rotation, spotLightState); // デバッグログ
                // 全プレイヤーに位置情報をブロードキャスト（必要に応じて）
                io.emit('updatePositions', players);
            }
        });

        socket.on('shoot', data => {
            const { shooter, position, direction } = data;
            io.emit('shotFired', { shooter, position, direction });
        });

        socket.on('hit', data => {
            const { enemyName, damage } = data;
            console.log(players[enemyName]);
            if (players[enemyName]) {
                players[enemyName].hp -= damage;
                if (players[enemyName].hp <= 0) {
                    players[enemyName].hp = 0;
                    io.emit('gameOver', { loser: enemyName });
                }
                io.emit('damage', { enemyName: players[enemyName], damage: damage });
            } else {
                console.log("Do not have enemyID");
            }
        });

        socket.on('disconnect', () => {
            // 名前を使ってプレイヤーを識別
            const name = Object.keys(players).find(key => players[key].socketId === socket.id);
            if (name) {
                console.log('User disconnected:', name);
                delete players[name];
            }
        });
    });
}

module.exports = { setupWebSocket };
