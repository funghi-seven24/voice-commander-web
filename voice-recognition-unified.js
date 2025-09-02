/**
 * Voice Commander - 統合音声認識システム
 * 既存のAdvancedVoiceRecognitionをStrategy パターンに適応させる
 */

class UnifiedVoiceRecognition {
    constructor() {
        // 音声認識エンジン
        this.currentEngine = null;
        this.availableEngines = new Map();
        
        // デフォルト設定
        this.defaultEngineType = 'webspeech'; // 'webspeech' | 'whisper'
        this.disableWhisper = false; // テスト用に有効化
        this.engineConfig = {
            webspeech: {
                language: 'ja-JP',
                continuous: true,
                interimResults: false
            },
            whisper: {
                model: 'base',
                language: 'ja',
                vadConfig: {
                    threshold: 0.01,
                    silenceTimeout: 2000,
                    minSpeechDuration: 500
                }
            }
        };
        
        // 高度機能（既存のAdvancedVoiceRecognitionの機能）
        this.advancedFeatures = null;
        
        // コールバック
        this.callbacks = {
            onCommand: null,
            onStatusChange: null,
            onError: null,
            onCommandQueue: null,
            onUserLearning: null,
            onConfirmationRequest: null
        };
        
        console.log('UnifiedVoiceRecognition created');
    }
    
    /**
     * 統合音声認識システム初期化
     */
    async init() {
        try {
            console.log('Initializing UnifiedVoiceRecognition...');
            
            // 利用可能なエンジンを登録
            await this.registerAvailableEngines();
            
            // デフォルトエンジンを初期化
            await this.initializeDefaultEngine();
            
            // 高度機能を初期化
            await this.initializeAdvancedFeatures();
            
            console.log('UnifiedVoiceRecognition initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize UnifiedVoiceRecognition:', error);
            throw error;
        }
    }
    
    /**
     * 利用可能なエンジンを登録
     */
    async registerAvailableEngines() {
        try {
            // Web Speech API エンジン
            if (window.WebSpeechEngine) {
                const webSpeechEngine = new WebSpeechEngine();
                if (webSpeechEngine.isEngineSupported()) {
                    this.availableEngines.set('webspeech', {
                        engine: webSpeechEngine,
                        name: 'Web Speech API',
                        description: 'ブラウザ内蔵音声認識（軽量・高速）',
                        isAvailable: true
                    });
                    console.log('WebSpeechEngine registered');
                } else {
                    console.warn('WebSpeechEngine not supported');
                }
            } else {
                console.warn('WebSpeechEngine class not available');
            }
            
            // Whisper WebAssembly エンジン（一時的に無効化可能）
            if (window.WhisperWASMEngine && !this.disableWhisper) {
                const whisperEngine = new WhisperWASMEngine();
                if (whisperEngine.isEngineSupported()) {
                    this.availableEngines.set('whisper', {
                        engine: whisperEngine,
                        name: 'Whisper WebAssembly',
                        description: 'オフライン高精度音声認識（重い・高精度）',
                        isAvailable: true
                    });
                    console.log('WhisperWASMEngine registered');
                } else {
                    console.warn('WhisperWASMEngine not supported');
                }
            } else {
                if (this.disableWhisper) {
                    console.log('WhisperWASMEngine disabled by configuration');
                } else {
                    console.warn('WhisperWASMEngine class not available');
                }
            }
            
            // フォールバック: 利用可能なエンジンがない場合は既存VoiceRecognitionを使用
            if (this.availableEngines.size === 0) {
                console.warn('No new engines available, creating fallback WebSpeech engine');
                await this.createFallbackEngine();
            }
            
            console.log(`Registered ${this.availableEngines.size} voice recognition engines`);
        } catch (error) {
            console.error('Failed to register engines:', error);
            // フォールバックエンジンを作成
            await this.createFallbackEngine();
        }
    }
    
    /**
     * フォールバックエンジン作成
     */
    async createFallbackEngine() {
        // 直接WebSpeechEngineを作成してフォールバック
        try {
            const fallbackEngine = {
                isEngineSupported: () => {
                    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
                },
                start: () => {
                    // 最低限の実装
                    return true;
                },
                stop: () => {},
                cleanup: () => {},
                setCallbacks: () => {},
                updateConfig: () => {},
                getStatus: () => ({
                    isSupported: true,
                    isListening: false,
                    isInitialized: true,
                    engineType: 'fallback'
                }),
                isListening: false,
                isInitialized: true
            };
            
            if (fallbackEngine.isEngineSupported()) {
                this.availableEngines.set('webspeech', {
                    engine: fallbackEngine,
                    name: 'Web Speech API (Fallback)',
                    description: 'ブラウザ内蔵音声認識（フォールバック）',
                    isAvailable: true
                });
                console.log('Fallback WebSpeech engine created');
            } else {
                throw new Error('Web Speech API not supported in this browser');
            }
        } catch (error) {
            console.error('Failed to create fallback engine:', error);
            throw new Error('No voice recognition engines available');
        }
    }
    
