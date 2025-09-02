/**
 * Voice Commander - 音声処理クラス
 * Web Audio APIによる音声キャプチャとWhisper用音声データ変換
 */

class AudioProcessor {
    constructor() {
        this.audioContext = null;
        this.mediaStream = null;
        this.sourceNode = null;
        this.processorNode = null;
        this.analyserNode = null;
        
        // 録音状態
        this.isRecording = false;
        this.isProcessing = false;
        
        // 音声データバッファ
        this.audioBuffer = [];
        this.sampleRate = 16000; // Whisperが期待するサンプリングレート
        this.bufferSize = 4096;
        
        // VAD (Voice Activity Detection) 設定（超高感度に設定）
        this.vadThreshold = 0.0001; // 音声検出閾値（超低く設定）
        this.silenceTimeout = 800; // 無音タイムアウト（ms）
        this.minSpeechDuration = 200; // 最小音声継続時間（ms）（さらに短く設定）
        
        // 状態管理
        this.speechStartTime = null;
        this.lastSpeechTime = null;
        this.silenceTimer = null;
        
        // コールバック
        this.callbacks = {
            onSpeechStart: null,
            onSpeechEnd: null,
            onAudioData: null,
            onVolumeLevel: null,
            onError: null
        };
        
        console.log('AudioProcessor created');
    }
    
