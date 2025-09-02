/**
 * Voice Commander - マイクテスト機能
 * マイクの動作確認と音量レベル表示
 */

class MicrophoneTest {
    constructor() {
        this.mediaStream = null;
        this.audioContext = null;
        this.analyserNode = null;
        this.dataArray = null;
        this.isTestRunning = false;
        this.animationId = null;
        
        // UI要素
        this.micTestBtn = null;
        this.micTestResult = null;
        this.micStatusDisplay = null;
        this.volumeBar = null;
        this.testInstructions = null;
        
        // テスト用音声認識
        this.testRecognition = null;
        this.recognitionTimeout = null;
        
        // 音量計測
        this.volumeLevels = [];
        this.maxVolume = 0;
        this.avgVolume = 0;
        
        console.log('MicrophoneTest initialized');
    }
    
    /**
     * 初期化
     */
    init() {
        // UI要素取得
        this.micTestBtn = document.getElementById('mic-test-btn');
        this.micTestResult = document.getElementById('mic-test-result');
        this.micStatusDisplay = document.getElementById('mic-status-display');
        this.volumeBar = document.getElementById('volume-bar');
        this.testInstructions = document.getElementById('test-instructions');
        
        if (!this.micTestBtn) {
            console.error('Mic test button not found');
            return false;
        }
        
        // イベントリスナー設定
        this.micTestBtn.addEventListener('click', () => {
            this.toggleTest();
        });
        
        console.log('MicrophoneTest UI initialized');
        return true;
    }
    
    /**
     * テスト開始/停止切り替え
     */
    async toggleTest() {
        if (this.isTestRunning) {
            this.stopTest();
        } else {
            await this.startTest();
        }
    }
    
    /**
     * マイクテスト開始
     */
    async startTest() {
        try {
            console.log('Starting microphone test...');
            
            this.isTestRunning = true;
            this.updateUI('testing');
            
            // マイクアクセス要求
            await this.requestMicrophoneAccess();
            
            // 音量分析開始
            await this.setupAudioAnalysis();
            
            // 音声認識テスト開始
            await this.setupSpeechRecognitionTest();
            
            // 音量メーター開始
            this.startVolumeMeter();
            
            this.updateUI('running');
            console.log('Microphone test started successfully');
            
        } catch (error) {
            console.error('Failed to start microphone test:', error);
            this.updateUI('error', error.message);
            this.stopTest();
        }
    }
    
