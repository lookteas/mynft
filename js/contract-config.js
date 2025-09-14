// ⚠️ 警告：此文件由部署脚本自动生成，请勿手动修改！
// 🔄 要更新配置，请运行：npm run deploy:local 或 npm run deploy:sepolia
// 📖 详细说明请查看：CONFIG-MANAGEMENT.md
//
// 合约配置文件 - 从统一配置管理器获取配置
// 为保持向后兼容性，提供原有的配置对象格式

import { configManager } from './config-manager.js';

// 异步加载配置并创建兼容的配置对象
let CONTRACT_CONFIG = null;
let configLoadPromise = null;

// 加载配置的异步函数
async function loadContractConfig() {
    if (configLoadPromise) {
        return configLoadPromise;
    }
    
    configLoadPromise = (async () => {
        try {
            const [networkConfig, nftConfig, marketConfig, deployerInfo] = await Promise.all([
                configManager.getNetworkConfig(),
                configManager.getNFTConfig(),
                configManager.getMarketConfig(),
                configManager.getDeployerInfo()
            ]);
            
            CONTRACT_CONFIG = {
                // 网络信息
                NETWORK_ID: networkConfig.chainId,
                NETWORK_NAME: networkConfig.name,
                
                // NFT合约
                NFT_CONTRACT_ADDRESS: nftConfig.address,
                NFT_CONTRACT_NAME: nftConfig.name,
                NFT_CONTRACT_SYMBOL: nftConfig.symbol,
                
                // 市场合约
                MARKET_CONTRACT_ADDRESS: marketConfig.address,
                PLATFORM_FEE_PERCENTAGE: parseInt(marketConfig.platformFee),
                FEE_RECIPIENT: marketConfig.feeRecipient,
                
                // 部署信息
                DEPLOYER_ADDRESS: deployerInfo.address,
                DEPLOYED_AT: '2025-09-14T09:35:04.363Z'
            };
            
            return CONTRACT_CONFIG;
        } catch (error) {
            console.error('加载合约配置失败:', error);
            // 返回默认配置以防止错误
            return {
                NFT_CONTRACT_ADDRESS: "0xxxxxxxxxxxxxxxxxxx3",
                MARKET_CONTRACT_ADDRESS: "0xxxxxxxxxxxxxxxxxxx33"
            };
        }
    })();
    
    return configLoadPromise;
}

// 获取配置的函数（确保配置已加载）
export async function getContractConfig() {
    if (!CONTRACT_CONFIG) {
        await loadContractConfig();
    }
    return CONTRACT_CONFIG;
}

// 立即开始加载配置
loadContractConfig().catch(console.error);

// 为了向后兼容，导出一个代理对象
export const CONTRACT_CONFIG_PROXY = new Proxy({}, {
    get(target, prop) {
        if (!CONTRACT_CONFIG) {
            console.warn('配置尚未加载完成，请使用 getContractConfig() 异步获取配置');
            return undefined;
        }
        return CONTRACT_CONFIG[prop];
    }
});

// 保持向后兼容性的默认导出
export { CONTRACT_CONFIG_PROXY as CONTRACT_CONFIG };

// NFT合约ABI (简化版)
export const NFT_ABI = [
    'function mint(address to, string memory tokenURI) public payable',
    'function tokenURI(uint256 tokenId) public view returns (string memory)',
    'function balanceOf(address owner) public view returns (uint256)',
    'function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256)',
    'function ownerOf(uint256 tokenId) public view returns (address)',
    'function approve(address to, uint256 tokenId) public',
    'function getApproved(uint256 tokenId) public view returns (address)',
    'function setApprovalForAll(address operator, bool approved) public',
    'function isApprovedForAll(address owner, address operator) public view returns (bool)',
    'function transferFrom(address from, address to, uint256 tokenId) public',
    'function safeTransferFrom(address from, address to, uint256 tokenId) public',
    'function totalSupply() public view returns (uint256)',
    'function tokensOfOwner(address owner) external view returns (uint256[] memory)',
    'function mintPrice() public view returns (uint256)',
    'function maxSupply() public view returns (uint256)',
    'function mintingEnabled() public view returns (bool)',
    'function royaltyInfo(uint256 tokenId, uint256 salePrice) external view returns (address receiver, uint256 royaltyAmount)'
];

// 市场合约ABI (简化版)
export const MARKET_ABI = [
    'function listNFT(address nftContract, uint256 tokenId, uint256 price) external',
    'function buyNFT(uint256 listingId) external payable',
    'function cancelListing(uint256 listingId) external',
    'function updateListingPrice(uint256 listingId, uint256 newPrice) external',
    'function createAuction(address nftContract, uint256 tokenId, uint256 startingPrice, uint256 duration) external',
    'function placeBid(uint256 auctionId) external payable',
    'function endAuction(uint256 auctionId) external',
    'function makeOffer(address nftContract, uint256 tokenId, uint256 expiration) external payable',
    'function acceptOffer(uint256 offerId) external',
    'function cancelOffer(uint256 offerId) external',
    'function getActiveListings(uint256 offset, uint256 limit) external view returns (tuple(uint256 listingId, address nftContract, uint256 tokenId, address seller, uint256 price, bool active, uint256 createdAt, uint256 updatedAt)[] memory)',
    'function getUserListings(address user) external view returns (tuple(uint256 listingId, address nftContract, uint256 tokenId, address seller, uint256 price, bool active, uint256 createdAt, uint256 updatedAt)[] memory)',
    'function listings(uint256 listingId) public view returns (uint256 listingId, address nftContract, uint256 tokenId, address seller, uint256 price, bool active, uint256 createdAt, uint256 updatedAt)',
    'function auctions(uint256 auctionId) public view returns (uint256 auctionId, address nftContract, uint256 tokenId, address seller, uint256 startingPrice, uint256 currentBid, address currentBidder, uint256 endTime, bool active, uint256 createdAt)',
    'function offers(uint256 offerId) public view returns (uint256 offerId, address nftContract, uint256 tokenId, address buyer, uint256 price, uint256 expiration, bool active, uint256 createdAt)',
    'function platformFeePercentage() public view returns (uint256)',
    'function feeRecipient() public view returns (address)',
    'function minimumPrice() public view returns (uint256)'
];