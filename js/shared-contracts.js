// 共享合约初始化模块
// 提供统一的合约实例管理和初始化功能

import { CONTRACT_CONFIG, NFT_ABI, MARKET_ABI } from './contract-config.js';

export class SharedContractManager {
    constructor() {
        this.nftContract = null;
        this.marketContract = null;
        this.provider = null;
        this.signer = null;
        this.isInitialized = false;
        
        // 从配置文件加载合约地址和ABI
        this.NFT_CONTRACT_ADDRESS = CONTRACT_CONFIG.NFT_CONTRACT_ADDRESS;
        this.MARKET_CONTRACT_ADDRESS = CONTRACT_CONFIG.MARKET_CONTRACT_ADDRESS;
        this.NFT_ABI = NFT_ABI;
        this.MARKET_ABI = MARKET_ABI;
    }

    // 初始化合约实例
    async initContracts(walletManager) {
        try {
            if (!walletManager.provider || !walletManager.signer) {
                console.warn('钱包未连接，无法初始化合约');
                return false;
            }

            this.provider = walletManager.provider;
            this.signer = walletManager.signer;

            // 创建NFT合约实例
            if (this.NFT_CONTRACT_ADDRESS && this.NFT_ABI) {
                this.nftContract = new ethers.Contract(
                    this.NFT_CONTRACT_ADDRESS,
                    this.NFT_ABI,
                    this.signer
                );
            }

            // 创建市场合约实例
            if (this.MARKET_CONTRACT_ADDRESS && this.MARKET_ABI) {
                this.marketContract = new ethers.Contract(
                    this.MARKET_CONTRACT_ADDRESS,
                    this.MARKET_ABI,
                    this.signer
                );
            }

            this.isInitialized = true;

            console.log('合约初始化成功');
            console.log('NFT合约地址:', this.NFT_CONTRACT_ADDRESS);
            console.log('市场合约地址:', this.MARKET_CONTRACT_ADDRESS);

            return true;
        } catch (error) {
            console.error('合约初始化失败:', error);
            this.isInitialized = false;
            return false;
        }
    }

    // 重置合约实例
    resetContracts() {
        this.nftContract = null;
        this.marketContract = null;
        this.provider = null;
        this.signer = null;
        this.isInitialized = false;
    }

    // 获取NFT合约实例
    getNFTContract() {
        if (!this.isInitialized || !this.nftContract) {
            throw new Error('NFT合约未初始化，请先连接钱包');
        }
        return this.nftContract;
    }

    // 获取市场合约实例
    getMarketContract() {
        if (!this.isInitialized || !this.marketContract) {
            throw new Error('市场合约未初始化，请先连接钱包');
        }
        return this.marketContract;
    }

    // 检查合约是否已初始化
    isContractsInitialized() {
        return this.isInitialized && this.nftContract && this.marketContract;
    }

    // 检查NFT合约是否可用
    isNFTContractAvailable() {
        return this.isInitialized && this.nftContract;
    }

    // 检查市场合约是否可用
    isMarketContractAvailable() {
        return this.isInitialized && this.marketContract;
    }

    // 获取合约配置信息
    getContractConfig() {
        return {
            nftAddress: this.NFT_CONTRACT_ADDRESS,
            marketAddress: this.MARKET_CONTRACT_ADDRESS,
            nftABI: this.NFT_ABI,
            marketABI: this.MARKET_ABI
        };
    }

    // NFT相关操作方法
    async mintNFT(userAddress, tokenURI, mintPrice) {
        const contract = this.getNFTContract();
        const tx = await contract.mint(userAddress, tokenURI, {
            value: mintPrice
        });
        return tx;
    }

    async getNFTBalance(userAddress) {
        const contract = this.getNFTContract();
        const balance = await contract.balanceOf(userAddress);
        return parseInt(balance.toString());
    }

    async getNFTTokenURI(tokenId) {
        const contract = this.getNFTContract();
        return await contract.tokenURI(tokenId);
    }

    async getNFTTokenOfOwnerByIndex(userAddress, index) {
        const contract = this.getNFTContract();
        return await contract.tokenOfOwnerByIndex(userAddress, index);
    }

