let players = {}; // プレイヤー情報を保持するオブジェクト
let waitingPlayer = null; // マッチング待機中のプレイヤー名を保持

function setupWebSocket(io) {
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

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
                waitingPlayer = null; // マッチングが成立したのでリセット
            } else {
                waitingPlayer = name;
                socket.emit('waiting', 'Waiting for an opponent...');
            }
        });

        socket.on('positionUpdate', data => {
            const { name, position, rotation, spotLightState } = data;
            if (players[name]) {
                players[name].position = position;
                players[name].rotation = rotation;
                players[name].spotLightState = spotLightState;
                console.log(`Position updated for ${name}`, position, rotation, spotLightState); // デバッグログ
                // 全プレイヤーに位置情報をブロードキャスト（必要に応じて）
                io.emit('updatePositions', players);
            }
        });



        socket.on('shoot', data => {
            const { shooter, position, direction } = data;
            io.emit('shotFired', { shooter, position, direction });
        });

        socket.on('hit', data => {
            const { target, damage, shooter } = data;
            if (players[target]) {
                players[target].hp -= damage;
                if (players[target].hp <= 0) {
                    players[target].hp = 0;
                    io.emit('gameOver', { winner: shooter, loser: target });
                }
                io.emit('updateHP', { name: target, hp: players[target].hp });
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
