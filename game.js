/**
 * Voice Commander - ゲームロジック
 * メインのゲーム進行とロジック管理
 */

class GameEngine {
    constructor() {
        // ゲーム状態
        this.gameState = 'menu'; // menu, playing, paused, gameover
        this.gameStartTime = null;
        this.gameEndTime = null;
        
        // プレイヤー状態
        this.defense = 100;
        this.maxDefense = 100;
        this.fleetCount = 3;
        this.maxFleetCount = 3;
        this.killCount = 0;
        this.totalKills = 0;
        
        // 敵・ウェーブ管理
        this.currentWave = 1;
        this.enemyCount = 0;
        this.maxEnemyCount = 3;
        this.enemySpawnRate = 3000; // 3秒間隔
        this.waveInProgress = false;
        
        // タイマー管理
        this.enemySpawnTimer = null;
        this.gameUpdateTimer = null;
        this.waveTimer = null;
        
        // ゲーム設定
        this.difficulty = 1.0;
        this.autoDefenseEnabled = true;
        
        // スコア・統計
        this.score = 0;
        this.commandCount = 0;
        this.successfulCommands = 0;
        this.lastCommandTime = null;
        this.comboCount = 0;
        this.maxCombo = 0;
        
        // イベントコールバック
        this.onStateChange = null;
        this.onStatsUpdate = null;
        this.onMessage = null;
        this.onGameOver = null;
        
        // その他
        this.messages = [];
        this.lastAutoDefenseTime = 0;
        
        console.log('GameEngine initialized');
    }
    
    /**
     * ゲーム開始
     */
    startGame() {
        console.log('Game starting...');
        
        // 状態リセット
        this.resetGameState();
        
        // ゲーム状態変更
        this.gameState = 'playing';
        this.gameStartTime = Date.now();
        
        // タイマー開始
        this.startGameLoop();
        
        // 最初のウェーブ開始
        setTimeout(() => {
            this.startWave();
        }, 2000);
        
        // イベント通知
        this.notifyStateChange();
        this.addMessage('system', '防衛戦開始！地球を守り抜け！');
        
        console.log('Game started');
    }
    
    /**
     * ゲーム状態リセット
     */
    resetGameState() {
        this.defense = this.maxDefense;
        this.fleetCount = this.maxFleetCount;
        this.killCount = 0;
        this.currentWave = 1;
        this.enemyCount = 0;
        this.score = 0;
        this.commandCount = 0;
        this.successfulCommands = 0;
        this.comboCount = 0;
        this.difficulty = 1.0;
        this.messages = [];
        
        this.clearAllTimers();
    }
    
    /**
     * ゲームループ開始
     */
    startGameLoop() {
        // メイン更新ループ（1秒間隔）
        this.gameUpdateTimer = setInterval(() => {
            this.updateGame();
        }, 1000);
        
        // 自動防御（5秒間隔）
        if (this.autoDefenseEnabled) {
            setInterval(() => {
                this.performAutoDefense();
            }, 5000);
        }
    }
    
    /**
     * ゲーム更新（毎秒実行）
     */
    updateGame() {
        if (this.gameState !== 'playing') return;
        
        // 統計更新
        this.updateStats();
        
        // ゲームオーバー判定
        if (this.defense <= 0) {
            this.gameOver();
            return;
        }
        
        // 難易度調整
        this.adjustDifficulty();
        
        // UI更新通知
        this.notifyStatsUpdate();
    }
    
    /**
     * ウェーブ開始
     */
    startWave() {
        console.log(`Wave ${this.currentWave} starting`);
        
        this.waveInProgress = true;
        this.enemyCount = Math.floor(this.maxEnemyCount * this.difficulty);
        
        // 敵生成開始
        this.startEnemySpawning();
        
        // メッセージ
        this.addMessage('alert', `第${this.currentWave}波 敵${this.enemyCount}体接近中！`);
        
        // 音声アナウンス
        if (window.audioManager) {
            window.audioManager.speakAsAlert(`第${this.currentWave}波、敵${this.enemyCount}体接近中！全艦隊戦闘配置！`);
        }
    }
    
    /**
     * 敵生成開始
     */
    startEnemySpawning() {
        this.enemySpawnTimer = setInterval(() => {
            this.spawnEnemy();
        }, this.enemySpawnRate);
    }
    