    /**
     * マイクアクセス要求
     */
    async requestMicrophoneAccess() {
        try {
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            };
            
            this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            console.log('Microphone access granted');
            return true;
            
        } catch (error) {
            let errorMessage = 'マイクにアクセスできません';
            
            switch (error.name) {
                case 'NotAllowedError':
                    errorMessage = 'マイクの使用が許可されていません。ブラウザの設定を確認してください。';
                    break;
                case 'NotFoundError':
                    errorMessage = 'マイクが見つかりません。マイクが接続されているか確認してください。';
                    break;
                case 'NotReadableError':
                    errorMessage = 'マイクが他のアプリケーションで使用中です。';
                    break;
                default:
                    errorMessage += ': ' + error.message;
            }
            
            throw new Error(errorMessage);
        }
    }
    
    /**
     * 音声分析セットアップ
     */
    async setupAudioAnalysis() {
        try {
            // AudioContext作成
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // MediaStreamSourceNode作成
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            
            // AnalyserNode作成
            this.analyserNode = this.audioContext.createAnalyser();
            this.analyserNode.fftSize = 256;
            this.analyserNode.smoothingTimeConstant = 0.3;
            
            // 接続
            source.connect(this.analyserNode);
            
            // データ配列作成
            const bufferLength = this.analyserNode.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            
            console.log('Audio analysis setup completed');
            return true;
            
        } catch (error) {
            throw new Error('音声分析の初期化に失敗しました: ' + error.message);
        }
    }
    
    /**
     * 音声認識テストセットアップ
     */
    async setupSpeechRecognitionTest() {
        try {
            // Web Speech API確認
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                throw new Error('このブラウザは音声認識に対応していません');
            }
            
            // SpeechRecognition作成
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.testRecognition = new SpeechRecognition();
            
            // 設定
            this.testRecognition.lang = 'ja-JP';
            this.testRecognition.continuous = false;
            this.testRecognition.interimResults = false;
            this.testRecognition.maxAlternatives = 1;
            
            // イベントリスナー
            this.testRecognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                const confidence = event.results[0][0].confidence;
                
                console.log(`Recognition result: "${transcript}" (confidence: ${confidence})`);
                this.handleRecognitionResult(transcript, confidence);
            };
            
            this.testRecognition.onerror = (event) => {
                console.error('Recognition error:', event.error);
                this.handleRecognitionError(event.error);
            };
            
            this.testRecognition.onend = () => {
                console.log('Recognition ended');
                if (this.isTestRunning) {
                    // 自動再開
                    setTimeout(() => {
                        if (this.isTestRunning) {
                            this.testRecognition.start();
                        }
                    }, 500);
                }
            };
            
            // 音声認識開始
            this.testRecognition.start();
            
            console.log('Speech recognition test setup completed');
            return true;
            
        } catch (error) {
            throw new Error('音声認識テストの初期化に失敗しました: ' + error.message);
        }
    }
    
    /**
     * 音量メーター開始
     */
    startVolumeMeter() {
        const updateVolume = () => {
            if (!this.isTestRunning || !this.analyserNode) {
                return;
            }
            
            // 時間領域データ取得（音声レベル測定用）
            this.analyserNode.getByteTimeDomainData(this.dataArray);
            
            // 正確な音量計算（RMS方式）
            let sum = 0;
            for (let i = 0; i < this.dataArray.length; i++) {
                // 0-255を-1.0 to 1.0に変換してRMS計算
                const sample = (this.dataArray[i] - 128) / 128;
                sum += sample * sample;
            }
            const rms = Math.sqrt(sum / this.dataArray.length);
            const volume = rms * 100; // パーセンテージに変換
            
            // 統計更新
            this.volumeLevels.push(volume);
            if (this.volumeLevels.length > 100) {
                this.volumeLevels.shift(); // 古いデータを削除
            }
            
            this.maxVolume = Math.max(this.maxVolume, volume);
            this.avgVolume = this.volumeLevels.reduce((a, b) => a + b, 0) / this.volumeLevels.length;
            
            // UI更新
            this.updateVolumeBar(volume);
            
            // 次のフレーム
            this.animationId = requestAnimationFrame(updateVolume);
        };
        
        updateVolume();
    }
    
    /**
     * 音量バー更新
     */
    updateVolumeBar(volume) {
        if (this.volumeBar) {
            this.volumeBar.style.width = `${Math.min(volume, 100)}%`;
        }
    }
    
    /**
     * 音声認識結果処理
     */
    handleRecognitionResult(transcript, confidence) {
        // テストワードチェック
        const testWords = ['テスト', 'てすと', 'test'];
        const isTestWord = testWords.some(word => 
            transcript.toLowerCase().includes(word.toLowerCase())
        );
        
        if (isTestWord) {
            this.updateUI('success', `音声認識成功！「${transcript}」(信頼度: ${(confidence * 100).toFixed(1)}%)`);
            
            // 成功効果音
            if (window.audioManager) {
                window.audioManager.playSound('notification');
            }
        } else {
            this.updateUI('partial', `認識: 「${transcript}」- 「テスト」と言ってみてください`);
        }
    }
    
    /**
     * 音声認識エラー処理
     */
    handleRecognitionError(error) {
        console.error('Recognition error in test:', error);
        
        let message = '音声認識エラー';
        switch (error) {
            case 'no-speech':
                message = '音声が検出されません - もう少し大きな声で話してください';
                break;
            case 'audio-capture':
                message = 'マイクから音声を取得できません';
                break;
            case 'not-allowed':
                message = 'マイクの使用が許可されていません';
                break;
            default:
                message = `音声認識エラー: ${error}`;
        }
        
        this.updateUI('error', message);
    }
    
    /**
     * テスト停止
     */
    stopTest() {
        console.log('Stopping microphone test...');
        
        this.isTestRunning = false;
        
        // 音声認識停止
        if (this.testRecognition) {
            try {
                this.testRecognition.stop();
            } catch (error) {
                console.warn('Error stopping recognition:', error);
            }
            this.testRecognition = null;
        }
        
        // 認識タイムアウトクリア
        if (this.recognitionTimeout) {
            clearTimeout(this.recognitionTimeout);
            this.recognitionTimeout = null;
        }
        
        // アニメーション停止
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // AudioContext停止
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        // MediaStream停止
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => {
                track.stop();
            });
            this.mediaStream = null;
        }
        
        this.analyserNode = null;
        this.dataArray = null;
        
        // UI更新
        this.updateUI('stopped');
        
        // 結果表示
        this.showTestResults();
        
        console.log('Microphone test stopped');
    }
    
    /**
     * テスト結果表示
     */
    showTestResults() {
        if (this.volumeLevels.length > 0) {
            const summary = [
                `最大音量: ${this.maxVolume.toFixed(1)}%`,
                `平均音量: ${this.avgVolume.toFixed(1)}%`
            ].join(' / ');
            
            console.log('Test results:', summary);
            
            // 結果評価
            let evaluation = '';
            if (this.avgVolume < 5) {
                evaluation = '音量が小さいです。マイクに近づいて話してください。';
            } else if (this.avgVolume > 50) {
                evaluation = '音量が大きすぎます。マイクから少し離れてください。';
            } else {
                evaluation = '音量レベルは適切です。';
            }
            
            setTimeout(() => {
                this.updateUI('results', `テスト完了 - ${summary} - ${evaluation}`);
            }, 500);
        }
    }
    
    /**
     * UI状態更新
     */
    updateUI(state, message = '') {
        if (!this.micTestBtn || !this.micTestResult || !this.micStatusDisplay) {
            return;
        }
        
        // 結果パネルの表示/非表示
        if (state === 'stopped') {
            this.micTestResult.classList.add('hidden');
        } else {
            this.micTestResult.classList.remove('hidden');
        }
        
        // ボタン状態
        switch (state) {
            case 'testing':
                this.micTestBtn.textContent = '🔄 初期化中...';
                this.micTestBtn.classList.add('testing');
                this.micTestBtn.disabled = true;
                this.micStatusDisplay.textContent = 'マイクにアクセス中...';
                break;
                
            case 'running':
                this.micTestBtn.textContent = '⏹️ テスト停止';
                this.micTestBtn.classList.remove('testing');
                this.micTestBtn.disabled = false;
                this.micStatusDisplay.textContent = 'マイクテスト実行中 - 「テスト」と言ってください';
                this.micTestResult.className = 'mic-test-result'; // クラスリセット
                break;
                
            case 'success':
                this.micStatusDisplay.textContent = '✅ ' + message;
                this.micTestResult.classList.add('test-success');
                break;
                
            case 'partial':
                this.micStatusDisplay.textContent = '⚠️ ' + message;
                break;
                
            case 'error':
                this.micTestBtn.textContent = '🎤 マイクテスト';
                this.micTestBtn.classList.remove('testing');
                this.micTestBtn.disabled = false;
                this.micStatusDisplay.textContent = '❌ ' + message;
                this.micTestResult.classList.add('test-error');
                break;
                
            case 'results':
                this.micStatusDisplay.textContent = '📊 ' + message;
                break;
                
            case 'stopped':
                this.micTestBtn.textContent = '🎤 マイクテスト';
                this.micTestBtn.classList.remove('testing');
                this.micTestBtn.disabled = false;
                if (this.volumeBar) {
                    this.volumeBar.style.width = '0%';
                }
                break;
        }
    }
    
    /**
     * テスト状態取得
     */
    isRunning() {
        return this.isTestRunning;
    }
    
    /**
     * テスト結果取得
     */
    getResults() {
        return {
            maxVolume: this.maxVolume,
            avgVolume: this.avgVolume,
            volumeSamples: this.volumeLevels.length,
            isWorking: this.volumeLevels.length > 0 && this.avgVolume > 1
        };
    }
}