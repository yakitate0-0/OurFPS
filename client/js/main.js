import { init, animate } from './game.js';

const socket = io();

document.getElementById('registerBtn').addEventListener('click', () => {
    const playerName = document.getElementById('playerNameInput').value;
    if (playerName) {
        socket.emit('register', playerName);
    }
});

document.getElementById('joinMatchmakingBtn').addEventListener('click', () => {
    const playerName = document.getElementById('playerNameInput').value;
    if (playerName) {
        document.getElementById('matchmaking').style.display = 'none';
        document.getElementById('loading-spinner').style.display = 'block';
        socket.emit('joinMatchmaking', playerName);
    }
});

socket.on('registered', (data) => {
    console.log('Registered as', data.name);
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('matchmaking').style.display = 'block';
});

socket.on('matchFound', (data) => {
    const gameId = data.gameId;
    const opponentName = data.opponentName;
    console.log(`Match found! Game ID: ${gameId}, Opponent Name: ${opponentName}`);

    document.getElementById('loading-spinner').style.display = 'none';
    document.getElementById('FPSCanvas').style.display = 'block';
    document.getElementById('aiming').style.display = 'block';

    // ゲームを開始
    init();
    animate();
});

socket.on('gameOver', (data) => {
    const message = data.winner === socket.id ? 'You Win!' : 'You Lose!';
    alert(message);
});

socket.on('waiting', (message) => {
    console.log(message);
});