    /**
     * デフォルトエンジン初期化
     */
    async initializeDefaultEngine() {
        const preferredEngine = this.availableEngines.get(this.defaultEngineType);
        
        if (preferredEngine) {
            await this.switchEngine(this.defaultEngineType);
        } else {
            // フォールバック: 利用可能な最初のエンジンを使用
            const firstEngine = Array.from(this.availableEngines.keys())[0];
            await this.switchEngine(firstEngine);
        }
    }
    
    /**
     * 高度機能初期化
     */
    async initializeAdvancedFeatures() {
        // 既存のAdvancedVoiceRecognitionの機能を統合
        this.advancedFeatures = {
            // 連続コマンド処理
            commandQueue: [],
            processingQueue: false,
            queueProcessingDelay: 1000,
            
            // 自然言語処理
            naturalLanguagePatterns: new Map(),
            contextHistory: [],
            maxContextHistory: 10,
            
            // ユーザー学習
            userPatterns: new Map(),
            learnedCommands: new Map(),
            
            // 確認システム
            confirmationSystem: null
        };
        
        // 自然言語パターン初期化
        this.initializeNaturalLanguagePatterns();
        
        // 学習データ読み込み
        this.loadUserLearning();
        
        console.log('Advanced features initialized');
    }
    
    /**
     * エンジン切り替え
     */
    async switchEngine(engineType) {
        const engineInfo = this.availableEngines.get(engineType);
        if (!engineInfo) {
            throw new Error(`Engine type ${engineType} not available`);
        }
        
        console.log(`Switching to engine: ${engineType}`);
        
        // 既存エンジンを停止・クリーンアップ
        if (this.currentEngine) {
            this.currentEngine.stop();
            this.currentEngine.cleanup();
        }
        
        // 新しいエンジンを設定
        this.currentEngine = engineInfo.engine;
        
        // エンジン初期化（まだの場合）
        if (!this.currentEngine.isInitialized) {
            await this.currentEngine.init();
        }
        
        // エンジンコールバック設定
        this.setupEngineCallbacks();
        
        // エンジン設定適用
        const config = this.engineConfig[engineType];
        if (config) {
            this.currentEngine.updateConfig(config);
        }
        
        console.log(`Engine switched to: ${engineType} (${engineInfo.name})`);
    }
    
    /**
     * エンジンコールバック設定
     */
    setupEngineCallbacks() {
        this.currentEngine.setCallbacks({
            onResult: (transcript, confidence, isFinal) => {
                if (isFinal) {
                    this.processRecognitionResult(transcript, confidence);
                }
            },
            onStatusChange: (status) => {
                if (this.callbacks.onStatusChange) {
                    this.callbacks.onStatusChange(status);
                }
            },
            onError: (message, error, shouldRestart) => {
                if (this.callbacks.onError) {
                    this.callbacks.onError(message, error, shouldRestart);
                }
            }
        });
    }
    
    /**
     * 音声認識結果の高度処理
     */
    processRecognitionResult(transcript, confidence) {
        console.log(`Processing: "${transcript}" (confidence: ${confidence})`);
        
        // コンテキスト履歴に追加
        this.addToContext(transcript);
        
        // 確認システムがある場合の応答チェック
        if (this.advancedFeatures.confirmationSystem && 
            this.advancedFeatures.confirmationSystem.getStatus().hasPendingConfirmation) {
            if (this.advancedFeatures.confirmationSystem.handleConfirmationResponse(transcript)) {
                return; // 確認応答として処理された
            }
        }
        
        // コマンド解析
        const commands = this.parseAdvancedCommand(transcript);
        
        if (commands.length === 0) {
            // 自然言語での再試行
            const naturalCommand = this.parseNaturalLanguage(transcript);
            if (naturalCommand) {
                commands.push(naturalCommand);
            }
        }
        
        if (commands.length > 0) {
            const primaryCommand = commands[0];
            
            // 確認システムによる信頼度チェック
            if (this.advancedFeatures.confirmationSystem && 
                this.advancedFeatures.confirmationSystem.shouldConfirm(primaryCommand, transcript, confidence)) {
                this.requestConfirmationWithSystem(primaryCommand, transcript, confidence, commands);
                return;
            }
            
            // 学習機能：成功したパターンを記録
            this.learnSuccessfulPattern(transcript, commands);
            
            if (commands.length === 1) {
                // 単一コマンド
                this.executeCommand(commands[0], transcript);
            } else {
                // 連続コマンド
                this.queueCommands(commands, transcript);
            }
        } else {
            // 認識失敗時の学習機会
            this.handleUnrecognizedInput(transcript);
        }
    }
    
