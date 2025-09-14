// NFT市场交易模块
import { walletManager } from './wallet.js';
import { nftManager } from './nft.js';
import { configManager } from './config-manager.js';

class MarketManager {
    constructor() {
        // 市场合约配置
        this.marketContract = null;
        this.nftContract = null;
        
        // 交易费用配置 - 从统一配置管理器获取
        this.PLATFORM_FEE = null;
        this.MIN_PRICE = null;
        this.MAX_PRICE = null;
        this.configLoaded = false;
        
        // 缓存
        this.listingsCache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5分钟缓存
        
        // 异步加载配置
        this.loadMarketConfig();
    }
    
    // 加载市场配置
    async loadMarketConfig() {
        try {
            const marketConfig = await configManager.getMarketConfig();
            this.PLATFORM_FEE = marketConfig.platformFeePercentage;
            this.MIN_PRICE = marketConfig.minPrice;
            this.MAX_PRICE = marketConfig.maxPrice;
            this.configLoaded = true;
            console.log('市场配置加载成功');
        } catch (error) {
            console.error('市场配置加载失败:', error);
            // 设置默认值以防止错误
            this.PLATFORM_FEE = 0.025; // 2.5%
            this.MIN_PRICE = 0.001; // 最低价格 (ETH)
            this.MAX_PRICE = 1000; // 最高价格 (ETH)
            this.configLoaded = true;
        }
    }
    
    // 确保配置已加载
    async ensureConfigLoaded() {
        if (!this.configLoaded) {
            await this.loadMarketConfig();
        }
    }
    
    // 初始化市场合约
    initContracts(nftContractAddress, marketContractAddress, nftABI, marketABI) {
        if (!walletManager.signer) {
            throw new Error('钱包未连接');
        }
        
        try {
            this.nftContract = new ethers.Contract(
                nftContractAddress,
                nftABI,
                walletManager.signer
            );
            
            this.marketContract = new ethers.Contract(
                marketContractAddress,
                marketABI,
                walletManager.signer
            );
            
            console.log('市场合约初始化成功');
        } catch (error) {
            console.error('初始化市场合约失败:', error);
            throw error;
        }
    }
    
    // 验证价格
    async validatePrice(price) {
        await this.ensureConfigLoaded();
        
        const numPrice = parseFloat(price);
        const errors = [];
        
        if (isNaN(numPrice) || numPrice <= 0) {
            errors.push('价格必须大于0');
        }
        
        if (numPrice < this.MIN_PRICE) {
            errors.push(`价格不能低于 ${this.MIN_PRICE} ETH`);
        }
        
        if (numPrice > this.MAX_PRICE) {
            errors.push(`价格不能高于 ${this.MAX_PRICE} ETH`);
        }
        
        return {
            valid: errors.length === 0,
            errors,
            price: numPrice
        };
    }
    
    // 上架NFT
    async listNFT(tokenId, price, progressCallback) {
        try {
            if (!walletManager.isConnected) {
                throw new Error('请先连接钱包');
            }
            
            // 验证价格
            const priceValidation = await this.validatePrice(price);
            if (!priceValidation.valid) {
                throw new Error(priceValidation.errors.join(', '));
            }
            
            const priceInWei = ethers.parseEther(priceValidation.price.toString());
            
            if (progressCallback) progressCallback(10, '检查NFT所有权...');
            
            // 检查NFT所有权
            if (this.nftContract) {
                const owner = await this.nftContract.ownerOf(tokenId);
                if (owner.toLowerCase() !== walletManager.userAddress.toLowerCase()) {
                    throw new Error('您不是此NFT的所有者');
                }
            }
            
            if (progressCallback) progressCallback(30, '检查授权状态...');
            
            // 检查是否已授权市场合约
            if (this.nftContract && this.marketContract) {
                const approvedAddress = await this.nftContract.getApproved(tokenId);
                const marketAddress = await this.marketContract.getAddress();
                
                if (approvedAddress.toLowerCase() !== marketAddress.toLowerCase()) {
                    if (progressCallback) progressCallback(50, '授权市场合约...');
                    
                    // 授权市场合约
                    const approveTx = await this.nftContract.approve(marketAddress, tokenId);
                    await approveTx.wait();
                }
            }
            
            if (progressCallback) progressCallback(70, '上架NFT到市场...');
            
            // 上架NFT
            if (this.marketContract) {
                const listTx = await this.marketContract.listNFT(
                    await this.nftContract.getAddress(),
                    tokenId,
                    priceInWei
                );
                
                if (progressCallback) progressCallback(90, '等待交易确认...');
                
                const receipt = await listTx.wait();
                
                if (progressCallback) progressCallback(100, '上架成功！');
                
                // 清除缓存
                this.clearCache();
                
                return {
                    success: true,
                    transactionHash: receipt.transactionHash,
                    tokenId,
                    price: priceValidation.price
                };
            } else {
                // 模拟模式
                if (progressCallback) progressCallback(100, '上架成功！(演示模式)');
                
                return {
                    success: true,
                    transactionHash: '0x' + Math.random().toString(16).substring(2),
                    tokenId,
                    price: priceValidation.price,
                    demo: true
                };
            }
            
        } catch (error) {
            console.error('上架NFT失败:', error);
            throw error;
        }
    }
    
