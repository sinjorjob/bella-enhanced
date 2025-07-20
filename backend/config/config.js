const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const config = {
    // Server configuration
    port: process.env.PORT || 3000,
    
    // Google Gemini AI configuration
    google: {
        apiKey: process.env.GOOGLE_API_KEY,
        modelName: 'gemini-1.5-pro'
    },
    
    // FishAudio configuration
    fishAudio: {
        apiKey: process.env.FISH_AUDIO_API_KEY,
        modelId: process.env.FISH_AUDIO_MODEL_ID || '0098edd06ff54679ae52c74556b048fa',
        baseUrl: 'https://api.fish.audio/v1'
    }
};

// Validate required environment variables
const requiredEnvVars = ['GOOGLE_API_KEY', 'FISH_AUDIO_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars);
    console.error('Please copy .env.example to .env and fill in the required values');
    process.exit(1);
}

module.exports = config;