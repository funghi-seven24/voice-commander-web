/**
 * Voice Commander - Web Speech API エンジン
 * 既存のWeb Speech API機能をStrategy パターンに適合
 */

class WebSpeechEngine extends VoiceRecognitionEngine {
    constructor() {
        super();
        
        this.recognition = null;
        this.restartTimeout = null;
        this.lastSpeechTime = 0;
        this.silenceThreshold = 3000; // 3秒の無音でリスタート
        
        // Web Speech API サポート確認
        this.isSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
        
        console.log('WebSpeechEngine created, supported:', this.isSupported);
    }
    
    /**
     * Web Speech API 初期化
     */
    async init() {
        if (!this.isSupported) {
            throw new Error('Web Speech API is not supported in this browser');
        }
        
        try {
            // SpeechRecognition インスタンス作成
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            // 基本設定
            this.recognition.lang = this.config.language;
            this.recognition.continuous = this.config.continuous;
            this.recognition.interimResults = this.config.interimResults;
            this.recognition.maxAlternatives = this.config.maxAlternatives;
            
            // イベントリスナー設定
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('WebSpeechEngine initialized successfully');
            
        } catch (error) {
            this.notifyError('Failed to initialize Web Speech API', error);
            throw error;
        }
    }
    
    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        // 音声認識開始
        this.recognition.onstart = () => {
            console.log('Web Speech API started');
            this.notifyStatusChange('listening');
        };
        
        // 音声認識終了
        this.recognition.onend = () => {
            console.log('Web Speech API ended');
            this.notifyStatusChange('stopped');
            
            // 自動再開（エラーでない場合）
            if (this.isListening) {
                this.scheduleRestart();
            }
        };
        
        // 音声認識結果
        this.recognition.onresult = (event) => {
            this.handleRecognitionResult(event);
        };
        
        // エラー処理
        this.recognition.onerror = (event) => {
            this.handleRecognitionError(event);
        };
        
        // 音声検出開始
        this.recognition.onspeechstart = () => {
            console.log('Speech detected');
            this.lastSpeechTime = Date.now();
        };
        
        // 音声検出終了
        this.recognition.onspeechend = () => {
            console.log('Speech ended');
        };
        
        // 音声なし
        this.recognition.onnomatch = () => {
            console.log('No speech recognized');
        };
    }
    
    /**
     * 認識結果処理
     */
    handleRecognitionResult(event) {
        let finalTranscript = '';
        let interimTranscript = '';
        let confidence = 0;
        
        // 結果を処理
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript.trim();
            
            if (result.isFinal) {
                finalTranscript += transcript;
                confidence = result[0].confidence || 0.8; // デフォルト信頼度
            } else {
                interimTranscript += transcript;
            }
        }
        
        // 中間結果通知
        if (interimTranscript) {
            this.notifyResult(interimTranscript, confidence, false);
        }
        
        // 最終結果通知
        if (finalTranscript) {
            this.notifyResult(finalTranscript, confidence, true);
            this.lastSpeechTime = Date.now();
        }
    }
    
    /**
     * エラー処理
     */
    handleRecognitionError(event) {
        const error = event.error;
        let message = 'Unknown error';
        let shouldRestart = false;
        
        switch (error) {
            case 'network':
                message = 'ネットワークエラーが発生しました';
                shouldRestart = true;
                break;
                
            case 'not-allowed':
                message = 'マイクのアクセスが許可されていません';
                shouldRestart = false;
                break;
                
            case 'audio-capture':
                message = 'マイクが見つからないか、使用できません';
                shouldRestart = false;
                break;
                
            case 'no-speech':
                message = '音声が検出されませんでした';
                shouldRestart = true;
                break;
                
            case 'aborted':
                message = '音声認識が中断されました';
                shouldRestart = false;
                break;
                
            case 'service-not-allowed':
                message = '音声認識サービスが利用できません';
                shouldRestart = false;
                break;
                
            default:
                message = `音声認識エラー: ${error}`;
                shouldRestart = true;
        }
        
        this.notifyError(message, error, shouldRestart);
        
        // 自動再開判定
        if (shouldRestart && this.isListening) {
            this.scheduleRestart();
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
            console.log('WebSpeechEngine already listening');
            return true;
        }
        
        try {
            this.recognition.start();
            this.isListening = true;
            this.lastSpeechTime = Date.now();
            
            console.log('WebSpeechEngine started');
            return true;
            
        } catch (error) {
            this.notifyError('Failed to start Web Speech API', error);
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
        
        // リスタートタイマーキャンセル
        if (this.restartTimeout) {
            clearTimeout(this.restartTimeout);
            this.restartTimeout = null;
        }
        
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.warn('Error stopping recognition:', error);
            }
        }
        
        console.log('WebSpeechEngine stopped');
    }
    
    /**
     * 再開スケジュール
     */
    scheduleRestart() {
        if (!this.isListening) {
            return;
        }
        
        if (this.restartTimeout) {
            clearTimeout(this.restartTimeout);
        }
        
        this.restartTimeout = setTimeout(() => {
            if (this.isListening) {
                console.log('Auto-restarting WebSpeechEngine');
                try {
                    this.recognition.start();
                } catch (error) {
                    console.warn('Failed to auto-restart:', error);
                    // 少し待ってから再試行
                    setTimeout(() => {
                        if (this.isListening) {
                            this.scheduleRestart();
                        }
                    }, 1000);
                }
            }
        }, 500); // 500ms後に再開
    }
    
    /**
     * 設定更新
     */
    updateConfig(config) {
        super.updateConfig(config);
        
        if (this.recognition) {
            this.recognition.lang = this.config.language;
            this.recognition.continuous = this.config.continuous;
            this.recognition.interimResults = this.config.interimResults;
            this.recognition.maxAlternatives = this.config.maxAlternatives;
        }
    }
    
    /**
     * クリーンアップ
     */
    cleanup() {
        super.cleanup();
        
        if (this.restartTimeout) {
            clearTimeout(this.restartTimeout);
            this.restartTimeout = null;
        }
        
        if (this.recognition) {
            this.recognition.onstart = null;
            this.recognition.onend = null;
            this.recognition.onresult = null;
            this.recognition.onerror = null;
            this.recognition.onspeechstart = null;
            this.recognition.onspeechend = null;
            this.recognition.onnomatch = null;
            this.recognition = null;
        }
    }
    
    /**
     * エンジン固有ステータス取得
     */
    getEngineStatus() {
        return {
            ...this.getStatus(),
            lastSpeechTime: this.lastSpeechTime,
            silenceThreshold: this.silenceThreshold,
            hasRestartScheduled: !!this.restartTimeout
        };
    }
}

// グローバル参照用
window.WebSpeechEngine = WebSpeechEngine;