    // 购买NFT
    async buyNFT(tokenId, price, progressCallback) {
        try {
            if (!walletManager.isConnected) {
                throw new Error('请先连接钱包');
            }
            
            const priceInWei = ethers.parseEther(price.toString());
            
            if (progressCallback) progressCallback(10, '检查余额...');
            
            // 检查余额
            const balance = await walletManager.getBalance();
            const balanceInWei = ethers.parseEther(balance.toString());
            
            if (balanceInWei < priceInWei) {
                throw new Error('余额不足');
            }
            
            if (progressCallback) progressCallback(30, '检查NFT状态...');
            
            // 检查NFT是否仍在出售
            if (this.marketContract) {
                // 先获取listingId
                const listingId = await this.marketContract.nftToListingId(
                    await this.nftContract.getAddress(),
                    tokenId
                );
                
                if (listingId === 0n) {
                    throw new Error('此NFT未上架');
                }
                
                // 通过listingId获取listing信息
                const listing = await this.marketContract.listings(listingId);
                
                if (!listing.active) {
                    throw new Error('此NFT已下架或已售出');
                }
                
                if (listing.price !== priceInWei) {
                    throw new Error('价格已变更，请刷新页面');
                }
            }
            
            if (progressCallback) progressCallback(60, '发送购买交易...');
            
            // 购买NFT
            if (this.marketContract) {
                // 重新获取listingId（确保最新状态）
                const listingId = await this.marketContract.nftToListingId(
                    await this.nftContract.getAddress(),
                    tokenId
                );
                
                const buyTx = await this.marketContract.buyNFT(
                    listingId,
                    { value: priceInWei }
                );
                
                if (progressCallback) progressCallback(90, '等待交易确认...');
                
                const receipt = await buyTx.wait();
                
                if (progressCallback) progressCallback(100, '购买成功！');
                
                // 清除缓存
                this.clearCache();
                
                return {
                    success: true,
                    transactionHash: receipt.transactionHash,
                    tokenId,
                    price
                };
            } else {
                // 模拟模式
                if (progressCallback) progressCallback(100, '购买成功！(演示模式)');
                
                return {
                    success: true,
                    transactionHash: '0x' + Math.random().toString(16).substring(2),
                    tokenId,
                    price,
                    demo: true
                };
            }
            
        } catch (error) {
            console.error('购买NFT失败:', error);
            throw error;
        }
    }
    
