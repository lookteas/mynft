// IPFS修复工具
class IPFSFixTool {
    constructor() {
        this.selectedNFT = null;
        this.selectedNFTs = new Set();
        this.problemNFTs = [];
        this.batchFixData = {
            images: [],
            metadata: []
        };
        this.init();
    }
    
    async init() {
        // 等待全局变量初始化
        await this.waitForGlobalVariables();
        this.setupEventListeners();
        await this.checkWalletConnection();
    }
    
    async waitForGlobalVariables() {
        // 等待全局变量可用
        while (!window.walletManager || !window.nftManager || !window.CONTRACT_CONFIG || !window.NFT_ABI || !window.sharedContractManager || !window.sharedUIManager || !window.createSharedWalletUI) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        // 初始化共享钱包UI
        this.sharedWalletUI = window.createSharedWalletUI({
            connectBtnId: 'connect-wallet-btn',
            disconnectBtnId: 'disconnect-wallet-btn',
            walletDisplayId: 'wallet-display',
            onConnect: () => this.onWalletConnected(),
            onDisconnect: () => this.onWalletDisconnected()
        });
    }
    
    setupEventListeners() {
        // 图片上传
        const imageInput = document.getElementById('fix-image');
        const uploadArea = document.getElementById('image-upload-area');
        
        imageInput.addEventListener('change', (e) => {
            this.handleImageSelect(e.target.files[0]);
        });
        
        // 拖拽上传
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleImageSelect(files[0]);
            }
        });
        
        // 修复按钮
        document.getElementById('fix-nft-btn').addEventListener('click', () => {
            this.fixNFTMetadata();
        });
        
        // 监听钱包事件
        if (typeof window.ethereum !== 'undefined') {
            window.ethereum.on('accountsChanged', (accounts) => {
                this.handleAccountChange(accounts[0]);
            });
        }
    }
    
    async checkWalletConnection() {
        if (window.walletManager.isConnected) {
            await window.sharedContractManager.initContracts(window.walletManager);
            await this.loadUserNFTs();
        }
    }
    
    // 钱包连接成功回调
    async onWalletConnected() {
        try {
            await window.sharedContractManager.initContracts(window.walletManager);
            await this.loadUserNFTs();
        } catch (error) {
            console.error('钱包连接后初始化失败:', error);
            window.sharedUIManager.showError('初始化失败: ' + error.message);
        }
    }
    
    // 钱包断开连接回调
    onWalletDisconnected() {
        document.getElementById('nft-list-section').classList.add('hidden');
        document.getElementById('fix-section').classList.add('hidden');
    }
    
    async loadUserNFTs() {
        if (!window.walletManager.isConnected) {
            return;
        }
        
        try {
            const userNFTs = await window.sharedContractManager.getUserNFTs(window.walletManager.userAddress);
            
            if (userNFTs.length === 0) {
                document.getElementById('nft-list').innerHTML = '<p>您还没有铸造任何NFT</p>';
                document.getElementById('nft-list-section').classList.remove('hidden');
                return;
            }
            
            const nfts = [];
            
            for (const nft of userNFTs) {
                // 检查IPFS状态
                const ipfsStatus = await this.checkIPFSStatus(nft.tokenURI);
                
                nfts.push({
                    tokenId: nft.tokenId,
                    tokenURI: nft.tokenURI,
                    ipfsStatus
                });
            }
            
            this.renderNFTList(nfts);
            document.getElementById('nft-list-section').classList.remove('hidden');
            
        } catch (error) {
            console.error('加载NFT失败:', error);
            window.sharedUIManager.showError('加载NFT失败: ' + error.message);
        }
    }
    
    async checkIPFSStatus(tokenURI) {
        try {
            console.log('检查IPFS状态，tokenURI:', tokenURI);
            
            if (!tokenURI || !tokenURI.startsWith('ipfs://')) {
                return { status: 'invalid', message: '不是IPFS链接' };
            }
            
            const hash = tokenURI.replace('ipfs://', '').trim();
            console.log('提取的IPFS哈希:', hash);
            
            // 验证IPFS哈希格式
            if (!hash || hash.length < 40) {
                console.log('IPFS哈希格式无效，长度:', hash.length);
                return { status: 'invalid', message: 'IPFS哈希格式无效' };
            }
            
            // 检查是否包含路径（如 hash/metadata.json）
            const hashParts = hash.split('/');
            const actualHash = hashParts[0];
            console.log('实际哈希:', actualHash, '完整路径:', hash);
            
            // 多个IPFS网关，避免单点故障和CORS问题
            const gateways = [
                `https://ipfs.io/ipfs/${hash}`,
                `https://cloudflare-ipfs.com/ipfs/${hash}`,
                `https://gateway.pinata.cloud/ipfs/${hash}`
            ];
            
            // 尝试每个网关
            for (let i = 0; i < gateways.length; i++) {
                const gatewayUrl = gateways[i];
                try {
                    console.log(`尝试访问网关 ${i + 1}/${gateways.length}:`, gatewayUrl);
                    
                    // 使用AbortController设置超时
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
                    
                    const response = await fetch(gatewayUrl, { 
                        method: 'GET',
                        signal: controller.signal,
                        headers: {
                            'Accept': 'application/json,text/plain,*/*'
                        }
                    });
                    
                    clearTimeout(timeoutId);
                    
                    console.log(`网关 ${i + 1} 响应状态:`, response.status, response.statusText);
                    
                    if (response.ok) {
                        console.log('网关访问成功:', gatewayUrl);
                        return { status: 'ok', message: 'IPFS文件正常' };
                    } else if (response.status === 422) {
                        console.log('网关返回422错误，可能是哈希格式问题');
                        return { status: 'invalid', message: 'IPFS哈希格式错误或文件不存在' };
                    } else {
                        console.log(`网关 ${i + 1} 返回错误状态:`, response.status);
                    }
                } catch (error) {
                    console.log(`网关 ${i + 1} 访问失败:`, gatewayUrl, error.message);
                    
                    // 如果是CORS错误，尝试下一个网关
                    if (error.message.includes('CORS')) {
                        console.log('遇到CORS错误，尝试下一个网关');
                        continue;
                    }
                    
                    // 如果是429错误，等待后重试
                    if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
                        console.log('遇到频率限制，等待1秒后继续');
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    
                    // 如果是超时或网络错误，继续下一个网关
                    if (error.name === 'AbortError') {
                        console.log('请求超时，尝试下一个网关');
                    }
                    
                    continue; // 尝试下一个网关
                }
            }
            
            return { status: 'error', message: 'IPFS文件无法通过任何网关访问' };
        } catch (error) {
            console.error('IPFS检查异常:', error);
            return { status: 'error', message: `IPFS检查失败: ${error.message}` };
        }
    }
    
    renderNFTList(nfts) {
        const container = document.getElementById('nft-list');
        
        if (nfts.length === 0) {
            container.innerHTML = '<p>没有找到NFT</p>';
            return;
        }
        
        const problemNFTs = nfts.filter(nft => nft.ipfsStatus.status !== 'ok');
        
        let html = '';
        
        // 如果有多个问题NFT，显示批量修复选项
        if (problemNFTs.length > 1) {
            html += `
                <div class="batch-fix-section" style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 1rem; margin-bottom: 1rem; border-radius: 8px;">
                    <h4>🔧 批量修复选项</h4>
                    <p>检测到 ${problemNFTs.length} 个NFT需要修复IPFS文件</p>
                    <div style="margin: 0.5rem 0;">
                        <label>
                            <input type="checkbox" id="select-all-problem" onchange="fixTool.toggleSelectAll(this.checked)"> 
                            选择所有需要修复的NFT
                        </label>
                    </div>
                    <button class="btn btn-warning" onclick="fixTool.startBatchFix()" id="batch-fix-btn" disabled>
                        批量修复选中的NFT (0个)
                    </button>
                </div>
            `;
        }
        
        html += nfts.map(nft => {
            const statusClass = nft.ipfsStatus.status === 'ok' ? 'success' : 'error';
            const statusIcon = nft.ipfsStatus.status === 'ok' ? '✅' : '❌';
            const needsFix = nft.ipfsStatus.status !== 'ok';
            
            return `
                <div class="nft-item" style="border: 1px solid #ddd; padding: 1rem; margin: 0.5rem 0; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            ${needsFix ? `<input type="checkbox" class="nft-checkbox" data-token-id="${nft.tokenId}" data-token-uri="${nft.tokenURI}" onchange="fixTool.updateBatchSelection()">` : ''}
                            <div>
                                <strong>Token ID: ${nft.tokenId}</strong><br>
                                <small>TokenURI: ${nft.tokenURI.slice(0, 50)}...</small><br>
                                <span class="status-${statusClass}">${statusIcon} ${nft.ipfsStatus.message}</span>
                            </div>
                        </div>
                        <div>
                            ${needsFix ? 
                        `<button class="btn btn-primary" onclick="fixTool.selectNFT('${nft.tokenId}', '${nft.tokenURI}')">生成修复版本</button>` : 
                        '<span style="color: #4caf50;">正常</span>'
                    }
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    }
    
    selectNFT(tokenId, tokenURI) {
        this.selectedNFT = { tokenId, tokenURI };
        
        document.getElementById('selected-token-id').textContent = tokenId;
        document.getElementById('current-token-uri').textContent = tokenURI;
        document.getElementById('nft-status').textContent = 'IPFS文件无法访问，需要重新上传';
        
        // 清空表单
        document.getElementById('fix-name').value = '';
        document.getElementById('fix-description').value = '';
        document.getElementById('fix-image').value = '';
        document.getElementById('image-preview-section').classList.add('hidden');
        document.getElementById('fix-nft-btn').disabled = true;
        
        // 隐藏结果和错误区域
        document.getElementById('result-section').style.display = 'none';
        document.getElementById('error-section').style.display = 'none';
        
        document.getElementById('fix-section').classList.remove('hidden');
    }
    
    handleImageSelect(file) {
        if (!file) return;
        
        const validation = window.nftManager.validateFile(file);
        if (!validation.valid) {
            this.showStatus(validation.errors.join(', '), 'error');
            return;
        }
        
        // 显示预览
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('fix-image-preview');
            preview.src = e.target.result;
            document.getElementById('image-preview-section').classList.remove('hidden');
            this.checkFormValid();
        };
        reader.readAsDataURL(file);
    }
    
    checkFormValid() {
        const name = document.getElementById('fix-name').value.trim();
        const description = document.getElementById('fix-description').value.trim();
        const image = document.getElementById('fix-image').files[0];
        
        const isValid = name && description && image;
        document.getElementById('fix-nft-btn').disabled = !isValid;
    }
    
    async fixNFTMetadata() {
        if (!this.selectedNFT) {
            this.showStatus('请先选择要修复的NFT', 'error');
            return;
        }
        
        const name = document.getElementById('fix-name').value.trim();
        const description = document.getElementById('fix-description').value.trim();
        const imageFile = document.getElementById('fix-image').files[0];
        
        if (!name || !description || !imageFile) {
            this.showStatus('请填写完整信息', 'error');
            return;
        }
        
        try {
            // 显示进度条
            const progressBar = document.getElementById('upload-progress');
            const progressFill = document.getElementById('progress-fill');
            const statusDiv = document.getElementById('upload-status');
            
            progressBar.classList.remove('hidden');
            statusDiv.classList.remove('hidden');
            statusDiv.textContent = '正在上传图片到IPFS...';
            statusDiv.className = 'status-message info';
            
            // 上传图片到IPFS
            const imageResult = await window.nftManager.uploadFileToIPFS(imageFile, (progress) => {
                progressFill.style.width = `${progress * 0.5}%`;
                statusDiv.textContent = `正在上传图片到IPFS... ${progress}%`;
            });
            
            if (!imageResult.success) {
                throw new Error(`图片上传失败: ${imageResult.error}`);
            }
            
            statusDiv.textContent = '正在创建元数据...';
            progressFill.style.width = '60%';
            
            // 创建元数据
            const metadata = {
                name: name,
                description: description,
                image: imageResult.url,
                attributes: [],
                properties: {
                            creator: window.walletManager.userAddress,
                            created_at: new Date().toISOString(),
                            fixed_at: new Date().toISOString(),
                            original_token_id: this.selectedNFT.tokenId
                        }
            };
            
            // 上传元数据到IPFS
            const metadataResult = await window.nftManager.uploadJSONToIPFS(metadata, (progress) => {
                progressFill.style.width = `${60 + progress * 0.4}%`;
                statusDiv.textContent = `正在上传元数据到IPFS... ${progress}%`;
            });
            
            if (!metadataResult.success) {
                throw new Error(`元数据上传失败: ${metadataResult.error}`);
            }
            
            progressFill.style.width = '100%';
            statusDiv.textContent = '修复完成！';
            statusDiv.className = 'status-message success';
            
            // 生成修复报告（注意：由于合约限制，无法直接更新已存在NFT的tokenURI）
            statusDiv.textContent = '生成修复报告...';
            progressFill.style.width = '90%';
            
            const newTokenURI = `ipfs://${metadataResult.hash}`;
            
            // 检查用户是否为NFT拥有者
            let isOwner = false;
            try {
                const nftContract = window.sharedContractManager.getNFTContract();
                if (nftContract) {
                    const owner = await nftContract.ownerOf(this.selectedNFT.tokenId);
                    isOwner = owner.toLowerCase() === window.walletManager.userAddress.toLowerCase();
                }
            } catch (error) {
                console.warn('无法验证NFT拥有者:', error);
            }
            
            progressFill.style.width = '100%';
            statusDiv.textContent = '修复完成！';
            statusDiv.className = 'status-message success';
            
            // 显示修复结果和说明
            document.getElementById('new-ipfs-hash').textContent = metadataResult.hash;
            document.getElementById('new-token-uri').textContent = newTokenURI;
            
            const gatewayLink = document.getElementById('ipfs-gateway-link');
            gatewayLink.href = metadataResult.url;
            gatewayLink.textContent = metadataResult.url;
            
            // 添加修复说明
            const resultSection = document.getElementById('result-section');
            const existingNote = resultSection.querySelector('.fix-note');
            if (!existingNote) {
                const noteDiv = document.createElement('div');
                noteDiv.className = 'fix-note alert alert-info mt-3';
                noteDiv.innerHTML = `
                    <h6>📋 修复说明：</h6>
                    <ul>
                        <li>✅ 已成功上传修复后的元数据到IPFS</li>
                        <li>✅ 新的IPFS链接可以正常访问</li>
                        <li>⚠️ 由于合约设计限制，无法直接更新已铸造NFT的tokenURI</li>
                        ${isOwner ? '<li>💡 建议：可以考虑重新铸造一个新的NFT使用修复后的元数据</li>' : '<li>ℹ️ 只有NFT拥有者才能进行进一步操作</li>'}
                    </ul>
                `;
                resultSection.appendChild(noteDiv);
            }
            
            document.getElementById('result-section').style.display = 'block';
            document.getElementById('error-section').style.display = 'none';
            
            // 隐藏进度条
            setTimeout(() => {
                progressBar.classList.add('hidden');
                statusDiv.classList.add('hidden');
            }, 3000);
            
        } catch (error) {
            console.error('修复失败:', error);
            
            document.getElementById('error-message').textContent = error.message;
            document.getElementById('error-section').style.display = 'block';
            document.getElementById('result-section').style.display = 'none';
            
            // 隐藏进度条
            document.getElementById('upload-progress').classList.add('hidden');
            document.getElementById('upload-status').classList.add('hidden');
        }
    }
    
    showStatus(message, type = 'info') {
        window.sharedUIManager.showStatus(message, type);
    }
    
    handleAccountChange(newAddress) {
        if (newAddress) {
            window.walletManager.userAddress = newAddress;
            this.loadUserNFTs();
        } else {
            this.onWalletDisconnected();
        }
    }
    
    // 批量修复相关方法
    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.nft-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
        this.updateBatchSelection();
    }
    
    updateBatchSelection() {
        const checkboxes = document.querySelectorAll('.nft-checkbox:checked');
        const batchBtn = document.getElementById('batch-fix-btn');
        const selectAllCheckbox = document.getElementById('select-all-problem');
        const totalCheckboxes = document.querySelectorAll('.nft-checkbox');
        
        if (batchBtn) {
            batchBtn.disabled = checkboxes.length === 0;
            batchBtn.textContent = `批量修复选中的NFT (${checkboxes.length}个)`;
        }
        
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = checkboxes.length === totalCheckboxes.length && totalCheckboxes.length > 0;
            selectAllCheckbox.indeterminate = checkboxes.length > 0 && checkboxes.length < totalCheckboxes.length;
        }
    }
    
    async startBatchFix() {
        const selectedCheckboxes = document.querySelectorAll('.nft-checkbox:checked');
        
        if (selectedCheckboxes.length === 0) {
            this.showStatus('请先选择要修复的NFT', 'error');
            return;
        }
        
        const selectedNFTs = Array.from(selectedCheckboxes).map(checkbox => ({
            tokenId: checkbox.dataset.tokenId,
            tokenURI: checkbox.dataset.tokenUri
        }));
        
        // 显示批量修复界面
        this.showBatchFixInterface(selectedNFTs);
    }
    
    showBatchFixInterface(selectedNFTs) {
        // 隐藏NFT列表，显示批量修复界面
        document.getElementById('nft-list-section').classList.add('hidden');
        
        // 创建批量修复界面
        const batchSection = document.createElement('div');
        batchSection.id = 'batch-fix-section';
        batchSection.innerHTML = `
            <div class="page-header">
                <h3>批量修复IPFS文件</h3>
                <button class="btn btn-secondary" onclick="fixTool.cancelBatchFix()">返回列表</button>
            </div>
            
            <div class="batch-info">
                <p>将要修复 <strong>${selectedNFTs.length}</strong> 个NFT的IPFS文件</p>
                <div class="selected-nfts">
                    ${selectedNFTs.map(nft => `<span class="nft-tag">Token ID: ${nft.tokenId}</span>`).join('')}
                </div>
            </div>
            
            <div class="batch-form">
                <div class="form-group">
                    <label for="batch-name-template">NFT名称模板:</label>
                    <input type="text" id="batch-name-template" class="form-control" placeholder="例如: My NFT #{id}" value="Fixed NFT #{id}">
                    <small>使用 #{id} 作为Token ID的占位符</small>
                </div>
                
                <div class="form-group">
                    <label for="batch-description-template">描述模板:</label>
                    <textarea id="batch-description-template" class="form-control" rows="3" placeholder="例如: This is NFT #{id}">This NFT has been fixed and re-uploaded to IPFS. Token ID: #{id}</textarea>
                </div>
                
                <div class="upload-section" id="batch-image-upload-area">
                    <p>📁 选择一张图片用于所有NFT，或拖拽到这里</p>
                    <input type="file" id="batch-image" accept="image/*" style="display: none;">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('batch-image').click()">选择图片</button>
                </div>
                
                <div id="batch-image-preview-section" class="hidden">
                    <img id="batch-image-preview" style="max-width: 200px; border-radius: 8px;">
                </div>
                
                <div class="progress-section hidden" id="batch-progress-section">
                    <h4>修复进度</h4>
                    <div class="progress-bar">
                        <div class="progress-fill" id="batch-progress-fill"></div>
                    </div>
                    <div id="batch-status" class="status-message"></div>
                    <div id="batch-details"></div>
                </div>
                
                <div class="batch-actions">
                    <button id="start-batch-fix-btn" class="btn btn-primary" onclick="fixTool.executeBatchFix()" disabled>开始批量修复</button>
                    <button class="btn btn-secondary" onclick="fixTool.cancelBatchFix()">取消</button>
                </div>
                
                <div id="batch-results" class="hidden">
                    <h4>修复结果</h4>
                    <div id="batch-results-list"></div>
                </div>
            </div>
        `;
        
        // 插入到fix-section之前
        const fixSection = document.getElementById('fix-section');
        fixSection.parentNode.insertBefore(batchSection, fixSection);
        
        // 设置批量修复的NFT数据
        this.batchNFTs = selectedNFTs;
        
        // 设置图片上传事件
        this.setupBatchImageUpload();
    }
    
    setupBatchImageUpload() {
        const imageInput = document.getElementById('batch-image');
        const uploadArea = document.getElementById('batch-image-upload-area');
        
        imageInput.addEventListener('change', (e) => {
            this.handleBatchImageSelect(e.target.files[0]);
        });
        
        // 拖拽上传
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleBatchImageSelect(files[0]);
            }
        });
        
        // 监听模板输入变化
        const nameTemplate = document.getElementById('batch-name-template');
        const descTemplate = document.getElementById('batch-description-template');
        
        nameTemplate.addEventListener('input', () => this.checkBatchFormValid());
        descTemplate.addEventListener('input', () => this.checkBatchFormValid());
    }
    
    handleBatchImageSelect(file) {
        if (!file) return;
        
        const validation = window.nftManager.validateFile(file);
        if (!validation.valid) {
            this.showStatus(validation.errors.join(', '), 'error');
            return;
        }
        
        // 显示预览
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('batch-image-preview');
            preview.src = e.target.result;
            document.getElementById('batch-image-preview-section').classList.remove('hidden');
            this.checkBatchFormValid();
        };
        reader.readAsDataURL(file);
    }
    
    checkBatchFormValid() {
        const nameTemplate = document.getElementById('batch-name-template').value.trim();
        const descTemplate = document.getElementById('batch-description-template').value.trim();
        const image = document.getElementById('batch-image').files[0];
        
        const isValid = nameTemplate && descTemplate && image;
        document.getElementById('start-batch-fix-btn').disabled = !isValid;
    }
    
    async executeBatchFix() {
        if (!this.batchNFTs || this.batchNFTs.length === 0) {
            this.showStatus('没有选择要修复的NFT', 'error');
            return;
        }
        
        const nameTemplate = document.getElementById('batch-name-template').value.trim();
        const descTemplate = document.getElementById('batch-description-template').value.trim();
        const imageFile = document.getElementById('batch-image').files[0];
        
        if (!nameTemplate || !descTemplate || !imageFile) {
            this.showStatus('请填写完整信息', 'error');
            return;
        }
        
        try {
            // 显示进度区域
            const progressSection = document.getElementById('batch-progress-section');
            const progressFill = document.getElementById('batch-progress-fill');
            const statusDiv = document.getElementById('batch-status');
            const detailsDiv = document.getElementById('batch-details');
            
            progressSection.classList.remove('hidden');
            
            // 禁用开始按钮
            document.getElementById('start-batch-fix-btn').disabled = true;
            
            statusDiv.textContent = '正在上传图片到IPFS...';
            statusDiv.className = 'status-message info';
            
            // 先上传图片（所有NFT共用）
            const imageResult = await window.nftManager.uploadFileToIPFS(imageFile, (progress) => {
                progressFill.style.width = `${progress * 0.2}%`;
                statusDiv.textContent = `正在上传图片到IPFS... ${progress}%`;
            });
            
            if (!imageResult.success) {
                throw new Error(`图片上传失败: ${imageResult.error}`);
            }
            
            statusDiv.textContent = '开始批量处理NFT元数据...';
            progressFill.style.width = '20%';
            
            const results = [];
            const total = this.batchNFTs.length;
            
            // 逐个处理每个NFT
            for (let i = 0; i < this.batchNFTs.length; i++) {
                const nft = this.batchNFTs[i];
                const baseProgress = 20 + (i / total) * 80;
                
                try {
                    statusDiv.textContent = `正在处理 Token ID ${nft.tokenId} (${i + 1}/${total})...`;
                    
                    // 生成个性化元数据
                    const name = nameTemplate.replace(/#{id}/g, nft.tokenId);
                    const description = descTemplate.replace(/#{id}/g, nft.tokenId);
                    
                    const metadata = {
                        name: name,
                        description: description,
                        image: imageResult.url,
                        attributes: [],
                        properties: {
                            creator: window.walletManager.userAddress,
                            created_at: new Date().toISOString(),
                            fixed_at: new Date().toISOString(),
                            original_token_id: nft.tokenId,
                            batch_fixed: true
                        }
                    };
                    
                    // 上传元数据
                    const metadataResult = await window.nftManager.uploadJSONToIPFS(metadata, (progress) => {
                        const currentProgress = baseProgress + (progress / total) * 0.8;
                        progressFill.style.width = `${currentProgress}%`;
                    });
                    
                    if (metadataResult.success) {
                        results.push({
                            tokenId: nft.tokenId,
                            success: true,
                            newTokenURI: `ipfs://${metadataResult.hash}`,
                            ipfsHash: metadataResult.hash,
                            gatewayUrl: metadataResult.url
                        });
                        
                        detailsDiv.innerHTML += `<div style="color: #4caf50;">✅ Token ID ${nft.tokenId} 修复成功</div>`;
                    } else {
                        throw new Error(metadataResult.error);
                    }
                    
                } catch (error) {
                    results.push({
                        tokenId: nft.tokenId,
                        success: false,
                        error: error.message
                    });
                    
                    detailsDiv.innerHTML += `<div style="color: #f44336;">❌ Token ID ${nft.tokenId} 修复失败: ${error.message}</div>`;
                }
            }
            
            progressFill.style.width = '100%';
            statusDiv.textContent = '批量修复完成！';
            statusDiv.className = 'status-message success';
            
            // 显示结果
            this.showBatchResults(results);
            
        } catch (error) {
            console.error('批量修复失败:', error);
            
            const statusDiv = document.getElementById('batch-status');
            statusDiv.textContent = `批量修复失败: ${error.message}`;
            statusDiv.className = 'status-message error';
            
            // 重新启用开始按钮
            document.getElementById('start-batch-fix-btn').disabled = false;
        }
    }
    
    showBatchResults(results) {
        const resultsSection = document.getElementById('batch-results');
        const resultsList = document.getElementById('batch-results-list');
        
        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;
        
        let html = `
            <div class="results-summary">
                <p><strong>修复完成:</strong> ${successCount} 个成功, ${failCount} 个失败</p>
            </div>
            <div class="results-list">
        `;
        
        results.forEach(result => {
                if (result.success) {
                    html += `
                        <div class="result-item success" style="border: 1px solid #4caf50; padding: 1rem; margin: 0.5rem 0; border-radius: 8px; background: #e8f5e8;">
                            <h5>✅ Token ID: ${result.tokenId}</h5>
                            <p><strong>新的IPFS哈希:</strong> ${result.ipfsHash}</p>
                            <p><strong>新的TokenURI:</strong> ${result.newTokenURI}</p>
                            <p><strong>网关链接:</strong> <a href="${result.gatewayUrl}" target="_blank">${result.gatewayUrl}</a></p>
                            <div class="alert alert-warning mt-2" style="font-size: 0.9em;">
                                <strong>⚠️ 注意：</strong>由于合约限制，无法直接更新已铸造NFT的tokenURI。建议重新铸造使用修复后的元数据。
                            </div>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="result-item error" style="border: 1px solid #f44336; padding: 1rem; margin: 0.5rem 0; border-radius: 8px; background: #ffeaea;">
                            <h5>❌ Token ID: ${result.tokenId}</h5>
                            <p><strong>错误:</strong> ${result.error}</p>
                        </div>
                    `;
                }
            });
        
        html += '</div>';
        
        resultsList.innerHTML = html;
        resultsSection.classList.remove('hidden');
    }
    
    cancelBatchFix() {
        // 移除批量修复界面
        const batchSection = document.getElementById('batch-fix-section');
        if (batchSection) {
            batchSection.remove();
        }
        
        // 显示NFT列表
        document.getElementById('nft-list-section').classList.remove('hidden');
        
        // 清理数据
        this.batchNFTs = null;
    }
}

// 建议重新铸造功能
function suggestRemint(tokenId, newTokenURI) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">重新铸造NFT建议</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>由于合约设计限制，无法直接更新已铸造NFT的tokenURI。</p>
                    <p>建议您使用修复后的元数据重新铸造一个新的NFT：</p>
                    <div class="alert alert-info">
                        <strong>修复后的TokenURI:</strong><br>
                        <code>${newTokenURI}</code>
                    </div>
                    <p>您可以：</p>
                    <ul>
                        <li>前往铸造页面使用此元数据铸造新NFT</li>
                        <li>将此链接保存备用</li>
                        <li>分享给其他需要的用户</li>
                    </ul>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                    <button type="button" class="btn btn-success" onclick="copyToClipboard('${newTokenURI}')">复制TokenURI</button>
                    <button type="button" class="btn btn-primary" onclick="goToMintPage('${newTokenURI}')">
                        前往铸造页面
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 显示模态框
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    // 模态框关闭后移除DOM元素
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

// 前往铸造页面并预填TokenURI
function goToMintPage(tokenURI) {
    // 将TokenURI存储到localStorage
    localStorage.setItem('fixedTokenURI', tokenURI);
    
    // 跳转到主页面的铸造页面
    window.open('index.html#mint', '_blank');
}

// 复制到剪贴板
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // 显示复制成功提示
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = 'TokenURI已复制到剪贴板';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 9999;
            font-size: 14px;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 3000);
    }).catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制TokenURI');
    });
}

// 将IPFSFixTool类导出到全局作用域
window.IPFSFixTool = IPFSFixTool;

// 创建全局实例
const fixTool = new IPFSFixTool();
window.fixTool = fixTool;

// 添加表单验证监听
document.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('fix-name');
    const descInput = document.getElementById('fix-description');
    
    if (nameInput) nameInput.addEventListener('input', () => fixTool.checkFormValid());
    if (descInput) descInput.addEventListener('input', () => fixTool.checkFormValid());
});