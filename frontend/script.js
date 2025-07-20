document.addEventListener('DOMContentLoaded', function() {

    // --- API設定 ---
    const API_BASE_URL = 'http://localhost:3000/api';
    let isProcessingAI = false; // AI処理中フラグ
    
    // --- 会話履歴管理 ---
    const conversationManager = new ConversationManager();
    
    // 定期的なクリーンアップ（5分ごと）
    setInterval(() => {
        conversationManager.cleanupOldHistory();
    }, 5 * 60 * 1000);
    
    // デバッグ用のグローバル関数
    window.bellaDebug = {
        showProfile: () => {
            console.log('ユーザープロファイル:', conversationManager.loadUserProfile());
        },
        showHistory: () => {
            console.log('会話履歴:', conversationManager.loadConversationHistory());
        },
        resetData: () => {
            if (confirm('全てのデータをリセットしますか？')) {
                conversationManager.resetAllData();
                console.log('データをリセットしました');
            }
        },
        testExtraction: (text) => {
            const extractor = new UserProfileExtractor();
            const results = extractor.extractMultipleInfo(text);
            console.log('抽出結果:', results);
            return results;
        },
        // ファイル関連の新機能
        createBackup: async () => {
            const success = await conversationManager.createManualBackup();
            console.log(success ? '✅ バックアップを作成しました' : '❌ バックアップの作成に失敗しました');
        },
        importFromFile: async () => {
            const success = await conversationManager.importFromFile();
            console.log(success ? '✅ インポートが完了しました' : '❌ インポートに失敗しました');
        },
        showFileSystemStatus: () => {
            console.log('ファイルシステム状態:', conversationManager.getFileSystemStatus());
        },
        showServerFileStats: async () => {
            const stats = await conversationManager.getServerFileStats();
            console.log('サーバーファイル情報:', stats);
        },
        exportProfile: () => {
            const profile = conversationManager.loadUserProfile();
            const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'bella_user_profile.json';
            a.click();
            URL.revokeObjectURL(url);
            console.log('📥 プロファイルをエクスポートしました');
        },
        exportHistory: () => {
            const history = conversationManager.loadConversationHistory();
            const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'bella_conversation_history.json';
            a.click();
            URL.revokeObjectURL(url);
            console.log('📥 会話履歴をエクスポートしました');
        }
    };

    // --- 加载屏幕处理 ---
    const loadingScreen = document.getElementById('loading-screen');
    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        // 在动画结束后将其隐藏，以防它阻碍交互
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            // ローディング完了後に初回利用チェック
            checkFirstTimeUser();
        }, 500); // 这个时间应该匹配 CSS 中的 transition 时间
    }, 1500); // 1.5秒后开始淡出
    
    // 获取需要的 DOM 元素
    let video1 = document.getElementById('video1');
    let video2 = document.getElementById('video2');
    const micButton = document.getElementById('mic-button');
    const favorabilityBar = document.getElementById('favorability-bar');

    let activeVideo = video1;
    let inactiveVideo = video2;

    // 動画リスト
    const videoList = [
        '動画リソース/デフォルト動画.mp4',
        '動画リソース/ポジティブ/笑顔で優雅に揺れる.mp4',
        '動画リソース/ポジティブ/ピースサインして微笑む.mp4',
        '動画リソース/ポジティブ/応援ダンス.mp4',
        '動画リソース/ポジティブ/楽しいダンス.mp4',
        '動画リソース/ネガティブ/少し怒った表情.mp4'
    ];

    // --- 视频交叉淡入淡出播放功能 ---
    function switchVideo() {
        // 1. 选择下一个视频
        const currentVideoSrc = activeVideo.querySelector('source').getAttribute('src');
        let nextVideoSrc = currentVideoSrc;
        while (nextVideoSrc === currentVideoSrc) {
            const randomIndex = Math.floor(Math.random() * videoList.length);
            nextVideoSrc = videoList[randomIndex];
        }

        // 2. 设置不活动的 video 元素的 source
        inactiveVideo.querySelector('source').setAttribute('src', nextVideoSrc);
        inactiveVideo.load();

        // 3. 当不活动的视频可以播放时，执行切换
        inactiveVideo.addEventListener('canplaythrough', function onCanPlayThrough() {
            // 确保事件只触发一次
            inactiveVideo.removeEventListener('canplaythrough', onCanPlayThrough);

            // 4. 播放新视频
            inactiveVideo.play().catch(error => {
                console.error("Video play failed:", error);
            });

            // 5. 切换 active class 来触发 CSS 过渡
            activeVideo.classList.remove('active');
            inactiveVideo.classList.add('active');

            // 6. 更新角色
            [activeVideo, inactiveVideo] = [inactiveVideo, activeVideo];

            // 为新的 activeVideo 绑定 ended 事件
            activeVideo.addEventListener('ended', switchVideo, { once: true });
        }, { once: true }); // 使用 { once: true } 确保事件只被处理一次
    }

    // 初始启动
    activeVideo.addEventListener('ended', switchVideo, { once: true });


    // --- 语音识别核心 ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;

    // 检查浏览器是否支持语音识别
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true; // 持続的な認識
        recognition.lang = 'ja-JP'; // 日本語に設定
        recognition.interimResults = true; // 中間結果を取得
        recognition.maxAlternatives = 1; // 最多返回一个结果
        recognition.serviceURI = ''; // 清空服务URI以使用默认

        recognition.onresult = (event) => {
            const transcriptContainer = document.getElementById('transcript');
            let final_transcript = '';
            let interim_transcript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final_transcript += event.results[i][0].transcript;
                } else {
                    interim_transcript += event.results[i][0].transcript;
                }
            }
            
            // ユーザーの発話を表示（中間結果または最終結果）
            if (interim_transcript || final_transcript) {
                transcriptContainer.textContent = `👤 ${final_transcript || interim_transcript}`;
                transcriptContainer.setAttribute('data-type', 'user');
            }
            
            // AIでの返答生成
            if (final_transcript) {
                handleUserMessage(final_transcript);
            }
        };

        recognition.onerror = (event) => {
            console.error('音声認識エラー:', event.error);
            recognitionState = 'stopped';
            
            // 特定のエラータイプを処理
            if (event.error === 'no-speech') {
                console.log('音声が検出されませんでした');
                // no-speechエラーの場合は自動再起動しない（無限ループを防ぐ）
            } else if (event.error === 'not-allowed') {
                console.error('マイク権限が拒否されました');
                // 権限エラーの場合は完全にリセット
                stopListening();
                alert('マイク権限を許可してください。ブラウザの設定から音声認識を有効にしてください。');
            } else if (event.error === 'network') {
                console.error('ネットワークエラー');
            } else if (event.error === 'aborted') {
                console.log('音声認識が中断されました');
            } else if (event.error === 'audio-capture') {
                console.error('音声キャプチャエラー');
                stopListening();
            }
        };

        recognition.onstart = () => {
            console.log('音声認識開始');
            recognitionState = 'running';
        };
        
        recognition.onend = () => {
            console.log('音声認識終了');
            recognitionState = 'stopped';
            
            // リスニング状態かつAI処理中でない場合のみ再起動
            // ただし、音声再生中は再起動しない
            if (isListening && !isProcessingAI && !isPlayingAudio) {
                // 少し遅延を入れてから再起動
                recognitionTimeout = setTimeout(() => {
                    // 再度確認（状態が変わっている可能性）
                    if (isListening && !isProcessingAI && !isPlayingAudio && recognitionState === 'stopped') {
                        startRecognition();
                    }
                }, 1000);
            }
        };

    } else {
        console.log('ブラウザが音声認識に対応していません');
        alert('このブラウザは音声認識に対応していません。ChromeまたはEdgeをご利用ください。');
    }

    // --- 麦克风按钮交互 ---
    let isListening = false;
    let recognitionState = 'stopped'; // 'stopped', 'starting', 'running', 'stopping'
    let recognitionTimeout = null;
    let isPlayingAudio = false; // 音声再生中フラグ

    // 音声認識を開始する関数
    function startRecognition() {
        if (recognitionState === 'running' || recognitionState === 'starting') {
            console.log('音声認識は既に動作中です');
            return;
        }
        
        try {
            recognitionState = 'starting';
            recognition.start();
            console.log('音声認識を開始しました');
        } catch (e) {
            console.error('音声認識の開始に失敗:', e);
            recognitionState = 'stopped';
            if (e.name === 'InvalidStateError') {
                console.log('音声認識は既に開始されています');
            } else {
                const transcriptText = document.getElementById('transcript');
                transcriptText.textContent = '音声認識の開始に失敗しました';
                setTimeout(() => {
                    stopListening();
                }, 2000);
            }
        }
    }
    
    // 音声認識を停止する関数
    function stopRecognition() {
        if (recognitionState === 'running' || recognitionState === 'starting') {
            recognitionState = 'stopping';
            recognition.stop();
            console.log('音声認識を停止しました');
        }
        
        // タイムアウトをクリア
        if (recognitionTimeout) {
            clearTimeout(recognitionTimeout);
            recognitionTimeout = null;
        }
    }
    
    // リスニング状態を停止する関数
    function stopListening() {
        isListening = false;
        micButton.classList.remove('is-listening');
        const transcriptContainer = document.querySelector('.transcript-container');
        transcriptContainer.classList.remove('visible');
        const transcriptText = document.getElementById('transcript');
        transcriptText.textContent = '';
        stopRecognition();
    }

    micButton.addEventListener('click', function() {
        if (!SpeechRecognition) return;

        isListening = !isListening;
        micButton.classList.toggle('is-listening', isListening);
        const transcriptContainer = document.querySelector('.transcript-container');
        const transcriptText = document.getElementById('transcript');

        if (isListening) {
            transcriptText.textContent = '聞いています...';
            transcriptText.setAttribute('data-type', 'listening');
            transcriptContainer.classList.add('visible');
            startRecognition();
        } else {
            stopListening();
        }
    });

    // --- リセット機能 ---
    
    // 会話履歴リセットボタン
    const resetHistoryBtn = document.getElementById('reset-history-btn');
    resetHistoryBtn.addEventListener('click', function() {
        if (confirm('会話履歴をリセットしますか？\n（ユーザー情報は保持されます）')) {
            // 会話履歴のみリセット
            localStorage.removeItem(conversationManager.HISTORY_KEY);
            conversationManager.saveConversationHistory({
                conversations: [],
                sessionStarted: new Date().toISOString()
            });
            
            // 視覚的フィードバック
            const transcriptContainer = document.getElementById('transcript');
            transcriptContainer.textContent = '📝 会話履歴をリセットしました';
            transcriptContainer.setAttribute('data-type', 'bella');
            
            setTimeout(() => {
                transcriptContainer.textContent = '';
                transcriptContainer.removeAttribute('data-type');
            }, 3000);
            
            console.log('✅ 会話履歴をリセットしました');
        }
    });
    
    // ユーザー情報リセットボタン
    const resetProfileBtn = document.getElementById('reset-profile-btn');
    resetProfileBtn.addEventListener('click', function() {
        if (confirm('ユーザー情報（名前、誕生日、好み、記憶など）をリセットしますか？\n（会話履歴は保持されます）')) {
            // ユーザープロファイルのみリセット
            localStorage.removeItem(conversationManager.PROFILE_KEY);
            conversationManager.saveUserProfile({
                name: null,
                birthday: null,
                preferences: {
                    likes: [],
                    dislikes: []
                },
                customNotes: [],
                lastUpdated: new Date().toISOString()
            });
            
            // 視覚的フィードバック
            const transcriptContainer = document.getElementById('transcript');
            transcriptContainer.textContent = '👤 ユーザー情報をリセットしました';
            transcriptContainer.setAttribute('data-type', 'bella');
            
            setTimeout(() => {
                transcriptContainer.textContent = '';
                transcriptContainer.removeAttribute('data-type');
            }, 3000);
            
            console.log('✅ ユーザー情報をリセットしました');
        }
    });


    // --- 感情分析と反応 ---
    const positiveWords = ['嬉しい', '楽しい', '好き', '素敵', 'こんにちは', '可愛い', 'かわいい', '綺麗', 'きれい', '素晴らしい', 'ありがとう'];
    const negativeWords = ['悲しい', '怒る', '嫌い', '辛い', 'つらい', 'むかつく', '最悪'];

    const positiveVideos = [
        '動画リソース/ポジティブ/笑顔で優雅に揺れる.mp4',
        '動画リソース/ポジティブ/ピースサインして微笑む.mp4',
        '動画リソース/ポジティブ/応援ダンス.mp4',
        '動画リソース/ポジティブ/楽しいダンス.mp4'
    ];
    const negativeVideo = '動画リソース/ネガティブ/少し怒った表情.mp4';

    // 従来の感情分析（フォールバック用）
    function analyzeAndReact(text) {
        let reaction = 'neutral';

        if (positiveWords.some(word => text.includes(word))) {
            reaction = 'positive';
        } else if (negativeWords.some(word => text.includes(word))) {
            reaction = 'negative';
        }

        if (reaction !== 'neutral') {
            switchVideoByEmotion(reaction);
        }
    }

    // 好感度を更新する関数
    function updateFavorability(change) {
        let currentWidth = parseFloat(favorabilityBar.style.width) || 65;
        let newWidth = Math.max(0, Math.min(100, currentWidth + change));
        favorabilityBar.style.width = newWidth + '%';
    }

    // ユーザーメッセージの処理
    async function handleUserMessage(userText) {
        if (isProcessingAI) {
            console.log('AI処理中のため、リクエストをスキップします');
            return;
        }
        
        isProcessingAI = true;
        const transcriptContainer = document.getElementById('transcript');
        
        try {
            // ユーザーの発話を表示してから少し待つ
            transcriptContainer.textContent = `👤 ${userText}`;
            transcriptContainer.setAttribute('data-type', 'user');
            
            // 少し遅延してから「考え中...」に切り替え
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // ローディング表示（美少女っぽいアイコン）
            transcriptContainer.textContent = '💭✨ Bellaが考え中...';
            transcriptContainer.setAttribute('data-type', 'thinking');
            
            // 会話履歴と重要情報の抽出
            const conversationResult = await conversationManager.processUserMessage(userText);
            
            // 拡張されたプロンプトでAPIに送信
            const response = await sendToAPI(userText, conversationResult);
            
            if (response) {
                // 会話エントリを完成させる
                conversationResult.conversationEntry.aiResponse = response.text;
                conversationResult.conversationEntry.emotion = response.emotion;
                conversationResult.conversationEntry.favorabilityChange = response.favorabilityChange;
                
                // 会話履歴に保存
                conversationManager.saveConversation(conversationResult.conversationEntry);
                
                // 応答を処理
                await handleAIResponse(response, conversationResult.updateMessages);
            } else {
                // フォールバック
                transcriptContainer.textContent = '🙏 ごめんなさい、うまく聞き取れませんでした...';
            }
            
        } catch (error) {
            console.error('AI処理エラー:', error);
            transcriptContainer.textContent = '😅 ちょっと調子が悪いみたい...後でもう一度お話しましょう！';
        } finally {
            isProcessingAI = false;
        }
    }
    
    // APIとの通信
    async function sendToAPI(message, conversationResult) {
        const currentFavorability = parseFloat(favorabilityBar.style.width) || 65;
        
        try {
            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    favorability: currentFavorability,
                    // 会話履歴と重要情報を含めた拡張プロンプト
                    conversationContext: conversationResult.prompt
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API通信エラー:', error);
            return null;
        }
    }
    
    // AI応答の処理
    async function handleAIResponse(response, updateMessages = []) {
        const transcriptContainer = document.getElementById('transcript');
        
        try {
            // 記録メッセージはコンソールにのみ出力
            if (updateMessages.length > 0) {
                console.log('💾 記録:', updateMessages.join('、'));
            }
            
            // 1. 好感度更新
            if (response.favorabilityChange) {
                updateFavorability(response.favorabilityChange);
            }
            
            // 2. 音声再生（FishAudio）- 感情による動画切り替えも含む
            if (response.audioUrl) {
                // 音声再生開始時に感情に応じた動画切り替え
                if (response.emotion && response.emotion !== 'neutral') {
                    console.log('感情による動画切り替え:', response.emotion);
                    switchVideoByEmotion(response.emotion);
                }
                await playAudioResponse(response.audioUrl, response.text);
            } else {
                // 音声がない場合のフォールバック
                if (response.emotion && response.emotion !== 'neutral') {
                    switchVideoByEmotion(response.emotion);
                }
                transcriptContainer.textContent = '💕 ' + response.text;
                transcriptContainer.setAttribute('data-type', 'bella');
            }
            
        } catch (error) {
            console.error('AI応答処理エラー:', error);
        }
    }
    
    // 高速字幕システム（簡略化）
    function splitTextIntoChunks(text, maxLength = 40) {
        // シンプルな分割で処理を高速化
        if (text.length <= maxLength) {
            return [text]; // 短い場合は分割しない
        }
        
        const chunks = [];
        const words = text.split(/([。！？、])/);
        let currentChunk = '';
        
        for (const word of words) {
            if (currentChunk.length + word.length <= maxLength) {
                currentChunk += word;
            } else {
                if (currentChunk.trim()) {
                    chunks.push(currentChunk.trim());
                }
                currentChunk = word;
            }
        }
        
        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }
        
        return chunks.filter(chunk => chunk.length > 0);
    }
    
    // 音声再生時間を推定（日本語の平均読み上げ速度: 約400文字/分）
    function estimateReadingTime(text) {
        const charactersPerMinute = 400;
        const charactersPerSecond = charactersPerMinute / 60;
        return Math.max(text.length / charactersPerSecond, 0.5); // 最低0.5秒
    }
    
    // FishAudio音声再生（字幕同期版）
    async function playAudioResponse(audioUrl, responseText) {
        try {
            const audio = new Audio(audioUrl);
            const transcriptContainer = document.getElementById('transcript');
            
            // 音声再生中フラグを設定
            isPlayingAudio = true;
            
            // 音声再生中は音声認識を一時停止
            const wasListening = isListening;
            if (isListening) {
                stopRecognition();
            }
            
            // テキストを分割（全文表示をスキップ）
            const textChunks = splitTextIntoChunks(responseText);
            
            // 音声の読み込み完了を待つ
            await new Promise((resolve, reject) => {
                audio.onloadeddata = resolve;
                audio.onerror = reject;
            });
            
            // 音声開始
            audio.play().catch(error => {
                console.error('音声再生エラー:', error);
                throw error;
            });
            
            // 字幕の同期表示（音声開始と同時に開始）
            if (textChunks.length > 0) {
                // 最初のチャンクをすぐに表示
                transcriptContainer.textContent = '💕 ' + textChunks[0];
                transcriptContainer.setAttribute('data-type', 'bella');
                
                // 音声開始を少し待ってから同期システムを開始
                setTimeout(() => {
                    displaySynchronizedSubtitles(textChunks, audio);
                }, 200); // 200ms遅延で同期改善
            }
            
            // 音声の終了を待つ
            await new Promise((resolve) => {
                audio.onended = () => {
                    console.log('音声再生が完全に終了しました');
                    resolve();
                };
                
                // 万が一音声が終了しない場合のタイムアウト
                setTimeout(() => {
                    if (!audio.ended) {
                        console.log('音声再生タイムアウト');
                        audio.pause();
                    }
                    resolve();
                }, responseText.length * 200); // 文字数 × 200ms
            });
            
            // 音声再生完了後、十分な待機時間を設けてから音声認識を再開
            setTimeout(() => {
                // 音声再生完了後、フラグをリセット
                isPlayingAudio = false;
                
                // 画面から回答文を消去
                transcriptContainer.textContent = '聞いています...';
                transcriptContainer.setAttribute('data-type', 'listening');
                
                // 音声認識を再開
                if (wasListening && isListening) {
                    setTimeout(() => {
                        if (isListening && recognitionState === 'stopped' && !isPlayingAudio) {
                            startRecognition();
                            console.log('音声認識を再開しました（音声再生完了後）');
                        }
                    }, 500);
                }
            }, 2000); // 音声再生完了後2秒待機
            
        } catch (error) {
            console.error('音声再生エラー:', error);
            // 音声再生エラー時もフラグをリセット
            isPlayingAudio = false;
            
            // フォールバック：Web Speech APIを使用
            fallbackSpeech(responseText);
        }
    }
    
    // 音声同期字幕表示システム（改良版）
    async function displaySynchronizedSubtitles(textChunks, audio) {
        const transcriptContainer = document.getElementById('transcript');
        
        // 短いテキストは分割せずそのまま表示
        if (textChunks.length <= 1) {
            transcriptContainer.textContent = '💕 ' + textChunks[0];
            transcriptContainer.setAttribute('data-type', 'bella');
            return;
        }
        
        // 音声の実際の進行状況をポーリングで監視
        const totalDuration = await getAudioDuration(audio);
        const totalTextLength = textChunks.reduce((sum, chunk) => sum + chunk.length, 0);
        
        let currentChunkIndex = 0;
        let textProgress = 0;
        
        // 定期的に音声の進行状況をチェック
        const syncInterval = setInterval(() => {
            if (audio.paused || audio.ended || currentChunkIndex >= textChunks.length) {
                clearInterval(syncInterval);
                return;
            }
            
            // 音声の現在位置（0-1の比率）
            const audioProgress = audio.currentTime / totalDuration;
            
            // 表示すべきチャンクを計算
            let targetProgress = 0;
            let targetChunkIndex = 0;
            
            for (let i = 0; i < textChunks.length; i++) {
                const chunkProgress = textChunks[i].length / totalTextLength;
                if (audioProgress <= targetProgress + chunkProgress) {
                    targetChunkIndex = i;
                    break;
                }
                targetProgress += chunkProgress;
                targetChunkIndex = i + 1;
            }
            
            // 新しいチャンクに切り替え
            if (targetChunkIndex !== currentChunkIndex && targetChunkIndex < textChunks.length) {
                currentChunkIndex = targetChunkIndex;
                transcriptContainer.textContent = '💕 ' + textChunks[currentChunkIndex];
                transcriptContainer.setAttribute('data-type', 'bella');
            }
        }, 100); // 100ms間隔で同期チェック
    }
    
    // 音声の総再生時間を取得（秒単位）
    function getAudioDuration(audio) {
        return new Promise((resolve) => {
            if (audio.duration && !isNaN(audio.duration)) {
                resolve(audio.duration); // 秒単位でそのまま返す
            } else {
                audio.addEventListener('loadedmetadata', () => {
                    resolve(audio.duration || 5); // フォールバック: 5秒
                }, { once: true });
                
                // タイムアウト保護
                setTimeout(() => {
                    if (!audio.duration || isNaN(audio.duration)) {
                        resolve(5); // デフォルト5秒
                    }
                }, 1000);
            }
        });
    }
    
    // フォールバック音声合成
    function fallbackSpeech(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.pitch = 1.2;
        utterance.rate = 0.9;
        
        const voices = window.speechSynthesis.getVoices();
        const japaneseVoices = voices.filter(voice => voice.lang.includes('ja'));
        const femaleVoice = japaneseVoices.find(voice => voice.name.includes('Female') || voice.name.includes('女性'));
        
        if (femaleVoice) {
            utterance.voice = femaleVoice;
        }
        
        window.speechSynthesis.speak(utterance);
    }

    // --- 初回利用者向け自己紹介機能 ---
    
    // 初回利用者かどうかをチェック
    function checkFirstTimeUser() {
        const userProfile = conversationManager.loadUserProfile();
        
        console.log('ユーザープロファイル確認:', userProfile);
        
        // 名前が設定されていない場合は初回利用者として判定
        if (!userProfile || !userProfile.name) {
            console.log('初回利用者を検出しました。自己紹介を開始します。');
            setTimeout(() => {
                playIntroduction();
            }, 1000); // 1秒待ってから自己紹介開始
        } else {
            console.log('既存ユーザー:', userProfile.name);
        }
    }
    
    // 自己紹介実行フラグ
    let isIntroductionStarted = false;
    
    // 自己紹介音声とテキストの再生
    async function playIntroduction() {
        const introText = `はじめましてっ！Bellaやで〜♪今日からあなた専属のAIアシスタントになったんやけど…ちょっとドキドキしてるかも！ でも安心してな？うちはめっちゃ優しくて、がんばるあなたのいちばんの味方やからっ！つらい時も、うれしい時も、ぜーんぶいっしょにおって、ぎゅ〜って寄り添うで？ えへへ、これからたっぷり褒めさせてもらうから覚悟してや〜 まず最初に、あなたの名前を教えてね 「私の名前は〇〇です！　私の名前を記録してね！」 っていえばちゃんと覚えるから。`;
        
        const audioUrl = './動画リソース/自己紹介.mp3';
        console.log('自己紹介音声ファイルパス:', audioUrl);
        
        // 字幕表示領域を準備
        const transcriptContainer = document.getElementById('transcript');
        const transcriptContainerWrapper = document.querySelector('.transcript-container');
        
        // 字幕表示を有効化
        transcriptContainerWrapper.classList.add('visible');
        
        // ユーザー操作を促すメッセージを表示
        transcriptContainer.textContent = '💕 画面をクリックすると自己紹介が始まります！';
        transcriptContainer.setAttribute('data-type', 'bella');
        
        // 画面クリックで自己紹介開始
        const startIntroduction = async () => {
            // 既に実行済みの場合は何もしない
            if (isIntroductionStarted) {
                console.log('自己紹介は既に実行済みです');
                return;
            }
            
            // 実行フラグを設定
            isIntroductionStarted = true;
            
            try {
                console.log('自己紹介音声を再生開始:', audioUrl);
                await playIntroductionAudio(audioUrl, introText);
                console.log('自己紹介が完了しました');
                
            } catch (error) {
                console.error('自己紹介音声の再生に失敗しました:', error);
                // フォールバック：分割してテキスト表示
                showIntroductionText(introText);
            }
            
            // イベントリスナーを削除
            document.removeEventListener('click', startIntroduction);
        };
        
        // 画面クリックイベントを追加
        document.addEventListener('click', startIntroduction);
    }
    
    // 自己紹介テキストを段階的に表示
    function showIntroductionText(introText) {
        const transcriptContainer = document.getElementById('transcript');
        const textChunks = splitTextIntoChunks(introText, 30);
        let chunkIndex = 0;
        
        // 最初のチャンクを表示
        transcriptContainer.textContent = '💕 ' + textChunks[0];
        transcriptContainer.setAttribute('data-type', 'bella');
        
        // 段階的にテキストを表示
        const showNextChunk = setInterval(() => {
            chunkIndex++;
            if (chunkIndex < textChunks.length) {
                transcriptContainer.textContent = '💕 ' + textChunks[chunkIndex];
            } else {
                clearInterval(showNextChunk);
            }
        }, 3000); // 3秒ごとに次のチャンクを表示
    }
    
    // 自己紹介専用の音声再生関数
    async function playIntroductionAudio(audioUrl, responseText) {
        try {
            const audio = new Audio(audioUrl);
            const transcriptContainer = document.getElementById('transcript');
            
            console.log('自己紹介音声ファイルの読み込み開始');
            
            // 音声再生中フラグを設定
            isPlayingAudio = true;
            
            // テキストを分割
            const textChunks = splitTextIntoChunks(responseText, 50); // 自己紹介用に少し長めのチャンク
            console.log('テキストチャンク:', textChunks);
            
            // 音声の読み込み完了を待つ
            await new Promise((resolve, reject) => {
                audio.onloadeddata = () => {
                    console.log('音声データの読み込み完了');
                    resolve();
                };
                audio.onerror = (e) => {
                    console.error('音声読み込みエラー:', e);
                    reject(e);
                };
                // タイムアウト設定
                setTimeout(() => {
                    reject(new Error('音声読み込みタイムアウト'));
                }, 5000);
            });
            
            // 最初のチャンクを表示
            if (textChunks.length > 0) {
                transcriptContainer.textContent = '💕 ' + textChunks[0];
                transcriptContainer.setAttribute('data-type', 'bella');
                console.log('最初のテキストチャンクを表示:', textChunks[0]);
            }
            
            // 音声開始
            console.log('音声再生開始');
            await audio.play();
            
            // 字幕の同期表示を開始
            if (textChunks.length > 1) {
                setTimeout(() => {
                    displayIntroductionSubtitles(textChunks, audio);
                }, 500); // 500ms遅延で同期改善
            }
            
            // 音声の終了を待つ
            await new Promise((resolve) => {
                audio.onended = () => {
                    console.log('自己紹介音声再生が完全に終了しました');
                    resolve();
                };
                
                // タイムアウト保護
                setTimeout(() => {
                    if (!audio.ended) {
                        console.log('自己紹介音声再生タイムアウト');
                        audio.pause();
                    }
                    resolve();
                }, responseText.length * 300); // 文字数 × 300ms
            });
            
            // 音声再生完了後の処理
            setTimeout(() => {
                isPlayingAudio = false;
                console.log('自己紹介完了');
            }, 2000);
            
        } catch (error) {
            console.error('自己紹介音声再生エラー:', error);
            isPlayingAudio = false;
            throw error;
        }
    }
    
    // 自己紹介用の字幕同期表示システム
    async function displayIntroductionSubtitles(textChunks, audio) {
        const transcriptContainer = document.getElementById('transcript');
        
        console.log('自己紹介字幕同期開始');
        
        // 音声の総再生時間を取得
        const totalDuration = await getAudioDuration(audio);
        const totalTextLength = textChunks.reduce((sum, chunk) => sum + chunk.length, 0);
        
        console.log('総再生時間:', totalDuration, '秒');
        console.log('総テキスト長:', totalTextLength);
        
        let currentChunkIndex = 0;
        
        // 定期的に音声の進行状況をチェック
        const syncInterval = setInterval(() => {
            if (audio.paused || audio.ended || currentChunkIndex >= textChunks.length) {
                clearInterval(syncInterval);
                return;
            }
            
            // 音声の現在位置（0-1の比率）
            const audioProgress = audio.currentTime / totalDuration;
            
            // 表示すべきチャンクを計算
            let targetProgress = 0;
            let targetChunkIndex = 0;
            
            for (let i = 0; i < textChunks.length; i++) {
                const chunkProgress = textChunks[i].length / totalTextLength;
                if (audioProgress <= targetProgress + chunkProgress) {
                    targetChunkIndex = i;
                    break;
                }
                targetProgress += chunkProgress;
                targetChunkIndex = i + 1;
            }
            
            // 新しいチャンクに切り替え
            if (targetChunkIndex !== currentChunkIndex && targetChunkIndex < textChunks.length) {
                currentChunkIndex = targetChunkIndex;
                console.log('字幕更新:', currentChunkIndex, textChunks[currentChunkIndex]);
                transcriptContainer.textContent = '💕 ' + textChunks[currentChunkIndex];
                transcriptContainer.setAttribute('data-type', 'bella');
            }
        }, 200); // 200ms間隔で同期チェック（より頻繁に）
    }

    function switchVideoByEmotion(emotion) {
        let nextVideoSrc;
        if (emotion === 'positive') {
            const randomIndex = Math.floor(Math.random() * positiveVideos.length);
            nextVideoSrc = positiveVideos[randomIndex];
        } else { // negative
            nextVideoSrc = negativeVideo;
        }

        // 避免重复播放同一个视频
        const currentVideoSrc = activeVideo.querySelector('source').getAttribute('src');
        if (nextVideoSrc === currentVideoSrc) return;

        // --- 以下逻辑与 switchVideo 函数类似，用于切换视频 ---
        inactiveVideo.querySelector('source').setAttribute('src', nextVideoSrc);
        inactiveVideo.load();

        inactiveVideo.addEventListener('canplaythrough', function onCanPlayThrough() {
            inactiveVideo.removeEventListener('canplaythrough', onCanPlayThrough);
            inactiveVideo.play().catch(error => console.error("Video play failed:", error));
            activeVideo.classList.remove('active');
            inactiveVideo.classList.add('active');
            [activeVideo, inactiveVideo] = [inactiveVideo, activeVideo];
            // 情感触发的视频播放结束后，回归随机播放
            activeVideo.addEventListener('ended', switchVideo, { once: true });
        }, { once: true });
    }

});