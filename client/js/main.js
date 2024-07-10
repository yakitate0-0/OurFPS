import { init, animate } from "./game.js";

const socket = io();
let playerName = '';
document.getElementById('registerBtn').addEventListener('click', () => {
    playerName = document.getElementById('playerNameInput').value;
    socket.emit('register', playerName);
});

socket.on('registered', data => {
    console.log('Registered as', data.name);
    window.myname = data.name;
    document.getElementById('register-section').style.display = 'none';
    document.getElementById('matchmaking').style.display = 'block';
});

document.getElementById('joinMatchmakingBtn').addEventListener('click', () => {
    document.getElementById('matchmaking').style.display = 'none';
    document.getElementById('loading-spinner').style.display = 'block';
    socket.emit('joinMatchmaking', playerName);
});

socket.on('matchFound', data => {
    const gameId = data.gameId;
    if (window.myname == data.playerName) {
        window.enemyName = data.opponentName; // グローバル変数に格納
    } else {
        window.enemyName = data.playerName;
    }

    console.log(`my name is ${window.myname}`);

    console.log(`Match found! Game ID: ${gameId}, Opponent Name: ${window.enemyName},playername: ${playerName}`);
    document.getElementById('loading-spinner').style.display = 'none';
    document.getElementById('FPSCanvas').style.display = 'block';
    document.getElementById('aiming').style.display = 'block';

    // ゲームを開始
    init(window.enemyName, window.myname); // 初期化関数に敵の名前を渡す
    animate();
});

socket.on('gameOver', data => {
    console.log(`loser is ${data.loser}`);
    const message = data.loser === window.myname ? 'You Lose!' : 'You Win!';
    alert(message);
});
