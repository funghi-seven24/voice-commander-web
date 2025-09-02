/**
 * 発話後確認システム
 * 低信頼度の認識結果に対する確認機能を提供
 */

class ConfirmationSystem {
    constructor(voiceRecognition, audioManager) {
        this.voiceRecognition = voiceRecognition;
        this.audioManager = audioManager;
        
        // 確認状態管理
        this.pendingConfirmation = null;
        this.confirmationTimeout = null;
        
        // 確認フレーズ
        this.confirmationPhrases = {
            yes: /^(はい|そうです|正解|オーケー|OK|うん|そう|その通り)/i,
            no: /^(いいえ|違います|ちがう|だめ|ノー|NO|違う)/i,
            retry: /^(もう一度|やり直し|リトライ|再度)/i
        };
        
        // 信頼度閾値
        this.confidenceThreshold = 0.6;
        
        console.log('ConfirmationSystem initialized');
    }
    
    /**
     * コマンドの確認が必要かチェック
     */
    shouldConfirm(command, originalText, confidence) {
        // 基本的な確認条件
        if (confidence < this.confidenceThreshold) {
            return true;
        }
        
        // 重要なコマンドは信頼度が高くても確認
        const criticalCommands = ['撤退', 'retreat'];
        if (criticalCommands.some(cmd => command.toLowerCase().includes(cmd.toLowerCase()))) {
            return confidence < 0.8;
        }
        
        // 複雑な自然言語は確認
        if (originalText.split(' ').length > 3 && confidence < 0.75) {
            return true;
        }
        
        return false;
    }
    
    /**
     * 確認要求を開始
     */
    requestConfirmation(command, originalText, confidence, onConfirmed, onRejected) {
        // 既存の確認をクリア
        this.clearPendingConfirmation();
        
        this.pendingConfirmation = {
            command: command,
            originalText: originalText,
            confidence: confidence,
            onConfirmed: onConfirmed,
            onRejected: onRejected,
            timestamp: Date.now()
        };
        
        // 確認UI表示
        this.showConfirmationUI();
        
        // 音声での確認要求
        this.speakConfirmationRequest();
        
        // タイムアウト設定（10秒）
        this.confirmationTimeout = setTimeout(() => {
            this.handleConfirmationTimeout();
        }, 10000);
        
        console.log('Confirmation requested:', this.pendingConfirmation);
        
        return true;
    }
    
    /**
     * 確認応答を処理
     */
    handleConfirmationResponse(responseText) {
        if (!this.pendingConfirmation) {
            return false;
        }
        
        const response = responseText.toLowerCase();
        
        // 「はい」系の応答
        if (this.confirmationPhrases.yes.test(response)) {
            this.confirmCommand();
            return true;
        }
        
        // 「いいえ」系の応答
        if (this.confirmationPhrases.no.test(response)) {
            this.rejectCommand();
            return true;
        }
        
        // やり直し要求
        if (this.confirmationPhrases.retry.test(response)) {
            this.retryCommand();
            return true;
        }
        
        // 新しいコマンドとして解釈
        const newCommand = this.voiceRecognition.parseCommand(response);
        if (newCommand && newCommand !== 'unknown') {
            this.replaceCommand(newCommand, responseText);
            return true;
        }
        
        // 理解できない応答
        this.handleUnknownResponse(responseText);
        return false;
    }
    
    /**
     * コマンド確定
     */
    confirmCommand() {
        if (!this.pendingConfirmation) return;
        
        console.log('Command confirmed:', this.pendingConfirmation.command);
        
        // UIクリア
        this.hideConfirmationUI();
        
        // コールバック実行
        if (this.pendingConfirmation.onConfirmed) {
            this.pendingConfirmation.onConfirmed(
                this.pendingConfirmation.command,
                this.pendingConfirmation.originalText
            );
        }
        
        // 確認完了音
        this.audioManager.playSound('notification', 0.5);
        
        // 学習データとして記録
        this.voiceRecognition.addLearningPattern(
            this.pendingConfirmation.originalText,
            this.pendingConfirmation.command,
            1.0 // 確認済みなので信頼度最大
        );
        
        this.clearPendingConfirmation();
    }
    
    /**
     * コマンド拒否
     */
    rejectCommand() {
        if (!this.pendingConfirmation) return;
        
        console.log('Command rejected:', this.pendingConfirmation.command);
        
        // UIクリア
        this.hideConfirmationUI();
        
        // コールバック実行
        if (this.pendingConfirmation.onRejected) {
            this.pendingConfirmation.onRejected(
                this.pendingConfirmation.originalText,
                '認識が間違っていました'
            );
        }
        
        // 拒否音
        this.audioManager.playSound('error', 0.3);
        
        this.clearPendingConfirmation();
    }
    
