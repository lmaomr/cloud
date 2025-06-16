/**
 * 文件管理模块 - 处理文件列表显示和操作
 * @module file-manager
 */

import { CloudAPI } from '../api/cloud-api.js';
import { UI } from './ui.js';

/**
 * 文件管理器
 */
export const FileManager = {
  /**
   * 当前视图类型（grid或list）
   */
  currentView: 'grid',
  
  /**
   * 当前排序方式
   */
  currentSort: 'name-asc',
  
  /**
   * 选中的文件列表
   */
  selectedFiles: [],
  
  /**
   * 当前路径
   */
  currentPath: '/',
  
  /**
   * 当前文件列表缓存
   */
  currentFiles: [],
  
  /**
   * 是否处于搜索模式
   */
  isSearchMode: false,
  
  /**
   * 初始化文件管理器
   */
  init() {
    // DOM元素引用
    this.fileList = document.getElementById('fileList');
    this.emptyFileList = document.getElementById('emptyFileList');
    this.fileActionsToolbar = document.getElementById('fileActionsToolbar');
    this.selectedCountElement = document.getElementById('selectedCount');
    this.viewBtns = document.querySelectorAll('.view-btn');
    this.refreshBtn = document.getElementById('refreshBtn');
    
    // 加载保存的视图类型
    const savedView = localStorage.getItem('view');
    if (savedView) {
      this.currentView = savedView;
    }
    
    // 存储事件处理函数引用，便于后续移除
    this._eventHandlers = {
      fileItemClick: (e) => this.handleFileItemClick(e),
      checkboxChange: (e) => {
        if (e.target.classList.contains('item-checkbox')) {
          const fileItem = e.target.closest('.file-item');
          if (fileItem) {
            if (e.target.checked) {
              this.selectFile(fileItem);
            } else {
              this.deselectFile(fileItem);
            }
            this.updateToolbar();
          }
        }
      },
      fileAction: (e) => this.handleFileAction(e),
      sectionChange: (e) => {
        console.log('文件管理器接收到部分切换事件:', e.detail);
        if (e.detail && e.detail.section) {
          this.handleSectionChange(e.detail.section);
        }
      },
      searchPerform: (e) => {
        if (e.detail && e.detail.query) {
          this.searchFiles(e.detail.query);
        }
      },
      // 拖放事件处理
      dragOver: (e) => this.handleDragOver(e),
      dragEnter: (e) => this.handleDragEnter(e),
      dragLeave: (e) => this.handleDragLeave(e),
      drop: (e) => this.handleDrop(e)
    };
    
    // 绑定事件
    this.bindEvents();
    
    // 设置视图类型
    this.setView(this.currentView);
    
    console.log('文件管理器初始化完成');
    
    // 加载文件列表
    this.loadFiles();
  },
  
  /**
   * 绑定事件
   */
  bindEvents() {
    // 视图切换按钮
    this.viewBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.setView(btn.dataset.view);
      });
    });
    
    // 刷新按钮
    if (this.refreshBtn) {
      this.refreshBtn.addEventListener('click', () => this.refreshFiles());
    }
    
    // 排序选项
    document.querySelectorAll('[data-sort]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.sortFiles(item.dataset.sort);
      });
    });
    
    // 文件项选择 - 使用事件委托处理点击事件
    document.addEventListener('click', this._eventHandlers.fileItemClick);
    
    // 文件项复选框点击处理
    document.addEventListener('change', this._eventHandlers.checkboxChange);
    
    // 文件操作按钮
    document.addEventListener('click', this._eventHandlers.fileAction);
    
    // 批量操作按钮
    document.querySelectorAll('.toolbar-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleBulkAction(e));
    });
    
    // 监听部分切换事件
    document.addEventListener('section:change', this._eventHandlers.sectionChange);
    
    // 监听搜索事件
    document.addEventListener('search:perform', this._eventHandlers.searchPerform);
    
    // 拖放上传事件
    const dropTargets = [this.fileList, this.emptyFileList];
    dropTargets.forEach(target => {
      if (target) {
        target.addEventListener('dragover', this._eventHandlers.dragOver);
        target.addEventListener('dragenter', this._eventHandlers.dragEnter);
        target.addEventListener('dragleave', this._eventHandlers.dragLeave);
        target.addEventListener('drop', this._eventHandlers.drop);
      }
    });
  },
  
  /**
   * 移除事件监听器
   */
  destroy() {
    // 移除文档级事件监听器
    if (this._eventHandlers) {
      document.removeEventListener('click', this._eventHandlers.fileItemClick);
      document.removeEventListener('change', this._eventHandlers.checkboxChange);
      document.removeEventListener('click', this._eventHandlers.fileAction);
      document.removeEventListener('section:change', this._eventHandlers.sectionChange);
      document.removeEventListener('search:perform', this._eventHandlers.searchPerform);
      
      // 移除拖放事件监听器
      const dropTargets = [this.fileList, this.emptyFileList];
      dropTargets.forEach(target => {
        if (target) {
          target.removeEventListener('dragover', this._eventHandlers.dragOver);
          target.removeEventListener('dragenter', this._eventHandlers.dragEnter);
          target.removeEventListener('dragleave', this._eventHandlers.dragLeave);
          target.removeEventListener('drop', this._eventHandlers.drop);
        }
      });
      
      console.log('文件管理器事件监听器已移除');
    }
  },
  
  /**
   * 处理部分切换
   * @param {string} section - 部分ID
   */
  handleSectionChange(section) {
    // 清除选择
    this.clearFileSelection();
    
    // 重置当前路径
    this.currentPath = '/';
    
    // 移除可能存在的回收站操作栏
    this.removeTrashActionBar();
    
    // 根据不同的部分加载不同内容
    switch(section) {
      case 'my-files':
        this.refreshFiles();
        break;
      case 'videos':
        this.loadFilteredContent('video');
        break;
      case 'music':
        this.loadFilteredContent('audio');
        break;
      case 'documents':
        this.loadFilteredContent('document');
        break;
      case 'shared':
        this.loadSharedContent();
        break;
      case 'trash':
        this.loadTrashContent();
        break;
      default:
        // 显示开发中的功能
        this.showSectionUnderDevelopment(section);
    }
  },
  
  /**
   * 移除回收站操作栏
   */
  removeTrashActionBar() {
    const existingActionBar = document.querySelector('.trash-action-bar');
    if (existingActionBar) {
      existingActionBar.parentNode.removeChild(existingActionBar);
    }
  },
  
  /**
   * 设置视图模式
   * @param {string} view - 视图类型：grid或list
   */
  setView(view) {
    this.currentView = view;
    
    // 更新视图按钮状态
    this.viewBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    // 更新文件列表类
    if (this.fileList) {
      this.fileList.classList.remove('grid-view', 'list-view');
      this.fileList.classList.add(`${view}-view`);
    }
    
    // 保存用户偏好
    localStorage.setItem('view', view);
  },
  
  /**
   * 加载文件列表
   */
  async loadFiles() {
    try {
      // 显示加载指示器
      UI.Loader.showContentLoader('fileContainer');
      
      // 调用API获取文件列表
      const response = await CloudAPI.getFileList(this.currentPath, this.currentSort);
      const files = response.data || [];
      
      // 缓存当前文件列表
      this.currentFiles = files;
      
      // 隐藏加载指示器
      UI.Loader.hideContentLoader();
      
      // 显示文件列表
      this.renderFiles(files);
      
      // 更新面包屑导航
      this.updateBreadcrumb();
    } catch (error) {
      console.error('加载文件列表失败:', error);
      
      // 隐藏加载指示器
      UI.Loader.hideContentLoader();
      
      // 显示错误提示
      if (this.fileList) {
        this.fileList.style.display = 'block';
        this.fileList.className = 'file-list';
        this.fileList.innerHTML = `
          <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <h3>加载文件列表失败</h3>
            <p>${error.message || '无法连接到服务器，请检查您的网络连接并稍后再试'}</p>
            <button class="retry-btn">
              <i class="fas fa-sync-alt"></i> 重新加载
            </button>
          </div>
        `;
        
        // 绑定重试按钮事件
        const retryBtn = this.fileList.querySelector('.retry-btn');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => this.loadFiles());
        }
      }
      
      // 隐藏空状态
      if (this.emptyFileList) {
        this.emptyFileList.style.display = 'none';
      }
      
      // 显示错误提示
      UI.Toast.error('加载失败', error.message || '无法加载文件列表', 8000, {
        group: 'fileOperations'
      });
    }
  },
  
  /**
   * 渲染文件列表
   * @param {Array} files - 文件数组
   */
  renderFiles(files) {
    if (!this.fileList) return;
    
    // 清除所有选择状态
    this.clearFileSelection();
    
    // 重置文件列表的显示状态
    this.fileList.innerHTML = ''; // 清空现有内容
    
    if (files.length > 0) {
      // 有文件，显示文件列表
      this.fileList.style.display = 'grid';
      this.fileList.className = 'file-list';
      this.fileList.classList.add(`${this.currentView}-view`);
      
      // 隐藏空状态
      if (this.emptyFileList) {
        this.emptyFileList.style.display = 'none';
      }
      
      // 创建文件项
      files.forEach(file => {
        const fileItem = this.createFileItem(file);
        this.fileList.appendChild(fileItem);
      });
    } else {
      // 没有文件，显示空状态
      this.fileList.style.display = 'none';
      this.fileList.className = 'file-list'; // 重置类名，防止应用之前的样式
      
      if (this.emptyFileList) {
        this.emptyFileList.style.display = 'flex';
        this.emptyFileList.className = 'empty-file-list';
        
        // 更新提示内容
        this.emptyFileList.innerHTML = `
          <div class="empty-file-icon">
            <i class="fas fa-box-open"></i>
          </div>
          <div class="empty-file-title">此文件夹为空</div>
          <div class="empty-file-description">拖拽文件至此上传，或点击下方按钮选择文件</div>
          <div class="empty-file-actions">
            <button class="btn btn-primary upload-btn">
              <i class="fas fa-upload"></i> 上传文件
            </button>
          </div>
        `;
        
        // 绑定上传按钮事件
        const uploadBtn = this.emptyFileList.querySelector('.upload-btn');
        if (uploadBtn) {
          uploadBtn.addEventListener('click', () => {
            const fileInput = document.getElementById('fileInput');
            if (fileInput) fileInput.click();
          });
        }
      }
    }
  },
  
  /**
   * 刷新文件列表
   */
  async refreshFiles() {
    // 如果处于搜索模式，先退出
    if (this.isSearchMode) {
      this.exitSearchMode();
    }
    
    // 清除选择
    this.clearFileSelection();
    
    // 重新加载文件
    await this.loadFiles();
    
    // 显示刷新提示
    UI.Toast.success('已刷新', '文件列表已更新', 3000, {
      group: 'fileOperations'
    });
  },
  
  /**
   * 排序文件列表
   * @param {string} sortType - 排序类型
   */
  async sortFiles(sortType) {
    this.currentSort = sortType;
    await this.loadFiles();
  },
  
  /**
   * 创建文件项元素
   * @param {Object} file - 文件对象
   * @param {boolean} isTrash - 是否为回收站文件
   * @returns {HTMLElement} 文件项元素
   */
  createFileItem(file, isTrash = false) {
    const isFolder = file.type === 'folder';
    const fileItem = document.createElement('div');
    fileItem.className = `file-item ${isFolder ? 'folder' : 'file'}`;
    fileItem.setAttribute('tabindex', '0');
    fileItem.setAttribute('role', 'button');
    fileItem.setAttribute('aria-label', `${isFolder ? '文件夹: ' : '文件: '}${file.name}`);
    fileItem.setAttribute('data-id', file.id);
    fileItem.setAttribute('data-path', file.path);
    
    const fileIcon = this.getFileIcon(file.name);
    const fileSize = isFolder ? '' : this.formatFileSize(file.size);
    const fileDate = new Date(file.createTime).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    // 根据是否为回收站文件，显示不同的操作按钮
    let actionButtons = '';
    if (isTrash) {
      // 回收站文件只显示恢复和删除按钮
      actionButtons = `
        <i class="fas fa-trash-restore" data-action="restore" title="恢复" role="button" tabindex="0" aria-label="恢复${file.name}"></i>
        <i class="fas fa-trash-alt" data-action="delete-permanent" title="永久删除" role="button" tabindex="0" aria-label="永久删除${file.name}"></i>
      `;
    } else {
      // 普通文件显示下载、分享、重命名和删除按钮
      actionButtons = `
        <i class="fas fa-download" data-action="download" title="下载" role="button" tabindex="0" aria-label="下载${file.name}"></i>
        <i class="fas fa-share-alt" data-action="share" title="分享" role="button" tabindex="0" aria-label="分享${file.name}"></i>
        <i class="fas fa-edit" data-action="rename" title="重命名" role="button" tabindex="0" aria-label="重命名${file.name}"></i>
        <i class="fas fa-trash" data-action="delete" title="删除" role="button" tabindex="0" aria-label="删除${file.name}"></i>
      `;
    }
    
    fileItem.innerHTML = `
      <div class="file-checkbox">
        <input type="checkbox" class="item-checkbox" aria-label="选择${file.name}">
      </div>
      <div class="file-content">
        <div class="file-icon">
          <i class="${isFolder ? 'fas fa-folder' : fileIcon}"></i>
        </div>
        <div class="file-info">
          <div class="file-name" title="${file.name}">${file.name}</div>
          <div class="file-meta">${isFolder ? '' : fileSize + ' • '}修改于 ${fileDate}</div>
        </div>
      </div>
      <div class="file-actions">
        ${actionButtons}
      </div>
    `;
    
    // 确保复选框始终处于未选中状态
    const checkbox = fileItem.querySelector('.item-checkbox');
    if (checkbox) {
      checkbox.checked = false;
    }
    
    return fileItem;
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
   * 处理文件项点击
   * @param {Event} e - 点击事件
   */
  handleFileItemClick(e) {
    const fileItem = e.target.closest('.file-item');
    if (!fileItem) return;
    
    // 如果点击的是文件操作按钮或复选框，不处理选择逻辑
    if (e.target.closest('.file-actions') || e.target.closest('.file-checkbox')) {
      return;
    }
    
    // 处理Ctrl/Cmd键多选
    if (e.ctrlKey || e.metaKey) {
      this.toggleFileSelection(fileItem);
    } 
    // 处理Shift键范围选择
    else if (e.shiftKey && this.selectedFiles.length > 0) {
      const allItems = Array.from(document.querySelectorAll('.file-item'));
      const lastSelected = document.querySelector('.file-item.selected');
      if (lastSelected) {
        const start = allItems.indexOf(lastSelected);
        const end = allItems.indexOf(fileItem);
        const range = allItems.slice(
          Math.min(start, end),
          Math.max(start, end) + 1
        );
        
        // 清除之前的选择
        this.clearFileSelection();
        
        // 选择范围内的所有文件
        range.forEach(item => {
          this.selectFile(item);
        });
      }
    }
    // 普通点击
    else {
      // 如果是文件夹，导航进入
      if (fileItem.classList.contains('folder')) {
        this.navigateToFolder(fileItem);
      } 
      // 如果是文件，选择
      else {
        // 清除之前的选择
        this.clearFileSelection();
        
        // 选择当前文件
        this.selectFile(fileItem);
      }
    }
    
    // 更新工具栏状态
    this.updateToolbar();
  },
  
  /**
   * 切换文件选择状态
   * @param {HTMLElement} fileItem - 文件项元素
   */
  toggleFileSelection(fileItem) {
    if (fileItem.classList.contains('selected')) {
      this.deselectFile(fileItem);
    } else {
      this.selectFile(fileItem);
    }
  },
  
  /**
   * 选择文件
   * @param {HTMLElement} fileItem - 文件项元素
   */
  selectFile(fileItem) {
    fileItem.classList.add('selected');
    const checkbox = fileItem.querySelector('.item-checkbox');
    if (checkbox) checkbox.checked = true;
    
    // 添加到选中文件数组
    const fileName = fileItem.querySelector('.file-name').textContent;
    if (!this.selectedFiles.includes(fileName)) {
      this.selectedFiles.push(fileName);
    }
  },
  
  /**
   * 取消选择文件
   * @param {HTMLElement} fileItem - 文件项元素
   */
  deselectFile(fileItem) {
    fileItem.classList.remove('selected');
    const checkbox = fileItem.querySelector('.item-checkbox');
    if (checkbox) checkbox.checked = false;
    
    // 从选中文件数组中移除
    const fileName = fileItem.querySelector('.file-name').textContent;
    this.selectedFiles = this.selectedFiles.filter(name => name !== fileName);
  },
  
  /**
   * 清除所有文件选择
   */
  clearFileSelection() {
    // 清除所有选中的文件项
    document.querySelectorAll('.file-item.selected').forEach(item => {
      this.deselectFile(item);
    });
    
    // 额外确保所有复选框都是未选中状态
    document.querySelectorAll('.item-checkbox').forEach(checkbox => {
      checkbox.checked = false;
    });
    
    // 清空选中文件数组
    this.selectedFiles = [];
    
    // 隐藏工具栏
    if (this.fileActionsToolbar) {
      this.fileActionsToolbar.style.display = 'none';
    }
  },
  
  /**
   * 更新工具栏状态
   */
  updateToolbar() {
    if (this.selectedFiles.length > 0) {
      // 显示工具栏
      this.fileActionsToolbar.style.display = 'flex';
      this.selectedCountElement.textContent = this.selectedFiles.length;
      
      // 判断当前是否在回收站
      const isInTrash = document.querySelector('.nav-group li[data-section="trash"].active') !== null;
      
      // 如果在回收站中，更新工具栏样式
      if (isInTrash) {
        // 获取当前选中的文件数量
        const selectedCount = this.selectedFiles.length;
        
        // 更新工具栏内容
        const toolbar = this.fileActionsToolbar;
        
        // 检查是否已经应用了回收站特定样式
        if (!toolbar.classList.contains('trash-toolbar-styled')) {
          // 添加CSS样式到头部，而不是使用内联样式
          const styleId = 'trash-toolbar-style';
          if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
              /* 工具栏基本样式 */
              #fileActionsToolbar.trash-toolbar-styled {
                padding: 8px 12px;
                border-radius: 8px;
                background-color: var(--card-bg, #ffffff);
                color: var(--text-color, #333333);
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                justify-content: space-between;
                flex-wrap: nowrap;
                gap: 8px;
                width: 100%;
                box-sizing: border-box;
              }
              
              /* 计数容器样式 */
              #fileActionsToolbar.trash-toolbar-styled .selected-count-container {
                font-size: 13px;
                flex-shrink: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                color: var(--text-color, #333333);
                font-weight: 500;
                display: flex;
                align-items: center;
                padding: 0 10px;
              }
              
              /* 按钮容器样式 */
              #fileActionsToolbar.trash-toolbar-styled .trash-toolbar-buttons {
                display: flex;
                gap: 8px;
                align-items: center;
                flex-wrap: nowrap;
                justify-content: flex-end;
                min-width: 280px;
              }
              
              /* 按钮基本样式 */
              #fileActionsToolbar.trash-toolbar-styled .toolbar-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 5px 10px;
                border-radius: 4px;
                border: none;
                cursor: pointer;
                min-width: 70px;
                font-size: 13px;
                font-weight: 500;
                white-space: nowrap;
                line-height: 1;
              }
              
              /* 恢复按钮样式 */
              #fileActionsToolbar.trash-toolbar-styled .restore-btn {
                background-color: var(--primary-color, #3498db);
                color: #ffffff;
              }
              
              /* 删除按钮样式 */
              #fileActionsToolbar.trash-toolbar-styled .delete-btn {
                background-color: var(--danger-color, #e74c3c);
                color: #ffffff;
              }
              
              /* 清除按钮样式 */
              #fileActionsToolbar.trash-toolbar-styled .clear-btn {
                background-color: var(--secondary-bg, #e0e0e0);
                color: var(--text-color, #333333);
              }
              
              /* 按钮图标样式 */
              #fileActionsToolbar.trash-toolbar-styled .toolbar-btn i {
                margin-right: 4px;
              }
              
              /* 夜间模式样式 */
              .dark-mode #fileActionsToolbar.trash-toolbar-styled {
                background-color: var(--card-bg, #1a1a2e);
                color: var(--text-color, #ffffff);
              }
              
              .dark-mode #fileActionsToolbar.trash-toolbar-styled .selected-count-container {
                color: var(--text-color, #ffffff);
              }
              
              .dark-mode #fileActionsToolbar.trash-toolbar-styled .restore-btn {
                background-color: var(--primary-color, #2980b9);
                color: #ffffff;
              }
              
              .dark-mode #fileActionsToolbar.trash-toolbar-styled .delete-btn {
                background-color: var(--danger-color, #c0392b);
                color: #ffffff;
              }
              
              .dark-mode #fileActionsToolbar.trash-toolbar-styled .clear-btn {
                background-color: var(--secondary-bg, rgba(255, 255, 255, 0.15));
                color: var(--text-color, #ffffff);
              }
              
              /* 响应式样式 */
              @media (max-width: 600px) {
                #fileActionsToolbar.trash-toolbar-styled {
                  flex-wrap: wrap !important;
                }
                #fileActionsToolbar.trash-toolbar-styled .trash-toolbar-buttons {
                  margin-top: 8px;
                  width: 100%;
                  justify-content: space-between;
                }
                #fileActionsToolbar.trash-toolbar-styled .selected-count-container {
                  width: 100%;
                  justify-content: center;
                }
                #fileActionsToolbar.trash-toolbar-styled .toolbar-btn {
                  height: 32px;
                  padding: 4px 8px;
                  font-size: 12px;
                }
                #fileActionsToolbar.trash-toolbar-styled .toolbar-btn i {
                  font-size: 12px;
                  margin-right: 3px;
                }
              }
            `;
            document.head.appendChild(style);
          }
          
          // 清空工具栏内容
          toolbar.innerHTML = '';
          
          // 应用CSS类而不是内联样式
          toolbar.classList.add('trash-toolbar-styled');
          
          // 创建选中计数容器
          const newCountContainer = document.createElement('div');
          newCountContainer.className = 'selected-count-container';
          newCountContainer.innerHTML = `已选择 <span id="selectedCount">${selectedCount}</span> 个项目`;
          toolbar.appendChild(newCountContainer);
          this.selectedCountElement = newCountContainer.querySelector('#selectedCount');
          
          // 创建按钮容器
          const btnContainer = document.createElement('div');
          btnContainer.className = 'trash-toolbar-buttons';
          toolbar.appendChild(btnContainer);
          
          // 创建恢复按钮
          const restoreBtn = document.createElement('button');
          restoreBtn.className = 'toolbar-btn restore-btn';
          restoreBtn.title = '恢复';
          restoreBtn.innerHTML = '<i class="fas fa-trash-restore"></i><span>恢复</span>';
          restoreBtn.addEventListener('click', (e) => this.handleBulkAction(e));
          btnContainer.appendChild(restoreBtn);
          
          // 创建删除按钮
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'toolbar-btn delete-btn';
          deleteBtn.title = '永久删除';
          deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i><span>删除</span>';
          deleteBtn.addEventListener('click', (e) => this.handleBulkAction(e));
          btnContainer.appendChild(deleteBtn);
          
          // 添加清除选择按钮
          const clearBtn = document.createElement('button');
          clearBtn.className = 'toolbar-btn clear-btn';
          clearBtn.title = '清除选择';
          clearBtn.innerHTML = '<i class="fas fa-times"></i><span>清除</span>';
          clearBtn.addEventListener('click', () => this.clearFileSelection());
          btnContainer.appendChild(clearBtn);
        } else {
          // 只更新选中数量
          this.selectedCountElement.textContent = selectedCount;
        }
      }
    } else {
      this.fileActionsToolbar.style.display = 'none';
      
      // 移除回收站特定样式标记
      if (this.fileActionsToolbar.classList.contains('trash-toolbar-styled')) {
        this.fileActionsToolbar.classList.remove('trash-toolbar-styled');
      }
    }
  },
  
  /**
   * 处理文件操作
   * @param {Event} e - 点击事件
   */
  handleFileAction(e) {
    const actionBtn = e.target.closest('[data-action]');
    if (!actionBtn) return;
    
    e.stopPropagation();
    const action = actionBtn.dataset.action;
    const fileItem = actionBtn.closest('.file-item');
    
    // 确保fileItem存在
    if (!fileItem) {
      console.error('找不到文件项元素');
      return;
    }
    
    const fileName = fileItem.querySelector('.file-name').textContent;
    const fileId = fileItem.dataset.id;
    
    switch(action) {
      case 'download':
        this.downloadFile(fileName);
        break;
      case 'share':
        this.shareFile(fileName);
        break;
      case 'rename':
        this.renameFile(fileName);
        break;
      case 'delete':
        this.deleteFile(fileName);
        break;
      case 'restore':
        this.restoreFile(fileName, fileId);
        break;
      case 'delete-permanent':
        this.deletePermanentFile(fileName, fileId);
        break;
    }
  },
  
  /**
   * 从回收站恢复文件
   * @param {string} fileName - 文件名
   * @param {string} fileId - 文件ID
   */
  restoreFile(fileName, fileId) {
    // 显示确认对话框
    UI.Modal.confirm(
      '<i class="fas fa-trash-restore"></i> 恢复文件',
      `确定要将 "${fileName}" 恢复到原位置吗？`,
      () => {
        // 显示恢复进度
        const loadingToastId = UI.Toast.loading('恢复中', `正在恢复 ${fileName}...`, {
          group: 'trashOperations'
        });
        
        // 模拟恢复过程
        setTimeout(() => {
          // 隐藏加载通知
          UI.Toast.hide(loadingToastId);
          
          // 刷新回收站
          this.loadTrashContent();
          
          // 显示恢复成功提示
          UI.Toast.success('恢复成功', `已恢复 ${fileName}`, 5000, {
            group: 'trashOperations'
          });
        }, 800);
      }
    );
  },
  
  /**
   * 永久删除回收站中的文件
   * @param {string} fileName - 文件名
   * @param {string} fileId - 文件ID
   */
  deletePermanentFile(fileName, fileId) {
    // 显示确认对话框
    UI.Modal.confirm(
      '<i class="fas fa-trash-alt"></i> 永久删除',
      `确定要永久删除 "${fileName}" 吗？此操作不可撤销！`,
      () => {
        // 显示删除进度
        const loadingToastId = UI.Toast.loading('删除中', `正在永久删除 ${fileName}...`, {
          group: 'trashOperations'
        });
        
        // 模拟删除过程
        setTimeout(() => {
          // 隐藏加载通知
          UI.Toast.hide(loadingToastId);
          
          // 刷新回收站
          this.loadTrashContent();
          
          // 显示删除成功提示
          UI.Toast.success('删除成功', `已永久删除 ${fileName}`, 5000, {
            group: 'trashOperations'
          });
        }, 800);
      }
    );
  },
  
  /**
   * 处理批量操作
   * @param {Event} e - 点击事件
   */
  handleBulkAction(e) {
    const action = e.currentTarget.title.toLowerCase();
    
    // 判断当前是否在回收站
    const isInTrash = document.querySelector('.nav-group li[data-section="trash"].active') !== null;
    
    if (isInTrash) {
      // 回收站中的批量操作
      switch(action) {
        case '恢复':
          this.restoreFiles(this.selectedFiles);
          break;
        case '删除':
          this.deletePermanentFiles(this.selectedFiles);
          break;
        case '永久删除':
          this.deletePermanentFiles(this.selectedFiles);
          break;
      }
    } else {
      // 普通文件的批量操作
      switch(action) {
        case '下载':
          this.downloadFiles(this.selectedFiles);
          break;
        case '分享':
          this.shareFiles(this.selectedFiles);
          break;
        case '移动':
          this.moveFiles(this.selectedFiles);
          break;
        case '删除':
          this.deleteFiles(this.selectedFiles);
          break;
      }
    }
  },
  
  /**
   * 批量恢复回收站文件
   * @param {Array<string>} fileNames - 文件名数组
   */
  restoreFiles(fileNames) {
    if (!fileNames || fileNames.length === 0) {
      UI.Toast.warning('未选择文件', '请先选择要恢复的文件', 5000);
      return;
    }
    
    // 显示确认对话框
    UI.Modal.confirm(
      '<i class="fas fa-trash-restore"></i> 批量恢复',
      `确定要将选中的 ${fileNames.length} 个文件恢复到原位置吗？`,
      () => {
        // 显示恢复进度
        const loadingToastId = UI.Toast.loading('恢复中', `正在恢复 ${fileNames.length} 个文件...`, {
          group: 'trashOperations'
        });
        
        // 模拟恢复过程
        setTimeout(() => {
          // 隐藏加载通知
          UI.Toast.hide(loadingToastId);
          
          // 刷新回收站
          this.loadTrashContent();
          
          // 显示恢复成功提示
          UI.Toast.success('恢复成功', `已恢复 ${fileNames.length} 个文件`, 5000, {
            group: 'trashOperations'
          });
        }, 800);
      }
    );
  },
  
  /**
   * 批量永久删除回收站文件
   * @param {Array<string>} fileNames - 文件名数组
   */
  deletePermanentFiles(fileNames) {
    if (!fileNames || fileNames.length === 0) {
      UI.Toast.warning('未选择文件', '请先选择要删除的文件', 5000);
      return;
    }
    
    // 显示确认对话框
    UI.Modal.confirm(
      '<i class="fas fa-trash-alt"></i> 批量永久删除',
      `确定要永久删除选中的 ${fileNames.length} 个文件吗？此操作不可撤销！`,
      () => {
        // 显示删除进度
        const loadingToastId = UI.Toast.loading('删除中', `正在永久删除 ${fileNames.length} 个文件...`, {
          group: 'trashOperations'
        });
        
        // 模拟删除过程
        setTimeout(() => {
          // 隐藏加载通知
          UI.Toast.hide(loadingToastId);
          
          // 刷新回收站
          this.loadTrashContent();
          
          // 显示删除成功提示
          UI.Toast.success('删除成功', `已永久删除 ${fileNames.length} 个文件`, 5000, {
            group: 'trashOperations'
          });
        }, 800);
      }
    );
  },
  
  /**
   * 导航到文件夹
   * @param {HTMLElement} folderItem - 文件夹元素
   */
  async navigateToFolder(folderItem) {
    if (!folderItem || !folderItem.classList.contains('folder')) {
      console.error('无效的文件夹项');
      return;
    }
    
    const folderName = folderItem.querySelector('.file-name').textContent;
    const folderPath = folderItem.dataset.path || `${this.currentPath}${this.currentPath.endsWith('/') ? '' : '/'}${folderName}`;
    
    // 更新当前路径
    this.currentPath = folderPath;
    
    // 更新面包屑导航
    this.updateBreadcrumb();
    
    // 加载文件夹内容
    await this.loadFiles();
  },
  
  /**
   * 更新面包屑导航
   */
  updateBreadcrumb() {
    // 如果处于搜索模式，不更新
    if (this.isSearchMode) return;
    
    // 如果有保存的原始面包屑，恢复它
    if (this._originalBreadcrumb) {
      const breadcrumb = document.querySelector('.breadcrumb');
      if (breadcrumb) {
        breadcrumb.innerHTML = this._originalBreadcrumb;
        this._originalBreadcrumb = null;
      }
      return;
    }
    
    // 原有的面包屑更新逻辑
    const breadcrumb = document.querySelector('.breadcrumb');
    if (!breadcrumb) return;
    
    // 清空面包屑
    breadcrumb.innerHTML = '';
    
    // 添加首页
    const homeItem = document.createElement('span');
    homeItem.className = 'path-item';
    homeItem.innerHTML = '<i class="fas fa-home"></i> 首页';
    homeItem.addEventListener('click', () => {
      this.currentPath = '/';
      this.loadFiles();
    });
    breadcrumb.appendChild(homeItem);
    
    // 如果在根目录，不需要添加更多路径项
    if (this.currentPath === '/') {
      return;
    }
    
    // 分割路径
    const pathParts = this.currentPath.split('/').filter(Boolean);
    let currentPath = '';
    
    // 添加每个路径部分
    pathParts.forEach((part, index) => {
      // 添加分隔符
      const separator = document.createElement('i');
      separator.className = 'fas fa-chevron-right path-separator';
      breadcrumb.appendChild(separator);
      
      // 更新当前路径
      currentPath += '/' + part;
      
      // 创建路径项
      const pathItem = document.createElement('span');
      pathItem.className = 'path-item';
      if (index === pathParts.length - 1) {
        pathItem.classList.add('current');
      }
      pathItem.textContent = part;
      
      // 绑定点击事件
      const path = currentPath; // 创建闭包以保存当前路径
      pathItem.addEventListener('click', () => {
        this.currentPath = path;
        this.loadFiles();
      });
      
      breadcrumb.appendChild(pathItem);
    });
  },
  
  /**
   * 显示正在开发的部分
   * @param {string} section - 部分ID
   */
  showSectionUnderDevelopment(section) {
    console.log('显示开发中页面:', section);
    
    // 隐藏实际文件列表
    if (this.fileList) {
      this.fileList.style.display = 'none';
      this.fileList.className = 'file-list'; // 重置类名
      this.fileList.innerHTML = ''; // 清空内容
    }
    
    // 确保文件操作工具栏隐藏
    if (this.fileActionsToolbar) {
      this.fileActionsToolbar.style.display = 'none';
    }
    
    // 清除选中状态
    this.clearFileSelection();
    
    // 显示空文件列表提示（用于显示"开发中"信息）
    if (this.emptyFileList) {
      this.emptyFileList.style.display = 'flex';
      this.emptyFileList.className = 'empty-file-list dev-empty';
      
      // 获取部分名称
      let sectionName = '';
      document.querySelectorAll('.nav-group li').forEach(item => {
        if (item.dataset.section === section) {
          const spanElement = item.querySelector('span');
          if (spanElement) {
            sectionName = spanElement.textContent.trim();
          }
        }
      });
      
      // 更新提示内容
      this.emptyFileList.innerHTML = `
        <div class="empty-file-icon">
          <i class="fas fa-code"></i>
        </div>
        <div class="empty-file-title">${sectionName || '功能'}正在开发中</div>
        <div class="empty-file-description">此功能正在开发中，敬请期待</div>
        <div class="empty-file-actions">
          <button class="btn btn-primary go-to-files-btn">
            <i class="fas fa-folder-open"></i> 返回我的文件
          </button>
        </div>
      `;
      
      // 绑定按钮事件
      const goToFilesBtn = this.emptyFileList.querySelector('.go-to-files-btn');
      if (goToFilesBtn) {
        goToFilesBtn.addEventListener('click', () => {
          // 切换到"我的文件"部分
          document.querySelectorAll('.nav-group li').forEach(item => {
            if (item.dataset.section === 'my-files') {
              item.click();
            }
          });
        });
      }
      
      // 更新面包屑导航
      const breadcrumb = document.querySelector('.breadcrumb');
      if (breadcrumb) {
        breadcrumb.innerHTML = '';
        
        // 添加首页
        const homeItem = document.createElement('span');
        homeItem.className = 'path-item';
        homeItem.innerHTML = '<i class="fas fa-home"></i> 首页';
        homeItem.addEventListener('click', () => {
          // 切换到"我的文件"部分
          document.querySelectorAll('.nav-group li').forEach(item => {
            if (item.dataset.section === 'my-files') {
              item.click();
            }
          });
        });
        breadcrumb.appendChild(homeItem);
        
        // 添加分隔符
        const separator = document.createElement('i');
        separator.className = 'fas fa-chevron-right path-separator';
        breadcrumb.appendChild(separator);
        
        // 添加当前部分
        const currentItem = document.createElement('span');
        currentItem.className = 'path-item current';
        currentItem.textContent = sectionName || '功能';
        breadcrumb.appendChild(currentItem);
      }
    }
  },
  
  /**
   * 加载按类型筛选的内容
   * @param {string} type - 文件类型
   */
  loadFilteredContent(type) {
    console.log(`加载${this.getTypeName(type)}内容，类型:`, type);
    
    // 显示加载指示器
    UI.Loader.showContentLoader('fileContainer');
    
    // 清除选中状态
    this.clearFileSelection();
    
    // 重置文件列表类名
    if (this.fileList) {
      this.fileList.className = 'file-list';
      this.fileList.classList.add(`${this.currentView}-view`);
    }
    
    // 调用API获取所有文件
    CloudAPI.getFileList('/', this.currentSort)
      .then(response => {
        const allFiles = response.data || [];
        console.log(`API返回的所有文件数量:`, allFiles.length);
        
        // 根据类型过滤文件
        let filteredFiles = [];
        
        if (type === 'video') {
          filteredFiles = allFiles.filter(file => 
            file.type !== 'folder' && this.isVideoFile(file.name)
          );
        } else if (type === 'audio') {
          filteredFiles = allFiles.filter(file => 
            file.type !== 'folder' && this.isAudioFile(file.name)
          );
        } else if (type === 'document') {
          filteredFiles = allFiles.filter(file => 
            file.type !== 'folder' && this.isDocumentFile(file.name)
          );
        }
        
        console.log(`过滤后的${this.getTypeName(type)}文件数量:`, filteredFiles.length);
        filteredFiles.forEach(file => {
          console.log(`- ${file.name}`);
        });
        
        // 缓存当前文件列表
        this.currentFiles = filteredFiles;
        
        // 隐藏加载指示器
        UI.Loader.hideContentLoader();
        
        // 更新面包屑导航
        const breadcrumb = document.querySelector('.breadcrumb');
        if (breadcrumb) {
          breadcrumb.innerHTML = '';
          
          // 添加首页
          const homeItem = document.createElement('span');
          homeItem.className = 'path-item';
          homeItem.innerHTML = '<i class="fas fa-home"></i> 首页';
          homeItem.addEventListener('click', () => {
            this.currentPath = '/';
            this.loadFiles();
          });
          breadcrumb.appendChild(homeItem);
          
          // 添加分隔符
          const separator = document.createElement('i');
          separator.className = 'fas fa-chevron-right path-separator';
          breadcrumb.appendChild(separator);
          
          // 添加当前部分
          const currentItem = document.createElement('span');
          currentItem.className = 'path-item current';
          currentItem.textContent = this.getTypeName(type);
          breadcrumb.appendChild(currentItem);
        }
        
        // 显示文件列表
        if (filteredFiles.length > 0) {
          // 有文件，显示文件列表
          if (this.fileList) {
            this.fileList.style.display = 'grid';
            this.fileList.className = 'file-list';
            this.fileList.classList.add(`${this.currentView}-view`);
            this.fileList.innerHTML = ''; // 清空现有内容
            
            // 创建文件项
            filteredFiles.forEach(file => {
              const fileItem = this.createFileItem(file);
              this.fileList.appendChild(fileItem);
            });
          }
          
          // 隐藏空状态
          if (this.emptyFileList) {
            this.emptyFileList.style.display = 'none';
          }
          
          // 显示加载完成提示
          UI.Toast.success('加载完成', `已加载 ${filteredFiles.length} 个${this.getTypeName(type)}文件`, 5000, {
            group: 'fileOperations'
          });
        } else {
          // 没有文件，显示空状态
          if (this.fileList) {
            this.fileList.style.display = 'none';
            this.fileList.className = 'file-list'; // 重置类名，防止应用之前的样式
            this.fileList.innerHTML = ''; // 清空内容
          }
          
          if (this.emptyFileList) {
            this.emptyFileList.style.display = 'flex';
            this.emptyFileList.className = `empty-file-list ${type}-empty`;
            
            // 根据类型设置不同的提示信息
            let iconClass, title, description, buttonText;
            switch(type) {
              case 'video':
                iconClass = 'fas fa-film';
                title = '暂无视频';
                description = '您可以拖拽视频文件至此上传，或点击下方按钮选择文件';
                buttonText = '上传视频';
                break;
              case 'audio':
                iconClass = 'fas fa-music';
                title = '暂无音乐';
                description = '您可以拖拽音频文件至此上传，或点击下方按钮选择文件';
                buttonText = '上传音乐';
                break;
              case 'document':
                iconClass = 'fas fa-file-alt';
                title = '暂无文档';
                description = '您可以拖拽文档文件至此上传，或点击下方按钮选择文件';
                buttonText = '上传文档';
                break;
              default:
                iconClass = 'fas fa-file';
                title = '暂无文件';
                description = '您可以拖拽文件至此上传，或点击下方按钮选择文件';
                buttonText = '上传文件';
            }
            
            this.emptyFileList.innerHTML = `
              <div class="empty-file-icon">
                <i class="${iconClass}"></i>
              </div>
              <div class="empty-file-title">${title}</div>
              <div class="empty-file-description">${description}</div>
              <div class="empty-file-actions">
                <button class="btn btn-primary upload-btn" data-type="${type}">
                  <i class="fas fa-upload"></i> ${buttonText}
                </button>
              </div>
            `;
            
            // 绑定上传按钮事件
            const uploadBtn = this.emptyFileList.querySelector('.upload-btn');
            if (uploadBtn) {
              uploadBtn.addEventListener('click', () => {
                const fileInput = document.getElementById('fileInput');
                if (fileInput) fileInput.click();
              });
            }
          }
          
          console.log(`未找到${this.getTypeName(type)}，显示空状态`);
          
          // 显示无内容提示
          UI.Toast.info('无内容', `未找到${this.getTypeName(type)}文件`, 5000, {
            group: 'fileOperations'
          });
        }
      })
      .catch(error => {
        console.error(`加载${this.getTypeName(type)}失败:`, error);
        
        // 隐藏加载指示器
        UI.Loader.hideContentLoader();
        
        // 显示错误提示
        if (this.fileList) {
          this.fileList.style.display = 'block';
          this.fileList.className = 'file-list';
          this.fileList.innerHTML = `
            <div class="error-message">
              <i class="fas fa-exclamation-circle"></i>
              <h3>加载${this.getTypeName(type)}失败</h3>
              <p>${error.message || '无法连接到服务器，请检查您的网络连接并稍后再试'}</p>
              <button class="retry-btn">
                <i class="fas fa-sync-alt"></i> 重新加载
              </button>
            </div>
          `;
          
          // 绑定重试按钮事件
          const retryBtn = this.fileList.querySelector('.retry-btn');
          if (retryBtn) {
            retryBtn.addEventListener('click', () => this.loadFilteredContent(type));
          }
        }
        
        // 隐藏空状态
        if (this.emptyFileList) {
          this.emptyFileList.style.display = 'none';
        }
        
        // 显示错误提示
        UI.Toast.error('加载失败', `无法加载${this.getTypeName(type)}文件`, 8000, {
          group: 'fileOperations'
        });
      });
  },
  
  /**
   * 检查文件类型
   * @param {string} fileName - 文件名
   * @param {Array<string>} extensions - 扩展名数组
   * @param {string} fileType - 文件类型名称（用于日志）
   * @returns {boolean} 是否为指定类型的文件
   */
  checkFileType(fileName, extensions, fileType) {
    if (!fileName || typeof fileName !== 'string') {
      console.error('无效的文件名:', fileName);
      return false;
    }
    
    // 确保文件名包含扩展名
    const parts = fileName.split('.');
    if (parts.length < 2) {
      console.log('文件没有扩展名:', fileName);
      return false;
    }
    
    const extension = parts[parts.length - 1].toLowerCase();
    const isMatchType = extensions.includes(extension);
    
    console.log(`${fileType}检查: ${fileName}, 扩展名: ${extension}, 是${fileType}: ${isMatchType}`);
    return isMatchType;
  },
  
  /**
   * 判断文件是否为视频文件
   * @param {string} fileName - 文件名
   * @returns {boolean} 是否为视频文件
   */
  isVideoFile(fileName) {
    const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', '3gp', 'mpeg', 'mpg'];
    return this.checkFileType(fileName, videoExtensions, '视频');
  },
  
  /**
   * 判断文件是否为音频文件
   * @param {string} fileName - 文件名
   * @returns {boolean} 是否为音频文件
   */
  isAudioFile(fileName) {
    const audioExtensions = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'aiff', 'alac'];
    return this.checkFileType(fileName, audioExtensions, '音频');
  },
  
  /**
   * 判断文件是否为文档文件
   * @param {string} fileName - 文件名
   * @returns {boolean} 是否为文档文件
   */
  isDocumentFile(fileName) {
    const docExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'rtf', 'odt', 'ods', 'odp', 'md', 'markdown'];
    return this.checkFileType(fileName, docExtensions, '文档');
  },
  
  /**
   * 获取类型名称
   * @param {string} type - 文件类型
   * @returns {string} 类型名称
   */
  getTypeName(type) {
    switch(type) {
      case 'video': return '视频';
      case 'audio': return '音乐';
      case 'document': return '文档';
      default: return '文件';
    }
  },
  
  /**
   * 加载共享内容
   */
  loadSharedContent() {
    console.log('加载共享内容');
    
    // 显示加载指示器
    UI.Loader.showContentLoader('fileContainer');
    
    // 清除选中状态
    this.clearFileSelection();
    
    // 创建一个Promise数组，同时获取我的分享和他人分享给我的内容
    Promise.all([
      CloudAPI.getShareList(),
      CloudAPI.getSharedWithMe()
    ])
      .then(([mySharesResponse, sharedWithMeResponse]) => {
        const myShares = mySharesResponse.data || [];
        const sharedWithMe = sharedWithMeResponse.data || [];
        
        // 合并两种共享内容
        const allSharedContent = [
          ...myShares.map(item => ({...item, shareType: 'outgoing'})),
          ...sharedWithMe.map(item => ({...item, shareType: 'incoming'}))
        ];
        
        // 缓存当前文件列表
        this.currentFiles = allSharedContent;
        
        // 隐藏加载指示器
        UI.Loader.hideContentLoader();
        
        // 更新面包屑导航
        const breadcrumb = document.querySelector('.breadcrumb');
        if (breadcrumb) {
          breadcrumb.innerHTML = '';
          
          // 添加首页
          const homeItem = document.createElement('span');
          homeItem.className = 'path-item';
          homeItem.innerHTML = '<i class="fas fa-home"></i> 首页';
          homeItem.addEventListener('click', () => {
            this.currentPath = '/';
            this.loadFiles();
          });
          breadcrumb.appendChild(homeItem);
          
          // 添加分隔符
          const separator = document.createElement('i');
          separator.className = 'fas fa-chevron-right path-separator';
          breadcrumb.appendChild(separator);
          
          // 添加当前部分
          const currentItem = document.createElement('span');
          currentItem.className = 'path-item current';
          currentItem.textContent = '互发共享';
          breadcrumb.appendChild(currentItem);
        }
        
        // 显示文件列表
        if (allSharedContent.length > 0) {
          // 隐藏空状态
          if (this.emptyFileList) {
            this.emptyFileList.style.display = 'none';
          }
          
          // 创建共享内容视图
          if (this.fileList) {
            this.fileList.style.display = 'flex';
            this.fileList.className = 'file-list shared-content-view';
            this.fileList.innerHTML = `
              <div class="shared-content-tabs">
                <button class="tab-btn active" data-tab="all">全部共享</button>
                <button class="tab-btn" data-tab="outgoing">我的分享</button>
                <button class="tab-btn" data-tab="incoming">收到的分享</button>
              </div>
              <div class="shared-content-container">
                ${this.renderSharedContent(allSharedContent)}
              </div>
            `;
            
            // 绑定标签页切换事件
            const tabBtns = this.fileList.querySelectorAll('.tab-btn');
            tabBtns.forEach(btn => {
              btn.addEventListener('click', () => {
                // 更新标签页激活状态
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // 过滤内容
                const tabType = btn.dataset.tab;
                let filteredContent;
                
                if (tabType === 'outgoing') {
                  filteredContent = allSharedContent.filter(item => item.shareType === 'outgoing');
                } else if (tabType === 'incoming') {
                  filteredContent = allSharedContent.filter(item => item.shareType === 'incoming');
                } else {
                  filteredContent = allSharedContent;
                }
                
                // 更新内容
                const container = this.fileList.querySelector('.shared-content-container');
                if (container) {
                  container.innerHTML = this.renderSharedContent(filteredContent);
                }
              });
            });
          }
          
          // 显示加载完成提示
          UI.Toast.success('加载完成', `已加载 ${allSharedContent.length} 个共享内容`, 5000, {
            group: 'shareOperations'
          });
        } else {
          // 没有文件，显示空状态
          if (this.fileList) {
            this.fileList.style.display = 'none';
            this.fileList.className = 'file-list'; // 重置类名
            this.fileList.innerHTML = ''; // 清空内容
          }
          
          if (this.emptyFileList) {
            this.emptyFileList.style.display = 'flex';
            this.emptyFileList.className = 'empty-file-list shared-empty';
            
            // 更新提示内容
            this.emptyFileList.innerHTML = `
              <div class="empty-file-icon">
                <i class="fas fa-share-alt"></i>
              </div>
              <div class="empty-file-title">暂无互发共享内容</div>
              <div class="empty-file-description">您可以在文件上点击分享按钮，创建共享链接分享给他人</div>
              <div class="empty-file-actions">
                <button class="btn btn-primary go-to-files-btn">
                  <i class="fas fa-folder-open"></i> 浏览我的文件
                </button>
              </div>
            `;
            
            // 绑定按钮事件
            const goToFilesBtn = this.emptyFileList.querySelector('.go-to-files-btn');
            if (goToFilesBtn) {
              goToFilesBtn.addEventListener('click', () => {
                // 切换到"我的文件"部分
                document.querySelectorAll('.nav-group li').forEach(item => {
                  if (item.dataset.section === 'my-files') {
                    item.click();
                  }
                });
              });
            }
          }
          
          // 显示加载完成提示
          UI.Toast.info('无内容', '未找到共享内容', 5000, {
            group: 'shareOperations'
          });
        }
      })
      .catch(error => {
        console.error('加载共享内容失败:', error);
        
        // 隐藏加载指示器
        UI.Loader.hideContentLoader();
        
        // 显示错误提示
        if (this.fileList) {
          this.fileList.style.display = 'block';
          this.fileList.className = 'file-list';
          this.fileList.innerHTML = `
            <div class="error-message">
              <i class="fas fa-exclamation-circle"></i>
              <h3>加载共享内容失败</h3>
              <p>${error.message || '无法连接到服务器，请检查您的网络连接并稍后再试'}</p>
              <button class="retry-btn">
                <i class="fas fa-sync-alt"></i> 重新加载
              </button>
            </div>
          `;
          
          // 绑定重试按钮事件
          const retryBtn = this.fileList.querySelector('.retry-btn');
          if (retryBtn) {
            retryBtn.addEventListener('click', () => this.loadSharedContent());
          }
        }
        
        // 隐藏空状态
        if (this.emptyFileList) {
          this.emptyFileList.style.display = 'none';
        }
        
        // 显示错误提示
        UI.Toast.error('加载失败', error.message || '无法加载共享内容', 8000, {
          group: 'shareOperations'
        });
      });
  },
  
  /**
   * 渲染共享内容
   * @param {Array} sharedItems - 共享项目数组
   * @returns {string} HTML字符串
   */
  renderSharedContent(sharedItems) {
    if (!sharedItems || sharedItems.length === 0) {
      return `<div class="no-items-message">没有共享内容</div>`;
    }
    
    return `
      <div class="shared-items-list">
        ${sharedItems.map(item => this.renderSharedItem(item)).join('')}
      </div>
    `;
  },
  
  /**
   * 渲染单个共享项目
   * @param {Object} item - 共享项目
   * @returns {string} HTML字符串
   */
  renderSharedItem(item) {
    const isOutgoing = item.shareType === 'outgoing';
    const fileIcon = this.getFileIcon(item.name);
    const expireTime = new Date(item.expireTime).toLocaleString();
    
    return `
      <div class="shared-item ${isOutgoing ? 'outgoing' : 'incoming'}">
        <div class="shared-item-icon">
          <i class="${isOutgoing ? fileIcon : 'fas fa-file-import'}"></i>
        </div>
        <div class="shared-item-info">
          <div class="shared-item-name" title="${item.name}">${item.name}</div>
          <div class="shared-item-meta">
            ${isOutgoing 
              ? `<span>分享于 ${new Date(item.createTime).toLocaleString()}</span>` 
              : `<span>由 ${item.sharedBy} 分享</span>`}
            <span>过期时间: ${expireTime}</span>
          </div>
        </div>
        <div class="shared-item-actions">
          ${isOutgoing 
            ? `<button class="btn btn-sm btn-secondary copy-link-btn" data-link="${item.shareLink}" title="复制链接">
                 <i class="fas fa-copy"></i>
               </button>
               <button class="btn btn-sm btn-danger cancel-share-btn" data-id="${item.id}" title="取消分享">
                 <i class="fas fa-times"></i>
               </button>`
            : `<button class="btn btn-sm btn-primary download-btn" data-path="${item.path}" title="下载">
                 <i class="fas fa-download"></i>
               </button>
               <button class="btn btn-sm btn-secondary save-btn" data-path="${item.path}" title="保存到我的文件">
                 <i class="fas fa-save"></i>
               </button>`
          }
        </div>
      </div>
    `;
  },
  
  /**
   * 下载文件
   * @param {string} fileName - 文件名
   */
  async downloadFile(fileName) {
    try {
      // 获取文件项
      const fileItem = this.findFileItemByName(fileName);
      if (!fileItem) {
        throw new Error(`找不到文件: ${fileName}`);
      }
      
      // 获取文件ID
      const fileId = fileItem.dataset.id;
      if (!fileId) {
        throw new Error(`无效的文件ID: ${fileName}`);
      }
      
      // 显示准备下载的提示
      UI.Toast.info('准备下载', `正在准备下载 ${fileName}...`, 2000);
      
      // 获取下载链接
      const downloadUrl = CloudAPI.getFileDownloadUrl(fileId);
      
      // 创建隐藏的a标签触发下载
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = fileName; // 设置下载文件名
      downloadLink.style.display = 'none';
      document.body.appendChild(downloadLink);
      
      // 触发下载
      downloadLink.click();
      
      // 清理
      setTimeout(() => {
        document.body.removeChild(downloadLink);
      }, 100);
      
      UI.Toast.success('下载开始', `文件 ${fileName} 开始下载`, 3000);
      
    } catch (error) {
      console.error('下载文件失败:', error);
      UI.Toast.error('下载失败', error.message || '下载文件时出错', 5000);
    }
  },
  
  /**
   * 查找文件项
   * @param {string} fileName - 文件名
   * @returns {HTMLElement|null} 文件项元素
   */
  findFileItemByName(fileName) {
    const fileItems = document.querySelectorAll('.file-item');
    for (const item of fileItems) {
      const nameElement = item.querySelector('.file-name');
      if (nameElement && nameElement.textContent === fileName) {
        return item;
      }
    }
    return null;
  },
  
  /**
   * 搜索文件
   * @param {string} query - 搜索关键词
   */
  searchFiles(query) {
    if (!query) {
      // 如果搜索词为空，退出搜索模式
      if (this.isSearchMode) {
        this.exitSearchMode();
      }
      return;
    }
    
    console.log('搜索文件:', query);
    
    // 进入搜索模式
    this.isSearchMode = true;
    
    // 清除选择
    this.clearFileSelection();
    
    // 在当前文件列表中搜索
    const searchResults = this.currentFiles.filter(file => 
      file.name.toLowerCase().includes(query.toLowerCase())
    );
    
    // 渲染搜索结果
    this.renderFiles(searchResults);
    
    // 更新面包屑导航，添加搜索指示
    this.updateBreadcrumbForSearch(query);
    
    // 显示搜索结果提示
    if (searchResults.length > 0) {
      UI.Toast.show('info', '搜索结果', `找到 ${searchResults.length} 个匹配项`);
    } else {
      UI.Toast.show('warning', '搜索结果', '没有找到匹配项');
    }
  },
  
  /**
   * 退出搜索模式
   */
  exitSearchMode() {
    if (!this.isSearchMode) return;
    
    this.isSearchMode = false;
    
    // 重新加载当前目录文件
    this.renderFiles(this.currentFiles);
    
    // 更新面包屑导航
    this.updateBreadcrumb();
  },
  
  /**
   * 更新搜索模式下的面包屑导航
   * @param {string} query - 搜索关键词
   */
  updateBreadcrumbForSearch(query) {
    const breadcrumb = document.querySelector('.breadcrumb');
    if (!breadcrumb) return;
    
    // 保存原始路径的面包屑
    if (!this._originalBreadcrumb) {
      this._originalBreadcrumb = breadcrumb.innerHTML;
    }
    
    // 创建搜索面包屑
    breadcrumb.innerHTML = `
      <span class="path-item"><i class="fas fa-home"></i> 首页</span>
      <i class="fas fa-chevron-right path-separator"></i>
      <span class="path-item">搜索结果: "${query}"</span>
      <button class="btn-link exit-search" title="退出搜索">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    // 绑定退出搜索按钮事件
    const exitSearchBtn = breadcrumb.querySelector('.exit-search');
    if (exitSearchBtn) {
      exitSearchBtn.addEventListener('click', () => this.exitSearchMode());
    }
  },
  
  /**
   * 批量下载文件
   * @param {Array<string>} fileNames - 文件名数组
   */
  async downloadFiles(fileNames) {
    if (!fileNames || fileNames.length === 0) {
      UI.Toast.warning('未选择文件', '请先选择要下载的文件', 3000);
      return;
    }
    
    UI.Toast.info('准备下载', `正在准备下载 ${fileNames.length} 个文件...`, 3000);
    
    try {
      // 如果只有一个文件，直接调用单文件下载
      if (fileNames.length === 1) {
        await this.downloadFile(fileNames[0]);
        return;
      }
      
      // 多个文件，逐个下载并添加延迟
      for (let i = 0; i < fileNames.length; i++) {
        const fileName = fileNames[i];
        
        // 使用setTimeout添加延迟，避免浏览器阻止多个下载
        setTimeout(() => {
          this.downloadFile(fileName).catch(error => {
            console.error(`下载文件 ${fileName} 失败:`, error);
          });
        }, i * 1000); // 每个文件间隔1秒
      }
      
    } catch (error) {
      console.error('批量下载文件失败:', error);
      UI.Toast.error('下载失败', error.message || '批量下载文件时出错', 5000);
    }
  },
  
  /**
   * 分享文件
   * @param {string} fileName - 文件名
   */
  shareFile(fileName) {
    try {
      UI.Toast.show('info', '准备分享', `正在生成分享链接: ${fileName}...`);
      
      // 模拟分享过程
      setTimeout(() => {
        const shareLink = `https://cloud.example.com/share/${Math.random().toString(36).substring(2, 10)}`;
        const modalId = 'shareModal-' + Date.now();
        
        // 显示分享链接
        UI.Modal.show(modalId, '<i class="fas fa-share-alt"></i> 分享文件', `
          <div class="form-group">
            <label for="shareLink" class="form-label">分享链接</label>
            <div class="input-group">
              <input type="text" id="shareLink" class="form-input" value="${shareLink}" readonly>
              <button class="btn btn-primary copy-btn" data-clipboard-target="#shareLink">复制</button>
            </div>
            <div class="form-hint">此链接有效期为7天</div>
          </div>
        `, {
          confirmText: '完成',
          cancelText: '取消',
          showClose: true,
          onConfirm: () => {
            // 关闭弹框
            UI.Modal.close(modalId);
          }
        });
        
        // 聚焦到输入框并选中文本
        setTimeout(() => {
          const input = document.getElementById('shareLink');
          if (input) {
            input.focus();
            input.select();
          }
        }, 100);
      }, 800);
    } catch (error) {
      console.error('分享文件失败:', error);
      UI.Toast.show('error', '分享失败', error.message || '无法分享文件');
    }
  },
  
  /**
   * 批量分享文件
   * @param {Array<string>} fileNames - 文件名数组
   */
  shareFiles(fileNames) {
    if (!fileNames || fileNames.length === 0) {
      UI.Toast.show('warning', '未选择文件', '请先选择要分享的文件');
      return;
    }
    
    if (fileNames.length === 1) {
      // 如果只有一个文件，调用单文件分享
      this.shareFile(fileNames[0]);
      return;
    }
    
    UI.Toast.show('info', '准备分享', `正在生成批量分享链接...`);
    
    // 模拟分享过程
    setTimeout(() => {
      const shareLink = `https://cloud.example.com/share/${Math.random().toString(36).substring(2, 10)}`;
      const modalId = 'shareModal-' + Date.now();
      
      // 显示分享链接
      UI.Modal.show(modalId, '<i class="fas fa-share-alt"></i> 批量分享文件', `
        <div class="form-group">
          <label for="shareLink" class="form-label">分享链接 (${fileNames.length}个文件)</label>
          <div class="input-group">
            <input type="text" id="shareLink" class="form-input" value="${shareLink}" readonly>
            <button class="btn btn-primary copy-btn" data-clipboard-target="#shareLink">复制</button>
          </div>
          <div class="form-hint">此链接有效期为7天</div>
        </div>
      `, {
        confirmText: '完成',
        cancelText: '取消',
        showClose: true,
        onConfirm: () => {
          // 关闭弹框
          UI.Modal.close(modalId);
        }
      });
      
      // 聚焦到输入框并选中文本
      setTimeout(() => {
        const input = document.getElementById('shareLink');
        if (input) {
          input.focus();
          input.select();
        }
      }, 100);
    }, 800);
  },
  
  /**
   * 移动文件
   * @param {Array<string>} fileNames - 文件名数组
   */
  moveFiles(fileNames) {
    if (!fileNames || fileNames.length === 0) {
      UI.Toast.show('warning', '未选择文件', '请先选择要移动的文件');
      return;
    }
    
    const modalId = 'moveModal-' + Date.now();
    
    // 显示移动文件对话框
    UI.Modal.show(modalId, '<i class="fas fa-arrows-alt"></i> 移动文件', `
      <div class="form-group">
        <label for="targetPath" class="form-label">目标路径</label>
        <select id="targetPath" class="form-input">
          <option value="/">根目录</option>
          <option value="/文档">文档</option>
          <option value="/图片">图片</option>
          <option value="/视频">视频</option>
          <option value="/音乐">音乐</option>
        </select>
      </div>
      <div class="selected-files">
        <div class="form-label">已选择 ${fileNames.length} 个文件</div>
        <div class="file-list-preview">
          ${fileNames.map(name => `<div class="file-item-preview">${name}</div>`).join('')}
        </div>
      </div>
    `, {
      confirmText: '移动',
      cancelText: '取消',
      onConfirm: () => {
        const targetPath = document.getElementById('targetPath').value;
        
        // 显示移动进度
        UI.Toast.show('info', '移动中', `正在移动 ${fileNames.length} 个文件到 ${targetPath}...`);
        
        // 模拟移动过程
        setTimeout(() => {
          // 刷新文件列表
          this.refreshFiles();
          
          // 显示移动成功提示
          UI.Toast.show('success', '移动成功', `已将 ${fileNames.length} 个文件移动到 ${targetPath}`);
          
          // 关闭对话框
          UI.Modal.close(modalId);
        }, 1000);
      }
    });
  },
  
  /**
   * 重命名文件
   * @param {string} fileName - 文件名
   */
  renameFile(fileName) {
    const fileItem = this.findFileItemByName(fileName);
    if (!fileItem) {
      UI.Toast.show('error', '重命名失败', `找不到文件: ${fileName}`);
      return;
    }
    
    const isFolder = fileItem.classList.contains('folder');
    const fileType = isFolder ? '' : fileName.substring(fileName.lastIndexOf('.'));
    const baseName = isFolder ? fileName : fileName.substring(0, fileName.lastIndexOf('.'));
    
    const modalId = 'renameModal-' + Date.now();
    
    // 显示重命名对话框
    UI.Modal.show(modalId, `<i class="fas fa-edit"></i> 重命名${isFolder ? '文件夹' : '文件'}`, `
      <div class="form-group">
        <label for="newFileName" class="form-label">新名称</label>
        <input type="text" id="newFileName" class="form-input" value="${baseName}">
        ${!isFolder ? `<div class="form-hint">文件扩展名 ${fileType} 将保持不变</div>` : ''}
      </div>
    `, {
      confirmText: '重命名',
      cancelText: '取消',
      onConfirm: async () => {
        const newBaseName = document.getElementById('newFileName').value.trim();
        if (!newBaseName) {
          UI.Toast.show('warning', '重命名失败', '名称不能为空');
          return;
        }
        
        const newFileName = isFolder ? newBaseName : newBaseName + fileType;
        
        // 显示重命名进度
        UI.Toast.show('info', '重命名中', `正在将 ${fileName} 重命名为 ${newFileName}...`);
        await CloudAPI.renameFile(fileItem.dataset.id, newFileName);
        // 模拟重命名过程
        setTimeout(() => {
          // 刷新文件列表
          this.refreshFiles();
          
          // 显示重命名成功提示
          UI.Toast.show('success', '重命名成功', `已将 ${fileName} 重命名为 ${newFileName}`);
          
          // 关闭对话框
          UI.Modal.close(modalId);
        }, 800);
      }
    });
    
    // 聚焦到输入框并选中文本
    setTimeout(() => {
      const input = document.getElementById('newFileName');
      if (input) {
        input.focus();
        input.select();
      }
    }, 100);
  },
  
  /**
   * 删除文件
   * @param {string} fileName - 文件名
   */
  deleteFile(fileName) {
    // 查找文件项，获取完整路径
    const fileItem = this.findFileItemByName(fileName);
    if (!fileItem) {
      UI.Toast.error('删除失败', `找不到文件: ${fileName}`);
      return;
    }

    const fileId = fileItem.dataset.id;
    console.log(fileId);
    // 显示确认对话框
    UI.Modal.confirm(
      '<i class="fas fa-trash"></i> 确认删除',
      `确定要将 "${fileName}" 移动到回收站吗？`,
      async () => {
        try {
          // 显示删除进度
          const loadingToastId = UI.Toast.loading('删除中', `正在将 ${fileName} 移动到回收站...`, {
            group: 'fileOperations'
          });
          
          // 调用API删除文件
          await CloudAPI.deleteFile(fileId);
          
          // 隐藏加载通知
          UI.Toast.hide(loadingToastId);
          
          // 刷新文件列表
          this.refreshFiles();
          
          // 显示删除成功提示
          UI.Toast.success('删除成功', `已将 ${fileName} 移动到回收站`, 5000, {
            group: 'fileOperations'
          });
        } catch (error) {
          console.error('删除文件失败:', error);
          UI.Toast.error('删除失败', error.message || '无法删除文件', 8000, {
            group: 'fileOperations'
          });
        }
      }
    );
  },
  
  /**
   * 删除多个文件
   * @param {Array<string>} fileNames - 文件名数组
   */
  deleteFiles(fileNames) {
    if (!fileNames || fileNames.length === 0) {
      UI.Toast.warning('未选择文件', '请先选择要删除的文件', 5000);
      return;
    }
    
    // 显示确认对话框
    UI.Modal.confirm(
      '<i class="fas fa-trash"></i> 确认删除',
      `确定要将选中的 ${fileNames.length} 个文件移动到回收站吗？`,
      async () => {
        try {
          // 显示删除进度
          const loadingToastId = UI.Toast.loading('删除中', `正在将 ${fileNames.length} 个文件移动到回收站...`, {
            group: 'fileOperations'
          });
          
          // 创建删除操作的Promise数组
          const deletePromises = fileNames.map(fileName => {
            const fileItem = this.findFileItemByName(fileName);
            if (!fileItem) return Promise.reject(new Error(`找不到文件: ${fileName}`));
            
            const filePath = fileItem.dataset.path || `${this.currentPath}${this.currentPath.endsWith('/') ? '' : '/'}${fileName}`;
            return CloudAPI.deleteFile(filePath);
          });
          
          // 等待所有删除操作完成
          await Promise.all(deletePromises);
          
          // 隐藏加载通知
          UI.Toast.hide(loadingToastId);
          
          // 刷新文件列表
          this.refreshFiles();
          
          // 显示删除成功提示
          UI.Toast.success('删除成功', `已将 ${fileNames.length} 个文件移动到回收站`, 5000, {
            group: 'fileOperations'
          });
        } catch (error) {
          console.error('批量删除文件失败:', error);
          UI.Toast.error('删除失败', error.message || '无法删除选中的文件', 8000, {
            group: 'fileOperations'
          });
        }
      }
    );
  },
  
  /**
   * 加载回收站内容
   */
  loadTrashContent() {
    console.log('加载回收站内容');
    
    // 显示加载指示器
    UI.Loader.showContentLoader('fileContainer');
    
    // 清除选中状态
    this.clearFileSelection();
    
    // 移除可能存在的旧回收站操作栏
    this.removeTrashActionBar();
    
    // 调用API获取回收站列表
    CloudAPI.getTrashList()
      .then(response => {
        const trashFiles = response.data || [];
        
        // 缓存当前文件列表
        this.currentFiles = trashFiles;
        
        // 隐藏加载指示器
        UI.Loader.hideContentLoader();
        
        // 更新面包屑导航
        const breadcrumb = document.querySelector('.breadcrumb');
        if (breadcrumb) {
          breadcrumb.innerHTML = '';
          
          // 添加首页
          const homeItem = document.createElement('span');
          homeItem.className = 'path-item';
          homeItem.innerHTML = '<i class="fas fa-home"></i> 首页';
          homeItem.addEventListener('click', () => {
            this.currentPath = '/';
            this.loadFiles();
          });
          breadcrumb.appendChild(homeItem);
          
          // 添加分隔符
          const separator = document.createElement('i');
          separator.className = 'fas fa-chevron-right path-separator';
          breadcrumb.appendChild(separator);
          
          // 添加当前部分
          const currentItem = document.createElement('span');
          currentItem.className = 'path-item current';
          currentItem.textContent = '回收站';
          breadcrumb.appendChild(currentItem);
        }
        
        // 显示文件列表
        if (trashFiles.length > 0) {
          // 隐藏空状态
          if (this.emptyFileList) {
            this.emptyFileList.style.display = 'none';
          }
          
          // 创建回收站操作栏 - 放在合适的位置
          const fileContainer = document.getElementById('fileContainer');
          const fileList = document.getElementById('fileList');
          
          // 移除回收站操作栏，不再显示全部恢复和清空回收站按钮
          if (fileContainer && document.querySelector('.trash-action-bar')) {
            const existingActionBar = document.querySelector('.trash-action-bar');
            existingActionBar.parentNode.removeChild(existingActionBar);
          }
          
          // 创建回收站内容视图
          if (this.fileList) {
            this.fileList.style.display = 'grid';
            this.fileList.className = 'file-list trash-content-view';
            this.fileList.classList.add(`${this.currentView}-view`);
            this.fileList.innerHTML = '';
            
            // 创建文件项
            trashFiles.forEach(file => {
              const fileItem = this.createFileItem(file, true); // 第二个参数表示是回收站文件
              this.fileList.appendChild(fileItem);
            });
            
            // 注意：工具栏样式已移至updateToolbar方法中
          }
          
          // 显示加载完成提示
          UI.Toast.success('加载完成', `已加载 ${trashFiles.length} 个回收站文件`, 5000, {
            group: 'trashOperations'
          });
        } else {
          // 没有文件，显示空状态
          if (this.fileList) {
            this.fileList.style.display = 'none';
            this.fileList.className = 'file-list'; // 重置类名
            this.fileList.innerHTML = ''; // 清空内容
          }
          
          // 移除可能存在的操作栏
          this.removeTrashActionBar();
          
          if (this.emptyFileList) {
            this.emptyFileList.style.display = 'flex';
            this.emptyFileList.className = 'empty-file-list trash-empty';
            
            // 更新提示内容
            this.emptyFileList.innerHTML = `
              <div class="empty-file-icon">
                <i class="fas fa-trash"></i>
              </div>
              <div class="empty-file-title">回收站为空</div>
              <div class="empty-file-description">回收站中没有任何文件</div>
              <div class="empty-file-actions">
                <button class="btn btn-primary go-to-files-btn">
                  <i class="fas fa-folder-open"></i> 浏览我的文件
                </button>
              </div>
            `;
            
            // 绑定按钮事件
            const goToFilesBtn = this.emptyFileList.querySelector('.go-to-files-btn');
            if (goToFilesBtn) {
              goToFilesBtn.addEventListener('click', () => {
                // 切换到"我的文件"部分
                document.querySelectorAll('.nav-group li').forEach(item => {
                  if (item.dataset.section === 'my-files') {
                    item.click();
                  }
                });
              });
            }
          }
          
          // 显示空回收站提示
          UI.Toast.info('回收站为空', '回收站中没有任何文件', 5000, {
            group: 'trashOperations'
          });
        }
      })
      .catch(error => {
        console.error('加载回收站内容失败:', error);
        
        // 隐藏加载指示器
        UI.Loader.hideContentLoader();
        
        // 显示错误提示
        if (this.fileList) {
          this.fileList.style.display = 'block';
          this.fileList.className = 'file-list';
          this.fileList.innerHTML = `
            <div class="error-message">
              <i class="fas fa-exclamation-circle"></i>
              <h3>加载回收站失败</h3>
              <p>${error.message || '无法连接到服务器，请检查您的网络连接并稍后再试'}</p>
              <button class="retry-btn">
                <i class="fas fa-sync-alt"></i> 重新加载
              </button>
            </div>
          `;
          
          // 绑定重试按钮事件
          const retryBtn = this.fileList.querySelector('.retry-btn');
          if (retryBtn) {
            retryBtn.addEventListener('click', () => this.loadTrashContent());
          }
        }
        
        // 隐藏空状态
        if (this.emptyFileList) {
          this.emptyFileList.style.display = 'none';
        }
        
        // 显示错误提示
        UI.Toast.error('加载失败', error.message || '无法加载回收站内容', 8000, {
          group: 'trashOperations'
        });
      });
  },
  
  /**
   * 处理拖拽悬停事件
   * @param {DragEvent} e - 拖拽事件
   */
  handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  },
  
  /**
   * 处理拖拽进入事件
   * @param {DragEvent} e - 拖拽事件
   */
  handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // 添加拖拽样式
    const target = e.currentTarget;
    if (target) {
      target.classList.add('drag-over');
    }
  },
  
  /**
   * 处理拖拽离开事件
   * @param {DragEvent} e - 拖拽事件
   */
  handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // 检查是否真的离开了目标元素（而不是进入了子元素）
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    // 如果鼠标位置在元素外部，则移除拖拽样式
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      e.currentTarget.classList.remove('drag-over');
    }
  },
  
  /**
   * 处理拖拽放下事件
   * @param {DragEvent} e - 拖拽事件
   */
  handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // 移除拖拽样式
    const target = e.currentTarget;
    if (target) {
      target.classList.remove('drag-over');
    }
    
    // 获取拖拽的文件
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      this.uploadDroppedFiles(files);
    }
  },
  
  /**
   * 上传拖拽的文件
   * @param {FileList} files - 文件列表
   */
  uploadDroppedFiles(files) {
    console.log('开始处理拖放文件上传，文件数量:', files.length);
    
    // 确保有文件需要上传
    if (!files || files.length === 0) {
      console.warn('没有可上传的文件');
      return;
    }
    
    // 动态导入上传管理器
    import('./upload-manager.js')
      .then(module => {
        console.log('上传管理器模块加载成功');
        const uploadManager = module.default;
        
        if (!uploadManager) {
          throw new Error('无法获取上传管理器实例');
        }
        
        // 显示上传进度条
        const uploadProgressContainer = document.getElementById('uploadProgress');
        if (uploadProgressContainer) {
          uploadProgressContainer.style.display = 'block';
        } else {
          console.warn('找不到上传进度容器元素');
        }
        
        // 获取当前路径
        const currentPath = this.currentPath || '/';
        console.log('当前上传路径:', currentPath);
        
        // 创建FormData对象
        const formData = new FormData();
        formData.append('path', currentPath);
        
        // 处理每个文件上传
        const uploadIds = [];
        Array.from(files).forEach(file => {
          console.log('准备上传文件:', file.name, '大小:', file.size);
          
          // 生成唯一ID
          const id = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
          uploadIds.push(id);
          
          // 添加文件到FormData - 使用'file'作为字段名，与后端匹配
          formData.append('file', file);
          
          // 添加上传项到UI
          try {
            uploadManager.addUploadItem(id, file.name);
          } catch (err) {
            console.error('添加上传项到UI失败:', err);
            throw err;
          }
        });
        
        // 执行上传
        console.log('开始执行上传，文件数量:', uploadIds.length);
        return uploadManager.performUpload(formData);
      })
      .then(result => {
        console.log('拖放文件上传成功完成:', result);
      })
      .catch(error => {
        console.error('拖放上传失败:', error);
        UI.Toast.show('error', '上传失败', error.message || '文件上传过程中发生错误');
      });
  },
}