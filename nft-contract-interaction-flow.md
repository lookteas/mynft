# NFT合约交互逻辑流程图和说明

## 概述

本文档详细描述了NFT项目中智能合约交互的完整逻辑流程，包括NFT铸造、市场交易、授权管理等核心功能的实现机制。

## 整体架构图

```mermaid
graph TB
    subgraph "前端应用层"
        UI[用户界面]
        WM[钱包管理器]
        NM[NFT管理器]
        MM[市场管理器]
        CM[配置管理器]
        SCM[共享合约管理器]
    end
    
    subgraph "区块链层"
        NFT[MyNFT合约]
        MARKET[NFTMarket合约]
        WALLET[用户钱包]
    end
    
    subgraph "存储层"
        IPFS[IPFS存储]
        CONFIG[配置文件]
    end
    
    UI --> WM
    UI --> NM
    UI --> MM
    
    WM --> WALLET
    NM --> SCM
    MM --> SCM
    SCM --> NFT
    SCM --> MARKET
    
    NM --> IPFS
    NM --> CM
    MM --> CM
    CM --> CONFIG
    
    NFT --> MARKET
```

## 1. NFT铸造流程

### 1.1 铸造时序图

```mermaid
sequenceDiagram
    participant User as 用户
    participant UI as 前端界面
    participant NM as NFT管理器
    participant WM as 钱包管理器
    participant IPFS as IPFS存储
    participant NFT as NFT合约
    
    User->>UI: 选择文件并填写元数据
    UI->>NM: validateFile(file)
    NM-->>UI: 验证结果
    
    alt 文件验证通过
        UI->>NM: uploadFileToIPFS(file)
        NM->>IPFS: 上传文件
        IPFS-->>NM: 返回IPFS哈希
        
        NM->>NM: createMetadata(name, description, imageHash)
        NM->>IPFS: 上传元数据JSON
        IPFS-->>NM: 返回元数据URI
        
        UI->>WM: 检查钱包连接
        WM-->>UI: 连接状态
        
        UI->>NFT: mint(userAddress, tokenURI)
        NFT->>NFT: 验证铸造条件
        NFT->>NFT: _safeMint(to, tokenId)
        NFT->>NFT: _setTokenURI(tokenId, tokenURI)
        NFT-->>UI: 交易哈希
        
        UI->>User: 铸造成功通知
    else 文件验证失败
        NM-->>UI: 错误信息
        UI->>User: 显示错误
    end
```

### 1.2 铸造核心逻辑

#### 前端验证流程
```mermaid
flowchart TD
    A[用户选择文件] --> B{文件类型检查}
    B -->|支持的格式| C{文件大小检查}
    B -->|不支持| D[显示错误信息]
    C -->|小于10MB| E[生成预览]
    C -->|超过限制| D
    E --> F[上传到IPFS]
    F --> G{上传成功?}
    G -->|成功| H[创建元数据]
    G -->|失败| I[重试或报错]
    H --> J[上传元数据到IPFS]
    J --> K[调用铸造合约]
```

#### 智能合约验证流程
```mermaid
flowchart TD
    A[接收铸造请求] --> B{铸造是否启用?}
    B -->|否| C[抛出错误]
    B -->|是| D{检查最大供应量}
    D -->|已达上限| C
    D -->|未达上限| E{检查用户铸造限额}
    E -->|已达限额| C
    E -->|未达限额| F{检查支付金额}
    F -->|不足| C
    F -->|充足| G[执行铸造]
    G --> H[更新计数器]
    H --> I[设置TokenURI]
    I --> J[触发事件]
    J --> K[退还多余ETH]
```

## 2. NFT市场交易流程

### 2.1 上架NFT流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant UI as 前端界面
    participant MM as 市场管理器
    participant NFT as NFT合约
    participant MARKET as 市场合约
    
    User->>UI: 选择NFT并设置价格
    UI->>MM: validatePrice(price)
    MM-->>UI: 价格验证结果
    
    alt 价格验证通过
        UI->>MM: listNFT(tokenId, price)
        MM->>NFT: ownerOf(tokenId)
        NFT-->>MM: 所有者地址
        
        alt 用户是所有者
            MM->>NFT: getApproved(tokenId)
            NFT-->>MM: 授权地址
            
            alt 未授权市场合约
                MM->>NFT: approve(marketAddress, tokenId)
                NFT-->>MM: 授权交易哈希
            end
            
            MM->>MARKET: listNFT(nftContract, tokenId, price)
            MARKET->>MARKET: 验证上架条件
            MARKET->>MARKET: 创建上架记录
            MARKET-->>MM: 上架交易哈希
            MM-->>UI: 上架成功
            UI->>User: 显示成功消息
        else 用户非所有者
            MM-->>UI: 所有权错误
            UI->>User: 显示错误
        end
    else 价格验证失败
        MM-->>UI: 价格错误
        UI->>User: 显示错误
    end
