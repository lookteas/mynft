// 统一配置管理模块
// 提供项目中所有配置的统一访问接口

class ConfigManager {
    constructor() {
        this.config = null;
        this.configLoaded = false;
        this.loadPromise = null;
    }

    // 异步加载配置文件
    async loadConfig() {
        if (this.loadPromise) {
            return this.loadPromise;
        }

        this.loadPromise = this._loadConfigFromFile();
        return this.loadPromise;
    }

    // 从文件加载配置
    async _loadConfigFromFile() {
        try {
            const response = await fetch('./contract-config.json');
            if (!response.ok) {
                throw new Error(`配置文件加载失败: ${response.status}`);
            }
            
            this.config = await response.json();
            this.configLoaded = true;
            console.log('配置文件加载成功');
            return this.config;
        } catch (error) {
            console.error('配置文件加载失败:', error);
            throw error;
        }
    }

    // 确保配置已加载
    async ensureConfigLoaded() {
        if (!this.configLoaded) {
            await this.loadConfig();
        }
        if (!this.configLoaded) {
            throw new Error('配置加载失败');
        }
    }

    // 获取网络配置
    async getNetworkConfig() {
        await this.ensureConfigLoaded();
        return this.config.network;
    }

    // 获取合约配置
    async getContractConfig(contractType = null) {
        await this.ensureConfigLoaded();
        if (contractType) {
            return this.config.contracts[contractType];
        }
        return this.config.contracts;
    }

    // 获取NFT合约配置
    async getNFTConfig() {
        return await this.getContractConfig('nft');
    }

    // 获取市场配置
    async getMarketConfig() {
        await this.ensureConfigLoaded();
        return this.config.market || {
            platformFeePercentage: 0.025,
            minPrice: 0.001,
            maxPrice: 1000,
            listingDuration: 2592000,
            maxListingsPerUser: 100
        };
    }

    // 获取IPFS配置
    async getIPFSConfig() {
        await this.ensureConfigLoaded();
        return this.config.ipfs;
    }

    // 获取Pinata配置
    async getPinataConfig() {
        const ipfsConfig = await this.getIPFSConfig();
        return ipfsConfig.pinata;
    }

    // 获取NFT相关配置
    async getNFTSettings() {
        await this.ensureConfigLoaded();
        return this.config.nft;
    }

    // 获取部署者信息
    async getDeployerInfo() {
        await this.ensureConfigLoaded();
        return this.config.deployer;
    }

    // 获取网络链ID（十进制）
    async getChainId() {
        const networkConfig = await this.getNetworkConfig();
        return networkConfig.chainId;
    }

    // 获取网络链ID（十六进制）
    async getChainIdHex() {
        const networkConfig = await this.getNetworkConfig();
        return networkConfig.chainIdHex;
    }

    // 获取RPC URLs
    async getRpcUrls() {
        const networkConfig = await this.getNetworkConfig();
        return networkConfig.rpcUrls;
    }

    // 获取区块浏览器URLs
    async getBlockExplorerUrls() {
        const networkConfig = await this.getNetworkConfig();
        return networkConfig.blockExplorerUrls;
    }

    // 获取原生货币配置
    async getNativeCurrency() {
        const networkConfig = await this.getNetworkConfig();
        return networkConfig.nativeCurrency;
    }

    // 获取平台费用百分比
    async getPlatformFeePercentage() {
        const marketConfig = await this.getMarketConfig();
        return marketConfig.platformFeePercentage;
    }

    // 获取价格限制
    async getPriceLimits() {
        const marketConfig = await this.getMarketConfig();
        return {
            min: marketConfig.minPrice,
            max: marketConfig.maxPrice
        };
    }

    // 获取支持的文件类型
    async getSupportedFileTypes() {
        const nftSettings = await this.getNFTSettings();
        return nftSettings.supportedTypes;
    }

    // 获取最大文件大小
    async getMaxFileSize() {
        const nftSettings = await this.getNFTSettings();
        return nftSettings.maxFileSize;
    }

    // 获取IPFS网关
    async getIPFSGateway() {
        const ipfsConfig = await this.getIPFSConfig();
        return ipfsConfig.gateway;
    }

    // 检查Pinata配置是否完整
    async isPinataConfigured() {
        try {
            const pinataConfig = await this.getPinataConfig();
            return !!(pinataConfig.apiKey && pinataConfig.secretKey);
        } catch (error) {
            return false;
        }
    }

    // 获取完整配置（用于调试）
    async getFullConfig() {
        await this.ensureConfigLoaded();
        return this.config;
    }
    
    // 获取配置（别名方法，用于向后兼容）
    async getConfig() {
        await this.ensureConfigLoaded();
        return this.config;
    }

    // 重新加载配置
    async reloadConfig() {
        this.config = null;
        this.configLoaded = false;
        this.loadPromise = null;
        return await this.loadConfig();
    }
}

// 导出单例实例
export const configManager = new ConfigManager();

// 导出类（用于测试或特殊用途）
export { ConfigManager };