    // 取消上架
    async cancelListing(tokenId, progressCallback) {
        try {
            if (!walletManager.isConnected) {
                throw new Error('请先连接钱包');
            }
            
            if (progressCallback) progressCallback(20, '检查上架状态...');
            
            // 检查是否为NFT所有者
            if (this.nftContract) {
                const owner = await this.nftContract.ownerOf(tokenId);
                if (owner.toLowerCase() !== walletManager.userAddress.toLowerCase()) {
                    throw new Error('您不是此NFT的所有者');
                }
            }
            
            if (progressCallback) progressCallback(50, '取消上架...');
            
            // 取消上架
            if (this.marketContract) {
                // 先获取listingId
                const listingId = await this.marketContract.nftToListingId(
                    await this.nftContract.getAddress(),
                    tokenId
                );
                
                if (listingId === 0n) {
                    throw new Error('此NFT未上架');
                }
                
                const cancelTx = await this.marketContract.cancelListing(listingId);
                
                if (progressCallback) progressCallback(90, '等待交易确认...');
                
                const receipt = await cancelTx.wait();
                
                if (progressCallback) progressCallback(100, '取消成功！');
                
                // 清除缓存
                this.clearCache();
                
                return {
                    success: true,
                    transactionHash: receipt.transactionHash,
                    tokenId
                };
            } else {
                // 模拟模式
                if (progressCallback) progressCallback(100, '取消成功！(演示模式)');
                
                return {
                    success: true,
                    transactionHash: '0x' + Math.random().toString(16).substring(2),
                    tokenId,
                    demo: true
                };
            }
            
        } catch (error) {
            console.error('取消上架失败:', error);
            throw error;
        }
    }
    
    // 获取所有市场上架
    async getAllListings(useCache = true) {
        try {
            // 检查缓存
            if (useCache && this.listingsCache.has('all')) {
                const cached = this.listingsCache.get('all');
                if (Date.now() - cached.timestamp < this.cacheExpiry) {
                    return cached.data;
                }
            }
            
            let listings = [];
            
            if (this.marketContract) {
                // 从智能合约获取
                const contractListings = await this.marketContract.getAllListings();
                
                listings = await Promise.all(
                    contractListings
                        .filter(listing => listing.active)
                        .map(async (listing) => {
                            try {
                                // 获取NFT元数据
                                const tokenURI = await this.nftContract.tokenURI(listing.tokenId);
                                const metadataResult = await nftManager.fetchMetadata(tokenURI);
                                
                                return {
                                    tokenId: listing.tokenId.toString(),
                                    seller: listing.seller,
                                    price: ethers.formatEther(listing.price),
                                    priceWei: listing.price.toString(),
                                    active: listing.active,
                                    metadata: metadataResult.success ? metadataResult.metadata : null,
                                    contractAddress: listing.nftContract
                                };
                            } catch (error) {
                                console.error(`获取NFT ${listing.tokenId} 元数据失败:`, error);
                                return null;
                            }
                        })
                );
                
                // 过滤掉获取失败的项目
                listings = listings.filter(listing => listing !== null);
            } else {
                // 模拟数据
                listings = await this.getMockListings();
            }
            
            // 缓存结果
            this.listingsCache.set('all', {
                data: listings,
                timestamp: Date.now()
            });
            
            return listings;
            
        } catch (error) {
            console.error('获取市场上架失败:', error);
            throw error;
        }
    }
    
    // 获取用户的上架
    async getUserListings(userAddress = null) {
        try {
            const address = userAddress || walletManager.userAddress;
            if (!address) {
                throw new Error('用户地址未提供');
            }
            
            const allListings = await this.getAllListings();
            return allListings.filter(listing => 
                listing.seller.toLowerCase() === address.toLowerCase()
            );
            
        } catch (error) {
            console.error('获取用户上架失败:', error);
            throw error;
        }
    }
    
    // 获取NFT的上架信息
    async getNFTListing(tokenId) {
        try {
            if (this.marketContract) {
                const listing = await this.marketContract.getListing(
                    await this.nftContract.getAddress(),
                    tokenId
                );
                
                if (listing.active) {
                    return {
                        tokenId: tokenId.toString(),
                        seller: listing.seller,
                        price: ethers.formatEther(listing.price),
                        priceWei: listing.price.toString(),
                        active: listing.active
                    };
                }
            }
            
            return null;
            
        } catch (error) {
            console.error('获取NFT上架信息失败:', error);
            return null;
        }
    }
    
    // 计算交易费用
    async calculateFees(price) {
        await this.ensureConfigLoaded();
        
        const numPrice = parseFloat(price);
        const platformFee = numPrice * this.PLATFORM_FEE;
        const sellerReceives = numPrice - platformFee;
        
        return {
            totalPrice: numPrice,
            platformFee,
            sellerReceives,
            platformFeePercent: this.PLATFORM_FEE * 100
        };
    }
    