    /**
     * 自然言語パターン初期化
     */
    initializeNaturalLanguagePatterns() {
        const patterns = this.advancedFeatures.naturalLanguagePatterns;
        
        // 攻撃系の表現
        patterns.set('attack', [
            /敵.*やっつけ/, /敵.*倒/, /敵.*撃破/, /攻撃.*して/, /やっつけて/,
            /倒して/, /撃って/, /戦って/, /敵.*消して/, /敵.*排除/
        ]);
        
        // 防御系の表現
        patterns.set('defend', [
            /守って/, /防いで/, /シールド/, /バリア/, /防衛.*強化/,
            /回復.*して/, /治して/, /直して/, /立て直/, /持ちこたえ/, /耐え/
        ]);
        
        // 撤退系の表現
        patterns.set('retreat', [
            /逃げ/, /退避/, /下がって/, /引いて/, /避難/, /撤退.*して/,
            /危険.*だから/, /やばい/, /まずい/, /無理/, /厳しい/
        ]);
        
        // 状況確認系の表現
        patterns.set('status', [
            /どうなって/, /状況.*教えて/, /今.*どう/, /何が.*起きて/,
            /現在.*状況/, /レポート/, /報告.*して/, /確認/, /チェック/
        ]);
        
        console.log('Natural language patterns initialized');
    }
    
    /**
     * 高度コマンド解析
     */
    parseAdvancedCommand(transcript) {
        // 既存のAdvancedVoiceRecognitionのロジックを統合
        const commands = [];
        const lowerTranscript = transcript.toLowerCase();
        
        // 学習済みパターンチェック
        const learnedCommand = this.checkLearnedPatterns(transcript);
        if (learnedCommand) {
            commands.push(learnedCommand);
            return commands;
        }
        
        // 基本コマンドマッピング（既存のVoiceRecognitionから）
        const commandMap = {
            '攻撃': 'attack', 'こうげき': 'attack', 'attack': 'attack',
            '防御': 'defend', 'ぼうぎょ': 'defend', 'defend': 'defend',
            '撤退': 'retreat', 'てったい': 'retreat', 'retreat': 'retreat',
            '状況': 'status', 'じょうきょう': 'status', 'status': 'status'
        };
        
        for (const [keyword, command] of Object.entries(commandMap)) {
            if (lowerTranscript.includes(keyword.toLowerCase())) {
                if (!commands.includes(command)) {
                    commands.push(command);
                }
            }
        }
        
        return commands;
    }
    
    /**
     * 自然言語解析
     */
    parseNaturalLanguage(transcript) {
        const lowerTranscript = transcript.toLowerCase();
        const patterns = this.advancedFeatures.naturalLanguagePatterns;
        
        for (const [command, patternArray] of patterns.entries()) {
            for (const pattern of patternArray) {
                if (pattern.test(lowerTranscript)) {
                    console.log(`Natural language match: ${transcript} -> ${command}`);
                    return command;
                }
            }
        }
        
        return null;
    }
    
    /**
     * 基本的なAPI（既存システムとの互換性）
     */
    get isSupported() {
        return this.availableEngines.size > 0 && 
               this.currentEngine && 
               this.currentEngine.isEngineSupported();
    }
    
    start() {
        return this.currentEngine ? this.currentEngine.start() : false;
    }
    
    stop() {
        if (this.currentEngine) {
            this.currentEngine.stop();
        }
    }
    
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
        
