# NFT交易平台 (纯个人学习项目)

一个基于以太坊Sepolia测试网的完整NFT交易平台，支持NFT铸造、展示、交易等基本功能。采用Web技术栈和Hardhat开发框架，提供用户友好的界面和流畅的区块链交互体验，仅供个人学习交流欢迎提出issue和PR。

## 🌟 项目特色
- **智能合约**：基于Solidity和OpenZeppelin标准，提供安全、可扩展和可维护的合约
- **完整的NFT生态系统**：铸造、展示、交易一站式服务
- **现代化UI设计**：响应式界面，优秀的用户体验
- **模块化架构**：清晰的代码结构，易于维护和扩展
- **专业开发工具**：Hardhat框架，完整的开发、测试、部署流程
- **配置管理**：统一的配置管理系统，支持多环境部署

## 🚀 快速开始

### 环境要求

- Node.js 18.0+
- Python 3.9+ (用于本地服务器)
- MetaMask钱包
- Sepolia测试网ETH
- Git

### 安装步骤

1. **克隆项目**
   
   ```bash
   git clone xxx mynft.git
   cd mynft
   ```
   
2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境**
   ```bash
   cp .env.example .env
   cp contract-config.example.json contract-config.json
   ```
   
   编辑 `.env` 文件，添加必要的配置：
   ```env
   # 部署账户私钥 (不包含0x前缀)
   PRIVATE_KEY=your_private_key_without_0x
   
   # Infura RPC节点
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
   MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID
   
   # Etherscan API密钥 (用于合约验证)
   ETHERSCAN_API_KEY=your_etherscan_api_key
   
   # Gas报告开关
   REPORT_GAS=true
   ```

4. **编译智能合约**
   ```bash
   npm run compile
   ```

5. **运行测试 (可选)**
   ```bash
   npm run test
   ```

6. **部署智能合约**
   ```bash
   # 部署到Sepolia测试网
   npm run deploy:sepolia
   
   # 或部署到本地开发网络
   npm run node          # 在新终端启动本地节点
   npm run deploy:local  # 部署到本地网络
   ```

7. **启动应用**
   ```bash
   npm start
   ```
   
   访问 http://localhost:8000

## 📁 项目结构

```
mynft/
├── contracts/                 # 智能合约源码
│   ├── MyNFT.sol             # ERC-721 NFT合约
│   ├── NFTMarket.sol         # NFT市场合约
│   └── deploy.js             # 部署脚本
├── test/                     # 合约测试文件
├── js/                       # 前端JavaScript模块
│   ├── core.js               # 核心应用逻辑
│   ├── wallet.js             # 钱包管理
│   ├── nft.js                # NFT铸造和管理
│   ├── market.js             # 市场交易功能
│   ├── config-manager.js     # 配置管理
│   ├── contract-config.js    # 合约配置
│   └── shared-*.js           # 共享工具模块
├── artifacts/                # Hardhat编译输出
├── cache/                    # Hardhat缓存文件
├── index.html                # 主页面
├── styles.css                # 样式文件
├── contract-config.json      # 合约配置文件
├── hardhat.config.js         # Hardhat配置
├── package.json              # 项目依赖和脚本
├── .env                      # 环境变量 (需要创建)
├── .env.example              # 环境变量模板
├── CONFIG-MANAGEMENT.md      # 配置管理文档
└── README.md                 # 项目说明
```

## 🎯 核心功能

### 1. 钱包连接
- 支持MetaMask等Web3钱包
- 自动网络检测和切换
- 账户变化监听
- 余额显示和管理

### 2. NFT铸造
- 图片上传和预览
- 元数据编辑（名称、描述）
- IPFS存储集成
- 重新铸造模式支持
- 批量铸造功能

### 3. NFT展示
- 个人NFT收藏展示
- 详细信息查看
- 图片预览和缩放
- 元数据解析显示

### 4. NFT市场
- NFT上架销售
- 价格设置和管理
- 购买流程
- 交易历史记录
- 市场统计数据

