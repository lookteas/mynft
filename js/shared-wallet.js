// 共享钱包连接模块
// 提供统一的钱包UI更新和连接状态管理功能

export class SharedWalletUI {
    constructor(walletManager) {
        this.walletManager = walletManager;
        this.callbacks = {
            onConnect: [],
            onDisconnect: [],
            onAccountChange: [],
            onNetworkChange: []
        };
        this.setupEventListeners();
    }

    // 设置事件监听器
    setupEventListeners() {
        // 监听钱包管理器的自定义事件
        window.addEventListener('accountChanged', (e) => {
            this.handleAccountChange(e.detail.address);
        });

        window.addEventListener('networkChanged', (e) => {
            this.handleNetworkChange(e.detail.networkId);
        });
    }

    // 注册回调函数
    onConnect(callback) {
        this.callbacks.onConnect.push(callback);
    }

    onDisconnect(callback) {
        this.callbacks.onDisconnect.push(callback);
    }

    onAccountChange(callback) {
        this.callbacks.onAccountChange.push(callback);
    }

    onNetworkChange(callback) {
        this.callbacks.onNetworkChange.push(callback);
    }

    // 统一的钱包连接方法
    async connectWallet(statusCallback = null) {
        try {
            if (statusCallback) {
                statusCallback('正在连接钱包...', 'info');
            }

            const result = await this.walletManager.connect();

            if (result.success) {
                if (statusCallback) {
                    statusCallback('钱包连接成功！', 'success');
                }
                this.updateWalletUI();
                this.triggerCallbacks('onConnect', result);
                return result;
            } else {
                if (statusCallback) {
                    statusCallback(`连接失败: ${result.error}`, 'error');
                }
                return result;
            }
        } catch (error) {
            console.error('连接钱包失败:', error);
            if (statusCallback) {
                statusCallback('连接钱包失败: ' + error.message, 'error');
            }
            return { success: false, error: error.message };
        }
    }

    // 统一的钱包断开方法
    disconnectWallet(statusCallback = null) {
        this.walletManager.disconnect();
        this.updateWalletUI();
        
        if (statusCallback) {
            statusCallback('钱包已断开连接', 'info');
        }
        
        this.triggerCallbacks('onDisconnect');
    }

    // 统一的钱包UI更新方法
    updateWalletUI() {
        // 更新连接/断开按钮
        this.updateConnectButtons();
        
        // 更新地址显示
        this.updateAddressDisplay();
        
        // 更新功能按钮状态
        this.updateFeatureButtons();
    }

    // 更新连接按钮状态
    updateConnectButtons() {
        const connectBtn = document.getElementById('connect-wallet-btn');
        const disconnectBtn = document.getElementById('disconnect-wallet-btn');

        if (connectBtn && disconnectBtn) {
            if (this.walletManager.isConnected) {
                connectBtn.classList.add('hidden');
                disconnectBtn.classList.remove('hidden');
            } else {
                connectBtn.classList.remove('hidden');
                disconnectBtn.classList.add('hidden');
            }
        }
    }

    // 更新地址显示
    updateAddressDisplay() {
        // 主页面的地址显示
        const addressDisplay = document.getElementById('wallet-address-display');
        if (addressDisplay) {
            if (this.walletManager.isConnected && this.walletManager.userAddress) {
                addressDisplay.classList.remove('hidden');
                addressDisplay.textContent = this.formatAddress(this.walletManager.userAddress);
            } else {
                addressDisplay.classList.add('hidden');
            }
        }

        // IPFS修复页面的地址显示
        const walletDisplay = document.getElementById('wallet-display');
        if (walletDisplay) {
            if (this.walletManager.isConnected && this.walletManager.userAddress) {
                walletDisplay.classList.remove('hidden');
                walletDisplay.textContent = this.formatAddress(this.walletManager.userAddress);
            } else {
                walletDisplay.classList.add('hidden');
            }
        }
    }

    // 更新功能按钮状态
    updateFeatureButtons() {
        const buttons = [
            'nav-to-my-nft',
            'nav-to-mint',
            'nav-to-market'
        ];

        buttons.forEach(id => {
            const btn = document.getElementById(id);
            const status = document.getElementById(`home-${id.replace('nav-to-', '')}-status`);
            
            if (btn) {
                btn.disabled = !this.walletManager.isConnected;
            }
            
            if (status) {
                if (this.walletManager.isConnected) {
                    status.classList.add('hidden');
                } else {
                    status.classList.remove('hidden');
                }
            }
        });
    }

    // 格式化地址显示
    formatAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    // 处理账户变化
    handleAccountChange(newAddress) {
        this.updateWalletUI();
        this.triggerCallbacks('onAccountChange', newAddress);
    }

    // 处理网络变化
    handleNetworkChange(networkId) {
        this.triggerCallbacks('onNetworkChange', networkId);
    }

    // 触发回调函数
    triggerCallbacks(eventType, data = null) {
        this.callbacks[eventType].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`回调函数执行失败 (${eventType}):`, error);
            }
        });
    }

    // 检查钱包连接状态
    async checkConnection() {
        const isConnected = await this.walletManager.checkConnection();
        if (isConnected) {
            this.updateWalletUI();
            this.triggerCallbacks('onConnect', { success: true, address: this.walletManager.userAddress });
        }
        return isConnected;
    }

    // 设置钱包连接按钮事件监听器
    setupWalletButtons(statusCallback = null) {
        const connectBtn = document.getElementById('connect-wallet-btn');
        const disconnectBtn = document.getElementById('disconnect-wallet-btn');

        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                this.connectWallet(statusCallback);
            });
        }

        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => {
                this.disconnectWallet(statusCallback);
            });
        }
    }

    // 获取当前连接状态
    getConnectionStatus() {
        return {
            isConnected: this.walletManager.isConnected,
            address: this.walletManager.userAddress,
            networkId: this.walletManager.networkId,
            provider: this.walletManager.provider,
            signer: this.walletManager.signer
        };
    }
}

// 导出工厂函数，用于创建共享钱包UI实例
export function createSharedWalletUI(walletManager) {
    return new SharedWalletUI(walletManager);
}