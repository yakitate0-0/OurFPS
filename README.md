*************************************
プログラムのファイルの構成
project-root/
│
├── client/
│   ├── css/
│   │   └── styles.css      #クライアントの見た目管理
│   ├── js/
│   │   ├── main.js         #クライアントのエントリーポイントとなるjs
│   │   ├── game.js         #ゲームのロジックと描画を管理するjs
│   │   └── websocket.js    #クライアントとサーバーの通信を行うjs
│   ├── index.html          #クライアントのエントリーポイントとなるhtml
│   └── assets/             #画像や3Dモデルデータ
│       ├── images/         
│       └── models/
│
├── server/
│   ├── app.js              #サーバーのエントリーポイント
│   ├── gameLogic.js        #サーバー側のゲームロジックを管理する
│   ├── websocket.js        #サーバーとクライアントの通信を行う
│   └── package.json        #ライブラリーのインポート
│
├── php/
│   ├── api/
│   │   ├── login.php       #ログイン処理
│   │   ├── register.php    #新規登録処理
│   │   └── db.php          #データベース処理
│   └── public/
│       └── index.php       #phpアプリケーションのエントリーポイント
│
├── database/
│   └── schema.sql          #SQLの命令
│
└── README.md

*************************************