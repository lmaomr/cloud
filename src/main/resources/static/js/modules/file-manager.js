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
    document.addEventListener('click', (e) => this.handleFileItemClick(e));
    
    // 文件项复选框点击处理
    document.addEventListener('change', (e) => {
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
    });
    
    // 文件操作按钮
    document.addEventListener('click', (e) => this.handleFileAction(e));
    
    // 批量操作按钮
    document.querySelectorAll('.toolbar-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.handleBulkAction(e));
    });
    
    // 监听部分切换事件
    document.addEventListener('section:change', (e) => {
      if (e.detail && e.detail.section) {
        this.handleSectionChange(e.detail.section);
      }
    });
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
      
      // 隐藏加载指示器
      UI.Loader.hideContentLoader();
      
      // 显示文件列表
      if (this.fileList) {
        this.fileList.style.display = 'grid';
        this.fileList.innerHTML = ''; // 清空现有内容
        
        if (files.length > 0) {
          // 添加文件和文件夹
          files.forEach(file => {
            const fileItem = this.createFileItem(file);
            this.fileList.appendChild(fileItem);
          });
          
          if (this.emptyFileList) this.emptyFileList.style.display = 'none';
        } else {
          // 显示空状态
          if (this.fileList) this.fileList.style.display = 'none';
          if (this.emptyFileList) this.emptyFileList.style.display = 'flex';
        }
      }
    } catch (error) {
      console.error('加载文件列表失败:', error);
      
      // 隐藏加载指示器
      UI.Loader.hideContentLoader();
      
      // 检查是否是认证错误
      if (error.status === 401 || error.code === 401) {
        // 清除认证令牌
        CloudAPI.clearAuthToken();
        
        // 跳转到登录页面
        window.location.href = 'login.html';
        return;
      }
      
      UI.Toast.show('error', '加载失败', error.message || '无法加载文件列表');
      
      // 显示空状态
      if (this.fileList) this.fileList.style.display = 'none';
      if (this.emptyFileList) {
        this.emptyFileList.style.display = 'flex';
        this.emptyFileList.innerHTML = `
          <div class="empty-file-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <div class="empty-file-title">加载失败</div>
          <div class="empty-file-description">无法加载文件列表，请稍后再试</div>
        `;
      }
    }
  },
  
  /**
   * 刷新文件列表
   */
  async refreshFiles() {
    UI.Toast.show('info', '刷新中', '正在刷新文件列表...');
    
    try {
      await this.loadFiles();
      UI.Toast.show('success', '刷新完成', '文件列表已更新');
    } catch (error) {
      console.error('刷新文件列表失败:', error);
      UI.Toast.show('error', '刷新失败', error.message || '无法刷新文件列表');
    }
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
   * @returns {HTMLElement} 文件项元素
   */
  createFileItem(file) {
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
    
    fileItem.innerHTML = `
      <div class="file-checkbox">
        <input type="checkbox" class="item-checkbox" aria-label="选择${file.name}">
      </div>
      <div class="file-content">
        <div class="file-icon">
          <i class="${isFolder ? 'fas fa-folder' : fileIcon}"></i>
        </div>
        <div class="file-info">
          <div class="file-name">${file.name}</div>
          <div class="file-meta">${isFolder ? '' : fileSize + ' • '}修改于 ${fileDate}</div>
        </div>
      </div>
      <div class="file-actions">
        <i class="fas fa-download" data-action="download" title="下载" role="button" tabindex="0" aria-label="下载${file.name}"></i>
        <i class="fas fa-share-alt" data-action="share" title="分享" role="button" tabindex="0" aria-label="分享${file.name}"></i>
        <i class="fas fa-trash" data-action="delete" title="删除" role="button" tabindex="0" aria-label="删除${file.name}"></i>
      </div>
    `;
    
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
    document.querySelectorAll('.file-item.selected').forEach(item => {
      this.deselectFile(item);
    });
    this.selectedFiles = [];
  },
  
  /**
   * 更新工具栏状态
   */
  updateToolbar() {
    if (this.selectedFiles.length > 0) {
      this.fileActionsToolbar.style.display = 'flex';
      this.selectedCountElement.textContent = this.selectedFiles.length;
    } else {
      this.fileActionsToolbar.style.display = 'none';
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
    
    switch(action) {
      case 'download':
        this.downloadFile(fileName);
        break;
      case 'share':
        this.shareFile(fileName);
        break;
      case 'delete':
        this.deleteFile(fileName);
        break;
    }
  },
  
  /**
   * 处理批量操作
   * @param {Event} e - 点击事件
   */
  handleBulkAction(e) {
    const action = e.currentTarget.title.toLowerCase();
    
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
      case '重命名':
        if (this.selectedFiles.length === 1) {
          this.renameFile(this.selectedFiles[0]);
        } else {
          UI.Toast.show('warning', '操作受限', '一次只能重命名一个文件');
        }
        break;
      case '删除':
        this.deleteFiles(this.selectedFiles);
        break;
    }
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
    const breadcrumb = document.querySelector('.breadcrumb');
    if (!breadcrumb) return;
    
    // 清空面包屑
    breadcrumb.innerHTML = '';
    
    // 添加根目录
    const homeItem = document.createElement('span');
    homeItem.className = 'path-item';
    homeItem.innerHTML = '<i class="fas fa-home"></i> 首页';
    homeItem.addEventListener('click', () => {
      this.currentPath = '/';
      this.updateBreadcrumb();
      this.loadFiles();
    });
    breadcrumb.appendChild(homeItem);
    
    // 如果是根目录，直接返回
    if (this.currentPath === '/') {
      const currentItem = document.createElement('span');
      currentItem.className = 'path-item current';
      currentItem.textContent = '我的文件';
      
      // 添加分隔符
      const separator = document.createElement('i');
      separator.className = 'fas fa-chevron-right path-separator';
      breadcrumb.appendChild(separator);
      
      breadcrumb.appendChild(currentItem);
      return;
    }
    
    // 分割路径
    const pathParts = this.currentPath.split('/').filter(Boolean);
    let currentPath = '';
    
    // 添加路径项
    pathParts.forEach((part, index) => {
      // 添加分隔符
      const separator = document.createElement('i');
      separator.className = 'fas fa-chevron-right path-separator';
      breadcrumb.appendChild(separator);
      
      // 构建当前路径
      currentPath += '/' + part;
      
      // 创建路径项
      const pathItem = document.createElement('span');
      pathItem.className = 'path-item' + (index === pathParts.length - 1 ? ' current' : '');
      pathItem.textContent = part;
      
      // 非当前路径项添加点击事件
      if (index < pathParts.length - 1) {
        const path = currentPath;
        pathItem.addEventListener('click', () => {
          this.currentPath = path;
          this.updateBreadcrumb();
          this.loadFiles();
        });
      }
      
      breadcrumb.appendChild(pathItem);
    });
  },
  
  /**
   * 显示正在开发的部分
   * @param {string} section - 部分ID
   */
  showSectionUnderDevelopment(section) {
    if (this.fileList) this.fileList.style.display = 'none';
    if (this.emptyFileList) {
      this.emptyFileList.style.display = 'flex';
      
      let sectionName = '';
      document.querySelectorAll('.nav-group li').forEach(item => {
        if (item.dataset.section === section) {
          const spanElement = item.querySelector('span');
          if (spanElement) {
            sectionName = spanElement.textContent.trim();
          }
        }
      });
      
      this.emptyFileList.innerHTML = `
        <div class="empty-file-icon">
          <i class="fas fa-code"></i>
        </div>
        <div class="empty-file-title">${sectionName || '功能'}正在开发中</div>
        <div class="empty-file-description">此功能正在开发中，敬请期待</div>
      `;
    }
  },
  
  /**
   * 加载按类型筛选的内容
   * @param {string} type - 文件类型
   */
  loadFilteredContent(type) {
    UI.Toast.show('info', '加载中', `正在加载${this.getTypeName(type)}...`);
    // 这里应实现实际的内容加载逻辑
    
    // 模拟结果
    setTimeout(() => {
      UI.Toast.show('success', '加载完成', `已加载所有${this.getTypeName(type)}`);
    }, 1000);
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
    UI.Toast.show('info', '加载中', '正在加载共享内容...');
    // 这里应实现实际的共享内容加载逻辑
    
    // 模拟结果
    setTimeout(() => {
      UI.Toast.show('success', '加载完成', '已加载所有共享内容');
    }, 1000);
  },
  
  /**
   * 加载回收站内容
   */
  loadTrashContent() {
    UI.Toast.show('info', '加载中', '正在加载回收站...');
    // 这里应实现实际的回收站内容加载逻辑
    
    // 模拟结果
    setTimeout(() => {
      UI.Toast.show('success', '加载完成', '已加载回收站内容');
    }, 1000);
  },
  
  /**
   * 下载文件
   * @param {string} fileName - 文件名
   */
  async downloadFile(fileName) {
    try {
      // 获取文件路径
      const fileItem = this.findFileItemByName(fileName);
      if (!fileItem) {
        throw new Error(`找不到文件: ${fileName}`);
      }
      
      const filePath = fileItem.dataset.path || `/${fileName}`;
      
      UI.Toast.show('info', '准备下载', `正在准备下载 ${fileName}...`);
      
      // 实现下载逻辑
      // ...
      
      UI.Toast.show('success', '开始下载', `正在下载 ${fileName}`);
    } catch (error) {
      console.error('下载文件失败:', error);
      UI.Toast.show('error', '下载失败', error.message || '无法下载文件');
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
  }
};

export default FileManager; 