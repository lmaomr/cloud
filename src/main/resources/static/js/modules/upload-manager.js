/**
 * 上传管理器 - 处理文件上传进度显示和历史记录
 * @module upload-manager
 */

import { UI } from './ui.js';
import { CloudAPI } from '../api/cloud-api.js';
import { FileManager } from './file-manager.js';

/**
 * 上传管理器类
 */
class UploadManager {
  /**
   * 创建上传管理器实例
   */
  constructor() {
    // 上传项目列表
    this.uploadItems = {};
    
    // 上传历史记录
    this.uploadHistory = [];
    
    // 尝试从本地存储加载历史记录
    this.loadHistoryFromStorage();
    
    // 上传进度条容器
    this.uploadProgressContainer = document.getElementById('uploadProgress');
    this.uploadItemsContainer = document.getElementById('uploadItems');
    
    // 绑定关闭按钮事件
    this.bindCloseButton();
    
    // 初始化上传历史记录界面
    this.initHistoryView();
  }
  
  /**
   * 初始化上传管理器
   */
  init() {
    console.log('上传管理器初始化完成');
  }
  
  /**
   * 处理文件选择事件
   * @param {Event} e - 文件选择事件
   */
  handleFileSelect(e) {
    console.log('文件选择事件触发');
    
    const files = e.target.files;
    if (!files || files.length === 0) {
      console.warn('没有选择文件');
      return;
    }
    
    console.log(`选择了 ${files.length} 个文件`);
    
    try {
      // 显示上传进度条
      if (this.uploadProgressContainer) {
        this.uploadProgressContainer.style.display = 'block';
      } else {
        console.warn('找不到上传进度容器元素');
      }
      
      // 获取当前路径
      const currentPath = FileManager.currentPath || '/';
      console.log('当前上传路径:', currentPath);
      
      // 创建FormData对象
      const formData = new FormData();
      formData.append('path', currentPath);
      
      // 处理每个文件上传
      Array.from(files).forEach(file => {
        console.log('准备上传文件:', file.name, '大小:', file.size);
        
        // 生成唯一ID
        const id = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        // 添加文件到FormData - 使用'file'作为字段名，与后端匹配
        formData.append('file', file);
        
        // 添加上传项到UI
        try {
          this.addUploadItem(id, file.name);
          
          // 保存文件信息
          this.uploadItems[id].file = file;
        } catch (err) {
          console.error('添加上传项到UI失败:', err);
        }
      });
      
      // 执行上传
      console.log('开始执行上传');
      this.performUpload(formData)
        .then(result => {
          console.log('文件上传成功完成:', result);
        })
        .catch(error => {
          console.error('文件上传过程中发生错误:', error);
        });
      
      // 清空文件输入框，以便可以再次选择相同的文件
      e.target.value = '';
    } catch (error) {
      console.error('处理文件选择事件失败:', error);
      UI.Toast.show('error', '上传准备失败', error.message || '准备上传文件时发生错误');
      
      // 清空文件输入框
      if (e.target) e.target.value = '';
    }
  }
  
