// 核心应用逻辑
import { walletManager } from './wallet.js';
import { getContractConfig, NFT_ABI, MARKET_ABI } from './contract-config.js';
import { configManager } from './config-manager.js';
import { nftManager } from './nft.js';

class NFTApp {
    constructor() {
        this.currentPage = 'home-page';
        this.nftContract = null;
        this.marketContract = null;
        
        // 配置将异步加载
        this.NFT_CONTRACT_ADDRESS = null;
        this.MARKET_CONTRACT_ADDRESS = null;
        this.NFT_ABI = NFT_ABI;
        this.MARKET_ABI = MARKET_ABI;
        
        // 使用IIFE包装异步初始化
        (async () => {
            try {
                await this.init();
            } catch (error) {
                console.error('应用初始化失败:', error);
            }
        })();
    }
    
    // 初始化应用
    async init() {
        try {
            // 首先加载配置
            await this.loadConfig();
            
            this.setupEventListeners();
            await this.checkWalletConnection();
            await this.initContracts();
            this.showPage('home-page');
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.showStatus('应用初始化失败，请刷新页面重试', 'error');
        }
    }
    
    // 加载配置
    async loadConfig() {
        try {
            const contractConfig = await configManager.getConfig();
            this.NFT_CONTRACT_ADDRESS = contractConfig.contracts.nft.address;
            this.MARKET_CONTRACT_ADDRESS = contractConfig.contracts.market.address;
            console.log('配置加载成功');
        } catch (error) {
            console.error('配置加载失败:', error);
            throw error;
        }
    }
    
    // 初始化合约实例
    async initContracts() {
        try {
            if (walletManager.provider && walletManager.signer) {
                // 创建合约实例
                this.nftContract = new ethers.Contract(
                    this.NFT_CONTRACT_ADDRESS,
                    this.NFT_ABI,
                    walletManager.signer
                );
                
                this.marketContract = new ethers.Contract(
                    this.MARKET_CONTRACT_ADDRESS,
                    this.MARKET_ABI,
                    walletManager.signer
                );
                
                // 初始化marketManager
                const { marketManager } = await import('./market.js');
                marketManager.initContracts(
                    this.NFT_CONTRACT_ADDRESS,
                    this.MARKET_CONTRACT_ADDRESS,
                    this.NFT_ABI,
                    this.MARKET_ABI
                );
                
                console.log('合约初始化成功');
                console.log('NFT合约地址:', this.NFT_CONTRACT_ADDRESS);
                console.log('市场合约地址:', this.MARKET_CONTRACT_ADDRESS);
            } else {
                console.warn('钱包未连接，无法初始化合约');
            }
        } catch (error) {
            console.error('合约初始化失败:', error);
        }
    }
    
    // 设置事件监听器
    setupEventListeners() {
        // 钱包连接按钮
        document.getElementById('connect-wallet-btn')?.addEventListener('click', () => {
            this.connectWallet();
        });
        
        document.getElementById('disconnect-wallet-btn')?.addEventListener('click', () => {
            this.disconnectWallet();
        });
        
        // 导航按钮
        document.getElementById('nav-to-my-nft')?.addEventListener('click', () => {
            this.showPage('my-nft-page');
            this.loadMyNFTs();
        });
        
        document.getElementById('nav-to-mint')?.addEventListener('click', () => {
            this.showPage('mint-page');
        });
        
        document.getElementById('nav-to-market')?.addEventListener('click', () => {
            this.showPage('market-page');
            this.loadMarketNFTs();
        });
        
        // 返回按钮
        document.getElementById('back-to-home-from-my-nft')?.addEventListener('click', () => {
            this.showPage('home-page');
        });
        
        document.getElementById('back-to-home-from-mint')?.addEventListener('click', () => {
            this.showPage('home-page');
        });
        
        document.getElementById('back-to-home-from-market')?.addEventListener('click', () => {
            this.showPage('home-page');
        });
        
        // 去铸造NFT按钮
        document.getElementById('go-to-mint-from-my-nft')?.addEventListener('click', () => {
            this.showPage('mint-page');
        });
        
        // 铸造表单
        document.getElementById('mint-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleMintNFT();
        });
        
