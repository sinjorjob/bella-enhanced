const axios = require('axios');
const config = require('../config/config');

class FishAudioService {
    constructor() {
        this.apiKey = config.fishAudio.apiKey;
        this.modelId = config.fishAudio.modelId;
        // FishAudio REST API エンドポイント
        this.baseUrl = 'https://api.fish.audio';
    }
    
    async synthesize(text) {
        try {
            console.log('FishAudio TTS Request:', { text, modelId: this.modelId });
            
            // FishAudio API v1 のJSON形式リクエスト
            const requestData = {
                text: text,
                reference_id: this.modelId,
                chunk_length: 200,
                normalize: true,
                format: 'mp3',
                mp3_bitrate: 128,
                opus_bitrate: -1000,
                latency: 'normal',
                streaming: false,
                prosody: {
                    speed: 1.0,
                    volume: 0
                },
                temperature: 0.7,
                top_p: 0.9
            };
            
            console.log('Request data:', JSON.stringify(requestData, null, 2));
            
            const response = await axios.post(
                `${this.baseUrl}/v1/tts`,
                requestData,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        'Accept': 'audio/mpeg'
                    },
                    responseType: 'arraybuffer',
                    timeout: 30000 // 30秒タイムアウト
                }
            );
            
            if (response.status !== 200) {
                throw new Error(`FishAudio API returned status ${response.status}`);
            }
            
            // Base64エンコードして返す
            const audioBase64 = Buffer.from(response.data).toString('base64');
            const audioUrl = `data:audio/mp3;base64,${audioBase64}`;
            
            console.log('FishAudio TTS Success:', { 
                textLength: text.length, 
                audioSize: audioBase64.length,
                status: response.status 
            });
            
            return audioUrl;
            
        } catch (error) {
            console.error('FishAudio API Error:', error.message);
            
            // エラーの詳細をログに記録
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response headers:', error.response.headers);
                if (error.response.data) {
                    const errorText = Buffer.from(error.response.data).toString('utf-8');
                    console.error('Response data:', errorText);
                }
            }
            
            throw new Error(`音声合成に失敗しました: ${error.message}`);
        }
    }
    
    // 音声合成のテスト用メソッド
    async testSynthesis() {
        try {
            const testText = 'こんにちは！私はBellaです。音声テストをしています。';
            const audioUrl = await this.synthesize(testText);
            console.log('FishAudio test successful');
            return audioUrl;
        } catch (error) {
            console.error('FishAudio test failed:', error.message);
            throw error;
        }
    }
}

module.exports = FishAudioService;