    async getNFTOwner(tokenId) {
        const contract = this.getNFTContract();
        return await contract.ownerOf(tokenId);
    }

    async approveNFT(to, tokenId) {
        const contract = this.getNFTContract();
        const tx = await contract.approve(to, tokenId);
        return tx;
    }

    async isNFTApproved(tokenId, spender) {
        const contract = this.getNFTContract();
        const approved = await contract.getApproved(tokenId);
        return approved.toLowerCase() === spender.toLowerCase();
    }

    // 市场相关操作方法
    async listNFTOnMarket(tokenId, price) {
        const contract = this.getMarketContract();
        const tx = await contract.listNFT(tokenId, price);
        return tx;
    }

    async buyNFTFromMarket(listingId, price) {
        const contract = this.getMarketContract();
        const tx = await contract.buyNFT(listingId, { value: price });
        return tx;
    }

    async cancelNFTListing(listingId) {
        const contract = this.getMarketContract();
        const tx = await contract.cancelListing(listingId);
        return tx;
    }

    async getMarketListings() {
        const contract = this.getMarketContract();
        return await contract.getActiveListings();
    }

    async getMarketListing(listingId) {
        const contract = this.getMarketContract();
        return await contract.listings(listingId);
    }

    // 获取用户的所有NFT
    async getUserNFTs(userAddress) {
        try {
            const balance = await this.getNFTBalance(userAddress);
            const nfts = [];

            for (let i = 0; i < balance; i++) {
                const tokenId = await this.getNFTTokenOfOwnerByIndex(userAddress, i);
                const tokenURI = await this.getNFTTokenURI(tokenId);
                
                nfts.push({
                    tokenId: tokenId.toString(),
                    tokenURI,
                    owner: userAddress
                });
            }

            return nfts;
        } catch (error) {
            console.error('获取用户NFT失败:', error);
            throw error;
        }
    }

    // 获取市场上的所有NFT
    async getMarketNFTs() {
        try {
            const listings = await this.getMarketListings();
            const marketNFTs = [];

            for (const listing of listings) {
                if (listing.isActive) {
                    const tokenURI = await this.getNFTTokenURI(listing.tokenId);
                    const owner = await this.getNFTOwner(listing.tokenId);
                    
                    marketNFTs.push({
                        listingId: listing.listingId.toString(),
                        tokenId: listing.tokenId.toString(),
                        tokenURI,
                        price: listing.price.toString(),
                        seller: listing.seller,
                        owner,
                        isActive: listing.isActive
                    });
                }
            }

            return marketNFTs;
        } catch (error) {
            console.error('获取市场NFT失败:', error);
            throw error;
        }
    }

    // 检查铸造资格
    async checkMintingEligibility(userAddress) {
        try {
            const balance = await this.getNFTBalance(userAddress);
            return {
                canMint: balance === 0,
                currentBalance: balance,
                message: balance > 0 ? '您已经铸造过NFT，每个钱包只能铸造一个NFT' : '可以铸造NFT'
            };
        } catch (error) {
            console.error('检查铸造资格失败:', error);
            throw error;
        }
    }

    // 估算交易费用
    async estimateTransactionFee(method, ...args) {
        try {
            let contract, methodName;
            
            if (method.startsWith('nft.')) {
                contract = this.getNFTContract();
                methodName = method.replace('nft.', '');
            } else if (method.startsWith('market.')) {
                contract = this.getMarketContract();
                methodName = method.replace('market.', '');
            } else {
                throw new Error('无效的方法名称');
            }

            const gasEstimate = await contract[methodName].estimateGas(...args);
            const gasPrice = await this.provider.getFeeData();

            return {
                gasLimit: gasEstimate.toString(),
                gasPrice: gasPrice.gasPrice ? gasPrice.gasPrice.toString() : '0',
                maxFeePerGas: gasPrice.maxFeePerGas ? gasPrice.maxFeePerGas.toString() : '0',
                estimatedCost: gasEstimate * (gasPrice.gasPrice || 0n)
            };
        } catch (error) {
            console.error('估算交易费用失败:', error);
            throw error;
        }
    }
}

// 导出单例实例
export const sharedContractManager = new SharedContractManager();

// 导出工厂函数
export function createSharedContractManager() {
    return new SharedContractManager();
}