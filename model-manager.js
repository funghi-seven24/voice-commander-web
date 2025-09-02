/**
 * Voice Commander - Whisperモデル管理クラス
 * Whisper.cpp WebAssemblyモデルのダウンロード・キャッシュ・管理
 */

class ModelManager {
    constructor() {
        this.models = new Map();
        this.loadingPromises = new Map();
        this.cache = null;
        
        // モデル定義
        this.modelDefinitions = {
            // 小型モデル（高速、低精度）
            'tiny': {
                name: 'whisper-tiny',
                url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
                size: 39 * 1024 * 1024, // 39MB
                description: '最小モデル - 高速だが低精度',
                languages: ['ja', 'en'],
                performance: 'fast'
            },
            
            // 基本モデル（バランス型）
            'base': {
                name: 'whisper-base',
                url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
                size: 142 * 1024 * 1024, // 142MB
                description: '標準モデル - 速度と精度のバランス',
                languages: ['ja', 'en'],
                performance: 'balanced'
            },
            
            // 小型モデル（中精度）
            'small': {
                name: 'whisper-small',
                url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
                size: 244 * 1024 * 1024, // 244MB
                description: '小型モデル - 中精度',
                languages: ['ja', 'en'],
                performance: 'good'
            },
            
            // 中型モデル（高精度）
            'medium': {
                name: 'whisper-medium',
                url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
                size: 769 * 1024 * 1024, // 769MB
                description: '中型モデル - 高精度だが重い',
                languages: ['ja', 'en'],
                performance: 'high'
            }
        };
        
        // デフォルトモデル
        this.defaultModelId = 'base';
        
        // キャッシュ設定
        this.cacheConfig = {
            cacheName: 'whisper-models-v1',
            maxSize: 2 * 1024 * 1024 * 1024, // 2GB
            enableCache: true
        };
        
        console.log('ModelManager created');
    }
    
    /**
     * モデル管理システム初期化
     */
    async init() {
        try {
            // Cache API サポート確認
            if ('caches' in window && this.cacheConfig.enableCache) {
                this.cache = await caches.open(this.cacheConfig.cacheName);
                console.log('Cache API initialized for model storage');
            } else {
                console.warn('Cache API not available, models will be downloaded each time');
            }
            
            // 既存キャッシュ情報の取得
            await this.loadCacheInfo();
            
            console.log('ModelManager initialized successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to initialize ModelManager:', error);
            throw error;
        }
    }
    
    /**
     * キャッシュ情報読み込み
     */
    async loadCacheInfo() {
        if (!this.cache) return;
        
        try {
            const cacheKeys = await this.cache.keys();
            
            for (const request of cacheKeys) {
                const url = request.url;
                const modelId = this.getModelIdFromUrl(url);
                
                if (modelId && this.modelDefinitions[modelId]) {
                    const response = await this.cache.match(request);
                    if (response) {
                        console.log(`Found cached model: ${modelId}`);
                        this.models.set(modelId, {
                            id: modelId,
                            definition: this.modelDefinitions[modelId],
                            status: 'cached',
                            data: null, // 必要時にロード
                            cachedAt: new Date().toISOString()
                        });
                    }
                }
            }
            
        } catch (error) {
            console.error('Failed to load cache info:', error);
        }
    }
    
    /**
     * URLからモデルIDを取得
     */
    getModelIdFromUrl(url) {
        for (const [id, definition] of Object.entries(this.modelDefinitions)) {
            if (url.includes(definition.url)) {
                return id;
            }
        }
        return null;
    }
    
    /**
     * 利用可能なモデル一覧取得
     */
    getAvailableModels() {
        return Object.entries(this.modelDefinitions).map(([id, definition]) => ({
            id: id,
            name: definition.name,
            description: definition.description,
            size: definition.size,
            performance: definition.performance,
            cached: this.models.has(id) && this.models.get(id).status === 'cached'
        }));
    }
    
    /**
     * モデルロード
     */
    async loadModel(modelId = this.defaultModelId, onProgress = null) {
        // 既にロード中の場合は同じPromiseを返す
        if (this.loadingPromises.has(modelId)) {
            console.log(`Model ${modelId} is already loading, waiting for completion`);
            return await this.loadingPromises.get(modelId);
        }
        
        // 既にロード済みの場合
        if (this.models.has(modelId) && this.models.get(modelId).data) {
            console.log(`Model ${modelId} is already loaded`);
            return this.models.get(modelId);
        }
        
        const modelDefinition = this.modelDefinitions[modelId];
        if (!modelDefinition) {
            throw new Error(`Unknown model ID: ${modelId}`);
        }
        
        // ロード開始
        const loadingPromise = this.performModelLoad(modelId, modelDefinition, onProgress);
        this.loadingPromises.set(modelId, loadingPromise);
        
        try {
            const result = await loadingPromise;
            this.loadingPromises.delete(modelId);
            return result;
        } catch (error) {
            this.loadingPromises.delete(modelId);
            throw error;
        }
    }
    
