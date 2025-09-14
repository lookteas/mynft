# NFT项目配置管理指南

## ⚠️ 重要警告

**请勿手动修改以下文件：**

- `js/contract-config.js` - 此文件由部署脚本自动生成
- `contract-config.json` - 此文件由部署脚本自动生成

**手动修改这些文件可能导致：**
- 配置不一致
- 合约地址错误
- 应用功能异常
- 部署后配置被覆盖

## 📋 配置文件说明

### 1. 配置文件结构

```
mynft/
├── .env                    # 环境变量（开发者配置）
├── contract-config.json    # 主配置文件（自动生成）
└── js/
    ├── config-manager.js   # 配置管理器（手动维护）
    └── contract-config.js  # 前端配置（自动生成）
```

### 2. 各文件职责

| 文件 | 用途 | 修改方式 | 说明 |
|------|------|----------|------|
| `.env` | 环境变量配置 | ✅ 手动修改 | 私钥、API密钥等敏感信息 |
| `contract-config.json` | 主配置数据 | ❌ 自动生成 | 合约地址、网络信息等 |
| `js/contract-config.js` | 前端配置 | ❌ 自动生成 | 包含ABI和配置常量 |
| `js/config-manager.js` | 配置管理逻辑 | ✅ 手动修改 | 配置读取和管理逻辑 |

## 🔄 自动化配置流程

### 1. 部署命令

```bash
# 本地开发网络
npm run deploy:local

# Sepolia测试网
npm run deploy:sepolia

# 以太坊主网
npm run deploy:mainnet
```

### 2. 自动化流程

1. **合约编译** → `hardhat compile`
2. **合约部署** → 部署NFT和Market合约
3. **配置验证** → 验证合约部署成功
4. **配置生成** → 自动生成配置文件
   - 生成 `contract-config.json`
   - 生成 `js/contract-config.js`
5. **配置同步** → 确保两个文件地址一致

### 3. 生成的配置内容

**contract-config.json:**

```json
{
  "network": {
    "chainId": "31337",
    "name": "hardhat"
  },
  "contracts": {
    "nft": {
      "address": "0xxxxxxxxxxxxxxxxxxx3",
      "name": "MyNFT Collection",
      "symbol": "MYNFT"
    },
    "market": {
      "address": "0xxxxxxxxxxxxxxxxxxxxx2",
      "platformFee": "250",
      "feeRecipient": "0xxxxxxxxxxxxxxxxxxxx366"
    }
  },
  "deployer": {
    "address": "0xxxxxxxxxxxxxxxxxxxxx6",
    "balance": "9999.998"
  },
  "deployedAt": "2025-01-27T10:30:00.000Z"
}
```

**js/contract-config.js:**
```javascript
export const CONTRACT_CONFIG = {
    NFT_CONTRACT_ADDRESS: '0xxxxxxxxxxxxxxxxxxxxx33',
    MARKET_CONTRACT_ADDRESS: '0xxxxxxxxxxxxxxxxxxxxx312',
    // ... 其他配置
};
```

## 🛡️ 配置一致性保证

### 1. 单一数据源
- 所有配置都从 `contracts/deploy.js` 生成
- 避免多处维护导致的不一致
- 部署时间戳确保版本可追踪

### 2. 验证机制
- 部署脚本会验证合约部署成功
- 读取合约信息确认配置正确性
- 生成配置前进行完整性检查

### 3. 容错处理
- `js/contract-config.js` 包含fallback地址
- 配置加载失败时使用默认值
- 防止应用完全崩溃

## 📝 开发最佳实践

### ✅ 推荐做法

1. **使用部署命令更新配置**
   ```bash
   npm run deploy:local  # 本地开发
   npm run deploy:sepolia # 测试网部署
   ```

2. **环境变量配置**
   - 在 `.env` 文件中配置私钥和API密钥
   - 不要将敏感信息提交到版本控制

3. **版本控制**
   - 提交自动生成的配置文件到Git
   - 跟踪配置变更历史

4. **测试流程**
   - 本地测试 → 测试网验证 → 主网部署
   - 每个环境使用对应的部署命令

### ❌ 避免的做法

1. **手动修改自动生成的文件**
   - 不要直接编辑 `contract-config.json`
   - 不要直接编辑 `js/contract-config.js`

2. **跳过部署脚本**
   - 不要手动复制粘贴合约地址
   - 不要绕过自动化流程

3. **混合配置源**
   - 不要在多个地方维护相同配置
   - 不要使用硬编码的合约地址

## 🔧 故障排除

### 1. 配置加载失败

**问题：** 浏览器控制台显示"加载合约配置失败"

**解决方案：**
1. 检查 `contract-config.json` 文件是否存在
2. 验证JSON格式是否正确
3. 重新运行部署命令生成配置

### 2. 合约地址无效

**问题：** 合约调用失败，地址为null或无效

**解决方案：**
1. 确认合约已正确部署
2. 检查网络配置是否匹配
3. 重新部署并生成配置

### 3. 配置不一致

**问题：** 不同文件中的地址不匹配

**解决方案：**
1. 删除现有配置文件
2. 重新运行部署脚本
3. 确认两个文件内容一致

## 📞 技术支持

如果遇到配置相关问题：

1. 检查本文档的故障排除部分
2. 查看部署脚本的输出日志
3. 确认网络连接和环境配置
4. 重新运行完整的部署流程

---

**记住：配置管理的核心原则是自动化和一致性。始终使用部署脚本来管理配置，避免手动修改！**