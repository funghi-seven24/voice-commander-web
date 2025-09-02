/**
 * Voice Commander - メイン統合システム
 * 全システムを統合し、UIとの連携を管理
 */

class VoiceCommanderApp {
    constructor() {
        // システムインスタンス
        this.voiceRecognition = null;
        this.audioManager = null;
        this.gameEngine = null;
        this.microphoneTest = null;
        
        // UI要素
        this.elements = {};
        
        // 状態管理
        this.isInitialized = false;
        this.isGameRunning = false;
        
        console.log('VoiceCommanderApp created');
    }
    
    /**
     * アプリケーション初期化
     */
    async init() {
        try {
            console.log('Initializing VoiceCommanderApp...');
            
            // UI要素取得
            this.initializeElements();
            
            // システム初期化
            await this.initializeSystems();
            
            // イベントリスナー設定
            this.setupEventListeners();
            
            // 初期UI状態設定
            this.updateUI();
            
            this.isInitialized = true;
            console.log('VoiceCommanderApp initialized successfully');
            
            // 初期メッセージ
            this.addLogMessage('system', 'Voice Commander 初期化完了');
            
            // プロトコル確認
            if (location.protocol === 'file:') {
                this.addLogMessage('alert', '⚠️ ローカルファイルで実行中 - マイク許可が毎回必要です');
                this.addLogMessage('system', '解決方法: start-server.bat を実行して http://localhost:8000 でアクセス');
            } else {
                this.addLogMessage('system', '✅ Webサーバー経由でアクセス中 - マイク許可が保存されます');
            }
            
            this.addLogMessage('system', 'まず「マイクテスト」でマイクの動作を確認してください');
            this.addLogMessage('system', '準備ができたら「防衛戦開始」ボタンをクリック');
            
            // ガイド表示制御
            this.checkGuideVisibility();
            
            // マイク権限チェック（少し遅らせて実行）
            setTimeout(() => {
                this.checkMicrophonePermission();
            }, 1000);
            
        } catch (error) {
            console.error('Failed to initialize VoiceCommanderApp:', error);
            this.showError('初期化に失敗しました: ' + error.message);
        }
    }
    
    /**
     * UI要素初期化
     */
    initializeElements() {
        this.elements = {
            // ステータス要素
            defense: document.getElementById('defense'),
            fleetCount: document.getElementById('fleet-count'),
            killCount: document.getElementById('kill-count'),
            waveNumber: document.getElementById('wave-number'),
            enemyCount: document.getElementById('enemy-count'),
            
            // ログ要素
            logContent: document.getElementById('log-content'),
            
            // コントロール要素
            startBtn: document.getElementById('start-btn'),
            pauseBtn: document.getElementById('pause-btn'),
            restartBtn: document.getElementById('restart-btn'),
            
            // 音声制御要素
            voiceControls: document.getElementById('voice-controls'),
            gameControls: document.getElementById('game-controls'),
            micStatus: document.getElementById('mic-status'),
            micIndicator: document.getElementById('mic-indicator'),
            
            // コンテナ要素
            statusPanel: document.getElementById('status-panel'),
            gameContainer: document.getElementById('game-container')
        };
        
        // 要素存在確認
        for (const [key, element] of Object.entries(this.elements)) {
            if (!element) {
                console.warn(`Element not found: ${key}`);
            }
        }
    }
    
