const fs = require('fs').promises;
const path = require('path');

class FileStorageService {
    constructor() {
        this.DATA_DIR = path.join(__dirname, '../../Bella/data');
        this.PROFILE_FILE = 'bella_user_profile.json';
        this.HISTORY_FILE = 'bella_conversation_history.json';
        this.BACKUP_DIR = path.join(this.DATA_DIR, 'backups');
        
        this.ensureDirectories();
    }
    
    async ensureDirectories() {
        try {
            await fs.mkdir(this.DATA_DIR, { recursive: true });
            await fs.mkdir(this.BACKUP_DIR, { recursive: true });
            console.log('📁 データディレクトリを準備しました');
        } catch (error) {
            console.error('❌ ディレクトリ作成エラー:', error);
        }
    }
    
    async saveProfile(profileData) {
        try {
            const filePath = path.join(this.DATA_DIR, this.PROFILE_FILE);
            await fs.writeFile(filePath, JSON.stringify(profileData, null, 2), 'utf8');
            console.log('✅ プロファイルを保存しました:', filePath);
            return true;
        } catch (error) {
            console.error('❌ プロファイル保存エラー:', error);
            return false;
        }
    }
    
    async saveHistory(historyData) {
        try {
            const filePath = path.join(this.DATA_DIR, this.HISTORY_FILE);
            await fs.writeFile(filePath, JSON.stringify(historyData, null, 2), 'utf8');
            console.log('✅ 会話履歴を保存しました:', filePath);
            return true;
        } catch (error) {
            console.error('❌ 会話履歴保存エラー:', error);
            return false;
        }
    }
    
    async loadProfile() {
        try {
            const filePath = path.join(this.DATA_DIR, this.PROFILE_FILE);
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.log('プロファイルファイルが見つかりません');
            return null;
        }
    }
    
    async loadHistory() {
        try {
            const filePath = path.join(this.DATA_DIR, this.HISTORY_FILE);
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.log('履歴ファイルが見つかりません');
            return null;
        }
    }
    
    async createBackup(data, type) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFileName = `${type}_backup_${timestamp}.json`;
            const backupPath = path.join(this.BACKUP_DIR, backupFileName);
            
            const backupData = {
                ...data,
                backupInfo: {
                    timestamp: new Date().toISOString(),
                    type: type,
                    version: '1.0'
                }
            };
            
            await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
            console.log('📦 バックアップを作成しました:', backupPath);
            return true;
        } catch (error) {
            console.error('❌ バックアップ作成エラー:', error);
            return false;
        }
    }
    
    async listBackups() {
        try {
            const files = await fs.readdir(this.BACKUP_DIR);
            return files.filter(file => file.endsWith('.json'));
        } catch (error) {
            console.error('❌ バックアップリスト取得エラー:', error);
            return [];
        }
    }
    
    async getFileStats() {
        try {
            const profilePath = path.join(this.DATA_DIR, this.PROFILE_FILE);
            const historyPath = path.join(this.DATA_DIR, this.HISTORY_FILE);
            
            const stats = {};
            
            try {
                const profileStat = await fs.stat(profilePath);
                stats.profile = {
                    exists: true,
                    size: profileStat.size,
                    lastModified: profileStat.mtime
                };
            } catch {
                stats.profile = { exists: false };
            }
            
            try {
                const historyStat = await fs.stat(historyPath);
                stats.history = {
                    exists: true,
                    size: historyStat.size,
                    lastModified: historyStat.mtime
                };
            } catch {
                stats.history = { exists: false };
            }
            
            return stats;
        } catch (error) {
            console.error('❌ ファイル情報取得エラー:', error);
            return {};
        }
    }
}

module.exports = FileStorageService;