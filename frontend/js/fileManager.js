class FileManager {
    constructor() {
        this.DATA_DIR = './data/';
        this.PROFILE_FILE = 'bella_user_profile.json';
        this.HISTORY_FILE = 'bella_conversation_history.json';
        this.BACKUP_DIR = './data/backups/';
        this.isFileSystemAvailable = this.checkFileSystemAccess();
    }
    
    checkFileSystemAccess() {
        // ブラウザでFile System Access APIが使用可能かチェック
        return 'showSaveFilePicker' in window;
    }
    
    // JSONファイルを自動ダウンロード（リアルタイム保存）
    async saveToFile(filename, data) {
        if (!this.isFileSystemAvailable) {
            // File System Access APIが使用できない場合はBlobでダウンロード
            this.downloadAsBlob(filename, data);
            return;
        }
        
        try {
            // ファイルハンドルを取得（初回のみユーザーが選択）
            const fileHandle = await this.getFileHandle(filename);
            
            // ファイルに書き込み
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
            
            console.log(`✅ ${filename} を保存しました`);
        } catch (error) {
            console.error(`❌ ${filename} の保存に失敗:`, error);
            // フォールバック：Blobダウンロード
            this.downloadAsBlob(filename, data);
        }
    }
    
    // ファイルハンドルを取得（キャッシュ機能付き）
    async getFileHandle(filename) {
        // 既存のファイルハンドルがあるかチェック
        const cachedHandle = this.fileHandleCache?.[filename];
        if (cachedHandle) {
            return cachedHandle;
        }
        
        // 新しいファイルハンドルを作成
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{
                description: 'JSON files',
                accept: {
                    'application/json': ['.json']
                }
            }]
        });
        
        // キャッシュに保存
        if (!this.fileHandleCache) {
            this.fileHandleCache = {};
        }
        this.fileHandleCache[filename] = fileHandle;
        
        return fileHandle;
    }
    
    // Blobとしてダウンロード（フォールバック）
    downloadAsBlob(filename, data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        console.log(`📥 ${filename} をダウンロードしました`);
    }
    
    // タイムスタンプ付きバックアップ
    async createBackup(data, type) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFilename = `${type}_backup_${timestamp}.json`;
        
        await this.saveToFile(backupFilename, {
            ...data,
            backupInfo: {
                timestamp: new Date().toISOString(),
                type: type,
                version: '1.0'
            }
        });
    }
    
    // 定期バックアップの設定
    startPeriodicBackup(getProfileData, getHistoryData, intervalMinutes = 30) {
        setInterval(async () => {
            try {
                const profileData = getProfileData();
                const historyData = getHistoryData();
                
                if (profileData) {
                    await this.createBackup(profileData, 'profile');
                }
                
                if (historyData && historyData.conversations.length > 0) {
                    await this.createBackup(historyData, 'history');
                }
                
                console.log('📦 定期バックアップを実行しました');
            } catch (error) {
                console.error('❌ 定期バックアップでエラー:', error);
            }
        }, intervalMinutes * 60 * 1000);
    }
    
    // ファイルからインポート
    async importFromFile() {
        if (!this.isFileSystemAvailable) {
            console.warn('File System Access APIが利用できません');
            return null;
        }
        
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'JSON files',
                    accept: {
                        'application/json': ['.json']
                    }
                }]
            });
            
            const file = await fileHandle.getFile();
            const contents = await file.text();
            return JSON.parse(contents);
        } catch (error) {
            console.error('ファイルインポートエラー:', error);
            return null;
        }
    }
    
    // データの整合性チェック
    validateData(data, type) {
        if (!data || typeof data !== 'object') {
            return false;
        }
        
        switch (type) {
            case 'profile':
                return typeof data.name === 'string' || data.name === null;
            case 'history':
                return Array.isArray(data.conversations);
            default:
                return true;
        }
    }
    
    // 現在の保存状態を確認
    getStatus() {
        return {
            fileSystemAvailable: this.isFileSystemAvailable,
            cachedHandles: Object.keys(this.fileHandleCache || {}),
            supportedFeatures: {
                fileSystemAccess: 'showSaveFilePicker' in window,
                blob: 'Blob' in window,
                download: 'download' in document.createElement('a')
            }
        };
    }
}