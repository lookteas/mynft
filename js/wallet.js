// 钱包管理模块
import { configManager } from './config-manager.js';

export class WalletManager {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.userAddress = null;
        this.isConnected = false;
        this.networkId = null;
        
        // 网络配置将从配置管理器异步加载
        this.networkConfig = null;
        this.configLoaded = false;
        
        this.initEventListeners();
        this.loadNetworkConfig();
    }
    
    // 加载网络配置
    async loadNetworkConfig() {
        try {
            this.networkConfig = await configManager.getNetworkConfig();
            this.configLoaded = true;
            console.log('钱包网络配置加载成功');
        } catch (error) {
            console.error('钱包网络配置加载失败:', error);
            // 设置默认配置以防止错误
            this.networkConfig = {
                chainId: '11155111',
                chainIdHex: '0xaa36a7',
                name: 'sepolia',
                nativeCurrency: {
                    name: 'SepoliaETH',
                    symbol: 'ETH',
                    decimals: 18
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io/']
            };
            this.configLoaded = true;
        }
    }
    
    // 确保配置已加载
    async ensureConfigLoaded() {
        if (!this.configLoaded) {
            await this.loadNetworkConfig();
        }
    }
    
    // 初始化事件监听器
    initEventListeners() {
        if (typeof window.ethereum !== 'undefined') {
            // 监听账户变化
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnect();
                } else {
                    this.handleAccountChange(accounts[0]);
                }
            });
            
            // 监听网络变化
            window.ethereum.on('chainChanged', (chainId) => {
                this.handleNetworkChange(chainId);
            });
            
            // 监听连接状态变化
            window.ethereum.on('connect', (connectInfo) => {
                console.log('钱包已连接:', connectInfo);
            });
            
            window.ethereum.on('disconnect', (error) => {
                console.log('钱包已断开:', error);
                this.disconnect();
            });
        }
    }
    
    // 检查是否安装了MetaMask
    isMetaMaskInstalled() {
        return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
    }
    
    // 连接钱包
    async connect() {
        try {
            if (!this.isMetaMaskInstalled()) {
                throw new Error('请安装 MetaMask 钱包');
            }
            
            // 请求连接账户
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });
            
            if (accounts.length === 0) {
                throw new Error('未找到账户，请在 MetaMask 中创建或导入账户');
            }
            
            // 创建 provider 和 signer
            this.provider = new ethers.BrowserProvider(window.ethereum);
            this.signer = await this.provider.getSigner();
            this.userAddress = accounts[0];
            this.isConnected = true;
            
            // 检查网络
            const network = await this.provider.getNetwork();
            this.networkId = network.chainId.toString();
            
            // 确保配置已加载
            await this.ensureConfigLoaded();
            
            // 如果不在目标网络，提示切换
            if (this.networkId !== this.networkConfig.chainId) {
                await this.switchToTargetNetwork();
            }
            
            this.updateUI();
            
            return {
                success: true,
                address: this.userAddress,
                network: this.networkId
            };
            
        } catch (error) {
            console.error('连接钱包失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 断开连接
    disconnect() {
        this.provider = null;
        this.signer = null;
        this.userAddress = null;
        this.isConnected = false;
        this.networkId = null;
        
        this.updateUI();
    }
    
    // 切换到目标网络
    async switchToTargetNetwork() {
        await this.ensureConfigLoaded();
        
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: this.networkConfig.chainIdHex }]
            });
        } catch (switchError) {
            // 如果网络不存在，添加网络
            if (switchError.code === 4902) {
                try {
                    const networkConfig = {
                        chainId: this.networkConfig.chainIdHex,
                        chainName: `${this.networkConfig.name.charAt(0).toUpperCase() + this.networkConfig.name.slice(1)} Test Network`,
                        nativeCurrency: this.networkConfig.nativeCurrency,
                        rpcUrls: this.networkConfig.rpcUrls,
                        blockExplorerUrls: this.networkConfig.blockExplorerUrls
                    };
                    
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [networkConfig]
                    });
                } catch (addError) {
                    throw new Error(`添加 ${this.networkConfig.name} 网络失败`);
                }
            } else {
                throw new Error(`切换到 ${this.networkConfig.name} 网络失败`);
            }
        }
    }
    
    // 处理账户变化
    async handleAccountChange(newAccount) {
        if (newAccount && newAccount !== this.userAddress) {
            this.userAddress = newAccount;
            if (this.provider) {
                this.signer = await this.provider.getSigner();
            }
            this.updateUI();
            
            // 触发自定义事件
            window.dispatchEvent(new CustomEvent('accountChanged', {
                detail: { address: newAccount }
            }));
        }
    }
    
    // 处理网络变化
    async handleNetworkChange(chainId) {
        const networkId = parseInt(chainId, 16).toString();
        if (networkId !== this.networkId) {
            this.networkId = networkId;
            
            // 确保配置已加载
            await this.ensureConfigLoaded();
            
            // 如果不在目标网络，显示警告
            if (networkId !== this.networkConfig.chainId) {
                this.showNetworkWarning();
            } else {
                this.hideNetworkWarning();
            }
            
            // 触发自定义事件
            window.dispatchEvent(new CustomEvent('networkChanged', {
                detail: { networkId }
            }));
        }
    }
    
    // 显示网络警告
    showNetworkWarning() {
        // 可以在这里添加网络警告的UI逻辑
        if (this.networkConfig) {
            console.warn(`请切换到 ${this.networkConfig.name} 测试网络`);
        }
    }
    
    // 隐藏网络警告
    hideNetworkWarning() {
        // 隐藏网络警告的UI逻辑
        if (this.networkConfig) {
            console.log(`已连接到 ${this.networkConfig.name} 网络`);
        }
    }
    
    // 更新UI
    updateUI() {
        const connectBtn = document.getElementById('connect-wallet-btn');
        const disconnectBtn = document.getElementById('disconnect-wallet-btn');
        const addressDisplay = document.getElementById('wallet-address-display');
        
        if (this.isConnected && this.userAddress) {
            // 显示已连接状态
            connectBtn.classList.add('hidden');
            disconnectBtn.classList.remove('hidden');
            addressDisplay.classList.remove('hidden');
            addressDisplay.textContent = this.formatAddress(this.userAddress);
            
            // 启用功能按钮
            this.enableFeatureButtons();
            
        } else {
            // 显示未连接状态
            connectBtn.classList.remove('hidden');
            disconnectBtn.classList.add('hidden');
            addressDisplay.classList.add('hidden');
            
            // 禁用功能按钮
            this.disableFeatureButtons();
        }
    }
    
    // 启用功能按钮
    enableFeatureButtons() {
        const buttons = [
            'nav-to-my-nft',
            'nav-to-mint',
            'nav-to-market'
        ];
        
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            const status = document.getElementById(`home-${id.replace('nav-to-', '')}-status`);
            if (btn) {
                btn.disabled = false;
            }
            if (status) {
                status.classList.add('hidden');
            }
        });
    }
    
    // 禁用功能按钮
    disableFeatureButtons() {
        const buttons = [
            'nav-to-my-nft',
            'nav-to-mint',
            'nav-to-market'
        ];
        
        buttons.forEach(id => {
            const btn = document.getElementById(id);
            const status = document.getElementById(`home-${id.replace('nav-to-', '')}-status`);
            if (btn) {
                btn.disabled = true;
            }
            if (status) {
                status.classList.remove('hidden');
            }
        });
    }
    
    // 格式化地址显示
    formatAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    
    // 获取余额
    async getBalance() {
        if (!this.provider || !this.userAddress) {
            throw new Error('钱包未连接');
        }
        
        try {
            const balance = await this.provider.getBalance(this.userAddress);
            return ethers.formatEther(balance);
        } catch (error) {
            console.error('获取余额失败:', error);
            throw error;
        }
    }
    
    // 发送交易
    async sendTransaction(transaction) {
        if (!this.signer) {
            throw new Error('钱包未连接');
        }
        
        try {
            const tx = await this.signer.sendTransaction(transaction);
            return tx;
        } catch (error) {
            console.error('发送交易失败:', error);
            throw error;
        }
    }
    
    // 签名消息
    async signMessage(message) {
        if (!this.signer) {
            throw new Error('钱包未连接');
        }
        
        try {
            const signature = await this.signer.signMessage(message);
            return signature;
        } catch (error) {
            console.error('签名失败:', error);
            throw error;
        }
    }
    
    // 检查连接状态
    async checkConnection() {
        if (!this.isMetaMaskInstalled()) {
            return false;
        }
        
        try {
            const accounts = await window.ethereum.request({
                method: 'eth_accounts'
            });
            
            if (accounts.length > 0) {
                // 自动重连
                await this.connect();
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('检查连接状态失败:', error);
            return false;
        }
    }
    
    // 获取当前网络信息
    async getNetworkInfo() {
        if (!this.provider) {
            throw new Error('钱包未连接');
        }
        
        try {
            const network = await this.provider.getNetwork();
            return {
                chainId: network.chainId.toString(),
                name: network.name
            };
        } catch (error) {
            console.error('获取网络信息失败:', error);
            throw error;
        }
    }
    
    // 估算Gas费用
    async estimateGas(transaction) {
        if (!this.provider) {
            throw new Error('钱包未连接');
        }
        
        try {
            const gasEstimate = await this.provider.estimateGas(transaction);
            const gasPrice = await this.provider.getFeeData();
            
            return {
                gasLimit: gasEstimate.toString(),
                gasPrice: gasPrice.gasPrice ? gasPrice.gasPrice.toString() : '0',
                maxFeePerGas: gasPrice.maxFeePerGas ? gasPrice.maxFeePerGas.toString() : '0',
                maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas ? gasPrice.maxPriorityFeePerGas.toString() : '0'
            };
        } catch (error) {
            console.error('估算Gas失败:', error);
            throw error;
        }
    }
}

// 导出单例实例
export const walletManager = new WalletManager();