    /**
     * 実際のモデルロード処理
     */
    async performModelLoad(modelId, definition, onProgress) {
        console.log(`Loading model: ${modelId} (${this.formatFileSize(definition.size)})`);
        
        let modelData;
        
        try {
            // キャッシュから取得を試行
            if (this.cache) {
                const cachedResponse = await this.cache.match(definition.url);
                if (cachedResponse) {
                    console.log(`Loading model ${modelId} from cache`);
                    modelData = await cachedResponse.arrayBuffer();
                } else {
                    // ネットワークからダウンロード
                    modelData = await this.downloadModel(definition, onProgress);
                }
            } else {
                // キャッシュなしでダウンロード
                modelData = await this.downloadModel(definition, onProgress);
            }
            
            // モデル情報を登録
            const modelInfo = {
                id: modelId,
                definition: definition,
                status: 'loaded',
                data: modelData,
                loadedAt: new Date().toISOString(),
                size: modelData.byteLength
            };
            
            this.models.set(modelId, modelInfo);
            
            console.log(`Model ${modelId} loaded successfully (${this.formatFileSize(modelData.byteLength)})`);
            return modelInfo;
            
        } catch (error) {
            console.error(`Failed to load model ${modelId}:`, error);
            throw new Error(`Failed to load model ${modelId}: ${error.message}`);
        }
    }
    
    /**
     * モデルダウンロード
     */
    async downloadModel(definition, onProgress) {
        console.log(`Downloading model from: ${definition.url}`);
        
        const response = await fetch(definition.url);
        
        if (!response.ok) {
            throw new Error(`Download failed: ${response.status} ${response.statusText}`);
        }
        
        const contentLength = parseInt(response.headers.get('content-length') || '0');
        
        if (contentLength === 0) {
            console.warn('Content-Length not available, progress tracking disabled');
        }
        
        // ストリーミング読み込み with プログレス
        const reader = response.body.getReader();
        const chunks = [];
        let receivedLength = 0;
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            chunks.push(value);
            receivedLength += value.length;
            
            // プログレス通知
            if (onProgress && contentLength > 0) {
                const progress = (receivedLength / contentLength) * 100;
                onProgress({
                    loaded: receivedLength,
                    total: contentLength,
                    progress: progress,
                    modelId: definition.name
                });
            }
        }
        
        // チャンクを結合
        const modelData = new Uint8Array(receivedLength);
        let offset = 0;
        for (const chunk of chunks) {
            modelData.set(chunk, offset);
            offset += chunk.length;
        }
        
        // キャッシュに保存
        if (this.cache) {
            try {
                const cacheResponse = new Response(modelData, {
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'Content-Length': modelData.length.toString(),
                        'Cache-Control': 'public, max-age=31536000' // 1年
                    }
                });
                
                await this.cache.put(definition.url, cacheResponse.clone());
                console.log(`Model cached: ${definition.name}`);
            } catch (error) {
                console.error('Failed to cache model:', error);
            }
        }
        
        return modelData.buffer;
    }
    
    /**
     * モデル取得
     */
    getModel(modelId) {
        return this.models.get(modelId);
    }
    
    /**
     * モデルが利用可能かチェック
     */
    isModelAvailable(modelId) {
        const model = this.models.get(modelId);
        return model && model.status === 'loaded' && model.data;
    }
    
    /**
     * モデル削除
     */
    async unloadModel(modelId) {
        if (this.models.has(modelId)) {
            const model = this.models.get(modelId);
            
            // メモリ解放
            if (model.data) {
                model.data = null;
            }
            
            this.models.delete(modelId);
            console.log(`Model ${modelId} unloaded`);
        }
    }
    
    /**
     * キャッシュからモデル削除
     */
    async deleteModelFromCache(modelId) {
        if (!this.cache) return;
        
        const definition = this.modelDefinitions[modelId];
        if (definition) {
            await this.cache.delete(definition.url);
            console.log(`Model ${modelId} removed from cache`);
        }
    }
    
    /**
     * キャッシュサイズ取得
     */
    async getCacheSize() {
        if (!this.cache) return 0;
        
        let totalSize = 0;
        const cacheKeys = await this.cache.keys();
        
        for (const request of cacheKeys) {
            const response = await this.cache.match(request);
            if (response && response.headers.has('content-length')) {
                totalSize += parseInt(response.headers.get('content-length'));
            }
        }
        
        return totalSize;
    }
    
    /**
     * キャッシュクリア
     */
    async clearCache() {
        if (this.cache) {
            const deleted = await caches.delete(this.cacheConfig.cacheName);
            if (deleted) {
                console.log('Model cache cleared');
                this.cache = await caches.open(this.cacheConfig.cacheName);
                
                // メモリ上のモデルもクリア
                this.models.clear();
            }
        }
    }
    
    /**
     * ファイルサイズフォーマット
     */
    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }
    
    /**
     * ステータス取得
     */
    getStatus() {
        return {
            loadedModels: Array.from(this.models.keys()),
            loadingModels: Array.from(this.loadingPromises.keys()),
            cacheEnabled: !!this.cache,
            availableModels: Object.keys(this.modelDefinitions)
        };
    }
    
    /**
     * クリーンアップ
     */
    cleanup() {
        // ローディングPromiseをキャンセル（実際のキャンセルは困難なため、結果を無視）
        this.loadingPromises.clear();
        
        // メモリ上のモデルデータをクリア
        for (const model of this.models.values()) {
            if (model.data) {
                model.data = null;
            }
        }
        this.models.clear();
        
        console.log('ModelManager cleaned up');
    }
}

// グローバル参照用
window.ModelManager = ModelManager;