    /**
     * 敵生成
     */
    spawnEnemy() {
        if (this.enemyCount <= 0) {
            this.endWave();
            return;
        }
        
        // ランダムな攻撃パターン
        const attackType = Math.random();
        
        if (attackType < 0.3) {
            // 直接攻撃
            this.enemyDirectAttack();
        } else if (attackType < 0.7) {
            // 包囲攻撃
            this.enemySurroundAttack();
        } else {
            // 特殊攻撃
            this.enemySpecialAttack();
        }
    }
    
    /**
     * 敵の直接攻撃
     */
    enemyDirectAttack() {
        const damage = Math.floor(5 * this.difficulty + Math.random() * 5);
        this.defense = Math.max(0, this.defense - damage);
        
        this.addMessage('alert', `敵の直接攻撃！防衛度 -${damage}`);
        
        if (window.audioManager) {
            window.audioManager.playSound('damage_taken');
        }
        
        this.enemyCount--;
    }
    
    /**
     * 敵の包囲攻撃
     */
    enemySurroundAttack() {
        const damage = Math.floor(3 * this.difficulty + Math.random() * 3);
        this.defense = Math.max(0, this.defense - damage);
        
        this.addMessage('alert', `敵が包囲攻撃！防衛度 -${damage}`);
        
        // 2体同時に処理
        this.enemyCount = Math.max(0, this.enemyCount - 2);
    }
    
    /**
     * 敵の特殊攻撃
     */
    enemySpecialAttack() {
        const attackType = Math.random();
        
        if (attackType < 0.5 && this.fleetCount > 1) {
            // 艦隊への攻撃
            this.fleetCount--;
            this.addMessage('alert', '艦隊が被弾！戦力減少');
        } else {
            // 強力な攻撃
            const damage = Math.floor(8 * this.difficulty + Math.random() * 7);
            this.defense = Math.max(0, this.defense - damage);
            this.addMessage('alert', `敵の強力攻撃！防衛度 -${damage}`);
        }
        
        this.enemyCount--;
    }
    
    /**
     * ウェーブ終了
     */
    endWave() {
        console.log(`Wave ${this.currentWave} ended`);
        
        clearInterval(this.enemySpawnTimer);
        this.waveInProgress = false;
        
        // ボーナス計算
        const waveBonus = this.currentWave * 100;
        this.score += waveBonus;
        
        this.addMessage('system', `第${this.currentWave}波撃退成功！ボーナス +${waveBonus}点`);
        
        // 次のウェーブ準備
        this.currentWave++;
        setTimeout(() => {
            if (this.gameState === 'playing') {
                this.startWave();
            }
        }, 5000);
        
        if (window.audioManager) {
            window.audioManager.playSound('victory');
            window.audioManager.speakAsCommander('ウェーブ撃退成功！よくやった！');
        }
    }
    
    /**
     * コマンド処理
     */
    handleCommand(command, originalText) {
        if (this.gameState !== 'playing') {
            return { success: false, reason: 'ゲームが実行中ではありません' };
        }
        
        console.log(`Executing command: ${command}`);
        
        this.commandCount++;
        let result = { success: false, effect: '', reason: '' };
        
        switch (command) {
            case 'attack':
                result = this.performAttack();
                break;
            case 'defend':
                result = this.performDefense();
                break;
            case 'retreat':
                result = this.performRetreat();
                break;
            case 'status':
                result = this.performStatusReport();
                break;
            default:
                this.addMessage('system', `認識できないコマンド: "${originalText}"`);
                return { success: false, reason: `認識できないコマンド: "${originalText}"` };
        }
        
        if (result.success) {
            this.successfulCommands++;
            this.updateCombo();
        }
        
        return result;
    }
    
    /**
     * 攻撃実行
     */
    performAttack() {
        if (this.enemyCount <= 0) {
            this.addMessage('system', '攻撃する敵がいません');
            return { success: false, reason: '攻撃対象なし - 敵の出現を待機してください' };
        }
        
        // 攻撃成功率（艦隊数と難易度による）
        const successRate = Math.min(0.9, 0.5 + (this.fleetCount * 0.15));
        const success = Math.random() < successRate;
        
        if (success) {
            const destroyCount = Math.min(
                Math.floor(1 + Math.random() * 2), 
                this.enemyCount
            );
            
            this.enemyCount = Math.max(0, this.enemyCount - destroyCount);
            this.killCount += destroyCount;
            this.totalKills += destroyCount;
            
            const points = destroyCount * 50 * this.comboCount;
            this.score += points;
            
            this.addMessage('commander', `攻撃成功！敵${destroyCount}体撃破！ +${points}点`);
            
            if (window.audioManager) {
                window.audioManager.playSound('attack_success');
            }
            
            // 反撃リスク
            let counterAttack = '';
            if (Math.random() < 0.3) {
                const damage = Math.floor(3 + Math.random() * 4);
                this.defense = Math.max(0, this.defense - damage);
                this.addMessage('alert', `反撃を受けました！ -${damage}`);
                counterAttack = ` / 反撃 -${damage}`;
            }
            
            return { 
                success: true, 
                effect: `敵${destroyCount}体撃破 +${points}点${counterAttack}` 
            };
        } else {
            this.addMessage('system', '攻撃が外れました');
            return { success: false, reason: '攻撃失敗 - 再試行してください' };
        }
    }
    
