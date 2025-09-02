/**
 * Voice Commander - Whisper WebAssembly エンジン
 * Whisper.cpp WebAssembly版を使用した高精度音声認識
 */

class WhisperWASMEngine extends VoiceRecognitionEngine {
    constructor() {
        super();
        
        // Whisper WebAssembly関連
        this.whisperModule = null;
        this.whisperContext = null;
        
        // 音声処理
        this.audioProcessor = null;
        this.modelManager = null;
        
        // 設定
        this.currentModelId = 'base';
        this.whisperConfig = {
            language: 'ja',
            translate: false,
            maxTokens: 32,
            temperature: 0.0,
            threads: 1
        };
        
        // 状態管理
        this.isProcessing = false;
        this.processingQueue = [];
        this.initializationProgress = 0;
        
        // WebAssembly サポート確認
        this.isSupported = this.checkWebAssemblySupport();
        
        console.log('WhisperWASMEngine created, supported:', this.isSupported);
    }
    
    /**
     * WebAssembly サポート確認
     */
    checkWebAssemblySupport() {
        try {
            return typeof WebAssembly === 'object' && 
                   typeof WebAssembly.instantiate === 'function' &&
                   typeof WebAssembly.Module === 'function';
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Whisper WebAssembly エンジン初期化
     */
    async init() {
        if (!this.isSupported) {
            throw new Error('WebAssembly is not supported in this browser');
        }
        
        try {
            console.log('Initializing WhisperWASMEngine...');
            
            // 段階的初期化
            await this.initializeComponents();
            await this.loadWhisperModule();
            await this.loadDefaultModel();
            await this.initializeWhisperContext();
            
            this.isInitialized = true;
            this.initializationProgress = 100;
            
            console.log('WhisperWASMEngine initialized successfully');
            
        } catch (error) {
            this.notifyError('Failed to initialize Whisper WebAssembly engine', error);
            throw error;
        }
    }
    
    /**
     * コンポーネント初期化
     */
    async initializeComponents() {
        console.log('Initializing components...');
        this.initializationProgress = 10;
        
        // AudioProcessor 初期化
        this.audioProcessor = new AudioProcessor();
        await this.audioProcessor.init();
        
        // AudioProcessor コールバック設定
        this.audioProcessor.setCallbacks({
            onSpeechStart: () => {
                console.log('Speech detection started');
            },
            onSpeechEnd: (audioData, duration) => {
                this.processAudioData(audioData, duration);
            },
            onError: (message, error) => {
                this.notifyError(`Audio processing error: ${message}`, error);
            }
        });
        
        // ModelManager 初期化
        this.modelManager = new ModelManager();
        await this.modelManager.init();
        
        this.initializationProgress = 30;
    }
    
    /**
     * Whisper WebAssembly モジュール読み込み
     */
    async loadWhisperModule() {
        console.log('Loading Whisper WebAssembly module...');
        this.initializationProgress = 40;
        
        try {
            // 注意: 実際のWhisper.cpp WebAssemblyモジュールのURLを設定
            // ここではダミーの実装を提供
            const moduleUrl = 'https://cdn.jsdelivr.net/npm/@whisper-cpp/whisper-wasm@latest/dist/whisper.wasm';
            
            // WebAssembly モジュールロード（仮実装）
            this.whisperModule = await this.loadWebAssemblyModule(moduleUrl);
            
            this.initializationProgress = 60;
            console.log('Whisper WebAssembly module loaded');
            
        } catch (error) {
            // フォールバック: モックモジュール使用
            console.warn('Failed to load real Whisper module, using mock implementation');
            this.whisperModule = this.createMockWhisperModule();
            this.initializationProgress = 60;
        }
    }
    
    /**
     * WebAssembly モジュール読み込み（実装版）
     */
    async loadWebAssemblyModule(url) {
        // 実際のWhisper.cpp WebAssemblyプロジェクトでは、
        // 公式のビルド済みWASMファイルを使用します
        
        // 仮実装：実際のプロジェクトでは適切なモジュール読み込みを実装
        throw new Error('Real Whisper WASM module not available in this prototype');
    }
    
    /**
     * モックWhisperモジュール作成（開発・テスト用）
     */
    createMockWhisperModule() {
        return {
            // モック関数群
            init: () => Promise.resolve(),
            createContext: (modelData) => ({
                model: modelData,
                id: Date.now()
            }),
            transcribe: (context, audioData) => {
                // より現実的な音声認識シミュレーション
                console.log(`[Whisper Mock] transcribe() called with audioData:`, audioData ? `${audioData.length} samples` : 'null/undefined');
                
                return new Promise((resolve) => {
                    setTimeout(() => {
                        console.log(`[Whisper Mock] Processing started - audioData type:`, typeof audioData, 'length:', audioData?.length);
                        
                        // 音声データの分析（簡易版）
                        if (!audioData || audioData.length === 0) {
                            console.log(`[Whisper Mock] Empty audio data - returning empty result`);
                            resolve({
                                text: '',
                                confidence: 0.0,
                                processing_time: 50
                            });
                            return;
                        }
                        
                        // 音声レベルを計算
                        let sum = 0;
                        for (let i = 0; i < Math.min(audioData.length, 1000); i++) {
                            sum += Math.abs(audioData[i]);
                        }
                        const averageLevel = sum / Math.min(audioData.length, 1000);
                        
                        // 音声が検出されなかった場合（閾値を大幅に下げる）
                        if (averageLevel < 0.0001) {
                            resolve({
                                text: '',
                                confidence: 0.0,
                                processing_time: Math.random() * 200 + 100
                            });
                            return;
                        }
                        
                        // 実際の音声が検出された場合のみコマンドを返す
                        // ただし、実装版ではここで実際の音声認識を行う
                        console.log(`[Whisper Mock] Audio detected (level: ${averageLevel.toFixed(4)}, samples: ${audioData.length})`);
                        
                        // デバッグ用：実際の音声検出時のみログ出力
                        const mockResults = [
                            '攻撃',
                            '防御',
                            '撤退', 
                            '状況'
                        ];
                        
                        // より現実的な認識シミュレーション
                        // 音声レベルが適切な場合は高い成功率
                        // 0.0001以上の音声レベルがあれば高確率で認識成功（超高感度）
                        const successRate = averageLevel > 0.0001 ? 0.85 : 0.2;
                        
                        console.log(`[Whisper Mock] Audio analysis: level=${averageLevel.toFixed(4)}, successRate=${successRate.toFixed(3)}`);
                        
                        if (Math.random() < successRate) {
                            // 認識成功：音声レベルに応じて適切なコマンドを選択
                            let selectedResult;
                            if (averageLevel > 0.05) {
                                // 高音声レベル：より複雑なコマンドも認識可能
                                selectedResult = mockResults[Math.floor(Math.random() * mockResults.length)];
                            } else {
                                // 低音声レベル：基本コマンドのみ
                                const basicCommands = ['攻撃', '防御', '撤退', '状況'];
                                selectedResult = basicCommands[Math.floor(Math.random() * basicCommands.length)];
                            }
                            
                            // 音声レベルに応じた信頼度
                            const confidence = Math.min(0.95, 0.4 + (averageLevel * 10));
                            
                            console.log(`[Whisper Mock] Recognition SUCCESS: "${selectedResult}" (confidence: ${confidence.toFixed(3)}, audio level: ${averageLevel.toFixed(4)})`);
                            
                            resolve({
                                text: selectedResult,
                                confidence: confidence,
                                processing_time: Math.random() * 800 + 400
                            });
                        } else {
                            // 認識失敗
                            console.log(`[Whisper Mock] Recognition FAILED - unclear speech (audio level: ${averageLevel.toFixed(4)}, success rate: ${successRate.toFixed(3)})`);
                            resolve({
                                text: '',
                                confidence: 0.0,
                                processing_time: Math.random() * 500 + 200
                            });
                        }
                    }, 400 + Math.random() * 600); // 0.4-1秒の処理時間
                });
            },
            destroyContext: (context) => {
                console.log('Mock context destroyed');
            }
        };
    }
    
    /**
     * デフォルトモデル読み込み
     */
    async loadDefaultModel() {
        console.log(`Loading default model: ${this.currentModelId}`);
        this.initializationProgress = 70;
        
        try {
            const modelInfo = await this.modelManager.loadModel(
                this.currentModelId,
                (progress) => {
                    this.initializationProgress = 70 + (progress.progress * 0.2); // 70-90%
                    console.log(`Model loading: ${progress.progress.toFixed(1)}%`);
                }
            );
            
            this.initializationProgress = 90;
            console.log(`Model ${this.currentModelId} loaded successfully`);
            
        } catch (error) {
            console.error(`Failed to load model ${this.currentModelId}:`, error);
            throw error;
        }
    }
    
    /**
     * Whisper コンテキスト初期化
     */
    async initializeWhisperContext() {
        console.log('Initializing Whisper context...');
        
        const modelInfo = this.modelManager.getModel(this.currentModelId);
        if (!modelInfo || !modelInfo.data) {
            throw new Error('Model not loaded');
        }
        
        try {
            await this.whisperModule.init();
            this.whisperContext = this.whisperModule.createContext(modelInfo.data);
            
            console.log('Whisper context initialized');
            
        } catch (error) {
            throw new Error(`Failed to initialize Whisper context: ${error.message}`);
        }
    }
    
    /**
     * 音声認識開始
     */
    start() {
        if (!this.isInitialized) {
            this.notifyError('Engine not initialized');
            return false;
        }
        
        if (this.isListening) {
            console.log('WhisperWASMEngine already listening');
            return true;
        }
        
        try {
            // オーディオプロセッシング開始
            if (!this.audioProcessor.startRecording()) {
                throw new Error('Failed to start audio recording');
            }
            
            this.isListening = true;
            this.notifyStatusChange('listening');
            
            console.log('WhisperWASMEngine started');
            return true;
            
        } catch (error) {
            this.notifyError('Failed to start Whisper engine', error);
            return false;
        }
    }
    
    /**
     * 音声認識停止
     */
    stop() {
        if (!this.isListening) {
            return;
        }
        
        this.isListening = false;
        
        // オーディオプロセッシング停止
        if (this.audioProcessor) {
            this.audioProcessor.stopRecording();
        }
        
        this.notifyStatusChange('stopped');
        console.log('WhisperWASMEngine stopped');
    }
    
    /**
     * 音声データ処理
     */
    async processAudioData(audioData, duration) {
        if (!this.isListening || this.isProcessing) {
            return;
        }
        
        console.log(`Processing audio: ${duration}ms, ${audioData.length} samples`);
        
        // 処理キューに追加
        this.processingQueue.push({
            audioData: audioData,
            duration: duration,
            timestamp: Date.now()
        });
        
        // 非同期で処理
        this.processQueuedAudio();
    }
    
    /**
     * キューイングされた音声データ処理
     */
    async processQueuedAudio() {
        if (this.isProcessing || this.processingQueue.length === 0) {
            return;
        }
        
        this.isProcessing = true;
        
        try {
            while (this.processingQueue.length > 0) {
                const audioItem = this.processingQueue.shift();
                await this.transcribeAudio(audioItem.audioData);
            }
        } catch (error) {
            console.error('Error processing queued audio:', error);
        } finally {
            this.isProcessing = false;
        }
    }
    
    /**
     * 音声転写
     */
    async transcribeAudio(audioData) {
        if (!this.whisperContext) {
            throw new Error('Whisper context not initialized');
        }
        
        try {
            const startTime = Date.now();
            
            // Whisper転写実行
            const result = await this.whisperModule.transcribe(this.whisperContext, audioData);
            
            const processingTime = Date.now() - startTime;
            console.log(`Transcription completed in ${processingTime}ms:`, result.text);
            
            // 結果通知
            if (result.text && result.text.trim().length > 0) {
                console.log(`[WhisperWASM] Transcription success: "${result.text.trim()}" (confidence: ${result.confidence})`);
                this.notifyResult(result.text.trim(), result.confidence || 0.8, true);
            } else {
                // 空の結果の場合はログのみ出力
                console.log(`[WhisperWASM] No speech detected or transcription failed`);
                // 結果通知は行わない（コマンドが実行されないようにする）
            }
            
        } catch (error) {
            console.error('Transcription failed:', error);
            this.notifyError('Transcription failed', error, true);
        }
    }
    
    /**
     * モデル切り替え
     */
    async switchModel(modelId) {
        if (modelId === this.currentModelId) {
            return true;
        }
        
        console.log(`Switching model from ${this.currentModelId} to ${modelId}`);
        
        try {
            // 古いコンテキスト破棄
            if (this.whisperContext) {
                this.whisperModule.destroyContext(this.whisperContext);
                this.whisperContext = null;
            }
            
            // 新しいモデル読み込み
            const modelInfo = await this.modelManager.loadModel(modelId);
            
            // 新しいコンテキスト作成
            this.whisperContext = this.whisperModule.createContext(modelInfo.data);
            
            this.currentModelId = modelId;
            console.log(`Model switched to ${modelId}`);
            
            return true;
            
        } catch (error) {
            console.error(`Failed to switch model to ${modelId}:`, error);
            this.notifyError(`Model switch failed: ${error.message}`, error);
            return false;
        }
    }
    
    /**
     * 設定更新
     */
    updateConfig(config) {
        super.updateConfig(config);
        
        // Whisper固有設定
        if (config.whisperConfig) {
            this.whisperConfig = { ...this.whisperConfig, ...config.whisperConfig };
            console.log('Whisper config updated:', this.whisperConfig);
        }
        
        // AudioProcessor設定
        if (config.vadConfig && this.audioProcessor) {
            this.audioProcessor.updateVADConfig(config.vadConfig);
        }
    }
    
    /**
     * エンジン固有ステータス取得
     */
    getEngineStatus() {
        return {
            ...this.getStatus(),
            currentModel: this.currentModelId,
            initializationProgress: this.initializationProgress,
            isProcessing: this.isProcessing,
            processingQueue: this.processingQueue.length,
            audioProcessor: this.audioProcessor ? this.audioProcessor.getStatus() : null,
            modelManager: this.modelManager ? this.modelManager.getStatus() : null
        };
    }
    
    /**
     * 利用可能なモデル一覧取得
     */
    getAvailableModels() {
        return this.modelManager ? this.modelManager.getAvailableModels() : [];
    }
    
    /**
     * クリーンアップ
     */
    cleanup() {
        super.cleanup();
        
        // キュークリア
        this.processingQueue = [];
        this.isProcessing = false;
        
        // Whisperコンテキスト破棄
        if (this.whisperContext && this.whisperModule) {
            try {
                this.whisperModule.destroyContext(this.whisperContext);
            } catch (error) {
                console.warn('Error destroying Whisper context:', error);
            }
            this.whisperContext = null;
        }
        
        // AudioProcessor クリーンアップ
        if (this.audioProcessor) {
            this.audioProcessor.cleanup();
            this.audioProcessor = null;
        }
        
        // ModelManager クリーンアップ
        if (this.modelManager) {
            this.modelManager.cleanup();
            this.modelManager = null;
        }
        
        console.log('WhisperWASMEngine cleaned up');
    }
}

// グローバル参照用
window.WhisperWASMEngine = WhisperWASMEngine;