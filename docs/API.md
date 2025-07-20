# API ドキュメント

## エンドポイント一覧

### Health Check
```
GET /api/health
```
サーバーの状態とサービスの可用性を確認

**レスポンス:**
```json
{
  "status": "ok",
  "timestamp": "2025-07-20T12:00:00.000Z",
  "services": {
    "gemini": true,
    "fishAudio": true
  }
}
```

### チャット
```
POST /api/chat
```
AI会話のメインエンドポイント

**リクエスト:**
```json
{
  "message": "こんにちは",
  "favorability": 65,
  "conversationContext": {
    "userInfo": "名前: ユーザーさん",
    "recentNotes": "- 最近の情報",
    "conversationHistory": "過去の会話履歴"
  }
}
```

**レスポンス:**
```json
{
  "text": "こんにちは！元気やで〜♪",
  "emotion": "positive",
  "audioUrl": "data:audio/mpeg;base64,//uQx...",
  "favorabilityChange": 2,
  "timestamp": "2025-07-20T12:00:00.000Z"
}
```

### データストレージ

#### プロファイル保存
```
POST /api/storage/profile
```

#### プロファイル取得
```
GET /api/storage/profile
```

#### 会話履歴保存
```
POST /api/storage/history
```

#### 会話履歴取得
```
GET /api/storage/history
```

#### バックアップ作成
```
POST /api/storage/backup
```

#### ストレージ統計
```
GET /api/storage/stats
```

### テスト用エンドポイント

#### Fish Audio テスト
```
GET /api/test/fishaudio
```

#### Gemini AI テスト
```
POST /api/test/gemini
```

## エラーレスポンス

```json
{
  "error": "エラーメッセージ",
  "details": "詳細情報"
}
```

## レート制限

- Fish Audio API: 月間制限あり（プランによる）
- Google Gemini API: リクエスト/分の制限あり

## セキュリティ

- CORS有効
- APIキーは環境変数で管理
- ユーザーデータはローカルストレージとファイルシステムに保存