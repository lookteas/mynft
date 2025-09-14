// 共享UI模块
// 提供统一的状态消息显示和UI交互功能

export class SharedUIManager {
    constructor() {
        this.activeMessages = new Set();
        this.defaultDuration = 5000;
    }

    // 显示状态消息
    showStatus(message, type = 'info', duration = null, container = null) {
        const actualDuration = duration || this.defaultDuration;
        const targetContainer = container || this.getDefaultContainer();

        // 创建状态消息元素
        const statusDiv = document.createElement('div');
        statusDiv.className = `status-message ${type}`;
        statusDiv.textContent = message;
        
        // 添加关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.className = 'status-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => this.removeMessage(statusDiv);
        statusDiv.appendChild(closeBtn);

        // 添加到容器
        if (targetContainer) {
            targetContainer.insertBefore(statusDiv, targetContainer.firstChild);
        } else {
            // 如果没有找到容器，创建一个临时容器
            this.createTemporaryContainer(statusDiv);
        }

        // 记录活动消息
        this.activeMessages.add(statusDiv);

        // 自动移除
        if (actualDuration > 0) {
            setTimeout(() => {
                this.removeMessage(statusDiv);
            }, actualDuration);
        }

        return statusDiv;
    }

    // 获取默认容器
    getDefaultContainer() {
        // 优先查找主应用容器
        let container = document.querySelector('.app-main');
        if (container) return container;

        // 查找其他可能的容器
        container = document.querySelector('.container');
        if (container) return container;

        container = document.querySelector('main');
        if (container) return container;

        container = document.querySelector('body');
        return container;
    }

    // 创建临时容器
    createTemporaryContainer(statusDiv) {
        let tempContainer = document.getElementById('temp-status-container');
        
        if (!tempContainer) {
            tempContainer = document.createElement('div');
            tempContainer.id = 'temp-status-container';
            tempContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
            `;
            document.body.appendChild(tempContainer);
        }
        
        tempContainer.appendChild(statusDiv);
    }

    // 移除消息
    removeMessage(statusDiv) {
        if (statusDiv && statusDiv.parentNode) {
            statusDiv.parentNode.removeChild(statusDiv);
            this.activeMessages.delete(statusDiv);
        }
    }

    // 清除所有消息
    clearAllMessages() {
        this.activeMessages.forEach(message => {
            this.removeMessage(message);
        });
        this.activeMessages.clear();
    }

    // 显示成功消息
    showSuccess(message, duration = null, container = null) {
        return this.showStatus(message, 'success', duration, container);
    }

    // 显示错误消息
    showError(message, duration = null, container = null) {
        return this.showStatus(message, 'error', duration, container);
    }

    // 显示警告消息
    showWarning(message, duration = null, container = null) {
        return this.showStatus(message, 'warning', duration, container);
    }

    // 显示信息消息
    showInfo(message, duration = null, container = null) {
        return this.showStatus(message, 'info', duration, container);
    }

    // 显示加载消息（不自动消失）
    showLoading(message, container = null) {
        return this.showStatus(message, 'loading', 0, container);
    }

    // 更新现有消息
    updateMessage(messageElement, newText, newType = null) {
        if (messageElement && this.activeMessages.has(messageElement)) {
            messageElement.textContent = newText;
            
            if (newType) {
                // 移除旧的类型类
                messageElement.className = messageElement.className.replace(/\b(success|error|warning|info|loading)\b/g, '');
                messageElement.classList.add(newType);
            }
            
            // 重新添加关闭按钮
            const closeBtn = messageElement.querySelector('.status-close');
            if (!closeBtn) {
                const newCloseBtn = document.createElement('button');
                newCloseBtn.className = 'status-close';
                newCloseBtn.innerHTML = '×';
                newCloseBtn.onclick = () => this.removeMessage(messageElement);
                messageElement.appendChild(newCloseBtn);
            }
        }
    }

    // 显示确认对话框
    showConfirm(message, onConfirm, onCancel = null) {
        const modal = this.createModal('confirm', message);
        
        const confirmBtn = modal.querySelector('.confirm-btn');
        const cancelBtn = modal.querySelector('.cancel-btn');
        
        confirmBtn.onclick = () => {
            this.closeModal(modal);
            if (onConfirm) onConfirm();
        };
        
        cancelBtn.onclick = () => {
            this.closeModal(modal);
            if (onCancel) onCancel();
        };
        
        return modal;
    }

    // 显示提示对话框
    showAlert(message, onClose = null) {
        const modal = this.createModal('alert', message);
        
        const okBtn = modal.querySelector('.ok-btn');
        okBtn.onclick = () => {
            this.closeModal(modal);
            if (onClose) onClose();
        };
        
        return modal;
    }

    // 创建模态框
    createModal(type, message) {
        const modal = document.createElement('div');
        modal.className = 'shared-modal';
        
        let buttonsHtml = '';
        if (type === 'confirm') {
            buttonsHtml = `
                <button class="btn btn-primary confirm-btn">确认</button>
                <button class="btn btn-secondary cancel-btn">取消</button>
            `;
        } else if (type === 'alert') {
            buttonsHtml = `
                <button class="btn btn-primary ok-btn">确定</button>
            `;
        }
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    ${buttonsHtml}
                </div>
            </div>
        `;
        
        // 添加样式
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
        `;
        
        const modalContent = modal.querySelector('.modal-content');
        modalContent.style.cssText = `
            background: white;
            padding: 0;
            border-radius: 8px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;
        
        // 关闭按钮事件
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.onclick = () => this.closeModal(modal);
        
        // 点击背景关闭
        modal.onclick = (e) => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        };
        
        document.body.appendChild(modal);
        return modal;
    }

    // 关闭模态框
    closeModal(modal) {
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }

    // 显示进度条
    showProgress(message = '处理中...', container = null) {
        const progressDiv = document.createElement('div');
        progressDiv.className = 'progress-container';
        
        progressDiv.innerHTML = `
            <div class="progress-message">${message}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
            <div class="progress-percent">0%</div>
        `;
        
        const targetContainer = container || this.getDefaultContainer();
        if (targetContainer) {
            targetContainer.appendChild(progressDiv);
        }
        
        return {
            element: progressDiv,
            updateProgress: (percent, message = null) => {
                const fill = progressDiv.querySelector('.progress-fill');
                const percentText = progressDiv.querySelector('.progress-percent');
                const messageText = progressDiv.querySelector('.progress-message');
                
                if (fill) fill.style.width = `${percent}%`;
                if (percentText) percentText.textContent = `${percent}%`;
                if (message && messageText) messageText.textContent = message;
            },
            remove: () => {
                if (progressDiv.parentNode) {
                    progressDiv.parentNode.removeChild(progressDiv);
                }
            }
        };
    }

    // 设置默认持续时间
    setDefaultDuration(duration) {
        this.defaultDuration = duration;
    }

    // 获取活动消息数量
    getActiveMessageCount() {
        return this.activeMessages.size;
    }
}

// 导出单例实例
export const sharedUI = new SharedUIManager();

// 工厂函数
function createSharedUI(options = {}) {
    return new SharedUIManager(options);
}

// 便捷函数
function showMessage(message, type = 'info', duration = 3000, container = null) {
    return sharedUI.showMessage(message, type, duration, container);
}

function showModal(title, content, options = {}) {
    return sharedUI.showModal(title, content, options);
}

function showProgress(message = '处理中...', container = null) {
    return sharedUI.showProgress(message, container);
}

// 导出单例实例和工厂函数
export { sharedUI as sharedUIManager, createSharedUI, showMessage, showModal, showProgress };