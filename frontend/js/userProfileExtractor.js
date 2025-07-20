class UserProfileExtractor {
    constructor() {
        // 名前として認識してはいけない文字列のブラックリスト
        this.nameBlacklist = [
            '教えてもらってない', 'わからない', 'しらない', '知らない', 
            'ない', 'まだ', 'これから', 'あとで', '後で', '今度',
            '忘れた', '思い出せない', '秘密', 'ひみつ', '言えない',
            'だめ', 'ダメ', 'いけない', 'いやだ', 'やだ', 'いや',
            'うーん', 'えーと', 'そうですね', 'はい', 'いいえ'
        ];
        
        this.patterns = {
            name: [
                /私の名前は([ぁ-んァ-ヶー一-龠a-zA-Z0-9]{1,20})(?:です|だ|っす|よ|$)/,
                /([ぁ-んァ-ヶー一-龠a-zA-Z0-9]{1,20})(?:と|って)(?:呼んで|読んで|よんで)/,
                /(?:俺|私|僕|わたし|ぼく)(?:は|の名前は)([ぁ-んァ-ヶー一-龠a-zA-Z0-9]{1,20})(?:だ|です|という|っていう)/,
                /私は([ぁ-んァ-ヶー一-龠a-zA-Z0-9]{1,20})(?:と言います|といいます|っていいます)/,
                /名前は([ぁ-んァ-ヶー一-龠a-zA-Z0-9]{1,20})(?:です|だ|$)/
            ],
            memory: [
                // 記憶リクエストの基本パターン
                /(.+?)(?:を|のこと)?(?:覚えて|記憶して|記録して|忘れないで|忘れるな)/,
                /(.+?)(?:を|のこと)?(?:覚えといて|記憶しといて|記録しといて)/,
                /(.+?)(?:を|のこと)?(?:覚えててね|記憶してね|記録してね|忘れないでね)/,
                /(.+?)(?:って|は|のこと)?覚えておいて/,
                
                // 文末に記憶リクエストが来るパターン
                /(.+?)、?(?:覚えて|記憶して|記録して|忘れないで)$/,
                /(.+?)、?(?:覚えといて|記憶しといて|記録しといて)$/,
                /(.+?)、?(?:覚えててね|記憶してね|記録してね|忘れないでね)$/,
                
                // 重要性を示すパターン
                /(?:これ|この事?|それ|その事?)(?:は|って)?(?:重要|大事|大切)/,
                /(?:重要|大事|大切)(?:な(?:こと|事)|だから)/,
                
                // 「〜しといて」系の短縮形
                /(.+?)、?記録よろしく/,
                /(.+?)、?メモ(?:して|っといて|お願い)/,
                /(.+?)、?(?:覚え|記憶|記録)(?:お願い|頼む|たのむ)/
            ],
            birthday: [
                /誕生日は?(.+?月.+?日)/,
                /(.+?月.+?日)(?:生まれ|が誕生日|に生まれた)/,
                /(?:私|俺|僕)(?:の)?誕生日(?:は)?(.+?月.+?日)/,
                /(.+?月.+?日)(?:が|は)?(?:私|俺|僕)の誕生日/
            ],
            preferences: {
                likes: [
                    /(.+?)(?:が|は)?(?:好き|すき|スキ|大好き|だいすき)(?:です|だ|$)/,
                    /(.+?)(?:が|は)?(?:お気に入り|気に入って|推し)/,
                    /(.+?)(?:に|が)?(?:ハマって|はまって|夢中)/,
                    /(.+?)(?:が|は)?(?:最高|さいこう|イイ|いい|良い)(?:です|だ|よ|ね|$)/
                ],
                dislikes: [
                    /(.+?)(?:が|は)?(?:嫌い|きらい|キライ|大嫌い)(?:です|だ|$)/,
                    /(.+?)(?:は|が)?(?:ダメ|だめ|無理|ムリ|NG|苦手)(?:です|だ|$)/,
                    /(.+?)(?:は|が)?(?:ちょっと|あんまり|あまり)(?:…|\.\.\.|$)/
                ]
            }
        };
        
        // 文脈を考慮した追加の検出ロジック
        this.contextualPatterns = {
            // 「これ」「それ」などの指示語を使った記憶リクエスト
            demonstrative: /(?:これ|それ|あれ|この|その|あの)(?:.+)?(?:覚えて|記憶して|記録して|忘れないで)/,
            
            // 会話の流れで重要性を示すパターン
            importance: /(?:ちなみに|ところで|そういえば|あと)(.+?)(?:ね|よ|から)/
        };
    }
    
    extractMultipleInfo(message) {
        const results = [];
        
        // 1. まず記憶リクエストの有無をチェック
        const hasMemoryRequest = this.checkMemoryRequest(message);
        
        // 2. 名前パターンの検出
        this.extractPattern(message, 'name', this.patterns.name, results, hasMemoryRequest);
        
        // 3. 誕生日パターンの検出
        this.extractPattern(message, 'birthday', this.patterns.birthday, results, hasMemoryRequest);
        
        // 4. 好みの検出（好き）
        this.extractPattern(message, 'preference_like', this.patterns.preferences.likes, results, hasMemoryRequest);
        
        // 5. 好みの検出（嫌い）
        this.extractPattern(message, 'preference_dislike', this.patterns.preferences.dislikes, results, hasMemoryRequest);
        
        // 6. 一般的な記憶リクエストの検出
        if (hasMemoryRequest && results.length === 0) {
            // 他の特定パターンにマッチしない場合は、全文を記憶対象とする
            for (const pattern of this.patterns.memory) {
                const match = message.match(pattern);
                if (match) {
                    results.push({
                        type: 'memory',
                        value: match[1] ? match[1].trim() : message,
                        confidence: 0.8,
                        isExplicitlyRequested: true,
                        position: match.index,
                        length: match[0].length
                    });
                    break;
                }
            }
        }
        
        // 7. 文脈的な重要情報の検出
        if (this.contextualPatterns.importance.test(message)) {
            const match = message.match(this.contextualPatterns.importance);
            if (match) {
                results.push({
                    type: 'memory',
                    value: match[1] || message,
                    confidence: 0.6,
                    isExplicitlyRequested: false,
                    metadata: { contextual: true }
                });
            }
        }
        
        return results;
    }
    
    extractPattern(message, type, patterns, results, hasMemoryRequest) {
        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match) {
                const extractedValue = match[1].trim();
                
                // 名前の場合はブラックリストチェック
                if (type === 'name' && this.isInvalidName(extractedValue)) {
                    console.log(`❌ 無効な名前として拒否: "${extractedValue}"`);
                    continue; // このマッチをスキップして次のパターンを試す
                }
                
                const confidence = this.calculateConfidence(type, hasMemoryRequest);
                results.push({
                    type: type,
                    value: this.normalizeValue(type, extractedValue),
                    confidence: confidence,
                    isExplicitlyRequested: hasMemoryRequest,
                    position: match.index,
                    length: match[0].length
                });
                break; // 最初の有効なマッチのみを採用
            }
        }
    }
    
    // 名前が有効かどうかをチェック
    isInvalidName(name) {
        // ブラックリストに含まれているかチェック
        if (this.nameBlacklist.some(blacklisted => name.includes(blacklisted))) {
            return true;
        }
        
        // 長すぎる場合は無効
        if (name.length > 20) {
            return true;
        }
        
        // 短すぎる場合も無効（1文字の名前は珍しい）
        if (name.length < 2) {
            return true;
        }
        
        // 数字のみの場合は無効
        if (/^\d+$/.test(name)) {
            return true;
        }
        
        // 特殊文字が多い場合は無効
        if (/[!@#$%^&*()_+=\[\]{}|;:,.<>?]/.test(name)) {
            return true;
        }
        
        return false;
    }
    
    checkMemoryRequest(message) {
        return this.patterns.memory.some(pattern => pattern.test(message));
    }
    
    calculateConfidence(type, hasMemoryRequest) {
        const baseConfidence = {
            'name': 0.9,
            'birthday': 0.85,
            'preference_like': 0.8,
            'preference_dislike': 0.8,
            'memory': 0.8
        };
        
        const confidence = baseConfidence[type] || 0.7;
        return hasMemoryRequest ? Math.min(confidence + 0.05, 1.0) : confidence;
    }
    
    normalizeValue(type, value) {
        switch (type) {
            case 'birthday':
                return this.normalizeDateFormat(value);
            case 'name':
                // 敬称を除去
                return value.replace(/(?:さん|くん|ちゃん|様|氏)$/, '');
            default:
                return value;
        }
    }
    
    normalizeDateFormat(dateStr) {
        // 「1月1日」「1/1」「01月01日」などを統一形式に
        const match = dateStr.match(/(\d{1,2})[月\/](\d{1,2})日?/);
        if (match) {
            return `${match[1]}月${match[2]}日`;
        }
        return dateStr;
    }
    
    // より高度な文脈解析（オプション）
    analyzeWithContext(message, previousMessages = []) {
        // 指示語を含む場合、前の会話から情報を補完
        if (/(?:これ|それ|あれ)/.test(message) && previousMessages.length > 0) {
            const lastMessage = previousMessages[previousMessages.length - 1];
            // 簡易的な実装：直前のメッセージの名詞句を抽出
            const nounMatch = lastMessage.userMessage.match(/「(.+?)」|『(.+?)』/);
            if (nounMatch) {
                const referent = nounMatch[1] || nounMatch[2];
                // メッセージ内の指示語を置換
                const expandedMessage = message.replace(/(?:これ|それ|あれ)/, referent);
                return this.extractMultipleInfo(expandedMessage);
            }
        }
        
        return this.extractMultipleInfo(message);
    }
}