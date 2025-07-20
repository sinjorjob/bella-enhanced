# Bella AI Assistant 🎤💕

Bellaは日本語対応のAI音声アシスタントです。Google Gemini AIとFish Audio APIを活用し、自然な関西弁での会話と高品質な音声合成を提供します。

## 🎬 デモ

[![Bella AI Assistant Demo](https://img.youtube.com/vi/BmsQEB4nEFM/maxresdefault.jpg)](https://youtu.be/BmsQEB4nEFM)

実際の動作をYouTubeでご覧いただけます。Bellaとの自然な会話、感情表現、音声認識の様子をデモンストレーションしています。

## ✨ 特徴

- 🎯 **自然な日本語会話**: Google Gemini AIによる関西弁での親しみやすい応答
- 🎵 **高品質音声合成**: Fish Audio APIによる自然な音声生成
- 🎬 **感情表現動画**: 会話の感情に応じて表情が変わる動画表示
- 🧠 **会話記憶機能**: ユーザーの名前や好みを記憶して個人化された対話
- 🎤 **音声認識**: Web Speech APIによる日本語音声入力
- 💾 **データ永続化**: LocalStorageとファイルシステムによるデータ保存

## 🚀 クイックスタート

### 必要な環境

- Node.js 16.0以上
- 現代的なWebブラウザ（Chrome, Firefox, Safari, Edge）
- インターネット接続

### 1. リポジトリのクローン

```bash
git clone https://github.com/yourusername/bella-ai-assistant.git
cd bella-ai-assistant
```

### 2. 依存関係のインストール

```bash
cd backend
npm install
```

### 3. 環境設定

#### APIキーの取得

1. **Google Gemini API Key**
   - [Google AI Studio](https://aistudio.google.com/app/apikey)にアクセス
   - Googleアカウントでログイン
   - 「Create API Key」をクリック
   - 生成されたAPIキーをコピー

2. **Fish Audio API Key**
   - [Fish Audio](https://fish.audio/)にアクセス
   - アカウントを作成またはログイン
   - APIキーを取得

#### 環境変数の設定

```bash
# backend/.env.exampleをコピーして.envファイルを作成
cp .env.example .env

# .envファイルを編集してAPIキーを設定
nano .env
```

`.env`ファイルの内容：
```env
GOOGLE_API_KEY=your_google_api_key_here
FISH_AUDIO_API_KEY=your_fish_audio_api_key_here
PORT=3000
```

### 4. アプリケーションの起動

```bash
# バックエンドサーバーを起動
cd backend
npm start

# または開発モード
npm run dev
```

### 5. Webアプリケーションにアクセス

ブラウザで `http://localhost:3000` にアクセスします。

## 📁 プロジェクト構造

```
bella-ai-assistant/
├── frontend/                 # フロントエンド（HTML/CSS/JS）
│   ├── index.html           # メインページ
│   ├── script.js            # メインJavaScript
│   ├── style.css            # スタイルシート
│   ├── js/                  # JavaScript モジュール
│   │   ├── conversationManager.js
│   │   ├── fileManager.js
│   │   └── userProfileExtractor.js
│   └── 動画リソース/         # 動画・音声ファイル
├── backend/                 # バックエンドAPI
│   ├── server.js           # Expressサーバー
│   ├── services/           # サービス層
│   │   ├── gemini.js       # Gemini AI連携
│   │   ├── fishAudio.js    # Fish Audio連携
│   │   ├── emotionAnalyzer.js
│   │   └── fileStorage.js
│   ├── config/             # 設定ファイル
│   └── package.json        # 依存関係
└── docs/                   # ドキュメント
```

## 🎮 使い方

### 初回起動

1. アプリを開くと自己紹介メッセージが表示されます
2. 画面をクリックすると自己紹介音声が再生されます
3. 名前を登録するには「私の名前は○○です！私の名前を記録してね！」と話しかけてください

### 基本的な会話

1. **音声入力**: マイクボタンをクリックして話しかける
2. **テキスト表示**: 認識された音声がテキストで表示
3. **AI応答**: Bellaが関西弁で返答
4. **音声再生**: 応答が自然な音声で再生
5. **動画切り替え**: 感情に応じて表情動画が変化

### データ管理

- **会話履歴**: 自動的に保存され、文脈を理解した会話が可能
- **ユーザー情報**: 名前、好み、重要な情報を記憶
- **データエクスポート**: 設定画面から会話履歴をJSONでエクスポート可能

## ⚙️ 詳細設定

### 音声認識の設定

```javascript
// script.js内での音声認識設定
recognition.lang = 'ja-JP';  // 日本語認識
recognition.continuous = false;
recognition.interimResults = false;
```

### 動画リソースの追加

`frontend/動画リソース/`フォルダに動画ファイルを追加：
- `ポジティブ/`: 嬉しい・楽しい表情の動画
- `ネガティブ/`: 怒った・悲しい表情の動画
- `デフォルト動画.mp4`: 通常時の動画

### Fish Audio設定

特定の音声モデルを使用したい場合は、`backend/services/fishAudio.js`でモデルIDを変更：

```javascript
this.modelId = 'your_model_id_here';
```

## 🔧 開発者向け

### 開発環境の設定

```bash
# 開発用依存関係のインストール
npm install --dev

# 開発サーバーの起動（ホットリロード有効）
npm run dev

# テストの実行
npm test

# コードの整形
npm run format
```

### APIエンドポイント

- `POST /api/chat` - AI会話エンドポイント
- `GET /api/health` - ヘルスチェック
- `POST /api/storage/profile` - ユーザープロファイル保存
- `GET /api/storage/stats` - ストレージ統計情報

### 新機能の追加

1. **新しい感情の追加**: `backend/services/emotionAnalyzer.js`を編集
2. **新しい音声コマンド**: `frontend/js/userProfileExtractor.js`を編集
3. **新しいAPI連携**: `backend/services/`に新しいサービスファイルを追加

## 🛠️ トラブルシューティング

### よくある問題

#### 1. 音声認識が動作しない
- ブラウザでマイクの許可が有効か確認
- HTTPSまたはlocalhostでアクセスしているか確認
- コンソールでエラーメッセージを確認

#### 2. 音声が再生されない
- ブラウザの自動再生設定を確認
- Fish Audio APIキーが正しく設定されているか確認
- ネットワーク接続を確認

#### 3. サーバーが起動しない
- 環境変数（.env）が正しく設定されているか確認
- Node.jsのバージョンが16.0以上か確認
- ポート3000が他のプロセスで使用されていないか確認

#### 4. 会話が記憶されない
- LocalStorageが有効か確認
- バックエンドサーバーが起動しているか確認
- ブラウザのプライベートモードを使用していないか確認

### ログの確認

```bash
# サーバーログ
npm start

# ブラウザのコンソールログ
F12 → Console タブ
```

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細については[LICENSE](LICENSE)ファイルをご覧ください。

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📞 サポート

- **Issues**: [GitHub Issues](https://github.com/yourusername/bella-ai-assistant/issues)
- **ディスカッション**: [GitHub Discussions](https://github.com/yourusername/bella-ai-assistant/discussions)

## 🙏 謝辞

- [Google Gemini AI](https://ai.google.dev/) - 自然言語処理
- [Fish Audio](https://fish.audio/) - 高品質音声合成
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) - 音声認識

---

💕 **Bella**: 「おおきに！いっぱい楽しい会話しよな〜♪」