/**
 * Voice Commander - 高度音声認識システム
 * 連続コマンド、自然言語処理、学習機能
 */

class AdvancedVoiceRecognition extends VoiceRecognition {
    constructor() {
        super();
        
        // 連続コマンド処理
        this.commandQueue = [];
        this.processingQueue = false;
        this.queueProcessingDelay = 1000; // 1秒間隔
        
        // 自然言語処理
        this.naturalLanguagePatterns = new Map();
        this.contextHistory = [];
        this.maxContextHistory = 10;
        
        // ユーザー学習
        this.userPatterns = new Map();
        this.learnedCommands = new Map();
        
        // 確認システム（統合）
        this.confirmationSystem = null;
        
        this.initAdvancedFeatures();
    }
    
    /**
     * 高度機能初期化
     */
    initAdvancedFeatures() {
        this.initNaturalLanguagePatterns();
        this.loadUserLearning();
        console.log('Advanced voice recognition features initialized');
    }
    
    /**
     * 確認システム初期化（AudioManagerが利用可能になってから呼ばれる）
     */
    initConfirmationSystem(audioManager) {
        if (window.ConfirmationSystem && audioManager) {
            this.confirmationSystem = new ConfirmationSystem(this, audioManager);
            console.log('Confirmation system initialized');
        } else {
            console.warn('ConfirmationSystem or AudioManager not available');
        }
    }
    
    /**
     * 自然言語パターン初期化
     */
    initNaturalLanguagePatterns() {
        // 攻撃系の表現
        this.naturalLanguagePatterns.set('attack', [
            /敵.*やっつけ/,
            /敵.*倒/,
            /敵.*撃破/,
            /攻撃.*して/,
            /やっつけて/,
            /倒して/,
            /撃って/,
            /戦って/,
            /敵.*消して/,
            /敵.*排除/,
            /敵が.*うざい/,
            /敵.*なんとか/
        ]);
        
        // 防御系の表現
        this.naturalLanguagePatterns.set('defend', [
            /守って/,
            /防いで/,
            /シールド/,
            /バリア/,
            /防衛.*強化/,
            /回復.*して/,
            /治して/,
            /直して/,
            /立て直/,
            /持ちこたえ/,
            /耐え/
        ]);
        
        // 撤退系の表現
        this.naturalLanguagePatterns.set('retreat', [
            /逃げ/,
            /退避/,
            /下がって/,
            /引いて/,
            /避難/,
            /撤退.*して/,
            /危険.*だから/,
            /やばい/,
            /まずい/,
            /無理/,
            /厳しい/
        ]);
        
        // 状況確認系の表現
        this.naturalLanguagePatterns.set('status', [
            /どうなって/,
            /状況.*教えて/,
            /今.*どう/,
            /何が.*起きて/,
            /現在.*状況/,
            /レポート/,
            /報告.*して/,
            /確認/,
            /チェック/
        ]);
        
        // 連続コマンドパターン
        this.naturalLanguagePatterns.set('combo_attack_defend', [
            /攻撃.*防御/,
            /攻撃.*守/,
            /やっつけ.*守/,
            /撃破.*防御/
        ]);
        
        this.naturalLanguagePatterns.set('combo_defend_attack', [
            /防御.*攻撃/,
            /守.*攻撃/,
            /回復.*攻撃/,
            /立て直.*攻撃/
        ]);
    }
    
