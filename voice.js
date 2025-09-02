/**
 * Voice Commander - 音声認識システム
 * Web Speech API を使用した音声コマンド認識
 */

class VoiceRecognition {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.isSupported = false;
        
        // 認識可能なコマンドと対応する処理
        this.commandMap = {
            // 攻撃コマンド
            '攻撃': 'attack',
            'こうげき': 'attack',
            'アタック': 'attack',
            'たたかう': 'attack',
            '戦う': 'attack',
            
            // 防御コマンド
            '防御': 'defend',
            'ぼうぎょ': 'defend',
            'ディフェンス': 'defend',
            'まもる': 'defend',
            '守る': 'defend',
            'シールド': 'defend',
            
            // 撤退コマンド
            '撤退': 'retreat',
            'てったい': 'retreat',
            'にげる': 'retreat',
            '逃げる': 'retreat',
            'ひく': 'retreat',
            '引く': 'retreat',
            
            // その他のコマンド
            '状況': 'status',
            'じょうきょう': 'status',
            'レポート': 'status',
            'ほうこく': 'status',
            '報告': 'status'
        };
        
        // コマンド実行コールバック
        this.onCommand = null;
        this.onStatusChange = null;
        this.onError = null;
        
        this.init();
    }
    
    /**
     * 初期化
     */
    init() {
        // Web Speech API サポート確認
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Web Speech API is not supported');
            this.isSupported = false;
            return false;
        }
        
        // SpeechRecognition オブジェクト作成
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // 設定
        this.recognition.lang = 'ja-JP';
        this.recognition.continuous = true;  // 連続認識
        this.recognition.interimResults = false;  // 中間結果は不要
        this.recognition.maxAlternatives = 1;  // 最大候補数
        
        // イベントリスナー設定
        this.setupEventListeners();
        
        this.isSupported = true;
        return true;
    }
    
    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        // 認識開始
        this.recognition.onstart = () => {
            console.log('音声認識開始');
            this.isListening = true;
            if (this.onStatusChange) {
                this.onStatusChange('listening');
            }
        };
        
        // 認識終了
        this.recognition.onend = () => {
            console.log('音声認識終了');
            this.isListening = false;
            if (this.onStatusChange) {
                this.onStatusChange('stopped');
            }
        };
        
        // 認識結果
        this.recognition.onresult = (event) => {
            const lastResultIndex = event.results.length - 1;
            const transcript = event.results[lastResultIndex][0].transcript.trim();
            const confidence = event.results[lastResultIndex][0].confidence;
            
            console.log(`認識結果: "${transcript}" (信頼度: ${confidence})`);
            
            this.processRecognitionResult(transcript, confidence);
        };
        
        // エラーハンドリング
        this.recognition.onerror = (event) => {
            console.error('音声認識エラー:', event.error);
            
            let errorMessage = '音声認識でエラーが発生しました';
            let shouldRestart = false;
            
            switch (event.error) {
                case 'no-speech':
                    errorMessage = '音声が検出されませんでした（無音状態が続きました）';
                    shouldRestart = true;
                    break;
                case 'audio-capture':
                    errorMessage = 'マイクにアクセスできません。マイクの接続と許可を確認してください。';
                    break;
                case 'not-allowed':
                    errorMessage = 'マイクの使用が許可されていません。ブラウザの設定を確認してください。';
                    break;
                case 'network':
                    errorMessage = 'ネットワークエラーが発生しました。接続を確認してください。';
                    shouldRestart = true;
                    break;
                case 'aborted':
                    errorMessage = '音声認識が中断されました';
                    shouldRestart = true;
                    break;
                case 'service-not-allowed':
                    errorMessage = '音声認識サービスが利用できません';
                    break;
                case 'bad-grammar':
                    errorMessage = '音声認識の設定にエラーがあります';
                    break;
                default:
                    errorMessage = `音声認識エラー: ${event.error}`;
                    shouldRestart = true;
            }
            
            if (this.onError) {
                this.onError(errorMessage, event.error, shouldRestart);
            }
            
            // 軽微なエラーの場合は自動再開
            if (shouldRestart && this.isListening) {
                setTimeout(() => {
                    this.restart();
                }, 2000);
            }
        };
    }
    
    /**
     * 音声認識結果の処理
     */
    processRecognitionResult(transcript, confidence) {
        // 信頼度が低い場合は無視
        if (confidence < 0.5) {
            console.log('信頼度が低いため無視:', confidence);
            return;
        }
        
        // コマンド解析
        const command = this.parseCommand(transcript);
        
        if (command) {
            console.log(`コマンド実行: ${command} (元: "${transcript}")`);
            if (this.onCommand) {
                this.onCommand(command, transcript);
            }
        } else {
            console.log(`認識できないコマンド: "${transcript}"`);
            if (this.onCommand) {
                this.onCommand(null, transcript);
            }
        }
    }
    
    /**
     * コマンド解析
     */
    parseCommand(transcript) {
        const lowerTranscript = transcript.toLowerCase();
        
        // 完全一致を優先
        if (this.commandMap[transcript]) {
            return this.commandMap[transcript];
        }
        
        // 部分一致チェック
        for (const [keyword, command] of Object.entries(this.commandMap)) {
            if (lowerTranscript.includes(keyword.toLowerCase())) {
                return command;
            }
        }
        
        return null;
    }
    
    /**
     * 音声認識開始
     */
    start() {
        if (!this.isSupported) {
            console.error('音声認識がサポートされていません');
            return false;
        }
        
        if (this.isListening) {
            console.log('既に音声認識が実行中です');
            return true;
        }
        
        try {
            this.recognition.start();
            return true;
        } catch (error) {
            console.error('音声認識開始エラー:', error);
            if (this.onError) {
                this.onError('音声認識を開始できません', error);
            }
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
        
        try {
            this.recognition.stop();
        } catch (error) {
            console.error('音声認識停止エラー:', error);
        }
    }
    
    /**
     * 音声認識再開（停止後の再開用）
     */
    restart() {
        this.stop();
        setTimeout(() => {
            this.start();
        }, 100);
    }
    
    /**
     * サポート状況取得
     */
    isSupported() {
        return this.isSupported;
    }
    
    /**
     * リスニング状態取得
     */
    isListening() {
        return this.isListening;
    }
    
    /**
     * コマンドリスト取得
     */
    getAvailableCommands() {
        const commands = {};
        for (const [keyword, command] of Object.entries(this.commandMap)) {
            if (!commands[command]) {
                commands[command] = [];
            }
            commands[command].push(keyword);
        }
        return commands;
    }
    
    /**
     * コールバック設定
     */
    setCallbacks(callbacks) {
        if (callbacks.onCommand) this.onCommand = callbacks.onCommand;
        if (callbacks.onStatusChange) this.onStatusChange = callbacks.onStatusChange;
        if (callbacks.onError) this.onError = callbacks.onError;
    }
}