    /**
     * システム初期化
     */
    async initializeSystems() {
        // 音響システム初期化
        this.audioManager = new AudioManager();
        await this.audioManager.init();
        window.audioManager = this.audioManager; // グローバル参照
        
        // マイクテスト機能初期化
        this.microphoneTest = new MicrophoneTest();
        this.microphoneTest.init();
        
        // 音声認識システム初期化（フォールバック対応）
        try {
            // 新しい統合システムを試行
            if (window.UnifiedVoiceRecognition) {
                this.voiceRecognition = new UnifiedVoiceRecognition();
                await this.voiceRecognition.init();
                console.log('Using UnifiedVoiceRecognition system');
            } else {
                throw new Error('UnifiedVoiceRecognition not available');
            }
        } catch (error) {
            console.warn('Failed to initialize UnifiedVoiceRecognition, falling back to AdvancedVoiceRecognition:', error);
            
            // フォールバック: 既存のAdvancedVoiceRecognitionを使用
            if (window.AdvancedVoiceRecognition) {
                this.voiceRecognition = new AdvancedVoiceRecognition();
                console.log('Using AdvancedVoiceRecognition system (fallback)');
            } else if (window.VoiceRecognition) {
                this.voiceRecognition = new VoiceRecognition();
                console.log('Using basic VoiceRecognition system (fallback)');
            } else {
                throw new Error('No voice recognition system available');
            }
        }
        
        // 確認システム初期化
        if (this.voiceRecognition.initConfirmationSystem) {
            this.voiceRecognition.initConfirmationSystem(this.audioManager);
        }
        
        // 音声認識コールバック設定
        this.voiceRecognition.setCallbacks({
            onCommand: (command, originalText) => {
                this.handleVoiceCommand(command, originalText);
            },
            onStatusChange: (status) => {
                this.handleVoiceStatusChange(status);
            },
            onError: (message, error, shouldRestart) => {
                this.handleVoiceError(message, error, shouldRestart);
            },
            onCommandQueue: (queue) => {
                this.handleCommandQueue(queue);
            },
            onUserLearning: (learningInfo) => {
                this.handleUserLearning(learningInfo);
            },
            onConfirmationRequest: (confirmation) => {
                this.handleConfirmationRequest(confirmation);
            }
        });
        
        // ゲームエンジン初期化
        this.gameEngine = new GameEngine();
        
        // ゲームエンジンコールバック設定
        this.gameEngine.setCallbacks({
            onStateChange: (state) => {
                this.handleGameStateChange(state);
            },
            onStatsUpdate: (stats) => {
                this.handleStatsUpdate(stats);
            },
            onMessage: (message) => {
                this.addLogMessage(message.type, message.text);
            },
            onGameOver: (results) => {
                this.handleGameOver(results);
            }
        });
        
        console.log('All systems initialized');
    }
    
    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        // スタートボタン
        this.elements.startBtn.addEventListener('click', () => {
            this.startGame();
        });
        
        // ガイド非表示ボタン
        const hideGuideBtn = document.getElementById('hide-guide-btn');
        if (hideGuideBtn) {
            hideGuideBtn.addEventListener('click', () => {
                const guide = document.getElementById('mic-permission-guide');
                if (guide) {
                    guide.classList.add('hidden');
                    // ローカルストレージに非表示状態を保存
                    localStorage.setItem('voiceCommanderGuideHidden', 'true');
                }
            });
        }
        
        // エンジン設定イベント
        this.setupEngineSettingsEvents();
        
        // ポーズボタン
        this.elements.pauseBtn.addEventListener('click', () => {
            this.pauseGame();
        });
        
        // リスタートボタン
        this.elements.restartBtn.addEventListener('click', () => {
            this.restartGame();
        });
        
        // ページ離脱時の処理
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        // AudioContext の自動復帰（ユーザーインタラクション後）
        document.addEventListener('click', async () => {
            if (this.audioManager) {
                await this.audioManager.resumeContext();
            }
        }, { once: true });
        
