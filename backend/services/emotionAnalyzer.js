class EmotionAnalyzer {
    constructor() {
        // 感情分析用のキーワード辞書
        this.emotionKeywords = {
            positive: {
                keywords: ['嬉しい', '楽しい', '好き', '可愛い', '素敵', '最高', '良い', '面白い', '素晴らしい', '愛してる', '大好き', '幸せ', '♪', '♡', '💕', '😊', '🥰', '☺️'],
                weight: 1
            },
            negative: {
                keywords: ['悲しい', '辛い', '嫌い', '怒り', '腹立つ', '最悪', 'ダメ', 'むかつく', '疲れた', '落ち込む', '😢', '😭', '😠', '💢'],
                weight: 1
            },
            neutral: {
                keywords: ['普通', 'まあまあ', 'そうですね', 'なるほど', 'そうなんですね'],
                weight: 0.5
            }
        };
    }
    
    analyze(text) {
        let positiveScore = 0;
        let negativeScore = 0;
        let neutralScore = 0;
        
        // ポジティブキーワードの検出
        for (const keyword of this.emotionKeywords.positive.keywords) {
            const count = (text.match(new RegExp(keyword, 'g')) || []).length;
            positiveScore += count * this.emotionKeywords.positive.weight;
        }
        
        // ネガティブキーワードの検出
        for (const keyword of this.emotionKeywords.negative.keywords) {
            const count = (text.match(new RegExp(keyword, 'g')) || []).length;
            negativeScore += count * this.emotionKeywords.negative.weight;
        }
        
        // ニュートラルキーワードの検出
        for (const keyword of this.emotionKeywords.neutral.keywords) {
            const count = (text.match(new RegExp(keyword, 'g')) || []).length;
            neutralScore += count * this.emotionKeywords.neutral.weight;
        }
        
        // 最も高いスコアの感情を返す
        const maxScore = Math.max(positiveScore, negativeScore, neutralScore);
        
        if (maxScore === 0) {
            return 'neutral';
        }
        
        if (positiveScore === maxScore) {
            return 'positive';
        } else if (negativeScore === maxScore) {
            return 'negative';
        } else {
            return 'neutral';
        }
    }
    
    // 感情スコアの詳細を返すメソッド
    getDetailedAnalysis(text) {
        let positiveScore = 0;
        let negativeScore = 0;
        let neutralScore = 0;
        let foundKeywords = [];
        
        // ポジティブキーワードの検出
        for (const keyword of this.emotionKeywords.positive.keywords) {
            const matches = text.match(new RegExp(keyword, 'g'));
            if (matches) {
                positiveScore += matches.length * this.emotionKeywords.positive.weight;
                foundKeywords.push({ keyword, type: 'positive', count: matches.length });
            }
        }
        
        // ネガティブキーワードの検出
        for (const keyword of this.emotionKeywords.negative.keywords) {
            const matches = text.match(new RegExp(keyword, 'g'));
            if (matches) {
                negativeScore += matches.length * this.emotionKeywords.negative.weight;
                foundKeywords.push({ keyword, type: 'negative', count: matches.length });
            }
        }
        
        // ニュートラルキーワードの検出
        for (const keyword of this.emotionKeywords.neutral.keywords) {
            const matches = text.match(new RegExp(keyword, 'g'));
            if (matches) {
                neutralScore += matches.length * this.emotionKeywords.neutral.weight;
                foundKeywords.push({ keyword, type: 'neutral', count: matches.length });
            }
        }
        
        const emotion = this.analyze(text);
        
        return {
            emotion,
            scores: {
                positive: positiveScore,
                negative: negativeScore,
                neutral: neutralScore
            },
            foundKeywords
        };
    }
}

module.exports = EmotionAnalyzer;