  /**
   * 执行上传操作
   * @param {FormData} formData - 包含文件的FormData对象
   * @returns {Promise} - 上传操作的Promise
   */
  async performUpload(formData) {
    console.log('开始执行文件上传操作');
    
    // 验证FormData参数
    if (!formData) {
      console.error('上传失败: FormData对象为空');
      throw new Error('上传参数无效');
    }
    
    try {
      // 获取所有上传项ID
      const uploadIds = Object.keys(this.uploadItems).filter(id => 
        this.uploadItems[id].status === 'pending');
      
      console.log(`找到${uploadIds.length}个待上传项`);
      
      if (uploadIds.length === 0) {
        console.warn('没有待上传的文件');
        return;
      }
      
      // 更新所有上传项状态为上传中
      uploadIds.forEach(id => {
        const item = this.uploadItems[id];
        if (item && item.element) {
          const statusElement = item.element.querySelector('.upload-item-status');
          if (statusElement) {
            statusElement.textContent = '上传中...';
          }
        }
      });
      
      console.log('开始调用CloudAPI.uploadFiles');
      
      // 调用API上传文件
      await CloudAPI.uploadFiles(formData, (progress, event, isError) => {
        console.log(`上传进度: ${progress}%, 错误状态: ${isError ? 'true' : 'false'}`);
        
        // 如果是错误状态，直接标记为错误
        if (isError) {
          console.error('上传过程中收到错误信号');
          uploadIds.forEach(id => {
            this.updateProgress(id, progress, false); // 标记为错误
          });
          return;
        }
        
        // 确保进度不超过99%，只有在明确成功后才显示100%
        const displayProgress = Math.min(progress, 99);
        
        // 更新所有上传项的进度
        uploadIds.forEach(id => {
          this.updateProgress(id, displayProgress);
        });
      });
      
      console.log('CloudAPI.uploadFiles调用成功完成');
      
      // 上传成功后更新所有项的状态为成功
      uploadIds.forEach(id => {
        this.updateProgress(id, 100, true); // 明确标记为成功
      });
      
      // 上传成功后刷新文件列表
      console.log('刷新文件列表');
      await FileManager.refreshFiles();
      
      // 显示成功通知
      UI.Toast.show('success', '上传成功', `成功上传了 ${uploadIds.length} 个文件`);
      
      return { success: true, count: uploadIds.length };
      
    } catch (error) {
      console.error('上传文件失败:', error);
      
      // 更新所有上传项为错误状态
      const failedItems = Object.keys(this.uploadItems)
        .filter(id => this.uploadItems[id].status === 'uploading' || this.uploadItems[id].status === 'pending');
      
      console.log(`标记 ${failedItems.length} 个项目为失败状态`);
      
      failedItems.forEach(id => {
        this.setError(id, error.message || '上传失败');
      });
      
      // 显示错误通知
      UI.Toast.show('error', '上传失败', error.message || '文件上传失败');
      
      // 重新抛出错误，让调用者可以处理
      throw error;
    }
  }
  
  /**
   * 销毁上传管理器
   */
  destroy() {
    // 清理资源
    console.log('上传管理器资源已清理');
  }
  
  /**
   * 从本地存储加载历史记录
   */
  loadHistoryFromStorage() {
    try {
      const savedHistory = localStorage.getItem('uploadHistory');
      if (savedHistory) {
        this.uploadHistory = JSON.parse(savedHistory);
        // 限制历史记录数量，最多保留20条
        if (this.uploadHistory.length > 20) {
          this.uploadHistory = this.uploadHistory.slice(0, 20);
        }
      }
    } catch (error) {
      console.error('加载上传历史记录失败:', error);
      this.uploadHistory = [];
    }
  }
  
  /**
   * 保存历史记录到本地存储
   */
  saveHistoryToStorage() {
    try {
      localStorage.setItem('uploadHistory', JSON.stringify(this.uploadHistory));
    } catch (error) {
      console.error('保存上传历史记录失败:', error);
    }
  }
  
  /**
   * 添加上传记录到历史
   * @param {string} name - 文件名
   * @param {string} status - 上传状态 ('success', 'error')
   * @param {string} message - 状态信息
   */
  addToHistory(name, status, message) {
    // 创建新的历史记录
    const historyItem = {
      id: Date.now().toString(),
      name,
      status,
      message,
      timestamp: new Date().toISOString()
    };
    
    // 添加到历史记录开头
    this.uploadHistory.unshift(historyItem);
    
    // 限制历史记录数量，最多保留20条
    if (this.uploadHistory.length > 20) {
      this.uploadHistory = this.uploadHistory.slice(0, 20);
    }
    
    // 保存到本地存储
    this.saveHistoryToStorage();
    
    // 更新历史记录视图
    this.updateHistoryView();
  }
  
