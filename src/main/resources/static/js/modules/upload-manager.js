/**
 * 上传管理器 - 处理文件上传进度显示和历史记录
 * @module upload-manager
 */

import { UI } from './ui.js';
import { CloudAPI } from '../api/cloud-api.js';
import { FileManager } from './file-manager.js';

// 默认分片大小：2MB
const DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024;

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
      
      // 处理每个文件上传
      Array.from(files).forEach(file => {
        console.log('准备上传文件:', file.name, '大小:', file.size);
        
        // 生成唯一ID
        const id = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        // 添加上传项到UI
        try {
          this.addUploadItem(id, file.name);
          
          // 保存文件信息
          this.uploadItems[id] = {
            file,
            status: 'pending',
            progress: 0,
            path: currentPath
          };
          
          // 开始上传文件
          this.uploadFileWithChunks(id);
        } catch (err) {
          console.error('添加上传项到UI失败:', err);
        }
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
   * 使用分片上传文件
   * @param {string} id - 上传项ID
   */
  async uploadFileWithChunks(id) {
    const item = this.uploadItems[id];
    if (!item || !item.file) {
      console.error('上传项不存在或文件为空');
      return;
    }
    
    const file = item.file;
    const fileName = file.name;
    const fileSize = file.size;
    const path = item.path || '/';
    
    try {
      // 更新状态为上传中
      item.status = 'uploading';
      const statusElement = item.element?.querySelector('.upload-status');
          if (statusElement) {
        statusElement.textContent = '准备上传...';
          }
      
      // 初始化分片上传
      console.log(`初始化分片上传: ${fileName}, 大小: ${fileSize}`);
      const initResponse = await CloudAPI.initChunkedUpload(
        fileName, 
        fileSize, 
        DEFAULT_CHUNK_SIZE,
        path
      );
      
      if (!initResponse || !initResponse.data) {
        throw new Error('初始化上传失败');
      }
      
      const { uploadId, totalChunks } = initResponse.data;
      console.log(`上传ID: ${uploadId}, 总分片数: ${totalChunks}`);
      
      // 保存上传信息
      item.uploadId = uploadId;
      item.totalChunks = totalChunks;
      item.uploadedChunks = 0;
      
      // 创建分片并上传
      for (let i = 0; i < totalChunks; i++) {
        // 如果上传已取消，则退出循环
        if (item.status === 'cancelled') {
          console.log(`上传已取消: ${fileName}`);
          break;
        }
        
        // 计算分片的起始和结束位置
        const start = i * DEFAULT_CHUNK_SIZE;
        const end = Math.min(fileSize, start + DEFAULT_CHUNK_SIZE);
        const chunk = file.slice(start, end);
        
        try {
          // 更新状态
          if (statusElement) {
            statusElement.textContent = `上传中 (${i + 1}/${totalChunks})...`;
          }
          
          // 上传分片
          await CloudAPI.uploadChunk(uploadId, i, chunk, (progress) => {
            // 计算总体进度
            const chunkProgress = progress / 100;
            const totalProgress = ((item.uploadedChunks + chunkProgress) / totalChunks) * 100;
            this.updateProgress(id, totalProgress);
          });
        
          // 更新已上传分片数
          item.uploadedChunks++;
          
          // 更新总体进度
          const totalProgress = (item.uploadedChunks / totalChunks) * 100;
          this.updateProgress(id, totalProgress);
          
        } catch (error) {
          console.error(`上传分片失败: 索引=${i}, 错误=${error.message}`);
          throw new Error(`上传分片失败: ${error.message}`);
        }
      }
      
      // 如果上传已取消，则不继续完成上传
      if (item.status === 'cancelled') {
        return;
      }
      
      // 完成上传
      console.log(`完成分片上传: ${fileName}`);
      const completeResponse = await CloudAPI.completeChunkedUpload(uploadId);
      
      if (!completeResponse || !completeResponse.data) {
        throw new Error('完成上传失败');
      }
      
      // 更新状态为成功
      this.updateProgress(id, 100, true);
      
      // 更新存储空间信息
      console.log('更新存储空间使用情况');
      await this.updateStorageInfo();
      
      // 上传成功后刷新文件列表
      console.log('刷新文件列表');
      await FileManager.refreshFiles();
      
      // 添加到历史记录
      this.addToHistory(fileName, 'success', '上传成功');
      
      // 显示成功通知
      UI.Toast.success('上传成功', `文件 ${fileName} 上传成功`);
      
    } catch (error) {
      console.error(`上传文件失败: ${fileName}, 错误=${error.message}`);
      
      // 更新状态为失败
      this.setError(id, error.message || '上传失败');
      
      // 添加到历史记录
      this.addToHistory(fileName, 'error', error.message || '上传失败');
      
      // 显示错误通知
      UI.Toast.error('上传失败', `文件 ${fileName} 上传失败: ${error.message}`);
    }
  }
  
  /**
   * 执行上传操作
   * @param {FormData} formData - 包含文件的表单数据
   * @returns {Promise} - 返回Promise对象
   */
  performUpload(formData) {
    return new Promise((resolve, reject) => {
      try {
        // 获取当前路径
        const currentPath = FileManager.currentPath || '/';
        
        // 添加路径参数到表单数据
        formData.append('path', currentPath);

        // 获取当前上传任务的ID列表（仅更新这些ID对应的进度条）
        const currentUploadIds = Object.keys(this.uploadItems).filter(id => 
          this.uploadItems[id].status === 'pending' || this.uploadItems[id].status === 'uploading'
        );

        // 调用API上传文件
        CloudAPI.uploadFiles(formData, (progress, event, isError) => {
          // 这里可以处理总体上传进度
          if (!isError) {
            // 更新所有上传项的进度
            Object.keys(this.uploadItems).forEach(id => {
              this.updateProgress(id, progress);
            });
          }
        })
        .then(async (response) => {
          // 上传成功
          console.log('文件上传成功:', response);
          
          // 更新所有上传项为成功状态
          Object.keys(this.uploadItems).forEach(id => {
            this.updateProgress(id, 100, true);
          });
          
          // 更新存储空间信息
          await this.updateStorageInfo();
          
          // 刷新文件列表
          await FileManager.refreshFiles();
          
          // 显示成功通知
          UI.Toast.success('上传成功', '文件已上传');
          
          resolve(response);
        })
        .catch((error) => {
          console.error('文件上传失败:', error);
          
          // 更新所有上传项为失败状态
          Object.keys(this.uploadItems).forEach(id => {
        this.setError(id, error.message || '上传失败');
      });
      
      // 显示错误通知
      UI.Toast.error('上传失败', error.message || '文件上传失败');
      
          reject(error);
        });
      } catch (error) {
        console.error('执行上传操作失败:', error);
        reject(error);
    }
    });
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
   * 添加上传项到UI
   * @param {string} id - 上传项ID
   * @param {string} name - 文件名
   */
  addUploadItem(id, name) {
    // 检查上传进度容器是否存在
    if (!this.uploadProgressContainer || !this.uploadItemsContainer) {
      console.error('上传进度容器不存在');
      return;
    }
    
    // 显示上传进度容器
    this.uploadProgressContainer.style.display = 'flex';
    
    // 创建上传项元素
    const uploadItem = document.createElement('div');
    uploadItem.className = 'upload-item';
    uploadItem.dataset.id = id;
    
    // 创建上传项内容
    uploadItem.innerHTML = `
      <div class="upload-item-header">
        <div class="upload-item-name" title="${name}">${name}</div>
        <div class="upload-item-actions">
          <button class="upload-cancel" title="取消上传"><i class="fas fa-times"></i></button>
        </div>
      </div>
      <div class="upload-progress-bar">
        <div class="upload-progress-bar-inner" style="width: 0%"></div>
      </div>
      <div class="upload-item-footer">
        <div class="upload-status">准备上传...</div>
        <div class="progress-text">0%</div>
      </div>
    `;
    
    // 添加到上传项容器
    this.uploadItemsContainer.appendChild(uploadItem);
    
    // 绑定取消按钮事件
    const cancelButton = uploadItem.querySelector('.upload-cancel');
    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        this.cancelUpload(id);
      });
    }
    
    // 保存元素引用
    this.uploadItems[id] = this.uploadItems[id] || {};
    this.uploadItems[id].element = uploadItem;
    this.uploadItems[id].name = name;
    
    return uploadItem;
  }
  
  /**
   * 更新上传进度
   * @param {string} id - 上传项ID
   * @param {number} progress - 进度值(0-100)
   * @param {boolean} isSuccess - 是否成功完成
   */
  updateProgress(id, progress, isSuccess = false) {
    const item = this.uploadItems[id];
    if (!item || !item.element) {
      console.warn(`找不到上传项: ${id}`);
      return;
    }
    
    // 如果上传已取消，则不更新进度
    if (item.status === 'cancelled') {
      return;
    }
    
    // 更新进度值
    item.progress = progress;
    
    // 获取进度条元素
    const progressBar = item.element.querySelector('.upload-progress-bar-inner');
    const progressText = item.element.querySelector('.progress-text');
    const statusElement = item.element.querySelector('.upload-status');
    
      if (progressBar) {
      // 更新进度条宽度
        progressBar.style.width = `${progress}%`;
      }
      
    if (progressText) {
      // 更新进度文本
      progressText.textContent = `${Math.round(progress)}%`;
    }
    
    // 如果是成功完成
    if (isSuccess) {
      // 更新状态
      item.status = 'success';
      
      if (statusElement) {
        statusElement.textContent = '上传成功';
          statusElement.classList.add('success');
      }
      
      if (progressBar) {
        progressBar.classList.add('success');
      }
          
      // 添加到历史记录
          this.addToHistory(item.name, 'success', '上传成功');
    }
  }
  
  /**
   * 更新存储空间使用情况
   */
  async updateStorageInfo() {
    try {
      // 获取当前登录用户名
      const userInfo = await CloudAPI.getUserInfo();
      if (!userInfo || !userInfo.data || !userInfo.data.username) {
        console.error('获取用户信息失败，无法更新存储空间');
        return;
      }

      // 获取云盘信息
      const username = userInfo.data.username;
      const cloudInfo = await CloudAPI.getUserCloud(username);
      
      if (cloudInfo && cloudInfo.data) {
        // 更新存储空间信息
        const usedCapacity = cloudInfo.data.usedCapacity;
        const totalCapacity = cloudInfo.data.totalCapacity;
        const usedPercentage = (usedCapacity / totalCapacity) * 100;
        
        // 更新存储空间进度条
        const storageProgress = document.querySelector('.storage-progress');
        if (storageProgress) {
          const progressBar = storageProgress.querySelector('.progress-bar');
          const progress = progressBar.querySelector('.progress');
          const storageText = storageProgress.querySelector('.storage-text span');
          
          progressBar.setAttribute('aria-valuenow', usedPercentage);
          progress.style.width = `${usedPercentage}%`;
          
          // 使用FileManager的方法格式化文件大小
          if (window.FileManager && typeof window.FileManager.formatFileSize === 'function') {
            storageText.textContent = `${window.FileManager.formatFileSize(usedCapacity)} / ${window.FileManager.formatFileSize(totalCapacity)}`;
          } else {
            // 如果FileManager不可用，使用简单格式化
            const formatSize = (bytes) => {
              if (bytes === 0) return '0 B';
              const k = 1024;
              const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
              const i = Math.floor(Math.log(bytes) / Math.log(k));
              return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            };
            storageText.textContent = `${formatSize(usedCapacity)} / ${formatSize(totalCapacity)}`;
          }
        }
        
        console.log('存储空间信息已更新');
      }
    } catch (error) {
      console.error('更新存储空间信息失败:', error);
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
    if (!item) {
      console.warn(`找不到上传项: ${id}`);
      return;
    }
    
    // 更新状态为已取消
    item.status = 'cancelled';
    
    // 更新UI
    const statusElement = item.element?.querySelector('.upload-status');
    if (statusElement) {
      statusElement.textContent = '已取消';
      statusElement.classList.add('cancelled');
    }
    
    // 添加到历史记录
    this.addToHistory(item.name, 'cancelled', '上传已取消');
    
    console.log(`上传已取消: ${id}`);
  }
  
  /**
   * 上传单个文件
   * @param {string} id - 上传项ID
   * @param {string} name - 文件名
   * @param {Function} uploadFunction - 上传函数
   */
  async uploadFile(id, name, uploadFunction) {
    try {
      // 显示上传中通知
      const loadingToastId = UI.Toast.loading('上传中', `正在上传 ${name}...`);
      
      // 更新上传项状态
      const item = this.uploadItems[id];
      if (item) {
        item.status = 'uploading';
        const statusElement = item.element.querySelector('.upload-status');
        if (statusElement) {
          statusElement.textContent = '上传中...';
        }
      }
      
      // 执行上传
      await uploadFunction();
      
      // 隐藏加载通知
      if (loadingToastId) {
        UI.Toast.hide(loadingToastId);
      }
      
      // 更新为成功状态
      this.updateProgress(id, 100, true);
      
      // 添加到历史记录
      this.addToHistory(name, 'success', '上传成功');
      
      // 上传成功后更新存储空间信息
      await this.updateStorageInfo();
      
      // 上传成功后刷新文件列表
      await FileManager.refreshFiles();
      
      // 显示成功通知
      UI.Toast.success('上传成功', `${name} 已上传`);
      
      return { success: true };
    } catch (error) {
      console.error(`上传文件 ${name} 失败:`, error);
      
      // 隐藏可能存在的加载通知
      const loadingToasts = document.querySelectorAll('.toast-loading');
      loadingToasts.forEach(toast => {
        const toastId = toast.id;
        if (toastId) {
          UI.Toast.hide(toastId);
        }
      });
      
      // 设置错误状态
      this.setError(id, error.message || '上传失败');
      
      // 添加到历史记录
      this.addToHistory(name, 'error', error.message || '上传失败');
      
      // 显示错误通知
      UI.Toast.error('上传失败', `${name}: ${error.message || '文件上传失败'}`);
      
      throw error;
    }
  }
}

// 创建全局实例
const uploadManager = new UploadManager();

export default uploadManager; 