```

### 2.2 购买NFT流程

```mermaid
sequenceDiagram
    participant Buyer as 买家
    participant UI as 前端界面
    participant MM as 市场管理器
    participant MARKET as 市场合约
    participant NFT as NFT合约
    participant Seller as 卖家
    
    Buyer->>UI: 选择要购买的NFT
    UI->>MM: buyNFT(tokenId, price)
    MM->>MM: 检查买家余额
    
    alt 余额充足
        MM->>MARKET: buyNFT(listingId, {value: price})
        MARKET->>MARKET: 验证上架状态
        MARKET->>MARKET: 计算平台费用
        MARKET->>NFT: transferFrom(seller, buyer, tokenId)
        NFT-->>MARKET: 转移成功
        MARKET->>Seller: 转账给卖家
        MARKET->>MARKET: 转账平台费用
        MARKET->>MARKET: 更新上架状态
        MARKET-->>MM: 购买交易哈希
        MM-->>UI: 购买成功
        UI->>Buyer: 显示成功消息
    else 余额不足
        MM-->>UI: 余额不足错误
        UI->>Buyer: 显示错误
    end
```

## 3. 授权管理流程

### 3.1 NFT授权机制

```mermaid
flowchart TD
    A[用户要上架NFT] --> B{检查当前授权状态}
    B -->|已授权市场合约| F[直接上架]
    B -->|未授权| C[调用approve函数]
    C --> D{授权交易确认}
    D -->|成功| E[更新授权状态]
    D -->|失败| G[显示错误]
    E --> F
    F --> H[调用市场合约listNFT]
    H --> I[上架完成]
```

### 3.2 授权状态检查

```mermaid
sequenceDiagram
    participant MM as 市场管理器
    participant NFT as NFT合约
    participant MARKET as 市场合约
    
    MM->>NFT: getApproved(tokenId)
    NFT-->>MM: 当前授权地址
    MM->>MARKET: getAddress()
    MARKET-->>MM: 市场合约地址
    MM->>MM: 比较地址是否相同
    
    alt 地址相同
        MM->>MM: 授权有效，继续操作
    else 地址不同
        MM->>NFT: approve(marketAddress, tokenId)
        NFT-->>MM: 授权交易
    end
```

## 4. 错误处理机制

### 4.1 前端错误处理

```mermaid
flowchart TD
    A[合约调用] --> B{交易是否成功?}
    B -->|成功| C[更新UI状态]
    B -->|失败| D{错误类型判断}
    D -->|用户拒绝| E[显示用户取消消息]
    D -->|余额不足| F[显示余额不足提示]
    D -->|Gas不足| G[建议增加Gas费用]
    D -->|合约错误| H[显示具体错误信息]
    D -->|网络错误| I[建议重试或切换网络]
    E --> J[记录错误日志]
    F --> J
    G --> J
    H --> J
    I --> J
```

### 4.2 智能合约错误处理

```mermaid
flowchart TD
    A[接收函数调用] --> B{参数验证}
    B -->|无效| C[revert with message]
    B -->|有效| D{权限检查}
    D -->|无权限| C
    D -->|有权限| E{状态检查}
    E -->|状态无效| C
    E -->|状态有效| F[执行业务逻辑]
    F --> G{执行是否成功?}
    G -->|失败| C
    G -->|成功| H[触发事件]
    H --> I[返回结果]
```

## 5. Gas费用管理

### 5.1 Gas估算流程

```mermaid
sequenceDiagram
    participant UI as 前端界面
    participant WM as 钱包管理器
    participant Contract as 智能合约
    
    UI->>WM: 准备交易参数
    WM->>Contract: estimateGas(functionCall)
    Contract-->>WM: 估算Gas用量
    WM->>WM: 计算Gas费用
    WM-->>UI: 显示预估费用
    UI->>UI: 用户确认
    UI->>WM: 发送交易
    WM->>Contract: 执行交易
    Contract-->>WM: 交易结果
