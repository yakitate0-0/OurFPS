import { init, animate } from './game.js';

const socket = io();

document.getElementById('joinMatchmakingBtn').addEventListener('click', () => {
    // マッチングボタンを非表示にしてローディングスピナーを表示
    document.getElementById('matchmaking').style.display = 'none';
    document.getElementById('loading-spinner').style.display = 'block';

    socket.emit('joinMatchmaking');
});

socket.on('matchFound', (data) => {
    const gameId = data.gameId;
    const opponentId = data.opponentId;
    console.log(`Match found! Game ID: ${gameId}, Opponent ID: ${opponentId}`);
    
    // ローディングスピナーを非表示にしてゲーム画面を表示
    document.getElementById('loading-spinner').style.display = 'none';
    document.getElementById('FPSCanvas').style.display = 'block';
    document.getElementById('aiming').style.display = 'block';

    // ゲームを開始
    init();
    animate();
});

socket.on('gameOver', (data) => {
    const message = data.winnerId === socket.id ? 'You Win!' : 'You Lose!';
    alert(message);
});