    /**
     * 音声処理システム初期化
     */
    async init() {
        try {
            // AudioContext作成
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) {
                throw new Error('Web Audio API is not supported');
            }
            
            this.audioContext = new AudioContext();
            
            // マイクアクセス取得
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: this.sampleRate,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            this.mediaStream = stream;
            
            // オーディオノード作成
            this.setupAudioNodes();
            
            console.log('AudioProcessor initialized successfully');
            return true;
            
        } catch (error) {
            this.notifyError('Failed to initialize audio processor', error);
            throw error;
        }
    }
    
    /**
     * オーディオノード設定
     */
    setupAudioNodes() {
        // ソースノード作成
        this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
        
        // アナライザーノード作成
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 1024;
        this.analyserNode.smoothingTimeConstant = 0.3;
        
        // プロセッサノード作成（ScriptProcessorNode または AudioWorklet）
        if (this.audioContext.createScriptProcessor) {
            this.processorNode = this.audioContext.createScriptProcessor(
                this.bufferSize, 1, 1
            );
            
            this.processorNode.onaudioprocess = (event) => {
                this.processAudioData(event);
            };
        } else if (this.audioContext.audioWorklet) {
            // AudioWorkletを使用（より高性能）
            // 注意: 実際の使用時はWorkletファイルが必要
            console.warn('AudioWorklet is available but not implemented in this version');
            // フォールバックとしてScriptProcessorNodeを使用
            this.setupScriptProcessor();
        }
        
        // ノード接続
        this.sourceNode.connect(this.analyserNode);
        this.analyserNode.connect(this.processorNode);
        this.processorNode.connect(this.audioContext.destination);
        
        console.log('Audio nodes set up successfully');
    }
    
    /**
     * ScriptProcessorNode設定（フォールバック）
     */
    setupScriptProcessor() {
        this.processorNode = this.audioContext.createScriptProcessor(
            this.bufferSize, 1, 1
        );
        
        this.processorNode.onaudioprocess = (event) => {
            this.processAudioData(event);
        };
    }
    
    /**
     * 音声データ処理
     */
    processAudioData(event) {
        if (!this.isRecording) return;
        
        // TTS再生中は音声処理をスキップ
        if (window.ttsActive) {
            // console.log('[AudioProcessor] TTS active - skipping audio processing'); // デバッグ用（必要時にコメント解除）
            return;
        }
        
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // 音量レベル計算
        const volumeLevel = this.calculateVolumeLevel(inputData);
        
        // 音量レベル通知
        if (this.callbacks.onVolumeLevel) {
            this.callbacks.onVolumeLevel(volumeLevel);
        }
        
        // VAD (Voice Activity Detection)
        const isSpeech = volumeLevel > this.vadThreshold;
        
        if (isSpeech) {
            this.handleSpeechDetection();
        } else {
            this.handleSilenceDetection();
        }
        
        // 音声データをバッファに保存（リサンプリング）
        if (this.isProcessing) {
            const resampledData = this.resampleAudio(inputData, inputBuffer.sampleRate, this.sampleRate);
            this.audioBuffer.push(...resampledData);
        }
        
        // 音声データ通知
        if (this.callbacks.onAudioData && this.isProcessing) {
            this.callbacks.onAudioData(new Float32Array(inputData));
        }
    }
    
    /**
     * 音声検出処理
     */
    handleSpeechDetection() {
        const now = Date.now();
        this.lastSpeechTime = now;
        
        // 無音タイマーをクリア
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        
        // 音声開始判定
        if (!this.speechStartTime) {
            this.speechStartTime = now;
            this.isProcessing = true;
            this.audioBuffer = []; // バッファクリア
            
            console.log('Speech started');
            if (this.callbacks.onSpeechStart) {
                this.callbacks.onSpeechStart();
            }
        }
    }
    
    /**
     * 無音検出処理
     */
    handleSilenceDetection() {
        if (!this.speechStartTime) return;
        
        // 無音タイマー設定
        if (!this.silenceTimer) {
            this.silenceTimer = setTimeout(() => {
                this.handleSpeechEnd();
            }, this.silenceTimeout);
        }
    }
    
    /**
     * 音声終了処理
     */
    handleSpeechEnd() {
        if (!this.speechStartTime) return;
        
        const speechDuration = Date.now() - this.speechStartTime;
        
        // 最小音声継続時間チェック
        if (speechDuration >= this.minSpeechDuration) {
            // 音声データの統計情報
            let sum = 0;
            for (let i = 0; i < Math.min(this.audioBuffer.length, 1000); i++) {
                sum += Math.abs(this.audioBuffer[i]);
            }
            const averageLevel = sum / Math.min(this.audioBuffer.length, 1000);
            
            console.log(`[AudioProcessor] Speech ended (duration: ${speechDuration}ms, samples: ${this.audioBuffer.length}, avg level: ${averageLevel.toFixed(4)})`);
            
            // 音声データを取得
            const audioData = new Float32Array(this.audioBuffer);
            
            if (this.callbacks.onSpeechEnd) {
                this.callbacks.onSpeechEnd(audioData, speechDuration);
            }
        } else {
            console.log(`[AudioProcessor] Speech too short (${speechDuration}ms < ${this.minSpeechDuration}ms), ignored`);
        }
        
        // 状態リセット
        this.speechStartTime = null;
        this.isProcessing = false;
        this.audioBuffer = [];
        
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
    }
    
    /**
     * 音量レベル計算
     */
    calculateVolumeLevel(audioData) {
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
            sum += audioData[i] * audioData[i];
        }
        return Math.sqrt(sum / audioData.length);
    }
    
    /**
     * 音声データリサンプリング
     */
    resampleAudio(inputData, inputSampleRate, outputSampleRate) {
        if (inputSampleRate === outputSampleRate) {
            return Array.from(inputData);
        }
        
        const ratio = inputSampleRate / outputSampleRate;
        const outputLength = Math.floor(inputData.length / ratio);
        const output = new Float32Array(outputLength);
        
        for (let i = 0; i < outputLength; i++) {
            const inputIndex = i * ratio;
            const inputIndexFloor = Math.floor(inputIndex);
            const inputIndexCeil = Math.min(Math.ceil(inputIndex), inputData.length - 1);
            const fraction = inputIndex - inputIndexFloor;
            
            // 線形補間
            output[i] = inputData[inputIndexFloor] * (1 - fraction) + 
                       inputData[inputIndexCeil] * fraction;
        }
        
        return Array.from(output);
    }
    
    /**
     * 録音開始
     */
    startRecording() {
        if (this.isRecording) {
            console.log('Already recording');
            return true;
        }
        
        if (!this.audioContext) {
            this.notifyError('AudioProcessor not initialized');
            return false;
        }
        
        // AudioContext 復帰
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        this.isRecording = true;
        console.log('Recording started');
        return true;
    }
    
    /**
     * 録音停止
     */
    stopRecording() {
        if (!this.isRecording) {
            return;
        }
        
        this.isRecording = false;
        this.isProcessing = false;
        
        // 未完了の音声を処理
        if (this.speechStartTime) {
            this.handleSpeechEnd();
        }
        
        console.log('Recording stopped');
    }
    
    /**
     * コールバック設定
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }
    
    /**
     * VAD設定更新
     */
    updateVADConfig(config) {
        if (config.threshold !== undefined) {
            this.vadThreshold = Math.max(0.001, Math.min(1.0, config.threshold));
        }
        if (config.silenceTimeout !== undefined) {
            this.silenceTimeout = Math.max(500, Math.min(10000, config.silenceTimeout));
        }
        if (config.minSpeechDuration !== undefined) {
            this.minSpeechDuration = Math.max(100, Math.min(5000, config.minSpeechDuration));
        }
        
        console.log('VAD config updated:', {
            threshold: this.vadThreshold,
            silenceTimeout: this.silenceTimeout,
            minSpeechDuration: this.minSpeechDuration
        });
    }
    
    /**
     * 現在の音声レベル取得
     */
    getCurrentVolumeLevel() {
        if (!this.analyserNode) return 0;
        
        const bufferLength = this.analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyserNode.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
        }
        
        return sum / bufferLength / 255; // 0-1の範囲に正規化
    }
    
    /**
     * ステータス取得
     */
    getStatus() {
        return {
            isRecording: this.isRecording,
            isProcessing: this.isProcessing,
            speechStartTime: this.speechStartTime,
            bufferSize: this.audioBuffer.length,
            sampleRate: this.sampleRate,
            vadThreshold: this.vadThreshold
        };
    }
    
    /**
     * エラー通知
     */
    notifyError(message, error = null) {
        console.error('AudioProcessor Error:', message, error);
        
        if (this.callbacks.onError) {
            this.callbacks.onError(message, error);
        }
    }
    
    /**
     * クリーンアップ
     */
    cleanup() {
        this.stopRecording();
        
        // タイマークリア
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        
        // ノードの切断
        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }
        
        if (this.processorNode) {
            this.processorNode.disconnect();
            this.processorNode.onaudioprocess = null;
            this.processorNode = null;
        }
        
        if (this.analyserNode) {
            this.analyserNode.disconnect();
            this.analyserNode = null;
        }
        
        // MediaStreamの停止
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        // AudioContextのクローズ
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        console.log('AudioProcessor cleaned up');
    }
}

// グローバル参照用
window.AudioProcessor = AudioProcessor;