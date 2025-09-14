// 智能合约部署脚本
const { ethers } = require('hardhat');

async function main() {
    console.log('开始部署智能合约...');
    
    // 获取部署账户
    const [deployer] = await ethers.getSigners();
    console.log('部署账户:', deployer.address);
    console.log('账户余额:', ethers.formatEther(await deployer.provider.getBalance(deployer.address)), 'ETH');
    
    // 部署参数
    const NFT_NAME = 'MyNFT Collection';
    const NFT_SYMBOL = 'MYNFT';
    const ROYALTY_RECEIVER = deployer.address; // 版税接收者
    const FEE_RECIPIENT = deployer.address; // 平台费用接收者
    
    try {
        // 1. 部署NFT合约
        console.log('\n正在部署NFT合约...');
        const MyNFT = await ethers.getContractFactory('MyNFT');
        const nft = await MyNFT.deploy(NFT_NAME, NFT_SYMBOL, ROYALTY_RECEIVER);
        await nft.waitForDeployment();
        
        const nftAddress = await nft.getAddress();
        console.log('NFT合约部署成功!');
        console.log('NFT合约地址:', nftAddress);
        
        // 2. 部署市场合约
        console.log('\n正在部署市场合约...');
        const NFTMarket = await ethers.getContractFactory('NFTMarket');
        const market = await NFTMarket.deploy(FEE_RECIPIENT);
        await market.waitForDeployment();
        
        const marketAddress = await market.getAddress();
        console.log('市场合约部署成功!');
        console.log('市场合约地址:', marketAddress);
        
        // 3. 验证部署
        console.log('\n验证合约部署...');
        
        // 验证NFT合约
        const nftName = await nft.name();
        const nftSymbol = await nft.symbol();
        const nftOwner = await nft.owner();
        console.log('NFT合约信息:');
        console.log('  名称:', nftName);
        console.log('  符号:', nftSymbol);
        console.log('  所有者:', nftOwner);
        
        // 验证市场合约
        const marketOwner = await market.owner();
        const platformFee = await market.platformFeePercentage();
        const feeRecipient = await market.feeRecipient();
        console.log('市场合约信息:');
        console.log('  所有者:', marketOwner);
        console.log('  平台费用:', Number(platformFee) / 100, '%');
        console.log('  费用接收者:', feeRecipient);
        
        // 4. 生成配置文件
        const config = {
            network: await deployer.provider.getNetwork(),
            contracts: {
                nft: {
                    address: nftAddress,
                    name: NFT_NAME,
                    symbol: NFT_SYMBOL
                },
                market: {
                    address: marketAddress,
                    platformFee: platformFee.toString(),
                    feeRecipient: feeRecipient
                }
            },
            deployer: {
                address: deployer.address,
                balance: ethers.formatEther(await deployer.provider.getBalance(deployer.address))
            },
            deployedAt: new Date().toISOString()
        };
        
        // 保存配置到文件
        const fs = require('fs');
        const path = require('path');
        
        const configPath = path.join(__dirname, '..', 'contract-config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log('\n配置文件已保存到:', configPath);
        
        // 5. 生成前端配置
        const frontendConfig = `// ⚠️ 警告：此文件由部署脚本自动生成，请勿手动修改！
// 🔄 要更新配置，请运行：npm run deploy:local 或 npm run deploy:sepolia
// 📖 详细说明请查看：CONFIG-MANAGEMENT.md
//
// 自动生成的合约配置文件
// 生成时间: ${new Date().toISOString()}

export const CONTRACT_CONFIG = {
    // 网络信息
    NETWORK_ID: '${config.network.chainId}',
    NETWORK_NAME: '${config.network.name}',
    
    // NFT合约
    NFT_CONTRACT_ADDRESS: '${nftAddress}',
    NFT_CONTRACT_NAME: '${NFT_NAME}',
    NFT_CONTRACT_SYMBOL: '${NFT_SYMBOL}',
    
    // 市场合约
    MARKET_CONTRACT_ADDRESS: '${marketAddress}',
    PLATFORM_FEE_PERCENTAGE: ${platformFee},
    FEE_RECIPIENT: '${feeRecipient}',
    
    // 部署信息
    DEPLOYER_ADDRESS: '${deployer.address}',
    DEPLOYED_AT: '${config.deployedAt}'
};

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
`;
        
        const frontendConfigPath = path.join(__dirname, '..', 'js', 'contract-config.js');
        fs.writeFileSync(frontendConfigPath, frontendConfig);
        console.log('前端配置文件已保存到:', frontendConfigPath);
        
        console.log('\n=== 部署完成 ===');
        console.log('请将以下地址更新到前端代码中:');
        console.log('NFT合约地址:', nftAddress);
        console.log('市场合约地址:', marketAddress);
        console.log('\n注意: 请确保在Sepolia测试网上有足够的ETH用于交易');
        
    } catch (error) {
        console.error('部署失败:', error);
        process.exit(1);
    }
}

// 错误处理
process.on('unhandledRejection', (error) => {
    console.error('未处理的Promise拒绝:', error);
    process.exit(1);
});

// 运行部署脚本
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('部署脚本执行失败:', error);
            process.exit(1);
        });
}

module.exports = { main };