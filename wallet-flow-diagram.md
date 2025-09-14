# 钱包逻辑实现流程图

## 整体架构图

```mermaid
graph TB
    A[用户点击连接钱包] --> B{检查MetaMask是否安装}
    B -->|否| C[显示安装MetaMask提示]
    B -->|是| D[请求账户权限]
    
    D --> E{用户授权}
    E -->|拒绝| F[显示连接失败]
    E -->|同意| G[获取账户列表]
    
    G --> H{账户是否存在}
    H -->|否| I[提示创建账户]
    H -->|是| J[创建Provider和Signer]
    
    J --> K[获取当前网络]
    K --> L{网络是否正确}
    L -->|否| M[切换/添加网络]
    L -->|是| N[连接成功]
    
    M --> O{切换成功}
    O -->|否| P[显示网络错误]
    O -->|是| N
    
    N --> Q[更新UI状态]
    Q --> R[启用功能按钮]
    R --> S[监听事件变化]
```

## 详细流程说明

### 1. 初始化阶段

```mermaid
sequenceDiagram
    participant U as 用户
    participant WM as WalletManager
    participant CM as ConfigManager
    participant MM as MetaMask
    
    Note over WM: 创建WalletManager实例
    WM->>CM: 加载网络配置
    CM-->>WM: 返回网络配置
    WM->>WM: 初始化事件监听器
    WM->>MM: 监听accountsChanged
    WM->>MM: 监听chainChanged
    WM->>MM: 监听connect/disconnect
```

### 2. 连接流程

```mermaid
sequenceDiagram
    participant U as 用户
    participant UI as SharedWalletUI
    participant WM as WalletManager
    participant MM as MetaMask
    participant BC as 区块链网络
    
    U->>UI: 点击连接钱包
    UI->>WM: connect()
    
    WM->>WM: 检查MetaMask安装
    alt MetaMask未安装
        WM-->>UI: 返回错误信息
        UI-->>U: 显示安装提示
    else MetaMask已安装
        WM->>MM: eth_requestAccounts
        MM-->>U: 显示授权弹窗
        U-->>MM: 用户授权
        MM-->>WM: 返回账户列表
        
        WM->>MM: 创建BrowserProvider
        WM->>MM: 获取Signer
        WM->>BC: 获取网络信息
        BC-->>WM: 返回chainId
        
        alt 网络不匹配
            WM->>MM: wallet_switchEthereumChain
            alt 网络不存在
                MM-->>WM: 错误码4902
                WM->>MM: wallet_addEthereumChain
            end
        end
        
        WM->>UI: 返回连接结果
        UI->>UI: updateWalletUI()
        UI-->>U: 显示连接成功
    end
```

### 3. 状态管理流程

```mermaid
stateDiagram-v2
    [*] --> 未连接
    未连接 --> 连接中 : 用户点击连接
    连接中 --> 已连接 : 连接成功
    连接中 --> 未连接 : 连接失败
    
    已连接 --> 网络检查 : 监听到网络变化
    网络检查 --> 已连接 : 网络正确
    网络检查 --> 网络错误 : 网络不匹配
    网络错误 --> 已连接 : 切换成功
    网络错误 --> 未连接 : 切换失败
    
    已连接 --> 账户变化 : 监听到账户变化
    账户变化 --> 已连接 : 更新账户信息
    账户变化 --> 未连接 : 账户为空
    
    已连接 --> 未连接 : 用户断开连接
    已连接 --> 未连接 : MetaMask断开
```

### 4. 事件监听机制

```mermaid
graph LR
    A[MetaMask事件] --> B[WalletManager监听]
    B --> C{事件类型}
    
    C -->|accountsChanged| D[处理账户变化]
    C -->|chainChanged| E[处理网络变化]
    C -->|connect| F[处理连接事件]
    C -->|disconnect| G[处理断开事件]
    
    D --> H[更新用户地址]
    E --> I[更新网络ID]
    F --> J[记录连接状态]
    G --> K[清理连接状态]
    
    H --> L[触发自定义事件]
    I --> L
    J --> L
    K --> L
    
    L --> M[SharedWalletUI响应]
    M --> N[更新UI界面]
```