### 5. 高级功能
- **IPFS修复工具** (fix-ipfs.html)：检测并修复IPFS文件未上传成功的NFT
- **重新铸造指南** (remint-guide.html)：详细的NFT重新铸造使用说明
- **配置管理系统**：统一的配置管理和自动更新
- **错误处理和重试**：智能的错误恢复机制
- **交易状态跟踪**：实时监控交易进度

## 🔧 技术栈

### 前端技术
- **HTML5 + CSS3**: 响应式UI界面
- **JavaScript ES6+**: 模块化开发
- **Ethers.js v6**: 以太坊区块链交互
- **Web3 Provider**: MetaMask集成

### 区块链技术
- **Solidity ^0.8.19**: 智能合约开发
- **OpenZeppelin**: 安全的合约库
- **Hardhat**: 开发和测试框架
- **Sepolia测试网**: 开发环境

### 存储和服务
- **IPFS**: 去中心化存储
- **Pinata**: IPFS网关服务
- **Python HTTP Server**: 本地开发服务器

## 📋 可用脚本

### 开发服务器
```bash
npm start          # 启动本地HTTP服务器 (端口8000)
npm run dev        # 开发模式 (同上)
npm run serve      # 启动HTTP服务器 (同上)
```

### Hardhat核心命令
```bash
npm run compile    # 编译智能合约
npm run test       # 运行合约测试
npm run clean      # 清理编译缓存和artifacts
npm run node       # 启动本地Hardhat节点
npm run size       # 查看合约大小统计
```

### 合约部署
```bash
# 本地部署 (需要先启动hardhat node)
npm run deploy:local    # 部署到本地Hardhat网络

# 测试网部署
npm run deploy:sepolia  # 部署到Sepolia测试网
npm run deploy:goerli   # 部署到Goerli测试网

# 主网部署 (生产环境)
npm run deploy:mainnet  # 部署到以太坊主网
```

### 合约验证
```bash
# 在区块链浏览器上验证合约源码
npm run verify:sepolia  # 在Sepolia Etherscan验证
npm run verify:goerli   # 在Goerli Etherscan验证
npm run verify:mainnet  # 在主网Etherscan验证

# 验证示例 (需要提供合约地址和构造函数参数)
# npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS "Constructor arg 1"
```

### 测试和质量检查
```bash
npm run gas-report # 生成Gas使用报告
npm run coverage   # 生成测试覆盖率报告
npm run lint       # ESLint代码检查
npm run lint:fix   # 自动修复代码问题
npm run format     # Prettier代码格式化
```

## 🛠️ Hardhat开发流程

### 1. 本地开发环境
```bash
# 启动本地区块链节点
npm run node

# 在新终端中编译合约
npm run compile

# 部署到本地网络
npm run deploy:local

# 运行测试
npm run test

# 启动前端服务器
npm start
```

### 2. 测试网部署流程
```bash
# 1. 配置环境变量 (.env文件)
PRIVATE_KEY=your_private_key_without_0x
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
ETHERSCAN_API_KEY=your_etherscan_api_key

# 2. 编译合约
npm run compile

# 3. 部署到Sepolia测试网
npm run deploy:sepolia

# 4. 验证合约 (可选)
npm run verify:sepolia

# 5. 启动前端
npm start
```

### 3. 主网部署流程
```bash
# ⚠️ 主网部署前必须完成的检查:
# - 充分的测试网测试
# - 安全审计
# - Gas费用评估
# - 备份私钥和助记词

# 1. 配置主网环境变量
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID

# 2. 部署到主网
npm run deploy:mainnet

# 3. 验证合约
npm run verify:mainnet
```

### 4. Hardhat配置说明

项目的 `hardhat.config.js` 包含以下配置：

- **Solidity版本**: 0.8.19，启用优化器
- **网络配置**: 本地、Sepolia、主网
- **Gas报告**: 可通过环境变量启用
- **Etherscan验证**: 支持多网络验证
- **路径配置**: 合约、测试、缓存、输出目录
- **超时设置**: Mocha测试超时40秒

## ⚙️ 配置管理

项目采用统一的配置管理系统，详细信息请参考 [CONFIG-MANAGEMENT.md](./CONFIG-MANAGEMENT.md)。