        // 图片预览
        document.getElementById('nft-image').addEventListener('change', (e) => {
            this.handleImagePreview(e);
        });
        
        // 重新铸造模式切换
        document.getElementById('remint-mode').addEventListener('change', (e) => {
            const fixedUriGroup = document.getElementById('fixed-uri-group');
            if (e.target.checked) {
                fixedUriGroup.style.display = 'block';
            } else {
                fixedUriGroup.style.display = 'none';
                document.getElementById('fixed-token-uri').value = '';
            }
        });
        
        // 模态框关闭
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                this.closeModal(e.target.closest('.modal'));
            });
        });
        
        // 点击模态框外部关闭
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });
        
        // 上架表单
        document.getElementById('list-nft-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleListNFT();
        });
        
        // 购买确认
        document.getElementById('confirm-buy-btn')?.addEventListener('click', () => {
            this.handleBuyNFT();
        });
        
        // 钱包事件监听
        window.addEventListener('accountChanged', (e) => {
            this.handleAccountChange(e.detail.address);
        });
        
        window.addEventListener('networkChanged', (e) => {
            this.handleNetworkChange(e.detail.networkId);
        });
    }
    
    // 检查钱包连接
    async checkWalletConnection() {
        const isConnected = await walletManager.checkConnection();
        if (isConnected) {
            this.initContracts();
            await this.checkMintingEligibility();
        }
    }
    
    // 检查铸造资格
    async checkMintingEligibility() {
        const mintButton = document.querySelector('#mint-form button[type="submit"]');
        const mintStatus = document.getElementById('mint-status');
        
        if (!this.nftContract || !walletManager.userAddress) {
            return;
        }
        
        try {
            const balance = await this.nftContract.balanceOf(walletManager.userAddress);
            const balanceNumber = typeof balance === 'object' && balance.toString ? parseInt(balance.toString()) : parseInt(balance);
            if (balanceNumber > 0) {
                // 用户已经铸造过NFT，禁用铸造功能
                if (mintButton) {
                    mintButton.disabled = true;
                    mintButton.textContent = '已铸造过NFT';
                }
                if (mintStatus) {
                    mintStatus.textContent = '您已经铸造过NFT，每个钱包只能铸造一个NFT。可通过市场购买其他NFT。';
                    mintStatus.className = 'status-message info';
                    mintStatus.classList.remove('hidden');
                }
            } else {
                // 用户还未铸造过NFT，启用铸造功能
                if (mintButton) {
                    mintButton.disabled = false;
                    mintButton.textContent = '铸造NFT';
                }
                if (mintStatus) {
                    mintStatus.classList.add('hidden');
                }
            }
        } catch (error) {
            console.error('检查铸造资格失败:', error);
        }
    }
    
    // 连接钱包
    async connectWallet() {
        this.showStatus('正在连接钱包...', 'info');
        
        const result = await walletManager.connect();
        
        if (result.success) {
            this.showStatus('钱包连接成功！', 'success');
            await this.initContracts();
            await this.checkMintingEligibility();
        } else {
            this.showStatus(`连接失败: ${result.error}`, 'error');
        }
    }
    
    // 断开钱包连接
    disconnectWallet() {
        walletManager.disconnect();
        this.nftContract = null;
        this.marketContract = null;
        
        // 重置铸造按钮状态
        const mintButton = document.querySelector('#mint-form button[type="submit"]');
        const mintStatus = document.getElementById('mint-status');
        if (mintButton) {
            mintButton.disabled = false;
            mintButton.textContent = '铸造NFT';
        }
        if (mintStatus) {
            mintStatus.classList.add('hidden');
        }
        
        this.showStatus('钱包已断开连接', 'info');
    }
    
    // 初始化合约

    
    // 显示页面
    showPage(pageId) {
        // 隐藏所有页面
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // 显示目标页面
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageId;
        }
        
        // 如果是铸造页面，检查是否有修复后的TokenURI需要预填
        if (pageId === 'mint') {
            this.checkForFixedTokenURI();
        }
    }
    
    // 检查并预填修复后的TokenURI
    checkForFixedTokenURI() {
        const fixedTokenURI = localStorage.getItem('fixedTokenURI');
        if (fixedTokenURI) {
            // 启用重新铸造模式
            document.getElementById('remint-mode').checked = true;
            document.getElementById('fixed-uri-group').style.display = 'block';
            document.getElementById('fixed-token-uri').value = fixedTokenURI;
            
            // 清除localStorage中的数据
            localStorage.removeItem('fixedTokenURI');
            
            // 显示提示信息
            this.showStatus('已自动填入修复后的TokenURI，您可以直接铸造新NFT', 'success');
        }
    }
    
    // 显示状态消息
    showStatus(message, type = 'info', duration = 5000) {
        // 创建状态消息元素
        const statusDiv = document.createElement('div');
        statusDiv.className = `status-message ${type}`;
        statusDiv.textContent = message;
        
        // 添加到页面顶部
        const container = document.querySelector('.app-main');
        container.insertBefore(statusDiv, container.firstChild);
        
        // 自动移除
        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.parentNode.removeChild(statusDiv);
            }
        }, duration);
    }
    
    // 处理图片预览
    handleImagePreview(event) {
        const file = event.target.files[0];
        const preview = document.getElementById('image-preview');
        const previewImg = document.getElementById('preview-img');
        const mintBtn = document.querySelector('#mint-form button[type="submit"]');
        
        if (file) {
            // 验证文件类型
            if (!file.type.startsWith('image/')) {
                this.showStatus('请选择图片文件', 'error');
                event.target.value = '';
                return;
            }
            
            // 验证文件大小 (5MB)
            if (file.size > 5 * 1024 * 1024) {
                this.showStatus('图片文件不能超过5MB', 'error');
                event.target.value = '';
                return;
            }
            
            // 显示预览
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                preview.classList.remove('hidden');
                mintBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        } else {
            preview.classList.add('hidden');
            mintBtn.disabled = true;
        }
    }
    
    // 处理NFT铸造
    async handleMintNFT() {
        if (!walletManager.isConnected) {
            this.showStatus('请先连接钱包', 'error');
            return;
        }
        
        // 检查是否为重新铸造模式
        const isRemint = document.getElementById('remint-mode')?.checked || false;
        
        // 检查用户是否已经铸造过NFT（非重新铸造模式时）
        if (this.nftContract && !isRemint) {
            try {
                const balance = await this.nftContract.balanceOf(walletManager.userAddress);
                const balanceNumber = typeof balance === 'object' && balance.toString ? parseInt(balance.toString()) : parseInt(balance);
                if (balanceNumber > 0) {
                    this.showStatus('您已经铸造过NFT。如需重新铸造，请勾选"重新铸造模式"', 'error');
                    return;
                }
            } catch (error) {
                console.error('检查用户NFT余额失败:', error);
                this.showStatus('检查铸造权限失败，请重试', 'error');
                return;
            }
        }
        
        const form = document.getElementById('mint-form');
        const formData = new FormData(form);
        const name = document.getElementById('nft-name').value;
        const description = document.getElementById('nft-description').value;
        const imageFile = document.getElementById('nft-image').files[0];
        const statusDiv = document.getElementById('mint-status');
        
        if (!name || !imageFile) {
            this.showStatus('请填写完整信息', 'error');
            return;
        }
        
        try {
            statusDiv.textContent = '正在上传图片到IPFS...';
            statusDiv.className = 'status-message info';
            statusDiv.classList.remove('hidden');
            
            // 上传图片到IPFS (使用Pinata)
            const imageResult = await nftManager.uploadFileToIPFS(imageFile, (progress) => {
                statusDiv.textContent = `正在上传图片到IPFS... ${progress}%`;
            });
            
            if (!imageResult.success) {
                throw new Error(`图片上传失败: ${imageResult.error}`);
            }
            
            statusDiv.textContent = '正在创建NFT元数据...';
            
            // 检查是否使用修复后的元数据
            const fixedTokenURI = document.getElementById('fixed-token-uri')?.value;
            let tokenURI;
            
            if (fixedTokenURI && fixedTokenURI.startsWith('ipfs://')) {
                // 使用修复后的tokenURI
                tokenURI = fixedTokenURI;
                statusDiv.textContent = '使用修复后的元数据...';
            } else {
                // 创建新的元数据
                const metadata = {
                    name: name,
                    description: description,
                    image: imageResult.url,
                    attributes: []
                };
                
                // 上传元数据到IPFS
                const metadataResult = await nftManager.uploadJSONToIPFS(metadata, (progress) => {
                    statusDiv.textContent = `正在上传元数据到IPFS... ${progress}%`;
                });
                
                if (!metadataResult.success) {
                    throw new Error(`元数据上传失败: ${metadataResult.error}`);
                }
                
                tokenURI = `ipfs://${metadataResult.hash}`;
            }
            

            
            statusDiv.textContent = '正在铸造NFT...';
            
            // 调用智能合约铸造NFT
            if (this.nftContract) {
                // 设置铸造费用（0.01 ether）
                const mintPrice = ethers.parseEther('0.01');
                const tx = await this.nftContract.mint(walletManager.userAddress, tokenURI, {
                    value: mintPrice
                });
                
                statusDiv.textContent = '交易已提交，等待确认...';
                
                const receipt = await tx.wait();
                
                statusDiv.textContent = 'NFT铸造成功！';
                statusDiv.className = 'status-message success';
                
                // 重置表单
                form.reset();
                document.getElementById('image-preview').classList.add('hidden');
                
                // 检查铸造资格（禁用铸造按钮）
                await this.checkMintingEligibility();
                
            } else {
                // 如果合约未初始化，显示模拟成功消息
                statusDiv.textContent = 'NFT铸造成功！(合约未初始化)';
                statusDiv.className = 'status-message success';
                
                // 重置表单
                form.reset();
                document.getElementById('image-preview').classList.add('hidden');
                
                // 检查铸造资格（禁用铸造按钮）
                await this.checkMintingEligibility();
            }
            
        } catch (error) {
            console.error('铸造NFT失败:', error);
            statusDiv.textContent = `铸造失败: ${error.message}`;
            statusDiv.className = 'status-message error';
        }
    }
    
    // IPFS上传方法已移至nft.js模块中的nftManager
    // 这里保留注释以说明功能已迁移
    
    // 生成本地占位符图片
    generatePlaceholderImage(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        
        // 设置背景
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, 300, 200);
        
        // 设置文字样式
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 绘制文字
        ctx.fillText(text, 150, 100);
        
        // 返回base64编码的图片
        return canvas.toDataURL('image/png');
    }
    
    // 加载我的NFT
    async loadMyNFTs() {
        const grid = document.getElementById('my-nft-grid');
        const emptyMessage = document.getElementById('my-nft-empty');
        
        if (!walletManager.isConnected) {
            grid.innerHTML = '<div class="loading-message">请先连接钱包</div>';
            return;
        }
        
        try {
            grid.innerHTML = '<div class="loading-message">加载中...</div>';
            
            // 模拟加载NFT数据
            const nfts = await this.fetchUserNFTs();
            
            if (nfts.length === 0) {
                grid.classList.add('hidden');
                emptyMessage.classList.remove('hidden');
            } else {
                grid.classList.remove('hidden');
                emptyMessage.classList.add('hidden');
                this.renderNFTGrid(grid, nfts, 'my-nft');
            }
            
        } catch (error) {
            console.error('加载NFT失败:', error);
            grid.innerHTML = '<div class="loading-message">加载失败，请重试</div>';
        }
    }
    
    // 获取用户NFT
    async fetchUserNFTs() {
        if (!this.nftContract || !walletManager.userAddress) {
            console.warn('合约未初始化或用户未连接钱包');
            return [];
        }

        try {
            // 获取用户拥有的NFT数量
            const balance = await this.nftContract.balanceOf(walletManager.userAddress);
            const nfts = [];

            // 遍历获取每个NFT的详细信息
            for (let i = 0; i < balance; i++) {
                try {
                    // 获取用户拥有的第i个NFT的tokenId
                    const tokenId = await this.nftContract.tokenOfOwnerByIndex(walletManager.userAddress, i);
                    
                    // 获取NFT的URI
                    const tokenURI = await this.nftContract.tokenURI(tokenId);
                    
                    // 获取元数据
                    let metadata = {
                        name: `NFT #${tokenId}`,
                        description: '区块链NFT',
                        image: this.generatePlaceholderImage(`NFT #${tokenId}`)
                    };

                    // 尝试从IPFS获取元数据
                    if (tokenURI.startsWith('ipfs://')) {
                        try {
                            const ipfsHash = tokenURI.replace('ipfs://', '');
                            const metadataUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
                            const response = await fetch(metadataUrl);
                            if (response.ok) {
                                metadata = await response.json();
                            }
                        } catch (error) {
                            console.warn(`获取NFT #${tokenId}元数据失败:`, error);
                        }
                    }

                    // 检查是否在市场上架
                    let isListed = false;
                    let price = '0';
                    if (this.marketContract) {
                        try {
                            const listing = await this.marketContract.listings(tokenId);
                            isListed = listing.isActive;
                            if (isListed) {
                                price = ethers.utils.formatEther(listing.price);
                            }
                        } catch (error) {
                            console.warn(`检查NFT #${tokenId}上架状态失败:`, error);
                        }
                    }

                    nfts.push({
                        tokenId: tokenId.toString(),
                        name: metadata.name,
                        description: metadata.description,
                        image: metadata.image,
                        owner: walletManager.userAddress,
                        isListed,
                        price
                    });
                } catch (error) {
                    console.error(`获取NFT #${i}信息失败:`, error);
                }
            }

            return nfts;
        } catch (error) {
            console.error('获取用户NFT失败:', error);
            return [];
        }
    }
    
    // 加载市场NFT
    async loadMarketNFTs() {
        const grid = document.getElementById('market-grid');
        const emptyMessage = document.getElementById('market-empty');
        
        try {
            grid.innerHTML = '<div class="loading-message">加载中...</div>';
            
            // 模拟加载市场数据
            const nfts = await this.fetchMarketNFTs();
            
            if (nfts.length === 0) {
                grid.classList.add('hidden');
                emptyMessage.classList.remove('hidden');
            } else {
                grid.classList.remove('hidden');
                emptyMessage.classList.add('hidden');
                this.renderNFTGrid(grid, nfts, 'market');
            }
            
        } catch (error) {
            console.error('加载市场NFT失败:', error);
            grid.innerHTML = '<div class="loading-message">加载失败，请重试</div>';
        }
    }
    
    // 获取市场NFT
    async fetchMarketNFTs() {
        const nfts = [];
        
        // 保留2个模拟数据
        const mockNFTs = [
            {
                tokenId: '3',
                name: '稀有收藏品',
                description: '限量版数字收藏品',
                image: this.generatePlaceholderImage('Market NFT 1'),
                owner: '0x1234...5678',
                price: '0.5',
                isListed: true
            },
            {
                tokenId: '4',
                name: '像素艺术',
                description: '8位像素风格艺术作品',
                image: this.generatePlaceholderImage('Market NFT 2'),
                owner: '0xabcd...efgh',
                price: '0.2',
                isListed: true
            }
        ];
        
        nfts.push(...mockNFTs);
        
        // 获取真实市场数据
        if (this.marketContract && this.nftContract) {
            try {
                // 获取市场上所有上架的NFT（添加offset和limit参数）
                const listedItems = await this.marketContract.getActiveListings(0, 50);
                
                for (const item of listedItems) {
                    try {
                        const tokenId = item.tokenId.toString();
                        const tokenURI = await this.nftContract.tokenURI(tokenId);
                        
                        let metadata = {};
                        if (tokenURI.startsWith('ipfs://')) {
                            const ipfsHash = tokenURI.replace('ipfs://', '');
                            const metadataUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
                            
                            try {
                                const response = await fetch(metadataUrl);
                                if (response.ok) {
                                    metadata = await response.json();
                                }
                            } catch (error) {
                                console.warn(`获取tokenId ${tokenId}的元数据失败:`, error);
                            }
                        }
                        
                        const nft = {
                            tokenId: tokenId,
                            name: metadata.name || `NFT #${tokenId}`,
                            description: metadata.description || '无描述',
                            image: metadata.image ? metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/') : this.generatePlaceholderImage(`NFT #${tokenId}`),
                            owner: item.seller,
                            price: ethers.formatEther(item.price),
                            isListed: true,
                            listingId: item.listingId.toString()
                        };
                        
                        nfts.push(nft);
                    } catch (error) {
                        console.warn(`处理市场NFT失败:`, error);
                    }
                }
            } catch (error) {
                console.error('获取市场NFT失败:', error);
            }
        }
        
        return nfts;
    }
    
    // 渲染NFT网格
    renderNFTGrid(container, nfts, type) {
        container.innerHTML = '';
        
        nfts.forEach(nft => {
            const nftCard = this.createNFTCard(nft, type);
            container.appendChild(nftCard);
        });
    }
    
    // 创建NFT卡片
    createNFTCard(nft, type) {
        const card = document.createElement('div');
        card.className = 'nft-card';
        
        const isOwner = nft.owner === walletManager.userAddress;
        
        card.innerHTML = `
            <img src="${nft.image}" alt="${nft.name}" class="nft-image" loading="lazy">
            <div class="nft-info">
                <div class="nft-name">${nft.name}</div>
                <div class="nft-description">${nft.description}</div>
                ${nft.price ? `<div class="nft-price">${nft.price} ETH</div>` : ''}
                <div class="nft-actions">
                    ${this.getNFTActions(nft, type, isOwner)}
                </div>
            </div>
        `;
        
        // 添加事件监听器
        this.addNFTCardListeners(card, nft, type, isOwner);
        
        return card;
    }
    
    // 获取NFT操作按钮
    getNFTActions(nft, type, isOwner) {
        if (type === 'my-nft') {
            if (nft.isListed) {
                return '<button class="action-button cancel-listing">取消上架</button>';
            } else {
                return '<button class="action-button list-nft">上架出售</button>';
            }
        } else if (type === 'market') {
            if (!isOwner) {
                return '<button class="action-button buy-nft">购买</button>';
            } else {
                return '<span class="text-muted">您的NFT</span>';
            }
        }
        return '';
    }
    
    // 添加NFT卡片事件监听器
    addNFTCardListeners(card, nft, type, isOwner) {
        const listBtn = card.querySelector('.list-nft');
        const buyBtn = card.querySelector('.buy-nft');
        const cancelBtn = card.querySelector('.cancel-listing');
        
        if (listBtn) {
            listBtn.addEventListener('click', () => {
                this.showListModal(nft);
            });
        }
        
        if (buyBtn) {
            buyBtn.addEventListener('click', () => {
                this.showBuyModal(nft);
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.handleCancelListing(nft);
            });
        }
    }
    
    // 显示上架模态框
    showListModal(nft) {
        const modal = document.getElementById('list-nft-modal');
        document.getElementById('list-token-id').value = nft.tokenId;
        document.getElementById('list-nft-contract').value = this.NFT_CONTRACT_ADDRESS;
        modal.classList.remove('hidden');
    }
    
    // 显示购买模态框
    showBuyModal(nft) {
        const modal = document.getElementById('buy-nft-modal');
        document.getElementById('buy-confirm-text').innerHTML = `确认购买 <strong>${nft.name}</strong> 吗？`;
        document.getElementById('buy-price').textContent = `${nft.price} ETH`;
        
        // 存储NFT信息到按钮数据属性
        const confirmBtn = document.getElementById('confirm-buy-btn');
        confirmBtn.dataset.tokenId = nft.tokenId;
        confirmBtn.dataset.price = nft.price;
        
        modal.classList.remove('hidden');
    }
    
    // 关闭模态框
    closeModal(modal) {
        modal.classList.add('hidden');
    }
    
    // 处理上架NFT
    async handleListNFT() {
        const price = document.getElementById('listing-price').value;
        const tokenId = document.getElementById('list-token-id').value;
        
        if (!price || parseFloat(price) <= 0) {
            this.showStatus('请输入有效价格', 'error');
            return;
        }
        
        try {
            // 导入marketManager
            const { marketManager } = await import('./market.js');
            
            // 调用真实的上架功能
            const result = await marketManager.listNFT(tokenId, price, (progress, message) => {
                this.showStatus(`${message} (${progress}%)`, 'info');
            });
            
            if (result.success) {
                this.showStatus('NFT上架成功！', 'success');
                this.closeModal(document.getElementById('list-nft-modal'));
                
                // 刷新页面数据
                if (this.currentPage === 'my-nft-page') {
                    this.loadMyNFTs();
                }
            } else {
                throw new Error('上架失败');
            }
            
        } catch (error) {
            console.error('上架失败:', error);
            this.showStatus(`上架失败: ${error.message}`, 'error');
        }
    }
    
    // 处理购买NFT
    async handleBuyNFT() {
        const confirmBtn = document.getElementById('confirm-buy-btn');
        const tokenId = confirmBtn.dataset.tokenId;
        const price = confirmBtn.dataset.price;
        
        try {
            // 导入marketManager
            const { marketManager } = await import('./market.js');
            
            // 调用真实的购买功能
            const result = await marketManager.buyNFT(tokenId, price, (progress, message) => {
                this.showStatus(`${message} (${progress}%)`, 'info');
            });
            
            if (result.success) {
                this.showStatus('NFT购买成功！', 'success');
                this.closeModal(document.getElementById('buy-nft-modal'));
                
                // 刷新页面数据
                if (this.currentPage === 'market-page') {
                    this.loadMarketNFTs();
                }
            } else {
                throw new Error('购买失败');
            }
            
        } catch (error) {
            console.error('购买失败:', error);
            this.showStatus(`购买失败: ${error.message}`, 'error');
        }
    }
    
    // 处理取消上架
    async handleCancelListing(nft) {
        try {
            // 导入marketManager
            const { marketManager } = await import('./market.js');
            
            // 调用真实的取消上架功能
            const result = await marketManager.cancelListing(nft.tokenId, (progress, message) => {
                this.showStatus(`${message} (${progress}%)`, 'info');
            });
            
            if (result.success) {
                this.showStatus('取消上架成功！', 'success');
                
                // 刷新页面数据
                if (this.currentPage === 'my-nft-page') {
                    this.loadMyNFTs();
                }
            } else {
                throw new Error('取消上架失败');
            }
            
        } catch (error) {
            console.error('取消上架失败:', error);
            this.showStatus(`取消上架失败: ${error.message}`, 'error');
        }
    }
    
    // 处理账户变化
    handleAccountChange(newAddress) {
        this.showStatus(`账户已切换到: ${walletManager.formatAddress(newAddress)}`, 'info');
        
        // 重新初始化合约
        this.initContracts();
        
        // 如果在我的NFT页面，重新加载数据
        if (this.currentPage === 'my-nft-page') {
            this.loadMyNFTs();
        }
    }
    
    // 处理网络变化
    handleNetworkChange(networkId) {
        if (networkId !== '11155111') {
            this.showStatus('请切换到Sepolia测试网络', 'error');
        } else {
            this.showStatus('已连接到Sepolia网络', 'success');
            this.initContracts();
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new NFTApp();
});