    /**
     * 防御実行
     */
    performDefense() {
        const healAmount = Math.floor(5 + Math.random() * 10);
        const oldDefense = this.defense;
        
        this.defense = Math.min(this.maxDefense, this.defense + healAmount);
        const actualHeal = this.defense - oldDefense;
        
        if (actualHeal > 0) {
            this.addMessage('commander', `防御強化！防衛度 +${actualHeal}`);
            
            if (window.audioManager) {
                window.audioManager.playSound('defend_success');
            }
            
            return { 
                success: true, 
                effect: `防衛度 +${actualHeal} (現在${this.defense}%)` 
            };
        } else {
            this.addMessage('system', '防衛度は最大です');
            return { success: false, reason: '防衛度は既に最大 - 攻撃コマンドを使用してください' };
        }
    }
    
    /**
     * 撤退実行
     */
    performRetreat() {
        if (this.fleetCount <= 1) {
            this.addMessage('system', 'これ以上撤退できません');
            return { success: false, reason: '最後の艦隊 - 撤退不可能です' };
        }
        
        this.fleetCount--;
        const healAmount = Math.floor(15 + Math.random() * 10);
        const oldDefense = this.defense;
        
        this.defense = Math.min(this.maxDefense, this.defense + healAmount);
        const actualHeal = this.defense - oldDefense;
        
        this.addMessage('commander', `戦術的撤退！艦隊-1, 防衛度 +${actualHeal}`);
        
        if (window.audioManager) {
            window.audioManager.playSound('retreat');
        }
        
        return { 
            success: true, 
            effect: `艦隊-1, 防衛度 +${actualHeal} (緊急回復成功)` 
        };
    }
    
    /**
     * 状況報告
     */
    performStatusReport() {
        const report = [
            `防衛度: ${this.defense}%`,
            `艦隊: ${this.fleetCount}隻`,
            `敵残数: ${this.enemyCount}体`,
            `第${this.currentWave}波進行中`
        ];
        
        this.addMessage('system', report.join(', '));
        
        if (window.audioManager) {
            const reportText = `現在の状況をお知らせします。防衛度${this.defense}パーセント、艦隊${this.fleetCount}隻、敵残り${this.enemyCount}体、第${this.currentWave}波進行中。`;
            window.audioManager.speakAsCommander(reportText);
        }
        
        return { 
            success: true, 
            effect: `状況報告完了 - ${report.join(' / ')}` 
        };
    }
    
    /**
     * 自動防御
     */
    performAutoDefense() {
        if (this.gameState !== 'playing') return;
        
        // 防衛度が低い時のみ自動防御
        if (this.defense < 50) {
            const healAmount = Math.floor(2 + Math.random() * 3);
            this.defense = Math.min(this.maxDefense, this.defense + healAmount);
            
            if (Math.random() < 0.3) {
                this.addMessage('system', `自動防御システム作動 +${healAmount}`);
            }
        }
    }
    
    /**
     * コンボ更新
     */
    updateCombo() {
        const now = Date.now();
        
        if (this.lastCommandTime && (now - this.lastCommandTime) < 5000) {
            this.comboCount++;
        } else {
            this.comboCount = 1;
        }
        
        this.maxCombo = Math.max(this.maxCombo, this.comboCount);
        this.lastCommandTime = now;
        
        if (this.comboCount > 3) {
            this.addMessage('system', `コンボ x${this.comboCount}！`);
        }
    }
    
    /**
     * 難易度調整
     */
    adjustDifficulty() {
        // 時間経過による難易度上昇
        const gameTime = Date.now() - this.gameStartTime;
        const timeMinutes = gameTime / 60000;
        
        this.difficulty = 1.0 + (timeMinutes * 0.1);
        this.maxEnemyCount = Math.floor(3 + (this.currentWave * 0.5));
        this.enemySpawnRate = Math.max(1000, 3000 - (this.currentWave * 100));
    }
    