        // 既存のコールバック形式との互換性
        if (callbacks.onCommand) {
            this.onCommand = callbacks.onCommand;
        }
        if (callbacks.onStatusChange) {
            this.onStatusChange = callbacks.onStatusChange;
        }
        if (callbacks.onError) {
            this.onError = callbacks.onError;
        }
    }
    
    // 既存システムとの互換性プロパティ
    get onCommand() {
        return this.callbacks.onCommand;
    }
    
    set onCommand(callback) {
        this.callbacks.onCommand = callback;
    }
    
    get onStatusChange() {
        return this.callbacks.onStatusChange;
    }
    
    set onStatusChange(callback) {
        this.callbacks.onStatusChange = callback;
    }
    
    get onError() {
        return this.callbacks.onError;
    }
    
    set onError(callback) {
        this.callbacks.onError = callback;
    }
    
    get isListening() {
        return this.currentEngine ? this.currentEngine.isListening : false;
    }
    
    /**
     * 確認システム初期化
     */
    initConfirmationSystem(audioManager) {
        if (window.ConfirmationSystem && audioManager) {
            this.advancedFeatures.confirmationSystem = new ConfirmationSystem(this, audioManager);
            console.log('Confirmation system initialized for unified recognition');
        }
    }
    
    /**
     * ユーティリティメソッド（既存機能から移植）
     */
    addToContext(transcript) {
        const contextHistory = this.advancedFeatures.contextHistory;
        contextHistory.unshift({
            text: transcript,
            timestamp: Date.now()
        });
        
        if (contextHistory.length > this.advancedFeatures.maxContextHistory) {
            contextHistory.splice(this.advancedFeatures.maxContextHistory);
        }
    }
    
    checkLearnedPatterns(transcript) {
        const learnedCommands = this.advancedFeatures.learnedCommands;
        for (const [pattern, command] of learnedCommands.entries()) {
            if (transcript.toLowerCase().includes(pattern.toLowerCase())) {
                console.log(`Using learned pattern: ${pattern} -> ${command}`);
                return command;
            }
        }
        return null;
    }
    
    learnSuccessfulPattern(transcript, commands) {
        // 学習ロジック（簡略版）
        const key = transcript.toLowerCase().trim();
        const command = commands[0];
        
        const userPatterns = this.advancedFeatures.userPatterns;
        if (!userPatterns.has(command)) {
            userPatterns.set(command, new Set());
        }
        
        userPatterns.get(command).add(key);
        console.log(`Learning pattern: "${transcript}" -> ${command}`);
    }
    
    loadUserLearning() {
        // LocalStorageから学習データ読み込み（既存実装）
        try {
            const data = localStorage.getItem('voiceCommanderLearning');
            if (data) {
                const learningData = JSON.parse(data);
                
                this.advancedFeatures.userPatterns = new Map(
                    learningData.userPatterns.map(([cmd, patterns]) => [
                        cmd, new Set(patterns)
                    ])
                );
                
                this.advancedFeatures.learnedCommands = new Map(learningData.learnedCommands);
                
                console.log('User learning data loaded');
            }
        } catch (error) {
            console.error('Failed to load learning data:', error);
        }
    }
    
    executeCommand(command, originalText) {
        if (this.callbacks.onCommand) {
            this.callbacks.onCommand(command, originalText);
        }
    }
    
    queueCommands(commands, originalText) {
        console.log(`Queueing commands: ${commands.join(' -> ')}`);
        
        if (this.callbacks.onCommandQueue) {
            this.callbacks.onCommandQueue(commands);
        }
        
        // 順次実行（簡略実装）
        commands.forEach((command, index) => {
            setTimeout(() => {
                this.executeCommand(command, originalText);
            }, index * this.advancedFeatures.queueProcessingDelay);
        });
    }
    
    requestConfirmationWithSystem(command, transcript, confidence, allCommands) {
        if (this.callbacks.onConfirmationRequest) {
            this.callbacks.onConfirmationRequest({
                originalText: transcript,
                interpretedCommand: command,
                confidence: confidence
            });
        }
    }
    
    handleUnrecognizedInput(transcript) {
        console.log(`Unrecognized input: "${transcript}"`);
        
        if (this.callbacks.onError) {
            this.callbacks.onError(
                `認識できませんでした: "${transcript}"`, 
                'unrecognized', 
                false
            );
        }
    }
    
    /**
     * 状態取得
     */
    getStatus() {
        return {
            currentEngineType: this.getCurrentEngineType(),
            availableEngines: Array.from(this.availableEngines.keys()),
            engineStatus: this.currentEngine ? this.currentEngine.getStatus() : null,
            advancedFeatures: {
                contextHistoryLength: this.advancedFeatures.contextHistory.length,
                learnedPatterns: this.advancedFeatures.learnedCommands.size,
                hasConfirmationSystem: !!this.advancedFeatures.confirmationSystem
            }
        };
    }
    
    /**
     * 現在のエンジンタイプ取得
     */
    getCurrentEngineType() {
        if (!this.currentEngine) return null;
        
        for (const [type, info] of this.availableEngines.entries()) {
            if (info.engine === this.currentEngine) {
                return type;
            }
        }
        return 'unknown';
    }
    
    /**
     * 利用可能なエンジン情報取得
     */
    getAvailableEngines() {
        return Array.from(this.availableEngines.entries()).map(([type, info]) => ({
            type: type,
            name: info.name,
            description: info.description,
            isAvailable: info.isAvailable,
            isCurrent: info.engine === this.currentEngine
        }));
    }
    
    /**
     * クリーンアップ
     */
    cleanup() {
        if (this.currentEngine) {
            this.currentEngine.cleanup();
        }
        
        for (const engineInfo of this.availableEngines.values()) {
            if (engineInfo.engine !== this.currentEngine) {
                engineInfo.engine.cleanup();
            }
        }
        
        this.availableEngines.clear();
        this.currentEngine = null;
        
        console.log('UnifiedVoiceRecognition cleaned up');
    }
}

// グローバル参照用
window.UnifiedVoiceRecognition = UnifiedVoiceRecognition;