### 5. UI更新流程

```mermaid
flowchart TD
    A[钱包状态变化] --> B[SharedWalletUI.updateWalletUI]
    
    B --> C[updateConnectButtons]
    B --> D[updateAddressDisplay]
    B --> E[updateFeatureButtons]
    
    C --> F{钱包已连接?}
    F -->|是| G[隐藏连接按钮<br/>显示断开按钮]
    F -->|否| H[显示连接按钮<br/>隐藏断开按钮]
    
    D --> I{钱包已连接?}
    I -->|是| J[显示格式化地址]
    I -->|否| K[隐藏地址显示]
    
    E --> L{钱包已连接?}
    L -->|是| M[启用功能按钮<br/>隐藏提示信息]
    L -->|否| N[禁用功能按钮<br/>显示连接提示]
```

## 核心类和方法说明

### WalletManager 类

| 属性 | 说明 |
|------|------|
| `provider` | ethers.js BrowserProvider实例 |
| `signer` | 签名器实例，用于交易签名 |
| `userAddress` | 当前连接的用户地址 |
| `isConnected` | 连接状态标识 |
| `networkId` | 当前网络ID |
| `networkConfig` | 网络配置信息 |

| 方法 | 功能 |
|------|------|
| `connect()` | 连接钱包的主要方法 |
| `disconnect()` | 断开钱包连接 |
| `switchToTargetNetwork()` | 切换到目标网络 |
| `handleAccountChange()` | 处理账户变化 |
| `handleNetworkChange()` | 处理网络变化 |
| `updateUI()` | 更新用户界面 |

### SharedWalletUI 类

| 方法 | 功能 |
|------|------|
| `connectWallet()` | 统一的钱包连接接口 |
| `updateWalletUI()` | 统一的UI更新方法 |
| `setupEventListeners()` | 设置事件监听器 |
| `triggerCallbacks()` | 触发注册的回调函数 |

## 错误处理机制

```mermaid
graph TD
    A[钱包操作] --> B{操作成功?}
    B -->|是| C[返回成功结果]
    B -->|否| D[捕获错误]
    
    D --> E{错误类型}
    E -->|MetaMask未安装| F[提示安装MetaMask]
    E -->|用户拒绝授权| G[提示用户授权]
    E -->|网络错误| H[提示切换网络]
    E -->|账户不存在| I[提示创建账户]
    E -->|其他错误| J[显示通用错误信息]
    
    F --> K[记录错误日志]
    G --> K
    H --> K
    I --> K
    J --> K
    
    K --> L[返回错误结果]
```

## 配置管理集成

```mermaid
sequenceDiagram
    participant WM as WalletManager
    participant CM as ConfigManager
    participant CF as 配置文件
    
    WM->>CM: loadNetworkConfig()
    CM->>CF: 读取contract-config.json
    CF-->>CM: 返回配置数据
    CM->>CM: 验证配置格式
    CM-->>WM: 返回网络配置
    
    Note over WM: 使用配置进行网络检查和切换
    WM->>WM: switchToTargetNetwork()
```

## 安全考虑

1. **权限验证**：每次操作前检查钱包连接状态
2. **网络验证**：确保在正确的区块链网络上操作
3. **错误处理**：完善的错误捕获和用户提示
4. **状态同步**：实时监听钱包状态变化
5. **配置管理**：统一的网络配置管理，避免硬编码

## 使用示例

```javascript
// 基本连接
const result = await walletManager.connect();
if (result.success) {
    console.log('连接成功:', result.address);
} else {
    console.error('连接失败:', result.error);
}

// 使用SharedWalletUI
const sharedUI = new SharedWalletUI(walletManager);
sharedUI.onConnect((result) => {
    console.log('钱包已连接:', result.address);
});

await sharedUI.connectWallet((message, type) => {
    console.log(`${type}: ${message}`);
});
```

这个流程图展示了NFT项目中钱包连接和管理的完整逻辑实现，包括初始化、连接、状态管理、事件监听、UI更新和错误处理等各个环节。