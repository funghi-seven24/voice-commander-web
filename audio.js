/**
 * Voice Commander - 音響管理システム
 * Web Audio API を使用した効果音生成とTTS
 */

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterVolume = 0.3;
        this.effectsVolume = 0.8;
        this.voiceVolume = 1.0;
        
        // 効果音パターン定義
        this.soundPatterns = {
            // ゲーム開始
            'game_start': {
                notes: [440, 554, 659, 880],
                durations: [0.2, 0.2, 0.2, 0.4],
                type: 'square'
            },
            
            // 攻撃成功
            'attack_success': {
                notes: [800, 600, 400],
                durations: [0.1, 0.1, 0.2],
                type: 'sawtooth'
            },
            
            // 防御成功
            'defend_success': {
                notes: [400, 500, 600, 500],
                durations: [0.15, 0.15, 0.15, 0.15],
                type: 'sine'
            },
            
            // 撤退
            'retreat': {
                notes: [880, 659, 440, 330],
                durations: [0.1, 0.1, 0.1, 0.3],
                type: 'triangle'
            },
            
            // 敵出現警告
            'enemy_alert': {
                notes: [1000, 0, 1000, 0, 1000],
                durations: [0.2, 0.1, 0.2, 0.1, 0.3],
                type: 'square'
            },
            
            // ダメージ受ける
            'damage_taken': {
                notes: [200, 150, 100, 80],
                durations: [0.1, 0.1, 0.1, 0.2],
                type: 'sawtooth'
            },
            
            // 勝利
            'victory': {
                notes: [523, 659, 784, 1047],
                durations: [0.3, 0.3, 0.3, 0.6],
                type: 'sine'
            },
            
            // ゲームオーバー
            'game_over': {
                notes: [440, 415, 392, 370],
                durations: [0.5, 0.5, 0.5, 1.0],
                type: 'triangle'
            },
            
            // 通知音
            'notification': {
                notes: [800, 1000],
                durations: [0.1, 0.2],
                type: 'sine'
            },
            
            // エラー音
            'error': {
                notes: [300, 200],
                durations: [0.3, 0.3],
                type: 'square'
            }
        };
        
        // 音声合成関連
        this.speechSynthesis = null;
        this.voiceList = [];
        this.selectedVoice = null;
        
        this.init();
    }
    
    /**
     * 初期化
     */
    async init() {
        try {
            // Web Audio API 初期化
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 音声合成初期化
            this.initTextToSpeech();
            
            console.log('AudioManager initialized');
            return true;
        } catch (error) {
            console.error('AudioManager initialization failed:', error);
            return false;
        }
    }
    
    /**
     * Text-to-Speech 初期化
     */
    initTextToSpeech() {
        if ('speechSynthesis' in window) {
            this.speechSynthesis = window.speechSynthesis;
            
            // 音声リスト取得（非同期で読み込まれる）
            const loadVoices = () => {
                this.voiceList = this.speechSynthesis.getVoices();
                this.selectBestJapaneseVoice();
            };
            
            // 音声リストが読み込まれたとき
            this.speechSynthesis.onvoiceschanged = loadVoices;
            
            // 初期読み込み
            loadVoices();
        } else {
            console.warn('Speech Synthesis API is not supported');
        }
    }
    
    /**
     * 最適な日本語音声を選択
     */
    selectBestJapaneseVoice() {
        const japaneseVoices = this.voiceList.filter(voice => 
            voice.lang.includes('ja') || voice.lang.includes('JP')
        );
        
        if (japaneseVoices.length > 0) {
            // 女性の声を優先（司令官らしく）
            this.selectedVoice = japaneseVoices.find(voice => 
                voice.name.includes('female') || voice.name.includes('Female')
            ) || japaneseVoices[0];
            
            console.log('Selected voice:', this.selectedVoice.name);
        }
    }
    
    /**
     * 効果音再生
     */
    playSound(soundName, volumeMultiplier = 1.0) {
        if (!this.audioContext || !this.soundPatterns[soundName]) {
            console.warn(`Sound not found: ${soundName}`);
            return;
        }
        
        try {
            const pattern = this.soundPatterns[soundName];
            const volume = this.masterVolume * this.effectsVolume * volumeMultiplier;
            
            this.playToneSequence(pattern.notes, pattern.durations, pattern.type, volume);
        } catch (error) {
            console.error(`Failed to play sound ${soundName}:`, error);
        }
    }
    
    /**
     * トーンシーケンス再生
     */
    playToneSequence(notes, durations, waveType = 'sine', volume = 0.3) {
        const now = this.audioContext.currentTime;
        let currentTime = now;
        
        notes.forEach((freq, index) => {
            if (freq === 0) {
                // 休符の場合
                currentTime += durations[index];
                return;
            }
            
            // オシレーター作成
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // 接続
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // 設定
            oscillator.frequency.value = freq;
            oscillator.type = waveType;
            
            // エンベロープ設定（アタック・リリース）
            const duration = durations[index];
            const attackTime = Math.min(0.01, duration * 0.1);
            const releaseTime = Math.min(0.05, duration * 0.2);
            
            gainNode.gain.setValueAtTime(0, currentTime);
            gainNode.gain.linearRampToValueAtTime(volume, currentTime + attackTime);
            gainNode.gain.setValueAtTime(volume, currentTime + duration - releaseTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);
            
            // 再生
            oscillator.start(currentTime);
            oscillator.stop(currentTime + duration);
            
            currentTime += duration;
        });
    }
    
    /**
     * 音声読み上げ
     */
    speak(text, options = {}) {
        if (!this.speechSynthesis) {
            console.warn('Speech synthesis not available');
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            // 現在の読み上げを停止
            this.speechSynthesis.cancel();
            
            // TTS開始前に状態を設定
            window.ttsActive = true;
            
            const utterance = new SpeechSynthesisUtterance(text);
            
            // 設定
            utterance.voice = this.selectedVoice;
            utterance.volume = this.voiceVolume * (options.volume || 1.0);
            utterance.rate = options.rate || 1.0;
            utterance.pitch = options.pitch || 1.0;
            utterance.lang = 'ja-JP';
            
            // イベント
            utterance.onstart = () => {
                console.log(`TTS開始: "${text}"`);
                // グローバルTTS状態を設定
                window.ttsActive = true;
            };
            
            utterance.onend = () => {
                console.log(`TTS完了: "${text}"`);
                // グローバルTTS状態をクリア
                window.ttsActive = false;
                resolve();
            };
            
            utterance.onerror = (event) => {
                console.error('TTS エラー:', event.error);
                // エラー時もTTS状態をクリア
                window.ttsActive = false;
                reject(event.error);
            };
            
            // 読み上げ開始
            this.speechSynthesis.speak(utterance);
            console.log(`TTS開始: "${text}"`);
        });
    }
    
    /**
     * 司令官の音声（特別な設定で読み上げ）
     */
    speakAsCommander(text) {
        return this.speak(text, {
            rate: 1.1,
            pitch: 0.9,
            volume: 1.0
        });
    }
    
    /**
     * システムメッセージの音声
     */
    speakAsSystem(text) {
        return this.speak(text, {
            rate: 0.9,
            pitch: 1.1,
            volume: 0.8
        });
    }
    
    /**
     * 緊急メッセージの音声（効果音付き）
     */
    speakAsAlert(text) {
        // 警告音再生
        this.playSound('enemy_alert', 0.5);
        
        // 少し待ってから読み上げ
        setTimeout(() => {
            this.speak(text, {
                rate: 1.2,
                pitch: 1.2,
                volume: 1.0
            });
        }, 500);
    }
    
    /**
     * 音声読み上げ停止
     */
    stopSpeaking() {
        if (this.speechSynthesis) {
            this.speechSynthesis.cancel();
        }
    }
    
    /**
     * ボリューム設定
     */
    setVolume(masterVolume, effectsVolume = null, voiceVolume = null) {
        this.masterVolume = Math.max(0, Math.min(1, masterVolume));
        if (effectsVolume !== null) {
            this.effectsVolume = Math.max(0, Math.min(1, effectsVolume));
        }
        if (voiceVolume !== null) {
            this.voiceVolume = Math.max(0, Math.min(1, voiceVolume));
        }
    }
    
    /**
     * 利用可能な音声リスト取得
     */
    getAvailableVoices() {
        return this.voiceList;
    }
    
    /**
     * 音声選択
     */
    setVoice(voiceName) {
        const voice = this.voiceList.find(v => v.name === voiceName);
        if (voice) {
            this.selectedVoice = voice;
            console.log('Voice changed to:', voice.name);
            return true;
        }
        return false;
    }
    
    /**
     * Audio Context の状態確認・復帰
     */
    async resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('AudioContext resumed');
            } catch (error) {
                console.error('Failed to resume AudioContext:', error);
            }
        }
    }
    
    /**
     * 効果音テスト再生
     */
    testSounds() {
        const sounds = Object.keys(this.soundPatterns);
        let index = 0;
        
        const playNext = () => {
            if (index < sounds.length) {
                console.log(`Testing sound: ${sounds[index]}`);
                this.playSound(sounds[index]);
                index++;
                setTimeout(playNext, 1000);
            }
        };
        
        playNext();
    }
}