```

## 6. 状态管理

### 6.1 前端状态同步

```mermaid
stateDiagram-v2
    [*] --> Disconnected: 初始状态
    Disconnected --> Connecting: 连接钱包
    Connecting --> Connected: 连接成功
    Connecting --> Disconnected: 连接失败
    Connected --> Loading: 加载合约
    Loading --> Ready: 合约就绪
    Loading --> Error: 加载失败
    Ready --> Processing: 执行交易
    Processing --> Ready: 交易完成
    Processing --> Error: 交易失败
    Error --> Ready: 重试成功
    Connected --> Disconnected: 断开连接
```

## 7. 核心类和方法说明

### 7.1 NFTManager类
- **validateFile()**: 验证上传文件的类型和大小
- **uploadFileToIPFS()**: 上传文件到IPFS存储
- **createMetadata()**: 创建NFT元数据JSON
- **generatePreview()**: 生成文件预览

### 7.2 MarketManager类
- **listNFT()**: 上架NFT到市场
- **buyNFT()**: 购买市场上的NFT
- **cancelListing()**: 取消NFT上架
- **validatePrice()**: 验证价格有效性

### 7.3 SharedContractManager类
- **initContracts()**: 初始化合约实例
- **getNFTContract()**: 获取NFT合约实例
- **getMarketContract()**: 获取市场合约实例
- **mintNFT()**: 调用NFT铸造功能

### 7.4 智能合约核心函数

#### MyNFT.sol
- **mint()**: 铸造新的NFT
- **setMintPrice()**: 设置铸造价格
- **setMintingEnabled()**: 控制铸造状态
- **tokensOfOwner()**: 获取用户拥有的所有NFT

#### NFTMarket.sol
- **listNFT()**: 上架NFT
- **buyNFT()**: 购买NFT
- **cancelListing()**: 取消上架
- **updateListingPrice()**: 更新上架价格

## 8. 安全考虑

### 8.1 重入攻击防护
- 使用OpenZeppelin的ReentrancyGuard
- 状态更新在外部调用之前完成
- 使用checks-effects-interactions模式

### 8.2 权限控制
- 所有权验证：确保只有NFT所有者可以上架
- 授权检查：确保市场合约有权限转移NFT
- 管理员权限：关键参数只能由合约所有者修改

### 8.3 输入验证
- 地址非零检查
- 价格范围验证
- 文件类型和大小限制
- 元数据格式验证

## 9. 使用示例

### 9.1 铸造NFT示例
```javascript
// 1. 验证文件
const validation = nftManager.validateFile(file);
if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
}

// 2. 上传到IPFS
const uploadResult = await nftManager.uploadFileToIPFS(file, (progress) => {
    console.log(`上传进度: ${progress}%`);
});

// 3. 创建元数据
const metadata = nftManager.createMetadata(name, description, uploadResult.hash);

// 4. 上传元数据
const metadataResult = await nftManager.uploadJSONToIPFS(metadata);

// 5. 铸造NFT
const mintTx = await sharedContractManager.mintNFT(
    userAddress, 
    metadataResult.url, 
    mintPrice
);
```

### 9.2 上架NFT示例
```javascript
// 1. 验证价格
const priceValidation = await marketManager.validatePrice(price);
if (!priceValidation.valid) {
    throw new Error(priceValidation.errors.join(', '));
}

// 2. 上架NFT
const listResult = await marketManager.listNFT(tokenId, price, (progress, message) => {
    console.log(`${progress}%: ${message}`);
});

console.log('上架成功:', listResult.transactionHash);
```

## 10. 总结

本NFT合约交互系统通过分层架构设计，实现了完整的NFT生命周期管理：

1. **铸造阶段**：文件验证 → IPFS上传 → 元数据创建 → 合约铸造
2. **交易阶段**：授权检查 → 上架验证 → 市场交易 → 资金分配
3. **管理阶段**：状态同步 → 错误处理 → 安全防护 → 用户体验

系统具备完善的错误处理机制、安全防护措施和用户友好的交互体验，为NFT项目提供了可靠的技术基础。