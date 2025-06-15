/**
 * 上传管理模块 - 处理文件上传相关功能
 * @module upload-manager
 */

import { CloudAPI } from '../api/cloud-api.js';
import { UI } from './ui.js';
import { FileManager } from './file-manager.js';

/**
 * 上传管理器
 */
export const UploadManager = {
  /**
   * 初始化上传管理器
   */
  init() {
    this.uploadProgress = document.getElementById('uploadProgress');
    this.uploadItems = document.getElementById('uploadItems');
    
    // 绑定拖放上传事件
    this.setupDragAndDrop();
    
    // 绑定进度条关闭按钮事件
    if (this.uploadProgress) {
      const closeBtn = this.uploadProgress.querySelector('.upload-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.uploadProgress.style.display = 'none';
        });
      }
    }
    
    console.log('上传管理器初始化完成');
  },
  
  /**
   * 设置拖放上传
   */
  setupDragAndDrop() {
    const dropZone = document.querySelector('.file-container');
    if (!dropZone) return;
    
    // 防止浏览器默认行为
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    
    document.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // 只有当拖入的是文件时才显示拖拽效果
      if (e.dataTransfer.types.includes('Files')) {
        dropZone.classList.add('drag-over');
      }
    });
    
    document.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // 只有当离开的是文档时才移除拖拽效果
      if (e.relatedTarget === null) {
        dropZone.classList.remove('drag-over');
      }
    });
    
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // 移除拖拽效果
      dropZone.classList.remove('drag-over');
      
      // 只有在目标区域内放置才处理文件
      if (this.isDescendantOf(e.target, dropZone)) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          this.uploadFiles(files);
        }
      }
    });
  },
  
  /**
   * 检查元素是否是指定父元素的子元素
   * @param {HTMLElement} child - 子元素
   * @param {HTMLElement} parent - 父元素
   * @returns {boolean} 是否是子元素
   */
  isDescendantOf(child, parent) {
    let node = child;
    while (node !== null) {
      if (node === parent) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  },
  
  /**
   * 处理文件选择
   * @param {Event} e - 文件选择事件
   */
  handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
      this.uploadFiles(files);
    }
    // 清空 file input 的值，以便下次选择相同文件也能触发 change 事件
    e.target.value = null;
  },
  
  /**
   * 上传文件
   * @param {FileList|Array} files - 文件列表
   * @returns {Promise} - 上传结果
   */
  async uploadFiles(files) {
    // 定义上传结果变量
    let result = null;
    
    try {
      // 确保files是一个数组
      const fileArray = Array.from(files || []);
      
      if (fileArray.length === 0) {
        UI.Toast.show('warning', '上传失败', '没有选择任何文件');
        return { success: false, message: '没有选择任何文件', files: [] };
      }
      
      // 显示上传进度条
      if (this.uploadProgress) {
        this.uploadProgress.style.display = 'block';
      }
      
      // 清空上传项列表
      if (this.uploadItems) {
        this.uploadItems.innerHTML = '';
      }
      
      // 创建FormData对象
      const formData = new FormData();
      const uploadItemsMap = new Map();
      
      // 添加文件到FormData，并创建上传项UI
      fileArray.forEach(file => {
        formData.append('file', file);
        
        // 创建上传项UI
        if (this.uploadItems) {
          const uploadItem = this.createUploadItem(file);
          this.uploadItems.appendChild(uploadItem);
          uploadItemsMap.set(file, uploadItem);
          
          // 启动模拟进度
          this.startSimulatedProgress(uploadItem);
        }
      });
      
      // 设置上传进度回调
      const onProgress = (percent, event) => {
        if (event && event.lengthComputable) {
          const file = fileArray.find(f => f.size === event.total);
          if (file) {
            const uploadItem = uploadItemsMap.get(file);
            if (uploadItem) {
              this.updateItemProgress(uploadItem, percent);
            }
          }
        }
      };
      
      // 调用API上传文件
      result = await CloudAPI.uploadFiles(formData, onProgress);
      
      // 上传成功，将所有进度设为100%
      fileArray.forEach(file => {
        const uploadItem = uploadItemsMap.get(file);
        if (uploadItem) {
          this.updateItemProgress(uploadItem, 100);
        }
      });
      
      // 上传成功
      UI.Toast.show('success', '上传成功', `已成功上传 ${fileArray.length} 个文件`);
      
      // 刷新文件列表
      FileManager.refreshFiles();
      
      // 延迟关闭上传进度条
      const closeProgressTimeout = setTimeout(() => {
        if (this.uploadProgress) {
          this.uploadProgress.style.display = 'none';
        }
        // 清除定时器引用
        this._closeProgressTimeout = null;
      }, 2000);
      
      // 保存定时器引用，以便在需要时清除
      this._closeProgressTimeout = closeProgressTimeout;
      
      return { success: true, message: '上传成功', files: fileArray, result };
    } catch (error) {
      console.error('上传过程中发生错误:', error);
      
      // 显示错误信息
      let errorMessage = error.message || '上传失败';
      
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        errorMessage = '服务器连接失败，请检查服务器是否正常运行';
        UI.Toast.show('error', '上传失败', errorMessage);
      } else if (error.message.includes('Maximum upload size exceeded')) {
        errorMessage = '文件大小超过限制，请上传小于100MB的文件';
        UI.Toast.show('error', '上传失败', errorMessage);
      } else {
        UI.Toast.show('error', '上传失败', errorMessage);
      }
      
      return { success: false, message: errorMessage, error, files: Array.from(files || []) };
    }
  },
  
  /**
   * 创建上传项UI
   * @param {File} file - 文件对象
   * @returns {HTMLElement} 上传项元素
   */
  createUploadItem(file) {
    const item = document.createElement('div');
    item.className = 'upload-item';
    
    const fileIcon = this.getFileIcon(file.name);
    const fileSize = this.formatFileSize(file.size);
    
    item.innerHTML = `
      <div class="upload-item-info">
        <i class="${fileIcon}"></i>
        <span class="upload-filename">${file.name}</span>
        <span class="upload-filesize">${fileSize}</span>
      </div>
      <div class="upload-item-progress">
        <div class="upload-progress-bar">
          <div class="upload-progress-inner" style="width: 0%"></div>
        </div>
        <span class="upload-percentage">0%</span>
      </div>
    `;
    
    return item;
  },
  
  /**
   * 更新上传项进度
   * @param {HTMLElement} item - 上传项元素
   * @param {number} percent - 进度百分比
   */
  updateItemProgress(item, percent) {
    if (!item) return;
    
    // 停止模拟进度
    if (item._simulationInterval) {
      clearInterval(item._simulationInterval);
      item._simulationInterval = null;
    }
    
    const progressBar = item.querySelector('.upload-progress-inner');
    const percentage = item.querySelector('.upload-percentage');
    
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (percentage) percentage.textContent = `${Math.round(percent)}%`;
  },
  
  /**
   * 启动模拟进度
   * @param {HTMLElement} item - 上传项元素
   */
  startSimulatedProgress(item) {
    let progress = 0;
    const progressBar = item.querySelector('.upload-progress-inner');
    const percentage = item.querySelector('.upload-percentage');
    
    const interval = setInterval(() => {
      // 根据当前进度调整增量，使进度条增长速度逐渐减慢
      let increment;
      if (progress < 30) {
        increment = 1 + Math.random() * 2; // 快速增长到30%
      } else if (progress < 70) {
        increment = 0.5 + Math.random() * 1; // 中速增长到70%
      } else if (progress < 90) {
        increment = 0.1 + Math.random() * 0.3; // 慢速增长到90%
      } else {
        increment = 0.01 + Math.random() * 0.05; // 非常慢地增长到接近但不到100%
      }
      
      progress += increment;
      
      // 确保模拟进度不会到达100%（留给实际完成事件）
      if (progress >= 99) {
        progress = 99;
        clearInterval(interval);
      }
      
      if (progressBar) progressBar.style.width = `${progress}%`;
      if (percentage) percentage.textContent = `${Math.round(progress)}%`;
    }, 200);
    
    // 保存interval ID以便后续清除
    item._simulationInterval = interval;
  },
  
  /**
   * 获取文件图标
   * @param {string} fileName - 文件名
   * @returns {string} 图标类名
   */
  getFileIcon(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    
    switch(extension) {
      case 'pdf':
        return 'fas fa-file-pdf';
      case 'doc':
      case 'docx':
        return 'fas fa-file-word';
      case 'xls':
      case 'xlsx':
        return 'fas fa-file-excel';
      case 'ppt':
      case 'pptx':
        return 'fas fa-file-powerpoint';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
        return 'fas fa-file-image';
      case 'mp3':
      case 'wav':
      case 'ogg':
        return 'fas fa-file-audio';
      case 'mp4':
      case 'avi':
      case 'mov':
        return 'fas fa-file-video';
      case 'zip':
      case 'rar':
      case '7z':
        return 'fas fa-file-archive';
      case 'txt':
        return 'fas fa-file-alt';
      case 'html':
      case 'css':
      case 'js':
        return 'fas fa-file-code';
      default:
        return 'fas fa-file';
    }
  },
  
  /**
   * 格式化文件大小
   * @param {number} bytes - 文件大小（字节）
   * @returns {string} 格式化后的文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
  
  /**
   * 清理资源
   */
  destroy() {
    // 清除可能存在的定时器
    if (this._closeProgressTimeout) {
      clearTimeout(this._closeProgressTimeout);
      this._closeProgressTimeout = null;
    }
    
    // 移除事件监听器
    const dropZone = document.querySelector('.file-container');
    if (dropZone) {
      dropZone.classList.remove('drag-over');
    }
    
    console.log('上传管理器资源已清理');
  }
};

export default UploadManager; 