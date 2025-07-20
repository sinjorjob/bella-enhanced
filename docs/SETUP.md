# セットアップガイド

## 前提条件

- Node.js 16.0以上
- npm または yarn
- 現代的なWebブラウザ
- インターネット接続

## ステップバイステップガイド

### 1. プロジェクトのダウンロード

```bash
git clone https://github.com/yourusername/bella-ai-assistant.git
cd bella-ai-assistant
```

### 2. バックエンドのセットアップ

```bash
cd backend
npm install
```

### 3. APIキーの設定

#### Google Gemini API

1. [Google AI Studio](https://aistudio.google.com/app/apikey)にアクセス
2. Googleアカウントでログイン
3. 「Create API Key」をクリック
4. 生成されたAPIキーをコピー

#### Fish Audio API

1. [Fish Audio](https://fish.audio/)にアクセス
2. アカウント作成またはログイン
3. APIセクションでAPIキーを取得

### 4. 環境変数ファイルの作成

```bash
cd backend
cp .env.example .env
```

`.env`ファイルを編集：

```env
GOOGLE_API_KEY=あなたのGoogleAPIキー
FISH_AUDIO_API_KEY=あなたのFishAudioAPIキー
PORT=3000
```

### 5. アプリケーションの起動

```bash
npm start
```

### 6. ブラウザでアクセス

`http://localhost:3000` にアクセス

## 動画リソースの準備

初期状態では基本的な動画ファイルが含まれていますが、カスタマイズしたい場合：

1. `frontend/動画リソース/ポジティブ/` - 嬉しい表情の動画
2. `frontend/動画リソース/ネガティブ/` - 怒った表情の動画
3. `frontend/動画リソース/デフォルト動画.mp4` - 通常時の動画

対応フォーマット：MP4, WebM

## トラブルシューティング

### よくある問題と解決方法

#### マイクが認識されない
- ブラウザの設定でマイクアクセスを許可
- HTTPSまたはlocalhostでアクセス

#### 音声が再生されない
- ブラウザの自動再生を許可
- Fish Audio APIキーを確認

#### サーバーエラー
- 環境変数を再確認
- Node.jsのバージョンを確認
- ポート3000が空いているか確認

## 次のステップ

セットアップが完了したら：

1. 画面をクリックして自己紹介を聞く
2. 「私の名前は○○です！私の名前を記録してね！」と話しかけて名前を登録
3. 自由に会話を楽しむ