### 主要配置文件
- **contract-config.json**: 合约地址和网络配置
- **.env**: 环境变量和私钥
- **hardhat.config.js**: Hardhat框架配置

### 配置更新流程
1. 使用部署脚本自动更新配置
2. 禁止手动修改配置文件
3. 遇到问题查看配置管理文档

## 🔒 安全特性

### 智能合约安全
- 基于OpenZeppelin标准库
- ReentrancyGuard防重入攻击
- Ownable权限控制
- Pausable紧急暂停
- 输入验证和边界检查

### 前端安全
- 输入验证和清理
- 交易确认机制
- 错误处理和回滚
- 网络状态检查

### 开发安全
- 私钥环境变量管理
- .gitignore保护敏感文件
- 多网络隔离部署
- 合约验证和开源

## 🌐 网络支持

| 网络 | Chain ID | RPC URL | 区块浏览器 | 用途 |
|------|----------|---------|------------|------|
| Hardhat | 31337 | http://localhost:8545 | - | 本地开发 |
| Sepolia | 11155111 | Infura/Alchemy | https://sepolia.etherscan.io | 测试网 |
| Mainnet | 1 | Infura/Alchemy | https://etherscan.io | 生产环境 |

## 📖 使用指南

### 首次使用
1. 安装MetaMask钱包
2. 获取Sepolia测试网ETH ([水龙头](https://sepoliafaucet.com/))
3. 连接钱包到应用
4. 开始铸造和交易NFT

### 铸造NFT
1. 点击"铸造NFT"按钮
2. 上传图片文件
3. 填写NFT名称和描述
4. 确认交易并等待完成

### 交易NFT
1. 在"我的NFT"中选择要出售的NFT
2. 点击"上架"按钮
3. 设置价格并确认
4. 其他用户可在市场中购买

## 🧪 测试指南

### 运行测试
```bash
# 运行所有测试
npm run test

# 运行特定测试文件
npx hardhat test test/MyNFT.test.js

# 生成Gas报告
npm run gas-report

# 生成覆盖率报告
npm run coverage
```

### 测试结构
```
test/
├── MyNFT.test.js         # NFT合约测试
├── NFTMarket.test.js     # 市场合约测试
└── fixtures/             # 测试固件
```

## 🛠️ 开发指南

### 添加新功能
1. 在相应的模块文件中添加功能
2. 更新UI界面和事件监听
3. 添加必要的测试
4. 更新文档

### 调试技巧
- 使用浏览器开发者工具
- 查看控制台日志
- 检查网络请求
- 验证合约交互
- 使用Hardhat console进行合约调试

### 常用Hardhat命令
```bash
# 进入Hardhat控制台
npx hardhat console --network sepolia

# 运行特定脚本
npx hardhat run scripts/interact.js --network sepolia

# 查看账户余额
npx hardhat run scripts/balance.js --network sepolia

# 手动验证合约
npx hardhat verify --network sepolia CONTRACT_ADDRESS "Constructor Arg"
```

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

### 代码规范
- 使用ESLint和Prettier保持代码风格
- 遵循Solidity最佳实践
- 编写清晰的提交信息
- 添加适当的测试用例

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🆘 常见问题

### Q: 钱包连接失败？
A: 确保已安装MetaMask并切换到正确的网络。

### Q: 交易失败？
A: 检查余额是否充足，Gas费用是否合理。

### Q: NFT图片无法显示？
A: 可能是IPFS网络问题，尝试使用IPFS修复工具。

### Q: 合约部署失败？
A: 检查网络配置和私钥设置是否正确。

### Q: Hardhat编译错误？
A: 检查Solidity版本兼容性，运行 `npm run clean` 清理缓存。

### Q: 测试网ETH不足？
A: 访问 [Sepolia水龙头](https://sepoliafaucet.com/) 获取测试ETH。

### Q: 合约验证失败？
A: 确保Etherscan API密钥正确，构造函数参数匹配。

**注意**: 本项目仅用于学习和演示目的，请勿在生产环境中直接使用。在主网部署前请进行充分的安全审计。