    /**
     * コマンド置き換え
     */
    replaceCommand(newCommand, newText) {
        if (!this.pendingConfirmation) return;
        
        console.log('Command replaced:', this.pendingConfirmation.command, '→', newCommand);
        
        // UIクリア
        this.hideConfirmationUI();
        
        // 新しいコマンドで実行
        if (this.pendingConfirmation.onConfirmed) {
            this.pendingConfirmation.onConfirmed(newCommand, newText);
        }
        
        // 学習データとして記録（誤認識の修正）
        this.voiceRecognition.addCorrectionPattern(
            this.pendingConfirmation.originalText,
            this.pendingConfirmation.command,
            newText,
            newCommand
        );
        
        // 修正完了音
        this.audioManager.playSound('success', 0.4);
        
        this.clearPendingConfirmation();
    }
    
    /**
     * やり直し要求
     */
    retryCommand() {
        if (!this.pendingConfirmation) return;
        
        console.log('Command retry requested');
        
        // UIクリア
        this.hideConfirmationUI();
        
        // やり直し要求のフィードバック
        this.audioManager.speakAsSystem('もう一度お聞かせください');
        
        this.clearPendingConfirmation();
    }
    
    /**
     * 不明な応答処理
     */
    handleUnknownResponse(responseText) {
        console.log('Unknown confirmation response:', responseText);
        
        // 確認を継続（もう一度聞く）
        this.audioManager.speakAsSystem('「はい」「いいえ」でお答えいただくか、正しいコマンドをお聞かせください');
        this.audioManager.playSound('notification', 0.3);
        
        // タイムアウトをリセット
        if (this.confirmationTimeout) {
            clearTimeout(this.confirmationTimeout);
            this.confirmationTimeout = setTimeout(() => {
                this.handleConfirmationTimeout();
            }, 10000);
        }
    }
    
    /**
     * 確認タイムアウト処理
     */
    handleConfirmationTimeout() {
        if (!this.pendingConfirmation) return;
        
        console.log('Confirmation timeout');
        
        // タイムアウト時は拒否として処理
        this.rejectCommand();
        
        this.audioManager.speakAsSystem('確認がタイムアウトしました');
    }
    
    /**
     * 確認UI表示
     */
    showConfirmationUI() {
        // 既存の確認要素を削除
        const existing = document.getElementById('confirmation-overlay');
        if (existing) {
            existing.remove();
        }
        
        // 確認オーバーレイ作成
        const overlay = document.createElement('div');
        overlay.id = 'confirmation-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        // 確認ダイアログ作成
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: linear-gradient(135deg, #001122, #003366);
            border: 2px solid #00ffff;
            border-radius: 10px;
            padding: 30px;
            text-align: center;
            color: #ffffff;
            max-width: 500px;
            box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
        `;
        
        dialog.innerHTML = `
            <div style="font-size: 1.5rem; margin-bottom: 20px; color: #00ffff;">
                🤖 音声認識確認
            </div>
            <div style="margin-bottom: 15px;">
                「${this.pendingConfirmation.originalText}」
            </div>
            <div style="margin-bottom: 15px; color: #ffff00;">
                ↓
            </div>
            <div style="margin-bottom: 20px; font-size: 1.2rem; color: #00ff00;">
                「${this.pendingConfirmation.command}」
            </div>
            <div style="margin-bottom: 20px; color: #cccccc;">
                この解釈で正しいですか？
            </div>
            <div style="color: #ffaa00;">
                「はい」「いいえ」で回答、または正しいコマンドを話してください
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // フェードイン効果
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.transition = 'opacity 0.3s ease';
            overlay.style.opacity = '1';
        }, 10);
    }
    
    /**
     * 確認UI非表示
     */
    hideConfirmationUI() {
        const overlay = document.getElementById('confirmation-overlay');
        if (overlay) {
            overlay.style.transition = 'opacity 0.3s ease';
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
            }, 300);
        }
    }
    
    /**
     * 音声での確認要求
     */
    speakConfirmationRequest() {
        if (!this.pendingConfirmation) return;
        
        const text = `${this.pendingConfirmation.command}、でよろしいですか？`;
        
        setTimeout(() => {
            this.audioManager.speakAsSystem(text);
        }, 500);
    }
    
    /**
     * 保留中の確認をクリア
     */
    clearPendingConfirmation() {
        if (this.confirmationTimeout) {
            clearTimeout(this.confirmationTimeout);
            this.confirmationTimeout = null;
        }
        
        this.pendingConfirmation = null;
        this.hideConfirmationUI();
    }
    
    /**
     * 確認システムの状態取得
     */
    getStatus() {
        return {
            hasPendingConfirmation: !!this.pendingConfirmation,
            pendingCommand: this.pendingConfirmation?.command,
            pendingText: this.pendingConfirmation?.originalText,
            confidence: this.pendingConfirmation?.confidence
        };
    }
    
    /**
     * 信頼度閾値設定
     */
    setConfidenceThreshold(threshold) {
        this.confidenceThreshold = Math.max(0.1, Math.min(0.9, threshold));
        console.log('Confidence threshold set to:', this.confidenceThreshold);
    }
}

// グローバル参照用
window.ConfirmationSystem = ConfirmationSystem;