const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');

// Services
const GeminiService = require('./services/gemini');
const FishAudioService = require('./services/fishAudio');
const EmotionAnalyzer = require('./services/emotionAnalyzer');
const FileStorageService = require('./services/fileStorage');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 静的ファイルの配信（Bellaのフロントエンド）
app.use(express.static(path.join(__dirname, '../Bella')));

// Initialize services
const geminiService = new GeminiService();
const fishAudioService = new FishAudioService();
const emotionAnalyzer = new EmotionAnalyzer();
const fileStorageService = new FileStorageService();

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        services: {
            gemini: !!config.google.apiKey,
            fishAudio: !!config.fishAudio.apiKey
        }
    });
});

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, favorability, conversationContext } = req.body;
        
        // Input validation
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: 'メッセージが必要です' });
        }
        
        if (favorability === undefined || typeof favorability !== 'number') {
            return res.status(400).json({ error: '好感度が必要です' });
        }
        
        console.log('Chat request:', { 
            message, 
            favorability, 
            hasContext: !!conversationContext 
        });
        
        // 1. Gemini AIで応答生成（会話履歴を含む）
        const aiResponse = await geminiService.generateResponse(
            message, 
            favorability, 
            conversationContext
        );
        console.log('Gemini response:', aiResponse);
        
        // 2. FishAudioで音声生成
        const audioUrl = await fishAudioService.synthesize(aiResponse.text);
        console.log('FishAudio synthesis completed');
        
        // 3. 応答を返す
        const response = {
            text: aiResponse.text,
            emotion: aiResponse.emotion,
            audioUrl: audioUrl,
            favorabilityChange: aiResponse.favorabilityChange,
            timestamp: new Date().toISOString()
        };
        
        console.log('Response sent successfully');
        res.json(response);
        
    } catch (error) {
        console.error('Chat endpoint error:', error);
        res.status(500).json({ 
            error: 'サーバーエラーが発生しました',
            details: error.message 
        });
    }
});

// Test endpoint for FishAudio
app.get('/api/test/fishaudio', async (req, res) => {
    try {
        const audioUrl = await fishAudioService.testSynthesis();
        res.json({ 
            success: true, 
            audioUrl: audioUrl.substring(0, 50) + '...' // URLの一部だけ表示
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Test endpoint for Gemini
app.post('/api/test/gemini', async (req, res) => {
    try {
        const testMessage = req.body.message || 'こんにちは！';
        const testFavorability = req.body.favorability || 65;
        
        const response = await geminiService.generateResponse(testMessage, testFavorability);
        res.json({ 
            success: true, 
            response: response
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// File storage endpoints
app.post('/api/storage/profile', async (req, res) => {
    try {
        const { profileData } = req.body;
        
        if (!profileData || typeof profileData !== 'object') {
            return res.status(400).json({ error: 'プロファイルデータが必要です' });
        }
        
        const success = await fileStorageService.saveProfile(profileData);
        
        if (success) {
            res.json({ success: true, message: 'プロファイルを保存しました' });
        } else {
            res.status(500).json({ error: 'プロファイルの保存に失敗しました' });
        }
    } catch (error) {
        console.error('Profile storage error:', error);
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

app.post('/api/storage/history', async (req, res) => {
    try {
        const { historyData } = req.body;
        
        if (!historyData || typeof historyData !== 'object') {
            return res.status(400).json({ error: '履歴データが必要です' });
        }
        
        const success = await fileStorageService.saveHistory(historyData);
        
        if (success) {
            res.json({ success: true, message: '会話履歴を保存しました' });
        } else {
            res.status(500).json({ error: '会話履歴の保存に失敗しました' });
        }
    } catch (error) {
        console.error('History storage error:', error);
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

app.get('/api/storage/profile', async (req, res) => {
    try {
        const profileData = await fileStorageService.loadProfile();
        res.json({ success: true, data: profileData });
    } catch (error) {
        console.error('Profile load error:', error);
        res.status(500).json({ error: 'プロファイルの読み込みに失敗しました' });
    }
});

app.get('/api/storage/history', async (req, res) => {
    try {
        const historyData = await fileStorageService.loadHistory();
        res.json({ success: true, data: historyData });
    } catch (error) {
        console.error('History load error:', error);
        res.status(500).json({ error: '履歴の読み込みに失敗しました' });
    }
});

app.post('/api/storage/backup', async (req, res) => {
    try {
        const { data, type } = req.body;
        
        if (!data || !type) {
            return res.status(400).json({ error: 'データとタイプが必要です' });
        }
        
        const success = await fileStorageService.createBackup(data, type);
        
        if (success) {
            res.json({ success: true, message: 'バックアップを作成しました' });
        } else {
            res.status(500).json({ error: 'バックアップの作成に失敗しました' });
        }
    } catch (error) {
        console.error('Backup creation error:', error);
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

app.get('/api/storage/stats', async (req, res) => {
    try {
        const stats = await fileStorageService.getFileStats();
        const backups = await fileStorageService.listBackups();
        
        res.json({ 
            success: true, 
            stats: stats,
            backups: backups
        });
    } catch (error) {
        console.error('Stats retrieval error:', error);
        res.status(500).json({ error: 'ファイル情報の取得に失敗しました' });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'サーバーエラーが発生しました',
        details: error.message 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'エンドポイントが見つかりません' });
});

const PORT = config.port;
app.listen(PORT, () => {
    console.log(`🚀 Bella AI Server running on port ${PORT}`);
    console.log(`🌐 Bella Web App: http://localhost:${PORT}/`);
    console.log(`📡 API endpoints available at http://localhost:${PORT}/api/`);
    console.log(`🔧 Health check: http://localhost:${PORT}/api/health`);
    console.log(`💬 Chat endpoint: POST http://localhost:${PORT}/api/chat`);
    console.log(`🎤 FishAudio test: GET http://localhost:${PORT}/api/test/fishaudio`);
    console.log(`🤖 Gemini test: POST http://localhost:${PORT}/api/test/gemini`);
});