    // 搜索和过滤
    filterListings(listings, filters = {}) {
        let filtered = [...listings];
        
        // 价格范围过滤
        if (filters.minPrice !== undefined) {
            filtered = filtered.filter(listing => 
                parseFloat(listing.price) >= parseFloat(filters.minPrice)
            );
        }
        
        if (filters.maxPrice !== undefined) {
            filtered = filtered.filter(listing => 
                parseFloat(listing.price) <= parseFloat(filters.maxPrice)
            );
        }
        
        // 名称搜索
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filtered = filtered.filter(listing => 
                listing.metadata && (
                    listing.metadata.name.toLowerCase().includes(searchTerm) ||
                    listing.metadata.description.toLowerCase().includes(searchTerm)
                )
            );
        }
        
        // 排序
        if (filters.sortBy) {
            switch (filters.sortBy) {
                case 'price_low':
                    filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
                    break;
                case 'price_high':
                    filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
                    break;
                case 'name':
                    filtered.sort((a, b) => {
                        const nameA = a.metadata?.name || '';
                        const nameB = b.metadata?.name || '';
                        return nameA.localeCompare(nameB);
                    });
                    break;
                default:
                    // 默认按tokenId排序
                    filtered.sort((a, b) => parseInt(b.tokenId) - parseInt(a.tokenId));
            }
        }
        
        return filtered;
    }
    
    // 获取交易历史
    async getTransactionHistory(tokenId = null, userAddress = null) {
        try {
            // 这里应该从区块链事件日志中获取交易历史
            // 现在返回模拟数据
            return [
                {
                    type: 'mint',
                    tokenId: '1',
                    from: '0x0000000000000000000000000000000000000000',
                    to: '0x1234567890123456789012345678901234567890',
                    price: null,
                    timestamp: Date.now() - 86400000,
                    transactionHash: '0xabcdef1234567890'
                },
                {
                    type: 'list',
                    tokenId: '1',
                    seller: '0x1234567890123456789012345678901234567890',
                    price: '0.5',
                    timestamp: Date.now() - 43200000,
                    transactionHash: '0x1234567890abcdef'
                }
            ];
            
        } catch (error) {
            console.error('获取交易历史失败:', error);
            return [];
        }
    }
    
    // 获取市场统计
    async getMarketStats() {
        try {
            const listings = await this.getAllListings();
            
            const totalListings = listings.length;
            const prices = listings.map(l => parseFloat(l.price));
            
            const stats = {
                totalListings,
                averagePrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
                minPrice: prices.length > 0 ? Math.min(...prices) : 0,
                maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
                totalVolume: 0, // 需要从交易历史计算
                activeTraders: new Set(listings.map(l => l.seller)).size
            };
            
            return stats;
            
        } catch (error) {
            console.error('获取市场统计失败:', error);
            return {
                totalListings: 0,
                averagePrice: 0,
                minPrice: 0,
                maxPrice: 0,
                totalVolume: 0,
                activeTraders: 0
            };
        }
    }
    
    // 清除缓存
    clearCache() {
        this.listingsCache.clear();
    }
    
    // 获取模拟上架数据
    async getMockListings() {
        return [
            {
                tokenId: '1',
                seller: '0x1234567890123456789012345678901234567890',
                price: '0.5',
                priceWei: ethers.parseEther('0.5').toString(),
                active: true,
                metadata: {
                    name: '稀有收藏品 #1',
                    description: '这是一个稀有的数字收藏品',
                    imageUrl: 'https://via.placeholder.com/300x200?text=NFT+1',
                    attributes: [
                        { trait_type: '稀有度', value: '传奇' },
                        { trait_type: '颜色', value: '金色' }
                    ]
                },
                contractAddress: '0xabcdef1234567890123456789012345678901234'
            },
            {
                tokenId: '2',
                seller: '0xabcdef1234567890123456789012345678901234',
                price: '0.2',
                priceWei: ethers.parseEther('0.2').toString(),
                active: true,
                metadata: {
                    name: '像素艺术 #2',
                    description: '8位像素风格的艺术作品',
                    imageUrl: 'https://via.placeholder.com/300x200?text=NFT+2',
                    attributes: [
                        { trait_type: '风格', value: '像素' },
                        { trait_type: '尺寸', value: '32x32' }
                    ]
                },
                contractAddress: '0xabcdef1234567890123456789012345678901234'
            }
        ];
    }
}

// 导出单例
export const marketManager = new MarketManager();