    /**
     * 音声認識結果の高度処理
     */
    processRecognitionResult(transcript, confidence) {
        console.log(`Advanced processing: "${transcript}" (confidence: ${confidence})`);
        
        // コンテキスト履歴に追加
        this.addToContext(transcript);
        
        // 確認システムがある場合の応答チェック
        if (this.confirmationSystem && this.confirmationSystem.getStatus().hasPendingConfirmation) {
            if (this.confirmationSystem.handleConfirmationResponse(transcript)) {
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
            if (this.confirmationSystem && this.confirmationSystem.shouldConfirm(primaryCommand, transcript, confidence)) {
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
     * 高度コマンド解析
     */
    parseAdvancedCommand(transcript) {
        const commands = [];
        const lowerTranscript = transcript.toLowerCase();
        
        // 学習済みパターンチェック
        const learnedCommand = this.checkLearnedPatterns(transcript);
        if (learnedCommand) {
            commands.push(learnedCommand);
            return commands;
        }
        
        // 連続コマンドパターンチェック
        for (const [combo, patterns] of this.naturalLanguagePatterns.entries()) {
            if (combo.startsWith('combo_')) {
                for (const pattern of patterns) {
                    if (pattern.test(lowerTranscript)) {
                        const commandPair = combo.replace('combo_', '').split('_');
                        commands.push(...commandPair);
                        return commands;
                    }
                }
            }
        }
        
        // 通常のコマンドマッピング
        for (const [keyword, command] of Object.entries(this.commandMap)) {
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
        
        for (const [command, patterns] of this.naturalLanguagePatterns.entries()) {
            if (command.startsWith('combo_')) continue;
            
            for (const pattern of patterns) {
                if (pattern.test(lowerTranscript)) {
                    console.log(`Natural language match: ${transcript} -> ${command}`);
                    return command;
                }
            }
        }
        
        return null;
    }
    
    /**
     * 連続コマンドキューイング
     */
    queueCommands(commands, originalText) {
        console.log(`Queueing commands: ${commands.join(' -> ')}`);
        
        // キューに追加
        for (const command of commands) {
            this.commandQueue.push({
                command: command,
                originalText: originalText,
                timestamp: Date.now()
            });
        }
        
        // キュー処理開始
        if (!this.processingQueue) {
            this.processCommandQueue();
        }
        
        // UI通知
        if (this.onCommand) {
            this.onCommand('queue', `連続コマンド：${commands.join(' → ')}`);
        }
    }
    
    /**
     * コマンドキュー処理
     */
    async processCommandQueue() {
        if (this.processingQueue) return;
        
        this.processingQueue = true;
        
        while (this.commandQueue.length > 0) {
            const commandInfo = this.commandQueue.shift();
            
            console.log(`Processing queued command: ${commandInfo.command}`);
            
            // コマンド実行
            this.executeCommand(commandInfo.command, commandInfo.originalText);
            
            // 次のコマンドまで待機
            if (this.commandQueue.length > 0) {
                await this.wait(this.queueProcessingDelay);
            }
        }
        
        this.processingQueue = false;
        console.log('Command queue processing completed');
    }
    
    /**
     * 確認システムを使った確認要求
     */
    requestConfirmationWithSystem(command, transcript, confidence, allCommands) {
        if (!this.confirmationSystem) {
            // 確認システムがない場合は直接実行
            this.executeCommand(command, transcript);
            return;
        }
        
        this.confirmationSystem.requestConfirmation(
            command,
            transcript,
            confidence,
            // 確認完了時のコールバック
            (confirmedCommand, confirmedText) => {
                if (allCommands.length === 1) {
                    this.executeCommand(confirmedCommand, confirmedText);
                } else {
                    // 連続コマンドの場合は最初のコマンドを置き換え
                    const updatedCommands = [confirmedCommand, ...allCommands.slice(1)];
                    this.queueCommands(updatedCommands, confirmedText);
                }
                
                // 確認完了の学習
                this.learnSuccessfulPattern(confirmedText, [confirmedCommand]);
            },
            // 確認拒否時のコールバック
            (originalText, reason) => {
                console.log('Command confirmation rejected:', reason);
                
                // 拒否された場合のコールバック通知
                if (this.onConfirmationRequest) {
                    this.onConfirmationRequest({
                        type: 'rejected',
                        originalText: originalText,
                        reason: reason
                    });
                }
            }
        );
    }
    
    /**
     * コンテキスト履歴追加
     */
    addToContext(transcript) {
        this.contextHistory.unshift({
            text: transcript,
            timestamp: Date.now()
        });
        
        // 履歴サイズ制限
        if (this.contextHistory.length > this.maxContextHistory) {
            this.contextHistory = this.contextHistory.slice(0, this.maxContextHistory);
        }
    }
    
    /**
     * 学習済みパターンチェック
     */
    checkLearnedPatterns(transcript) {
        for (const [pattern, command] of this.learnedCommands.entries()) {
            if (transcript.toLowerCase().includes(pattern.toLowerCase())) {
                console.log(`Using learned pattern: ${pattern} -> ${command}`);
                return command;
            }
        }
        return null;
    }
    
    /**
     * 成功パターン学習
     */
    learnSuccessfulPattern(transcript, commands) {
        // ユーザー固有の表現を学習
        const key = transcript.toLowerCase().trim();
        const command = commands[0]; // 最初のコマンドを主コマンドとして記録
        
        if (!this.userPatterns.has(command)) {
            this.userPatterns.set(command, new Set());
        }
        
        this.userPatterns.get(command).add(key);
        
        // よく使われる表現を学習コマンドに昇格
        if (this.userPatterns.get(command).size >= 3) {
            this.learnedCommands.set(key, command);
            this.saveUserLearning();
        }
        
        console.log(`Learning pattern: "${transcript}" -> ${command}`);
    }
    
    /**
     * 認識失敗時の処理
     */
    handleUnrecognizedInput(transcript) {
        console.log(`Unrecognized input: "${transcript}"`);
        
        // 類似パターンの提案
        const suggestions = this.findSimilarPatterns(transcript);
        
        if (suggestions.length > 0) {
            const message = `もしかして：${suggestions.join('、')}`;
            if (this.onCommand) {
                this.onCommand('suggestion', message);
            }
        } else {
            if (this.onCommand) {
                this.onCommand('help', '利用可能なコマンド：攻撃、防御、撤退、状況');
            }
        }
    }
    
    /**
     * 類似パターン検索
     */
    findSimilarPatterns(transcript) {
        const suggestions = [];
        const lowerTranscript = transcript.toLowerCase();
        
        // 基本コマンドとの類似度チェック
        const basicCommands = ['攻撃', '防御', '撤退', '状況'];
        for (const cmd of basicCommands) {
            if (this.calculateSimilarity(lowerTranscript, cmd.toLowerCase()) > 0.3) {
                suggestions.push(cmd);
            }
        }
        
        return suggestions.slice(0, 3); // 最大3つまで
    }
    
    /**
     * 文字列類似度計算（簡易版）
     */
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const commonChars = this.countCommonCharacters(longer, shorter);
        return commonChars / longer.length;
    }
    
    /**
     * 共通文字数カウント
     */
    countCommonCharacters(str1, str2) {
        let count = 0;
        const chars2 = str2.split('');
        
        for (const char of str1) {
            const index = chars2.indexOf(char);
            if (index !== -1) {
                chars2.splice(index, 1);
                count++;
            }
        }
        
        return count;
    }
    
    /**
     * ユーザー学習データ保存
     */
    saveUserLearning() {
        try {
            const learningData = {
                userPatterns: Array.from(this.userPatterns.entries()).map(([cmd, patterns]) => [
                    cmd, Array.from(patterns)
                ]),
                learnedCommands: Array.from(this.learnedCommands.entries()),
                timestamp: Date.now()
            };
            
            localStorage.setItem('voiceCommanderLearning', JSON.stringify(learningData));
            console.log('User learning data saved');
        } catch (error) {
            console.error('Failed to save learning data:', error);
        }
    }
    
    /**
     * ユーザー学習データ読み込み
     */
    loadUserLearning() {
        try {
            const data = localStorage.getItem('voiceCommanderLearning');
            if (data) {
                const learningData = JSON.parse(data);
                
                // userPatternsの復元
                this.userPatterns = new Map(
                    learningData.userPatterns.map(([cmd, patterns]) => [
                        cmd, new Set(patterns)
                    ])
                );
                
                // learnedCommandsの復元
                this.learnedCommands = new Map(learningData.learnedCommands);
                
                console.log('User learning data loaded:', {
                    patterns: this.userPatterns.size,
                    learned: this.learnedCommands.size
                });
            }
        } catch (error) {
            console.error('Failed to load learning data:', error);
        }
    }
    
    /**
     * コマンド実行（親クラスのメソッドを拡張）
     */
    executeCommand(command, originalText) {
        if (this.onCommand) {
            this.onCommand(command, originalText);
        }
    }
    
    /**
     * 待機ユーティリティ
     */
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 高度機能の状態取得
     */
    getAdvancedStatus() {
        return {
            queueLength: this.commandQueue.length,
            processingQueue: this.processingQueue,
            pendingConfirmation: this.confirmationSystem ? 
                this.confirmationSystem.getStatus().hasPendingConfirmation : false,
            learnedPatterns: this.learnedCommands.size,
            contextHistoryLength: this.contextHistory.length,
            confirmationSystemActive: !!this.confirmationSystem
        };
    }
    
    /**
     * 学習パターン追加（外部から呼び出し可能）
     */
    addLearningPattern(originalText, command, confidence = 1.0) {
        this.learnSuccessfulPattern(originalText, [command]);
        
        // コールバック通知
        if (this.onUserLearning) {
            this.onUserLearning({
                newPattern: originalText,
                command: command,
                confidence: confidence
            });
        }
    }
    
    /**
     * 修正パターン追加（確認システム用）
     */
    addCorrectionPattern(originalText, wrongCommand, correctedText, correctCommand) {
        // 間違ったパターンを学習から除外
        for (const [cmd, patterns] of this.userPatterns.entries()) {
            patterns.delete(originalText.toLowerCase().trim());
        }
        
        // 正しいパターンを学習
        this.addLearningPattern(correctedText, correctCommand);
        
        console.log(`Correction learned: "${originalText}" (${wrongCommand}) -> "${correctedText}" (${correctCommand})`);
    }
    
    /**
     * 学習データリセット
     */
    resetLearning() {
        this.userPatterns.clear();
        this.learnedCommands.clear();
        this.contextHistory = [];
        localStorage.removeItem('voiceCommanderLearning');
        console.log('Learning data reset');
    }
}