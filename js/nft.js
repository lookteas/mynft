// NFT铸造和管理模块
import { walletManager } from './wallet.js';
import { configManager } from './config-manager.js';

class NFTManager {
    constructor() {
        // IPFS配置 - 从统一配置管理器获取
        this.configLoaded = false;
        this.PINATA_GATEWAY = null;
        this.PINATA_API_KEY = null;
        this.PINATA_SECRET_KEY = null;
        this.PINATA_GROUP_ID = null;
        
        // 文件配置 - 从统一配置管理器获取
        this.SUPPORTED_TYPES = null;
        this.MAX_FILE_SIZE = null;
        
        // 异步加载配置
        this.initConfig();
    }
    
    // 初始化配置
    async initConfig() {
        try {
            await this.loadAllConfig();
            this.configLoaded = true;
        } catch (error) {
            console.error('NFT管理器配置加载失败:', error);
            this.configLoaded = false;
        }
    }
    
    // 确保配置已加载
    async ensureConfigLoaded() {
        if (!this.configLoaded) {
            await this.initConfig();
        }
        if (!this.configLoaded) {
            throw new Error('Pinata配置加载失败，无法进行IPFS操作');
        }
    }
    
    // 加载所有配置
    async loadAllConfig() {
        try {
            // 并行加载所有配置
            const [ipfsConfig, nftSettings, pinataConfig] = await Promise.all([
                configManager.getIPFSConfig(),
                configManager.getNFTSettings(),
                configManager.getPinataConfig()
            ]);
            
            // 设置IPFS配置
            this.PINATA_GATEWAY = ipfsConfig.gateway;
            
            // 设置Pinata配置
            this.PINATA_API_KEY = pinataConfig.apiKey || '';
            this.PINATA_SECRET_KEY = pinataConfig.secretKey || '';
            this.PINATA_GROUP_ID = pinataConfig.groupId || '';
            
            // 设置文件配置
            this.SUPPORTED_TYPES = nftSettings.supportedTypes;
            this.MAX_FILE_SIZE = nftSettings.maxFileSize;
            
            if (this.PINATA_API_KEY && this.PINATA_SECRET_KEY) {
                console.log('Pinata配置加载成功');
            } else {
                console.warn('Pinata配置未完整设置，IPFS上传功能将不可用。如需使用请在contract-config.json中添加完整的pinata配置');
            }
            
        } catch (error) {
            console.error('配置加载失败:', error);
            // 设置默认值以防止错误
            this.PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';
            this.SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
            this.MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
            this.PINATA_API_KEY = '';
            this.PINATA_SECRET_KEY = '';
            this.PINATA_GROUP_ID = '';
            throw error;
        }
    }
    
