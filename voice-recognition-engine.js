/**
 * Voice Commander - 音声認識エンジン基底クラス
 * Strategy パターンによる音声認識エンジンの抽象化
 */

class VoiceRecognitionEngine {
    constructor() {
        this.isSupported = false;
        this.isListening = false;
        this.isInitialized = false;
        
        // コールバック関数群
        this.callbacks = {
            onCommand: null,
            onStatusChange: null,
            onError: null,
            onResult: null
        };
        
        // 設定
        this.config = {
            language: 'ja-JP',
            continuous: true,
            interimResults: false,
            maxAlternatives: 1
        };
        
        console.log(`${this.constructor.name} created`);
    }
    
    /**
     * 音声認識エンジン初期化（サブクラスで実装）
     */
    async init() {
        throw new Error('init() method must be implemented by subclass');
    }
    
    /**
     * 音声認識開始（サブクラスで実装）
     */
    start() {
        throw new Error('start() method must be implemented by subclass');
    }
    
    /**
     * 音声認識停止（サブクラスで実装）
     */
    stop() {
        throw new Error('stop() method must be implemented by subclass');
    }
    
    /**
     * コールバック設定
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }
    
    /**
     * 設定更新
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    
    /**
     * サポート状況取得
     */
    isEngineSupported() {
        return this.isSupported;
    }
    
    /**
     * 現在の状態取得
     */
    getStatus() {
        return {
            isSupported: this.isSupported,
            isListening: this.isListening,
            isInitialized: this.isInitialized,
            engineType: this.constructor.name
        };
    }
    
    /**
     * エラー通知
     */
    notifyError(message, error = null, shouldRestart = false) {
        console.error(`${this.constructor.name} Error:`, message, error);
        
        if (this.callbacks.onError) {
            this.callbacks.onError(message, error, shouldRestart);
        }
    }
    
    /**
     * ステータス変更通知
     */
    notifyStatusChange(status) {
        console.log(`${this.constructor.name} Status:`, status);
        this.isListening = (status === 'listening');
        
        if (this.callbacks.onStatusChange) {
            this.callbacks.onStatusChange(status);
        }
    }
    
    /**
     * 認識結果通知
     */
    notifyResult(transcript, confidence = 1.0, isFinal = true) {
        console.log(`${this.constructor.name} Result:`, transcript, confidence);
        
        if (this.callbacks.onResult) {
            this.callbacks.onResult(transcript, confidence, isFinal);
        }
    }
    
    /**
     * コマンド通知
     */
    notifyCommand(command, originalText) {
        console.log(`${this.constructor.name} Command:`, command, originalText);
        
        if (this.callbacks.onCommand) {
            this.callbacks.onCommand(command, originalText);
        }
    }
    
    /**
     * クリーンアップ
     */
    cleanup() {
        this.stop();
        this.isInitialized = false;
        console.log(`${this.constructor.name} cleaned up`);
    }
}

// グローバル参照用
window.VoiceRecognitionEngine = VoiceRecognitionEngine;