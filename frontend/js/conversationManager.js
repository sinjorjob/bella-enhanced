class ConversationManager {
    constructor() {
        this.PROFILE_KEY = 'bella_user_profile';
        this.HISTORY_KEY = 'bella_conversation_history';
        this.MAX_HISTORY_ITEMS = 50;
        this.MAX_CONTEXT_ITEMS = 10;
        this.HISTORY_EXPIRY_HOURS = 24;
        this.IMPORTANT_EXPIRY_DAYS = 7;
        this.API_BASE_URL = 'http://localhost:3000/api';
        
        this.extractor = new UserProfileExtractor();
        this.fileManager = new FileManager();
        this.initializeStorage();
        this.startFileBackupSystem();
    }
    
    initializeStorage() {
        // 初回起動時の初期化
        if (!localStorage.getItem(this.PROFILE_KEY)) {
            this.saveUserProfile({
                name: null,
                birthday: null,
                preferences: {
                    likes: [],
                    dislikes: []
                },
                customNotes: [],
                lastUpdated: new Date().toISOString()
            });
        }
        
        if (!localStorage.getItem(this.HISTORY_KEY)) {
            this.saveConversationHistory({
                conversations: [],
                sessionStarted: new Date().toISOString()
            });
        }
        
        // 古い履歴のクリーンアップ
        this.cleanupOldHistory();
    }
    
    loadUserProfile() {
        try {
            const profile = localStorage.getItem(this.PROFILE_KEY);
            return profile ? JSON.parse(profile) : null;
        } catch (error) {
            console.error('ユーザープロファイルの読み込みエラー:', error);
            return null;
        }
    }
    
    saveUserProfile(profile) {
        try {
            localStorage.setItem(this.PROFILE_KEY, JSON.stringify(profile));
            // サーバー経由でファイル保存
            this.saveToServer('profile', profile);
        } catch (error) {
            console.error('ユーザープロファイルの保存エラー:', error);
        }
    }
    
    loadConversationHistory() {
        try {
            const history = localStorage.getItem(this.HISTORY_KEY);
            return history ? JSON.parse(history) : { conversations: [] };
        } catch (error) {
            console.error('会話履歴の読み込みエラー:', error);
            return { conversations: [] };
        }
    }
    
    saveConversationHistory(history) {
        try {
            // 最大件数を超えないように調整
            if (history.conversations.length > this.MAX_HISTORY_ITEMS) {
                history.conversations = history.conversations.slice(-this.MAX_HISTORY_ITEMS);
            }
            localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
            // サーバー経由でファイル保存
            this.saveToServer('history', history);
        } catch (error) {
            console.error('会話履歴の保存エラー:', error);
        }
    }
    
    async processUserMessage(message, previousMessages = []) {
        // 1. 複数の重要情報を抽出
        const extractedInfos = this.extractor.extractMultipleInfo(message);
        
        // 2. プロファイル更新
        let profileUpdated = false;
        const updateMessages = [];
        const profile = this.loadUserProfile();
        
        for (const info of extractedInfos) {
            if (info.confidence > 0.7) {
                const updateResult = this.updateProfile(profile, info);
                if (updateResult.updated) {
                    profileUpdated = true;
                    updateMessages.push(updateResult.message);
                }
            }
        }
        
        if (profileUpdated) {
            profile.lastUpdated = new Date().toISOString();
            this.saveUserProfile(profile);
        }
        
        // 3. 会話エントリの作成
        const conversationEntry = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            userMessage: message,
            aiResponse: '', // 後で更新
            emotion: 'neutral',
            favorabilityChange: 0,
            isImportant: profileUpdated || extractedInfos.some(info => info.isExplicitlyRequested)
        };
        
        // 4. 最近の会話履歴を取得
        const recentHistory = this.getRecentHistory(this.MAX_CONTEXT_ITEMS);
        
        // 5. 拡張プロンプトの生成
        const prompt = this.createEnhancedPrompt(
            message,
            profile,
            recentHistory,
            updateMessages.join('、')
        );
        
        return { 
            prompt, 
            conversationEntry, 
            profileUpdated, 
            updateMessages 
        };
    }
    
    updateProfile(profile, extractedInfo) {
        let updated = false;
        let message = '';
        
        switch (extractedInfo.type) {
            case 'name':
                profile.name = extractedInfo.value;
                message = `お名前を「${extractedInfo.value}」として記憶しました`;
                updated = true;
                break;
                
            case 'memory':
                // 重複チェック
                const isDuplicate = profile.customNotes.some(
                    note => note.note === extractedInfo.value
                );
                if (!isDuplicate) {
                    profile.customNotes.push({
                        date: new Date().toISOString(),
                        note: extractedInfo.value,
                        type: extractedInfo.isExplicitlyRequested ? 'explicit' : 'contextual'
                    });
                    message = '大切な情報として記憶しました';
                    updated = true;
                }
                break;
                
            case 'birthday':
                profile.birthday = extractedInfo.value;
                message = `誕生日を${extractedInfo.value}として記憶しました`;
                updated = true;
                break;
                
            case 'preference_like':
                if (!profile.preferences.likes.includes(extractedInfo.value)) {
                    profile.preferences.likes.push(extractedInfo.value);
                    message = `「${extractedInfo.value}」が好きなことを記憶しました`;
                    updated = true;
                }
                break;
                
            case 'preference_dislike':
                if (!profile.preferences.dislikes.includes(extractedInfo.value)) {
                    profile.preferences.dislikes.push(extractedInfo.value);
                    message = `「${extractedInfo.value}」が苦手なことを記憶しました`;
                    updated = true;
                }
                break;
        }
        
        return { updated, message };
    }
    
    saveConversation(conversationEntry) {
        const history = this.loadConversationHistory();
        history.conversations.push(conversationEntry);
        this.saveConversationHistory(history);
    }
    
    getRecentHistory(count = 10) {
        const history = this.loadConversationHistory();
        return history.conversations.slice(-count);
    }
    
    createEnhancedPrompt(message, profile, history, updateMessage) {
        // プロファイル情報の整形
        const profileInfo = [];
        if (profile.name) profileInfo.push(`名前: ${profile.name}さん`);
        if (profile.birthday) profileInfo.push(`誕生日: ${profile.birthday}`);
        if (profile.preferences?.likes?.length > 0) {
            profileInfo.push(`好きなもの: ${profile.preferences.likes.join('、')}`);
        }
        if (profile.preferences?.dislikes?.length > 0) {
            profileInfo.push(`嫌いなもの: ${profile.preferences.dislikes.join('、')}`);
        }
        
        // カスタムノートの整形（最新5件）
        const recentNotes = profile.customNotes?.slice(-5).map(n => `- ${n.note}`).join('\n') || '';
        
        // 会話履歴の整形
        const historyText = history.map(h => 
            `ユーザー: ${h.userMessage}\nBella: ${h.aiResponse}`
        ).join('\n\n');
        
        return {
            userInfo: profileInfo.join('\n'),
            recentNotes: recentNotes,
            conversationHistory: historyText,
            currentMessage: message,
            updateMessage: updateMessage
        };
    }
    
    cleanupOldHistory() {
        const history = this.loadConversationHistory();
        const now = new Date();
        
        history.conversations = history.conversations.filter(conv => {
            const convDate = new Date(conv.timestamp);
            const hoursDiff = (now - convDate) / (1000 * 60 * 60);
            
            // 重要な会話は7日間、通常の会話は24時間保持
            if (conv.isImportant) {
                return hoursDiff < (this.IMPORTANT_EXPIRY_DAYS * 24);
            } else {
                return hoursDiff < this.HISTORY_EXPIRY_HOURS;
            }
        });
        
        this.saveConversationHistory(history);
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // サーバーにデータを保存
    async saveToServer(type, data) {
        try {
            const endpoint = type === 'profile' ? '/storage/profile' : '/storage/history';
            const payload = type === 'profile' ? { profileData: data } : { historyData: data };
            
            const response = await fetch(`${this.API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                console.log(`✅ ${type}をサーバーに保存しました`);
            } else {
                console.error(`❌ ${type}の保存に失敗:`, result.error);
            }
        } catch (error) {
            console.error(`❌ サーバー保存エラー (${type}):`, error);
        }
    }
    
    // ファイルバックアップシステムの開始
    startFileBackupSystem() {
        // 定期バックアップの設定（30分ごと）
        setInterval(async () => {
            try {
                const profile = this.loadUserProfile();
                const history = this.loadConversationHistory();
                
                if (profile) {
                    await this.createServerBackup(profile, 'profile');
                }
                
                if (history && history.conversations.length > 0) {
                    await this.createServerBackup(history, 'history');
                }
                
                console.log('📦 定期バックアップを実行しました');
            } catch (error) {
                console.error('❌ 定期バックアップでエラー:', error);
            }
        }, 30 * 60 * 1000); // 30分間隔
        
        console.log('📦 ファイルバックアップシステムを開始しました');
    }
    
    // サーバーでバックアップを作成
    async createServerBackup(data, type) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/storage/backup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data, type })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('❌ サーバーバックアップエラー:', error);
            return false;
        }
    }
    
    // ファイルからインポート
    async importFromFile() {
        try {
            const data = await this.fileManager.importFromFile();
            if (!data) return false;
            
            // データの種類を判定
            if (data.conversations) {
                // 会話履歴ファイル
                if (this.fileManager.validateData(data, 'history')) {
                    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(data));
                    console.log('✅ 会話履歴をインポートしました');
                    return true;
                }
            } else if (data.name !== undefined) {
                // ユーザープロファイル
                if (this.fileManager.validateData(data, 'profile')) {
                    localStorage.setItem(this.PROFILE_KEY, JSON.stringify(data));
                    console.log('✅ ユーザープロファイルをインポートしました');
                    return true;
                }
            }
            
            console.error('❌ 不正なファイル形式です');
            return false;
        } catch (error) {
            console.error('❌ インポートエラー:', error);
            return false;
        }
    }
    
    // 手動バックアップの作成
    async createManualBackup() {
        try {
            const profile = this.loadUserProfile();
            const history = this.loadConversationHistory();
            
            if (profile) {
                await this.fileManager.createBackup(profile, 'profile');
            }
            
            if (history && history.conversations.length > 0) {
                await this.fileManager.createBackup(history, 'history');
            }
            
            console.log('✅ 手動バックアップを作成しました');
            return true;
        } catch (error) {
            console.error('❌ バックアップ作成エラー:', error);
            return false;
        }
    }
    
    // ファイルシステムの状態を取得
    getFileSystemStatus() {
        return this.fileManager.getStatus();
    }
    
    // サーバーのファイル情報を取得
    async getServerFileStats() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/storage/stats`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result.success ? result : null;
        } catch (error) {
            console.error('❌ サーバー情報取得エラー:', error);
            return null;
        }
    }
    
    // デバッグ用：全データのリセット
    resetAllData() {
        localStorage.removeItem(this.PROFILE_KEY);
        localStorage.removeItem(this.HISTORY_KEY);
        this.initializeStorage();
    }
}