        console.log('Event listeners set up');
    }
    
    /**
     * ゲーム開始
     */
    async startGame() {
        try {
            console.log('Starting game...');
            
            // マイクテスト中なら停止
            if (this.microphoneTest && this.microphoneTest.isRunning()) {
                this.microphoneTest.stopTest();
            }
            
            // 音声認識サポート確認
            if (!this.voiceRecognition.isSupported) {
                this.showError('お使いのブラウザは音声認識に対応していません。Chrome または Edge をお使いください。');
                return;
            }
            
            // AudioContext 復帰
            await this.audioManager.resumeContext();
            
            // 音声認識開始
            if (!this.voiceRecognition.start()) {
                this.showError('音声認識の開始に失敗しました。マイクの許可を確認してください。');
                return;
            }
            
            // ゲーム開始
            this.gameEngine.startGame();
            
            // UI状態更新
            this.elements.startBtn.style.display = 'none';
            this.elements.voiceControls.classList.remove('hidden');
            this.elements.gameControls.classList.remove('hidden');
            
            // 状況表示を有効化
            const situationDisplay = document.getElementById('situation-display');
            if (situationDisplay) {
                situationDisplay.classList.remove('hidden');
            }
            
            this.isGameRunning = true;
            
            // 開始効果音
            this.audioManager.playSound('game_start');
            
            // 開始アナウンス
            setTimeout(() => {
                this.audioManager.speakAsSystem('防衛戦を開始します。音声コマンドで艦隊を指揮してください。');
            }, 1000);
            
            console.log('Game started successfully');
            
        } catch (error) {
            console.error('Failed to start game:', error);
            this.showError('ゲームの開始に失敗しました: ' + error.message);
        }
    }
    
    /**
     * ゲーム一時停止
     */
    pauseGame() {
        if (this.gameEngine && this.gameEngine.gameState === 'playing') {
            this.gameEngine.pauseGame();
            this.voiceRecognition.stop();
            this.elements.pauseBtn.textContent = '▶️ 再開';
            this.addLogMessage('system', 'ゲームを一時停止しました');
        } else if (this.gameEngine && this.gameEngine.gameState === 'paused') {
            this.gameEngine.resumeGame();
            this.voiceRecognition.start();
            this.elements.pauseBtn.textContent = '⏸️ 一時停止';
            this.addLogMessage('system', 'ゲームを再開しました');
        }
    }
    
    /**
     * ゲームリスタート
     */
    restartGame() {
        // 確認ダイアログ
        if (this.isGameRunning && !confirm('現在のゲームを終了して再開始しますか？')) {
            return;
        }
        
        this.cleanup();
        
        // UI リセット
        this.elements.startBtn.style.display = 'block';
        this.elements.startBtn.textContent = '🎮 防衛戦開始';
        this.elements.voiceControls.classList.add('hidden');
        this.elements.gameControls.classList.add('hidden');
        
        // ログクリア
        this.elements.logContent.innerHTML = '<div class=\"log-entry system\">[システム] 再開始しました</div>';
        
        this.isGameRunning = false;
        
        this.addLogMessage('system', 'ゲームをリセットしました');
    }
    
    /**
     * 音声コマンド処理
     */
    handleVoiceCommand(command, originalText) {
        console.log(`Voice command received: ${command} ("${originalText}")`);
        
        // プレイヤーの発言をログに記録
        this.addLogMessage('player', `> ${originalText}`);
        
        if (command && this.gameEngine) {
            // ゲームエンジンにコマンド送信
            const result = this.gameEngine.handleCommand(command, originalText);
            
            if (result.success) {
                // 成功時の効果音
                this.audioManager.playSound('notification', 0.3);
                
                // コマンド効果を表示
                this.showCommandEffect(result.effect);
            } else {
                // 失敗時の効果音
                this.audioManager.playSound('error', 0.5);
                
                // 失敗理由を表示
                this.showCommandEffect(result.reason || 'コマンド実行に失敗しました');
            }
        } else {
            // 認識できなかった場合
            this.addLogMessage('system', `認識できませんでした: "${originalText}"`);
            this.audioManager.playSound('error', 0.3);
            this.showCommandEffect('コマンドを認識できませんでした');
        }
    }
    
    /**
     * 音声認識状態変更処理
     */
    handleVoiceStatusChange(status) {
        console.log(`Voice status changed: ${status}`);
        
        switch (status) {
            case 'listening':
                this.elements.micIndicator.textContent = 'ON';
                this.elements.micIndicator.className = 'status-on';
                break;
            case 'stopped':
                this.elements.micIndicator.textContent = 'OFF';
                this.elements.micIndicator.className = 'status-off';
                
                // ゲーム中なら自動再開
                if (this.isGameRunning && this.gameEngine.gameState === 'playing') {
                    setTimeout(() => {
                        this.voiceRecognition.start();
                    }, 500);
                }
                break;
        }
    }
    
    /**
     * 音声認識エラー処理
     */
    handleVoiceError(message, error, shouldRestart = false) {
        console.error('Voice recognition error:', error, shouldRestart);
        
        // 重大なエラーの場合は詳細表示
        if (error === 'not-allowed' || error === 'audio-capture') {
            this.addLogMessage('alert', `❌ ${message}`);
            this.addLogMessage('system', 'マイクテストで動作確認を行ってください');
            
            // ゲーム中の場合は一時停止
            if (this.isGameRunning && this.gameEngine.gameState === 'playing') {
                this.pauseGame();
            }
        } else {
            // 軽微なエラーは簡潔に表示
            this.addLogMessage('alert', `⚠️ ${message}`);
            
            if (shouldRestart && error === 'no-speech') {
                this.addLogMessage('system', '音声認識を再開します...');
            }
        }
        
        // 音響フィードバック
        if (this.audioManager) {
            if (error === 'not-allowed' || error === 'audio-capture') {
                this.audioManager.playSound('error');
                this.audioManager.speakAsSystem('マイクのアクセスに問題があります。設定を確認してください。');
            }
        }
    }
    
    /**
     * ゲーム状態変更処理
     */
    handleGameStateChange(state) {
        console.log(`Game state changed: ${state}`);
        
        switch (state) {
            case 'playing':
                this.elements.statusPanel.classList.remove('flash');
                break;
            case 'paused':
                this.addLogMessage('system', 'ゲーム一時停止中');
                break;
            case 'gameover':
                this.elements.statusPanel.classList.add('flash');
                this.handleGameEnd();
                break;
        }
    }
    
    /**
     * 統計更新処理
     */
    handleStatsUpdate(stats) {
        // UI要素更新
        this.elements.defense.textContent = stats.defense;
        this.elements.fleetCount.textContent = stats.fleetCount;
        this.elements.killCount.textContent = stats.killCount;
        this.elements.waveNumber.textContent = stats.currentWave;
        this.elements.enemyCount.textContent = stats.enemyCount;
        
        // 防衛度による色変更
        if (stats.defense <= 20) {
            this.elements.defense.className = 'status-value danger';
        } else if (stats.defense <= 50) {
            this.elements.defense.className = 'status-value';
            this.elements.defense.style.color = '#ffaa00';
        } else {
            this.elements.defense.className = 'status-value';
            this.elements.defense.style.color = '#ffff00';
        }
        
        // 艦隊数による警告
        if (stats.fleetCount <= 1) {
            this.elements.fleetCount.className = 'status-value danger';
        }
        
        // 戦況分析表示を更新
        this.updateSituationDisplay(stats);
        
        // コンボ表示
        if (stats.comboCount > 1) {
            this.showCombo(stats.comboCount);
        }
    }
    
    /**
     * ゲームオーバー処理
     */
    handleGameOver(results) {
        console.log('Game over:', results);
        
        // 結果表示
        setTimeout(() => {
            this.showGameResults(results);
        }, 2000);
    }
    
    /**
     * ゲーム終了処理
     */
    handleGameEnd() {
        this.voiceRecognition.stop();
        this.isGameRunning = false;
        
        // UI更新
        this.elements.pauseBtn.textContent = '⏸️ 一時停止';
        this.elements.startBtn.style.display = 'block';
        this.elements.startBtn.textContent = '🔄 再挑戦';
    }
    
    /**
     * ログメッセージ追加
     */
    addLogMessage(type, text) {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.textContent = `[${timestamp}] ${text}`;
        
        // 最初に挿入
        this.elements.logContent.insertBefore(logEntry, this.elements.logContent.firstChild);
        
        // 古いログを削除（最大20件）
        while (this.elements.logContent.children.length > 20) {
            this.elements.logContent.removeChild(this.elements.logContent.lastChild);
        }
        
        // 画面シェイク効果（アラート時）
        if (type === 'alert') {
            this.elements.gameContainer.classList.add('shake');
            setTimeout(() => {
                this.elements.gameContainer.classList.remove('shake');
            }, 500);
        }
    }
    
    /**
     * コンボ表示
     */
    showCombo(count) {
        // コンボ表示要素作成
        const comboElement = document.createElement('div');
        comboElement.className = 'combo-display';
        comboElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 3rem;
            font-weight: bold;
            color: #ffff00;
            text-shadow: 0 0 20px #ffff00;
            z-index: 1000;
            pointer-events: none;
            animation: comboFade 2s ease-out forwards;
        `;
        comboElement.textContent = `COMBO x${count}!`;
        
        // CSS アニメーション定義
        if (!document.getElementById('combo-style')) {
            const style = document.createElement('style');
            style.id = 'combo-style';
            style.textContent = `
                @keyframes comboFade {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                    20% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(comboElement);
        
        // 2秒後に削除
        setTimeout(() => {
            document.body.removeChild(comboElement);
        }, 2000);
    }
    
    /**
     * ゲーム結果表示
     */
    showGameResults(results) {
        const resultText = [
            `最終スコア: ${results.score}点`,
            `撃破数: ${results.kills}体`,
            `到達ウェーブ: 第${results.waves}波`,
            `生存時間: ${Math.floor(results.survivalTime)}秒`,
            `最大コンボ: x${results.maxCombo}`
        ].join('\\n');
        
        // 結果をログに表示
        this.addLogMessage('system', '=== ゲーム結果 ===');
        resultText.split('\\n').forEach(line => {
            this.addLogMessage('system', line);
        });
        
        // 音声で結果読み上げ
        const speechText = `お疲れ様でした。最終スコア${results.score}点、撃破数${results.kills}体、到達ウェーブ第${results.waves}波でした。`;
        setTimeout(() => {
            this.audioManager.speakAsCommander(speechText);
        }, 500);
    }
    
    /**
     * エラー表示
     */
    showError(message) {
        this.addLogMessage('alert', `エラー: ${message}`);
        
        // エラー音再生
        if (this.audioManager) {
            this.audioManager.playSound('error');
        }
        
        console.error('App Error:', message);
    }
    
    /**
     * UI更新
     */
    updateUI() {
        // 初期状態の UI 更新
        if (this.elements.defense) {
            this.elements.defense.textContent = '100';
            this.elements.fleetCount.textContent = '3';
            this.elements.killCount.textContent = '0';
            this.elements.waveNumber.textContent = '1';
            this.elements.enemyCount.textContent = '0';
        }
    }
    
    /**
     * ガイド表示制御
     */
    checkGuideVisibility() {
        const guide = document.getElementById('mic-permission-guide');
        if (guide) {
            // ローカルストレージから状態を確認
            const isHidden = localStorage.getItem('voiceCommanderGuideHidden') === 'true';
            if (isHidden) {
                guide.classList.add('hidden');
            }
        }
    }
    
    /**
     * マイク権限チェック
     */
    async checkMicrophonePermission() {
        try {
            const result = await navigator.permissions.query({ name: 'microphone' });
            
            const guide = document.getElementById('mic-permission-guide');
            if (guide) {
                if (result.state === 'granted') {
                    // 許可済みの場合はガイドを非表示
                    guide.classList.add('hidden');
                    localStorage.setItem('voiceCommanderGuideHidden', 'true');
                    this.addLogMessage('system', '✅ マイクの許可が確認されました');
                } else if (result.state === 'denied') {
                    // 拒否されている場合はガイドを強制表示
                    guide.classList.remove('hidden');
                    this.addLogMessage('alert', '⚠️ マイクアクセスが拒否されています。設定を確認してください。');
                }
            }
            
            return result.state;
            
        } catch (error) {
            console.log('Permission query not supported:', error);
            return 'unknown';
        }
    }
    
    /**
     * 戦況分析表示更新
     */
    updateSituationDisplay(stats) {
        const enemyThreat = document.getElementById('enemy-threat');
        const recommendedAction = document.getElementById('recommended-action');
        
        if (!enemyThreat || !recommendedAction) return;
        
        // 脅威レベル計算
        let threatLevel = 'low';
        let threatText = '脅威レベル: 低';
        let recommendedActionText = '推奨行動: 待機';
        
        if (stats.enemyCount === 0) {
            threatLevel = 'low';
            threatText = '脅威レベル: なし';
            recommendedActionText = '推奨行動: 待機';
        } else if (stats.enemyCount <= 2) {
            threatLevel = 'low';
            threatText = '脅威レベル: 低';
            recommendedActionText = '推奨行動: 「攻撃」で排除';
        } else if (stats.enemyCount <= 5) {
            threatLevel = 'medium';
            threatText = '脅威レベル: 中';
            recommendedActionText = '推奨行動: 「攻撃」連続実行';
        } else if (stats.enemyCount <= 8) {
            threatLevel = 'high';
            threatText = '脅威レベル: 高';
            recommendedActionText = '推奨行動: 「攻撃」で集中排除';
        } else {
            threatLevel = 'critical';
            threatText = '脅威レベル: 危険';
            recommendedActionText = '推奨行動: 「撤退」を検討';
        }
        
        // 防衛度による調整
        if (stats.defense <= 20) {
            threatLevel = 'critical';
            recommendedActionText = '推奨行動: 「撤退」で回復';
        } else if (stats.defense <= 50) {
            if (stats.enemyCount <= 2) {
                recommendedActionText = '推奨行動: 「防御」で回復';
            }
        }
        
        // 艦隊数による調整
        if (stats.fleetCount <= 1) {
            recommendedActionText = '推奨行動: 慎重に「防御」';
        }
        
        // UI更新
        enemyThreat.className = `threat-${threatLevel}`;
        enemyThreat.textContent = threatText;
        recommendedAction.textContent = recommendedActionText;
    }
    
    /**
     * コマンド効果表示
     */
    showCommandEffect(effectText) {
        const lastCommandEffect = document.getElementById('last-command-effect');
        if (lastCommandEffect) {
            lastCommandEffect.textContent = effectText;
            
            // 3秒後にフェードアウト
            setTimeout(() => {
                lastCommandEffect.style.opacity = '0.5';
                setTimeout(() => {
                    if (lastCommandEffect.textContent === effectText) {
                        lastCommandEffect.textContent = '';
                        lastCommandEffect.style.opacity = '1';
                    }
                }, 1000);
            }, 3000);
        }
    }
    
    /**
     * コマンドキュー処理
     */
    handleCommandQueue(queue) {
        console.log('Command queue updated:', queue);
        
        if (queue.length > 1) {
            this.addLogMessage('system', `🎯 連続コマンド: ${queue.join(' → ')}`);
        }
    }
    
    /**
     * ユーザー学習情報処理
     */
    handleUserLearning(learningInfo) {
        console.log('User learning update:', learningInfo);
        
        if (learningInfo.newPattern) {
            this.addLogMessage('system', `📚 学習: "${learningInfo.newPattern}" → "${learningInfo.command}"`);
        }
        
        if (learningInfo.confidence > 0.8) {
            this.addLogMessage('system', `✨ 認識精度向上: ${Math.round(learningInfo.confidence * 100)}%`);
        }
    }
    
    /**
     * 確認要求処理
     */
    handleConfirmationRequest(confirmation) {
        console.log('Confirmation requested:', confirmation);
        
        // 低信頼度コマンドの確認表示
        this.addLogMessage('system', `❓ 確認: "${confirmation.originalText}" → "${confirmation.interpretedCommand}"でよろしいですか？`);
        this.addLogMessage('system', '「はい」「いいえ」で回答、または正しいコマンドを言い直してください');
        
        // 確認効果音
        this.audioManager.playSound('notification', 0.4);
    }
    
    /**
     * エンジン設定イベント設定
     */
    setupEngineSettingsEvents() {
        // エンジン選択ドロップダウン
        const engineSelect = document.getElementById('engine-select');
        if (engineSelect) {
            engineSelect.addEventListener('change', (e) => {
                const selectedEngine = e.target.value;
                this.updateEngineUI(selectedEngine);
            });
        }
        
        // モデル選択ドロップダウン
        const modelSelect = document.getElementById('model-select');
        if (modelSelect) {
            modelSelect.addEventListener('change', (e) => {
                // モデル変更は設定適用時に反映
                console.log('Model selection changed:', e.target.value);
            });
        }
        
        // 設定適用ボタン
        const applyEngineBtn = document.getElementById('apply-engine-btn');
        if (applyEngineBtn) {
            applyEngineBtn.addEventListener('click', async () => {
                await this.applyEngineSettings();
            });
        }
        
        // 初期UI更新
        if (this.voiceRecognition) {
            if (this.voiceRecognition.getCurrentEngineType) {
                const currentEngineType = this.voiceRecognition.getCurrentEngineType();
                if (currentEngineType) {
                    this.updateEngineUI(currentEngineType);
                    this.updateEngineStatus();
                }
            } else {
                // 既存システムの場合はWeb Speech APIと表示
                this.updateEngineUI('webspeech');
                this.updateEngineStatus();
            }
        }
    }
    
    /**
     * エンジンUI更新
     */
    updateEngineUI(engineType) {
        const whisperSettings = document.getElementById('whisper-settings');
        const engineSelect = document.getElementById('engine-select');
        
        if (engineSelect) {
            engineSelect.value = engineType;
        }
        
        if (whisperSettings) {
            if (engineType === 'whisper') {
                whisperSettings.classList.remove('hidden');
            } else {
                whisperSettings.classList.add('hidden');
            }
        }
    }
    
    /**
     * エンジン設定適用
     */
    async applyEngineSettings() {
        const engineSelect = document.getElementById('engine-select');
        const modelSelect = document.getElementById('model-select');
        const applyBtn = document.getElementById('apply-engine-btn');
        
        if (!engineSelect || !this.voiceRecognition) return;
        
        const selectedEngine = engineSelect.value;
        const selectedModel = modelSelect ? modelSelect.value : 'base';
        
        try {
            // ボタン無効化
            if (applyBtn) {
                applyBtn.disabled = true;
                applyBtn.textContent = '適用中...';
            }
            
            this.addLogMessage('system', `🔄 音声認識エンジンを${selectedEngine}に切り替え中...`);
            
            // Whisperテスト時の詳細情報表示
            if (selectedEngine === 'whisper') {
                this.addLogMessage('system', '📡 Whisper WASMエンジンをテスト中（モック実装）');
                this.addLogMessage('system', '🎙️ より長めに話すと認識成功率が向上します');
            }
            
            // 音声認識停止
            if (this.isGameRunning) {
                this.voiceRecognition.stop();
            }
            
            // エンジン切り替え（対応している場合のみ）
            if (this.voiceRecognition.switchEngine) {
                await this.voiceRecognition.switchEngine(selectedEngine);
            } else {
                console.warn('Engine switching not supported in current system');
                this.addLogMessage('system', '⚠️ エンジン切り替えは現在のシステムではサポートされていません');
                return;
            }
            
            // Whisperの場合、モデル設定を適用
            if (selectedEngine === 'whisper' && this.voiceRecognition.currentEngine) {
                if (this.voiceRecognition.currentEngine.switchModel) {
                    this.showModelDownloadProgress();
                    
                    const success = await this.voiceRecognition.currentEngine.switchModel(selectedModel);
                    
                    this.hideModelDownloadProgress();
                    
                    if (!success) {
                        throw new Error('モデルの切り替えに失敗しました');
                    }
                }
            }
            
            // 確認システム再初期化
            if (this.voiceRecognition.initConfirmationSystem) {
                this.voiceRecognition.initConfirmationSystem(this.audioManager);
            }
            
            // 音声認識再開
            if (this.isGameRunning) {
                this.voiceRecognition.start();
            }
            
            this.addLogMessage('system', `✅ エンジンを${selectedEngine}に切り替えました`);
            this.updateEngineStatus();
            
        } catch (error) {
            console.error('Engine switch failed:', error);
            this.addLogMessage('alert', `❌ エンジン切り替えに失敗: ${error.message}`);
        } finally {
            // ボタン復帰
            if (applyBtn) {
                applyBtn.disabled = false;
                applyBtn.textContent = '設定適用';
            }
        }
    }
    
    /**
     * エンジン状態更新
     */
    updateEngineStatus() {
        const currentEngineElement = document.getElementById('current-engine');
        const initStatusElement = document.getElementById('engine-init-status');
        
        if (!this.voiceRecognition) return;
        
        try {
            if (this.voiceRecognition.getStatus && this.voiceRecognition.getAvailableEngines) {
                // 新しい統合システムの場合
                const status = this.voiceRecognition.getStatus();
                const engines = this.voiceRecognition.getAvailableEngines();
                
                if (currentEngineElement) {
                    const currentEngine = engines.find(e => e.isCurrent);
                    currentEngineElement.textContent = currentEngine ? currentEngine.name : 'Web Speech API';
                }
                
                if (initStatusElement) {
                    const initStatus = status.engineStatus?.isInitialized ? '初期化済み' : '未初期化';
                    initStatusElement.textContent = initStatus;
                    initStatusElement.style.color = status.engineStatus?.isInitialized ? '#00ff00' : '#ffaa00';
                }
            } else {
                // 既存システムの場合
                if (currentEngineElement) {
                    currentEngineElement.textContent = 'Web Speech API';
                }
                
                if (initStatusElement) {
                    const initStatus = this.voiceRecognition.isSupported ? '初期化済み' : '未初期化';
                    initStatusElement.textContent = initStatus;
                    initStatusElement.style.color = this.voiceRecognition.isSupported ? '#00ff00' : '#ffaa00';
                }
            }
        } catch (error) {
            console.warn('Error updating engine status:', error);
            
            // フォールバック表示
            if (currentEngineElement) {
                currentEngineElement.textContent = 'Web Speech API (基本)';
            }
            if (initStatusElement) {
                initStatusElement.textContent = '動作中';
                initStatusElement.style.color = '#00ff00';
            }
        }
    }
    
    /**
     * モデルダウンロード進捗表示
     */
    showModelDownloadProgress() {
        const progressDiv = document.getElementById('model-download-progress');
        const progressFill = document.getElementById('download-progress-fill');
        const progressStatus = document.getElementById('download-status');
        
        if (progressDiv) {
            progressDiv.classList.remove('hidden');
        }
        
        if (progressFill) {
            progressFill.style.width = '0%';
        }
        
        if (progressStatus) {
            progressStatus.textContent = '0%';
        }
        
        // プログレス更新の監視（簡略実装）
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress >= 100) {
                progress = 100;
                clearInterval(progressInterval);
            }
            
            if (progressFill) {
                progressFill.style.width = progress + '%';
            }
            if (progressStatus) {
                progressStatus.textContent = Math.round(progress) + '%';
            }
        }, 200);
        
        this.modelProgressInterval = progressInterval;
    }
    
    /**
     * モデルダウンロード進捗非表示
     */
    hideModelDownloadProgress() {
        const progressDiv = document.getElementById('model-download-progress');
        
        if (progressDiv) {
            progressDiv.classList.add('hidden');
        }
        
        if (this.modelProgressInterval) {
            clearInterval(this.modelProgressInterval);
            this.modelProgressInterval = null;
        }
    }
    
    /**
     * クリーンアップ
     */
    cleanup() {
        if (this.voiceRecognition) {
            this.voiceRecognition.cleanup();
        }
        
        if (this.gameEngine) {
            this.gameEngine.clearAllTimers();
        }
        
        if (this.audioManager) {
            this.audioManager.stopSpeaking();
        }
        
        if (this.modelProgressInterval) {
            clearInterval(this.modelProgressInterval);
        }
        
        this.isGameRunning = false;
        
        console.log('Cleanup completed');
    }
}

// ページ読み込み完了後にアプリケーション開始
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded');
    
    try {
        // アプリケーション作成と初期化
        const app = new VoiceCommanderApp();
        await app.init();
        
        // グローバル参照（デバッグ用）
        window.voiceCommanderApp = app;
        
        console.log('Voice Commander loaded successfully');
        
    } catch (error) {
        console.error('Failed to load Voice Commander:', error);
        
        // フォールバック UI 表示
        document.body.innerHTML = `
            <div style="text-align: center; color: #ff4444; padding: 50px;">
                <h1>🚫 読み込みエラー</h1>
                <p>Voice Commander の初期化に失敗しました。</p>
                <p>ブラウザをリロードしてください。</p>
                <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 20px;">
                    🔄 リロード
                </button>
            </div>
        `;
    }
});