    // 验证文件
    validateFile(file) {
        const errors = [];
        
        if (!file) {
            errors.push('请选择文件');
            return { valid: false, errors };
        }
        
        // 检查文件类型
        if (!this.SUPPORTED_TYPES.includes(file.type)) {
            errors.push('不支持的文件类型。支持的格式：JPEG, PNG, GIF, WebP, SVG');
        }
        
        // 检查文件大小
        if (file.size > this.MAX_FILE_SIZE) {
            errors.push(`文件大小不能超过 ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    // 生成图片预览
    generatePreview(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            
            reader.onerror = () => {
                reject(new Error('读取文件失败'));
            };
            
            reader.readAsDataURL(file);
        });
    }
    
    // 上传文件到IPFS (使用Pinata)
    async uploadFileToIPFS(file, progressCallback) {
        try {
            // 确保配置已加载
            await this.ensureConfigLoaded();
            
            // 检查Pinata配置是否可用
            if (!this.PINATA_API_KEY || !this.PINATA_SECRET_KEY) {
                throw new Error('Pinata配置缺失，无法上传到IPFS。请在contract-config.json中添加pinata配置项');
            }
            
            // 使用真实的Pinata API上传文件
            const formData = new FormData();
            formData.append('file', file);
            
            const metadata = JSON.stringify({
                name: file.name,
                keyvalues: {
                    uploadedBy: walletManager.userAddress || 'unknown',
                    timestamp: Date.now()
                }
            });
            formData.append('pinataMetadata', metadata);
            
            const options = JSON.stringify({
                cidVersion: 0,
                groupId: this.PINATA_GROUP_ID
            });
            formData.append('pinataOptions', options);
            
            // 模拟进度更新
            if (progressCallback) {
                progressCallback(30);
            }
            
            const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
                method: 'POST',
                headers: {
                    'pinata_api_key': this.PINATA_API_KEY,
                    'pinata_secret_api_key': this.PINATA_SECRET_KEY
                },
                body: formData
            });
            
            if (progressCallback) {
                progressCallback(80);
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`上传失败: ${response.statusText} - ${errorText}`);
            }
            
            const result = await response.json();
            
            if (progressCallback) {
                progressCallback(100);
            }
            
            return {
                success: true,
                hash: result.IpfsHash,
                url: `${this.PINATA_GATEWAY}${result.IpfsHash}`
            };
            
        } catch (error) {
            console.error('IPFS上传失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 上传JSON元数据到IPFS
    async uploadJSONToIPFS(jsonData, progressCallback) {
        try {
            // 确保配置已加载
            await this.ensureConfigLoaded();
            
            // 检查Pinata配置是否可用
            if (!this.PINATA_API_KEY || !this.PINATA_SECRET_KEY) {
                throw new Error('Pinata配置缺失，无法上传到IPFS。请在contract-config.json中添加pinata配置项');
            }
            
            // 使用真实的Pinata API上传JSON元数据
            if (progressCallback) {
                progressCallback(20);
            }
            
            const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'pinata_api_key': this.PINATA_API_KEY,
                    'pinata_secret_api_key': this.PINATA_SECRET_KEY
                },
                body: JSON.stringify({
                    pinataContent: jsonData,
                    pinataMetadata: {
                        name: `NFT-Metadata-${Date.now()}`,
                        keyvalues: {
                            uploadedBy: walletManager.userAddress || 'unknown',
                            timestamp: Date.now()
                        }
                    },
                    pinataOptions: {
                        groupId: this.PINATA_GROUP_ID
                    }
                })
            });
            
            if (progressCallback) {
                progressCallback(80);
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`元数据上传失败: ${response.statusText} - ${errorText}`);
            }
            
            const result = await response.json();
            
            if (progressCallback) {
                progressCallback(100);
            }
            
            return {
                success: true,
                hash: result.IpfsHash,
                url: `${this.PINATA_GATEWAY}${result.IpfsHash}`
            };
            
        } catch (error) {
            console.error('元数据上传失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 创建NFT元数据
    createMetadata(name, description, imageHash, attributes = []) {
        const metadata = {
            name: name.trim(),
            description: description.trim(),
            image: `ipfs://${imageHash}`,
            external_url: '',
            attributes: attributes.filter(attr => attr.trait_type && attr.value),
            properties: {
                creator: walletManager.userAddress,
                created_at: new Date().toISOString()
            }
        };
        
        return metadata;
    }
    
    // 解析属性字符串
    parseAttributes(attributesString) {
        if (!attributesString || !attributesString.trim()) {
            return [];
        }
        
        try {
            const lines = attributesString.split('\n');
            const attributes = [];
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine) continue;
                
                const colonIndex = trimmedLine.indexOf(':');
                if (colonIndex === -1) continue;
                
                const trait_type = trimmedLine.substring(0, colonIndex).trim();
                const value = trimmedLine.substring(colonIndex + 1).trim();
                
                if (trait_type && value) {
                    attributes.push({
                        trait_type,
                        value
                    });
                }
            }
            
            return attributes;
        } catch (error) {
            console.error('解析属性失败:', error);
            return [];
        }
    }
    
    // 从IPFS获取元数据
    async fetchMetadata(tokenURI) {
        try {
            let url = tokenURI;
            
            // 处理IPFS URI
            if (tokenURI.startsWith('ipfs://')) {
                const hash = tokenURI.replace('ipfs://', '');
                url = `${this.PINATA_GATEWAY}${hash}`;
            }
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`获取元数据失败: ${response.statusText}`);
            }
            
            const metadata = await response.json();
            
            // 处理图片URL
            if (metadata.image && metadata.image.startsWith('ipfs://')) {
                const imageHash = metadata.image.replace('ipfs://', '');
                metadata.imageUrl = `${this.PINATA_GATEWAY}${imageHash}`;
            } else {
                metadata.imageUrl = metadata.image;
            }
            
            return {
                success: true,
                metadata
            };
            
        } catch (error) {
            console.error('获取元数据失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 生成模拟IPFS哈希
    generateMockHash() {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let hash = 'Qm';
        
        for (let i = 0; i < 44; i++) {
            hash += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return hash;
    }
    
    // 压缩图片 (可选功能)
    async compressImage(file, maxWidth = 1024, quality = 0.8) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // 计算新尺寸
                let { width, height } = img;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // 绘制压缩后的图片
                ctx.drawImage(img, 0, 0, width, height);
                
                // 转换为Blob
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, file.type, quality);
            };
            
            img.src = URL.createObjectURL(file);
        });
    }
    
    // 批量上传文件
    async batchUpload(files, progressCallback) {
        const results = [];
        const total = files.length;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            try {
                const result = await this.uploadFileToIPFS(file, (fileProgress) => {
                    const overallProgress = ((i / total) * 100) + (fileProgress / total);
                    if (progressCallback) {
                        progressCallback(overallProgress, i + 1, total);
                    }
                });
                
                results.push({
                    file: file.name,
                    ...result
                });
                
            } catch (error) {
                results.push({
                    file: file.name,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }
    
    // 获取文件信息
    getFileInfo(file) {
        return {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            sizeFormatted: this.formatFileSize(file.size)
        };
    }
    
    // 格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // 生成缩略图
    async generateThumbnail(file, size = 150) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                canvas.width = size;
                canvas.height = size;
                
                // 计算裁剪区域 (居中裁剪)
                const minDimension = Math.min(img.width, img.height);
                const x = (img.width - minDimension) / 2;
                const y = (img.height - minDimension) / 2;
                
                ctx.drawImage(img, x, y, minDimension, minDimension, 0, 0, size, size);
                
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.8);
            };
            
            img.onerror = () => {
                reject(new Error('生成缩略图失败'));
            };
            
            img.src = URL.createObjectURL(file);
        });
    }
}

// 导出单例
export const nftManager = new NFTManager();