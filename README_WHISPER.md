# Voice Commander - Whisper WebAssembly 統合版

Whisper.cpp WebAssembly版を使用した高精度音声認識システムが統合されたVoice Commanderゲームです。

## 🆕 新機能

### ハイブリッド音声認識システム
- **Web Speech API**: 軽量・高速（デフォルト）
- **Whisper WebAssembly**: オフライン・高精度

### 高度な音声機能
- 連続コマンド対応（「攻撃してから防御」）
- 自然言語処理（「敵をやっつけて」→「攻撃」）
- ユーザー学習機能（個人の発話パターンを学習）
- 発話後確認システム（信頼度が低い認識を確認）

## 🎮 使用方法

### 1. 基本起動
```bash
# ローカルサーバー起動（推奨）
start-server.bat
```
または
```powershell
./server.ps1
```

ブラウザで `http://localhost:8000` にアクセス

### 2. エンジン設定
1. 「音声認識エンジン設定」でエンジンを選択
2. Whisperの場合、モデルサイズを選択
3. 「設定適用」をクリック

### 3. ゲーム開始
1. 「マイクテスト」でマイクの動作確認
2. 「防衛戦開始」でゲーム開始
3. 音声コマンドで艦隊を指揮

## 🎙️ 音声コマンド

### 基本コマンド
- **「攻撃」**: 敵1-2体撃破（反撃リスクあり）
- **「防御」**: 防衛度+5-15（安全）
- **「撤退」**: 艦隊-1、防衛度大回復
- **「状況」**: 現在の戦況報告

### 自然言語コマンド
- 「敵をやっつけて」→ 攻撃
- 「危険だから逃げて」→ 撤退
- 「シールド張って」→ 防御
- 「今どうなってる？」→ 状況

### 連続コマンド
- 「攻撃してから防御」→ 攻撃 → 防御
- 「攻撃２回」→ 攻撃 × 2
- 「状況確認して攻撃」→ 状況 → 攻撃

## 🔧 技術仕様

### システム構成
```
UnifiedVoiceRecognition
├── WebSpeechEngine (Web Speech API)
└── WhisperWASMEngine (Whisper WebAssembly)
    ├── AudioProcessor (音声キャプチャ・VAD)
    ├── ModelManager (モデル管理・キャッシュ)
    └── WhisperModule (WebAssembly実行)
```

### Whisperモデル
| モデル | サイズ | 精度 | 速度 |
|--------|--------|------|------|
| Tiny   | 39MB   | 低   | 最高速 |
| Base   | 142MB  | 中   | 高速 |
| Small  | 244MB  | 高   | 中速 |
| Medium | 769MB  | 最高 | 低速 |

### 音声処理機能
- **VAD (Voice Activity Detection)**: 音声区間の自動検出
- **リサンプリング**: Whisper用16kHzに自動変換
- **ノイズ除去**: エコーキャンセル・ノイズサプレッション
- **バッファ管理**: 効率的な音声データ管理

## 📁 ファイル構成

### 新規ファイル
```
voice-recognition-engine.js     # 音声認識エンジン基底クラス
webspeech-engine.js            # Web Speech API エンジン
whisper-wasm-engine.js         # Whisper WebAssembly エンジン
audio-processor.js             # 音声処理・VAD
model-manager.js               # Whisperモデル管理
confirmation-system.js         # 発話後確認システム
voice-recognition-unified.js   # 統合音声認識システム
```

### 既存ファイル（統合済み）
```
main.js                        # メインアプリ（Whisper対応）
index.html                     # UI（エンジン設定追加）
style.css                      # スタイル（設定UI追加）
advanced-voice.js              # 高度機能（確認システム統合）
```

## ⚡ 性能特性

### Web Speech API
- **初期化**: 瞬時
- **認識レスポンス**: 100-300ms
- **メモリ使用量**: 最小
- **ネットワーク**: 必要（Google）

### Whisper WebAssembly
- **初期化**: 2-10秒（モデルによる）
- **認識レスポンス**: 300-2000ms
- **メモリ使用量**: 150MB-1GB
- **ネットワーク**: 不要（初回ダウンロード後）

## 🔍 デバッグ

### ブラウザコンソール
```javascript
// 現在のエンジン状態確認
voiceCommanderApp.voiceRecognition.getStatus()

// 利用可能なエンジン一覧
voiceCommanderApp.voiceRecognition.getAvailableEngines()

// Whisperエンジンの詳細状態
voiceCommanderApp.voiceRecognition.currentEngine.getEngineStatus()

// 学習データリセット
voiceCommanderApp.voiceRecognition.advancedFeatures.userPatterns.clear()
```

## 🚨 トラブルシューティング

### よくある問題

**1. Whisperモデルが読み込まれない**
- ネットワーク接続を確認
- ブラウザキャッシュをクリア
- 小さいモデル（Tiny）を試す

**2. 音声認識が反応しない**
- マイク権限を確認
- マイクテストで動作確認
- VAD閾値を調整

**3. 認識精度が低い**
- 静かな環境で使用
- マイクを口に近づける
- Whisperエンジンに切り替え

**4. 動作が重い**
- 小さいモデルを使用
- 他のタブを閉じる
- Web Speech APIを使用

## 🔮 今後の拡張予定

### 短期
- リアルタイムWhisper（ストリーミング）
- 追加言語対応（英語・中国語）
- カスタム語彙登録

### 中期
- 音声コマンドマクロ
- 音声品質自動調整
- マルチモーダル対応

### 長期
- カスタムモデル訓練
- 完全オフライン動作
- 音声合成統合

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🤝 貢献

バグ報告や機能要望は[Issues](https://github.com/your-repo/issues)でお願いします。

---

**Voice Commander - あなたの声だけで地球を守れ！** 🌍🚀