  /**
   * 初始化历史记录视图
   */
  initHistoryView() {
    // 如果容器存在，则创建历史记录视图
    if (this.uploadProgressContainer) {
      // 检查是否已存在历史记录标签页
      if (!this.uploadProgressContainer.querySelector('.upload-tabs')) {
        // 创建标签页
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'upload-tabs';
        tabsContainer.innerHTML = `
          <button class="tab-btn active" data-tab="current">当前上传</button>
          <button class="tab-btn" data-tab="history">上传历史</button>
        `;
        
        // 创建历史记录容器
        const historyContainer = document.createElement('div');
        historyContainer.className = 'upload-history';
        historyContainer.id = 'uploadHistory';
        historyContainer.style.display = 'none';
        
        // 插入到DOM中
        this.uploadProgressContainer.querySelector('.upload-header').after(tabsContainer);
        this.uploadItemsContainer.after(historyContainer);
        
        // 绑定标签页切换事件
        const tabBtns = tabsContainer.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            // 更新标签页激活状态
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 切换显示内容
            const tabType = btn.dataset.tab;
            if (tabType === 'current') {
              this.uploadItemsContainer.style.display = 'block';
              document.getElementById('uploadHistory').style.display = 'none';
            } else {
              this.uploadItemsContainer.style.display = 'none';
              document.getElementById('uploadHistory').style.display = 'block';
            }
          });
        });
        
        // 更新历史记录视图
        this.updateHistoryView();
      }
    }
  }
  
  /**
   * 更新历史记录视图
   */
  updateHistoryView() {
    const historyContainer = document.getElementById('uploadHistory');
    if (!historyContainer) return;
    
    // 如果没有历史记录，显示空状态
    if (this.uploadHistory.length === 0) {
      historyContainer.innerHTML = `
        <div class="empty-history">
          <i class="fas fa-history"></i>
          <p>暂无上传记录</p>
        </div>
      `;
      return;
    }
    
    // 添加清空历史按钮
    let historyContent = `
      <div class="history-actions">
        <button class="btn btn-sm btn-danger clear-history-btn">
          <i class="fas fa-trash"></i> 清空历史
        </button>
      </div>
    `;
    
    // 渲染历史记录
    historyContent += this.uploadHistory.map(item => {
      const date = new Date(item.timestamp);
      const formattedDate = date.toLocaleString('zh-CN');
      const statusClass = item.status === 'success' ? 'success' : 'error';
      const statusIcon = item.status === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
      
      return `
        <div class="history-item ${statusClass}" data-id="${item.id}">
          <div class="history-item-info">
            <div class="history-item-name" title="${item.name}">${item.name}</div>
            <div class="history-item-time">${formattedDate}</div>
          </div>
          <div class="history-item-status">
            <i class="fas ${statusIcon}"></i> ${item.message}
          </div>
          <div class="history-item-actions">
            <button class="history-item-delete" title="删除记录">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    historyContainer.innerHTML = historyContent;
    
    // 绑定删除按钮事件
    historyContainer.querySelectorAll('.history-item-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const historyItem = e.target.closest('.history-item');
        if (historyItem) {
          const id = historyItem.dataset.id;
          this.removeHistoryItem(id);
        }
      });
    });
    
    // 绑定清空历史按钮事件
    const clearBtn = historyContainer.querySelector('.clear-history-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        UI.Modal.confirm(
          '<i class="fas fa-trash"></i> 清空历史',
          '确定要清空所有上传历史记录吗？此操作不可撤销。',
          () => this.clearHistory()
        );
      });
    }
  }
  
  /**
   * 删除历史记录项
   * @param {string} id - 历史记录ID
   */
  removeHistoryItem(id) {
    // 从数组中删除
    this.uploadHistory = this.uploadHistory.filter(item => item.id !== id);
    
    // 保存到本地存储
    this.saveHistoryToStorage();
    
    // 更新历史记录视图
    this.updateHistoryView();
  }
  
  /**
   * 清空历史记录
   */
  clearHistory() {
    this.uploadHistory = [];
    this.saveHistoryToStorage();
    this.updateHistoryView();
  }
  
  /**
   * 绑定关闭按钮事件
   */
  bindCloseButton() {
    // 上传进度条关闭按钮
    if (this.uploadProgressContainer) {
      const uploadCloseBtn = this.uploadProgressContainer.querySelector('.upload-close');
      if (uploadCloseBtn) {
        uploadCloseBtn.addEventListener('click', () => {
          this.uploadProgressContainer.style.display = 'none';
        });
      }
    }
  }
  
  /**
   * 创建上传项元素
   * @param {string} id - 上传项ID
   * @param {string} name - 文件名
   * @returns {HTMLElement} 上传项元素
   */
  createUploadItem(id, name) {
    const item = document.createElement('div');
    item.className = 'upload-item';
    item.setAttribute('data-id', id);
    
    item.innerHTML = `
      <div class="upload-item-info">
        <div class="upload-item-name" title="${name}">${name}</div>
        <div class="upload-item-status">准备中...</div>
      </div>
      <div class="upload-item-progress">
        <div class="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
          <div class="progress" style="width: 0%"></div>
        </div>
      </div>
      <div class="upload-item-actions">
        <button class="upload-item-cancel" title="取消" aria-label="取消上传">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    // 绑定取消按钮事件
    const cancelBtn = item.querySelector('.upload-item-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.cancelUpload(id);
      });
    }
    
    return item;
  }
  
  /**
   * 添加上传项
   * @param {string} id - 上传项ID
   * @param {string} name - 文件名
   */
  addUploadItem(id, name) {
    // 创建上传项元素
    const item = this.createUploadItem(id, name);
    
    // 存储上传项信息
    this.uploadItems[id] = {
      element: item,
      name,
      status: 'pending',
      progress: 0
    };
    
    // 添加到容器
    if (this.uploadItemsContainer) {
      this.uploadItemsContainer.appendChild(item);
      this.uploadProgressContainer.style.display = 'block';
      
      // 如果有标签页，确保当前上传标签页处于激活状态
      const currentTabBtn = this.uploadProgressContainer.querySelector('.tab-btn[data-tab="current"]');
      if (currentTabBtn) {
        currentTabBtn.click();
      }
    }
    
    // 初始化历史记录视图（如果尚未初始化）
    this.initHistoryView();
  }
  
  /**
   * 更新上传进度
   * @param {string} id - 上传项ID
   * @param {number} progress - 进度百分比 (0-100)
   * @param {boolean} isSuccess - 是否上传成功，默认为undefined（表示进行中）
   */
  updateProgress(id, progress, isSuccess) {
    const item = this.uploadItems[id];
    if (!item) return;
    
    // 更新状态
    item.progress = progress;
    
    // 根据进度和成功标志确定状态
    if (isSuccess === false) {
      item.status = 'error';
    } else if (isSuccess === true) {
      item.status = 'completed';
    } else {
      item.status = 'uploading';
    }
    
    // 更新DOM
    const element = item.element;
    if (element) {
      // 更新进度条
      const progressBar = element.querySelector('.progress');
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
      }
      
      // 更新状态文本
      const statusElement = element.querySelector('.upload-item-status');
      if (statusElement) {
        if (isSuccess === false) {
          // 上传失败
          statusElement.textContent = '上传失败';
          statusElement.classList.add('error');
          element.classList.add('error');
        } else if (isSuccess === true) {
          // 上传完成
          statusElement.textContent = '完成';
          statusElement.classList.add('success');
          
          // 上传完成，添加到历史记录
          this.addToHistory(item.name, 'success', '上传成功');
          
          // 2秒后从当前上传列表中移除
          setTimeout(() => {
            if (element.parentNode === this.uploadItemsContainer) {
              this.uploadItemsContainer.removeChild(element);
              delete this.uploadItems[id];
            }
          }, 2000);
        } else {
          // 上传中
          statusElement.textContent = `${Math.round(progress)}%`;
        }
      }
    }
  }
  
  /**
   * 设置上传错误
   * @param {string} id - 上传项ID
   * @param {string} errorMessage - 错误信息
   */
  setError(id, errorMessage) {
    const item = this.uploadItems[id];
    if (!item) return;
    
    // 使用updateProgress方法更新状态为错误
    const currentProgress = item.progress || 0;
    this.updateProgress(id, currentProgress, false);
    
    // 更新DOM中的错误消息
    const element = item.element;
    if (element) {
      const statusElement = element.querySelector('.upload-item-status');
      if (statusElement) {
        statusElement.textContent = errorMessage || '上传失败';
      }
    }
    
    // 添加到历史记录
    this.addToHistory(item.name, 'error', errorMessage || '上传失败');
  }
  
  /**
   * 取消上传
   * @param {string} id - 上传项ID
   */
  cancelUpload(id) {
    const item = this.uploadItems[id];
    if (!item) return;
    
    // 更新状态
    item.status = 'cancelled';
    
    // 更新DOM
    const element = item.element;
    if (element && this.uploadItemsContainer) {
      // 从DOM中移除
      this.uploadItemsContainer.removeChild(element);
    }
    
    // 从列表中删除
    delete this.uploadItems[id];
    
    // 添加到历史记录
    this.addToHistory(item.name, 'error', '上传已取消');
  }
  
  /**
   * 开始上传文件
   * @param {string} id - 上传项ID
   * @param {string} name - 文件名
   * @param {Function} uploadFunction - 上传函数
   * @returns {Promise} - 上传结果
   */
  async uploadFile(id, name, uploadFunction) {
    // 添加上传项
    this.addUploadItem(id, name);
    
    try {
      // 执行上传，传入进度回调
      return await uploadFunction(progress => {
        this.updateProgress(id, progress);
      });
    } catch (error) {
      this.setError(id, error.message || '上传失败');
      throw error;
    }
  }
}

// 创建全局实例
const uploadManager = new UploadManager();

export default uploadManager; 