    /**
     * 統計更新
     */
    updateStats() {
        // 統計計算
        const accuracy = this.commandCount > 0 ? 
            (this.successfulCommands / this.commandCount * 100).toFixed(1) : 0;
    }
    
    /**
     * ゲームオーバー
     */
    gameOver() {
        console.log('Game Over');
        
        this.gameState = 'gameover';
        this.gameEndTime = Date.now();
        
        this.clearAllTimers();
        
        // 最終スコア計算
        const gameTime = (this.gameEndTime - this.gameStartTime) / 1000;
        const survivalBonus = Math.floor(gameTime * 10);
        this.score += survivalBonus;
        
        this.addMessage('alert', 'ゲームオーバー！地球防衛線突破...');
        this.addMessage('system', `最終スコア: ${this.score}点 (撃破数: ${this.totalKills})`);
        
        if (window.audioManager) {
            window.audioManager.playSound('game_over');
            setTimeout(() => {
                window.audioManager.speakAsSystem(`ゲームオーバー。最終スコア${this.score}点。撃破数${this.totalKills}体。`);
            }, 1000);
        }
        
        // コールバック通知
        if (this.onGameOver) {
            this.onGameOver({
                score: this.score,
                kills: this.totalKills,
                waves: this.currentWave - 1,
                survivalTime: gameTime,
                maxCombo: this.maxCombo
            });
        }
        
        this.notifyStateChange();
    }
    
    /**
     * メッセージ追加
     */
    addMessage(type, text) {
        const message = {
            type: type,
            text: text,
            timestamp: Date.now()
        };
        
        this.messages.unshift(message);
        
        // 最大50件まで保持
        if (this.messages.length > 50) {
            this.messages = this.messages.slice(0, 50);
        }
        
        // コールバック通知
        if (this.onMessage) {
            this.onMessage(message);
        }
        
        console.log(`[${type}] ${text}`);
    }
    
    /**
     * 全タイマークリア
     */
    clearAllTimers() {
        if (this.enemySpawnTimer) {
            clearInterval(this.enemySpawnTimer);
            this.enemySpawnTimer = null;
        }
        if (this.gameUpdateTimer) {
            clearInterval(this.gameUpdateTimer);
            this.gameUpdateTimer = null;
        }
        if (this.waveTimer) {
            clearInterval(this.waveTimer);
            this.waveTimer = null;
        }
    }
    
    /**
     * 状態変更通知
     */
    notifyStateChange() {
        if (this.onStateChange) {
            this.onStateChange(this.gameState);
        }
    }
    
    /**
     * 統計更新通知
     */
    notifyStatsUpdate() {
        if (this.onStatsUpdate) {
            this.onStatsUpdate({
                defense: this.defense,
                fleetCount: this.fleetCount,
                killCount: this.killCount,
                currentWave: this.currentWave,
                enemyCount: this.enemyCount,
                score: this.score,
                comboCount: this.comboCount
            });
        }
    }
    
    /**
     * ゲーム一時停止
     */
    pauseGame() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.clearAllTimers();
            this.addMessage('system', 'ゲーム一時停止');
            this.notifyStateChange();
        }
    }
    
    /**
     * ゲーム再開
     */
    resumeGame() {
        if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.startGameLoop();
            if (this.waveInProgress) {
                this.startEnemySpawning();
            }
            this.addMessage('system', 'ゲーム再開');
            this.notifyStateChange();
        }
    }
    
    /**
     * コールバック設定
     */
    setCallbacks(callbacks) {
        if (callbacks.onStateChange) this.onStateChange = callbacks.onStateChange;
        if (callbacks.onStatsUpdate) this.onStatsUpdate = callbacks.onStatsUpdate;
        if (callbacks.onMessage) this.onMessage = callbacks.onMessage;
        if (callbacks.onGameOver) this.onGameOver = callbacks.onGameOver;
    }
    
    /**
     * 現在のゲーム状態取得
     */
    getGameState() {
        return {
            state: this.gameState,
            defense: this.defense,
            fleetCount: this.fleetCount,
            killCount: this.killCount,
            currentWave: this.currentWave,
            enemyCount: this.enemyCount,
            score: this.score,
            comboCount: this.comboCount,
            messages: this.messages.slice(0, 10) // 最新10件
        };
    }
}