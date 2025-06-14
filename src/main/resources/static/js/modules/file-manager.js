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
    
    // 监听搜索事件
    document.addEventListener('search:perform', (e) => {
      if (e.detail && e.detail.query) {
        this.searchFiles(e.detail.query);
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
      UI.Toast.show('error', '加载失败', error.message || '无法加载文件列表');
      UI.Loader.hideContentLoader();
    }
  },
  
  /**
   * 渲染文件列表
   * @param {Array} files - 文件数组
   */
  renderFiles(files) {
    if (!this.fileList) return;
    
    this.fileList.style.display = 'grid';
    this.fileList.innerHTML = ''; // 清空现有内容
    
    if (files.length > 0) {
      // 有文件，隐藏空状态
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
      if (this.emptyFileList) {
        this.emptyFileList.style.display = 'flex';
      }
      this.fileList.style.display = 'none';
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
    UI.Toast.show('success', '已刷新', '文件列表已更新');
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
          <div class="file-name" title="${file.name}">${file.name}</div>
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
      UI.Toast.show('warning', '未选择文件', '请先选择要下载的文件');
      return;
    }
    
    UI.Toast.show('info', '准备下载', `正在准备下载 ${fileNames.length} 个文件...`);
    
    try {
      // 这里可以实现实际的批量下载逻辑
      // 例如创建一个ZIP文件或者逐个下载
      
      // 模拟下载过程
      setTimeout(() => {
        UI.Toast.show('success', '开始下载', `正在下载 ${fileNames.length} 个文件`);
      }, 1000);
    } catch (error) {
      console.error('批量下载文件失败:', error);
      UI.Toast.show('error', '下载失败', error.message || '无法下载选中的文件');
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
      onConfirm: () => {
        const newBaseName = document.getElementById('newFileName').value.trim();
        if (!newBaseName) {
          UI.Toast.show('warning', '重命名失败', '名称不能为空');
          return;
        }
        
        const newFileName = isFolder ? newBaseName : newBaseName + fileType;
        
        // 显示重命名进度
        UI.Toast.show('info', '重命名中', `正在将 ${fileName} 重命名为 ${newFileName}...`);
        
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
    // 显示确认对话框
    const modalId = 'deleteModal-' + Date.now();
    UI.Modal.confirm(
      '<i class="fas fa-trash"></i> 确认删除',
      `确定要将 "${fileName}" 移动到回收站吗？`,
      () => {
        // 显示删除进度
        UI.Toast.show('info', '删除中', `正在将 ${fileName} 移动到回收站...`);
        
        // 模拟删除过程
        setTimeout(() => {
          // 刷新文件列表
          this.refreshFiles();
          
          // 显示删除成功提示
          UI.Toast.show('success', '删除成功', `已将 ${fileName} 移动到回收站`);
          
          // 关闭弹框 - 由于 confirm 方法内部生成的 ID 无法直接获取，这里不调用关闭方法
          // UI.Modal.confirm 方法会自动处理关闭
        }, 800);
      }
    );
  },
  
  /**
   * 删除多个文件
   * @param {Array<string>} fileNames - 文件名数组
   */
  deleteFiles(fileNames) {
    if (!fileNames || fileNames.length === 0) {
      UI.Toast.show('warning', '未选择文件', '请先选择要删除的文件');
      return;
    }
    
    // 显示确认对话框
    UI.Modal.confirm(
      '<i class="fas fa-trash"></i> 确认删除',
      `确定要将选中的 ${fileNames.length} 个文件移动到回收站吗？`,
      () => {
        // 显示删除进度
        UI.Toast.show('info', '删除中', `正在将 ${fileNames.length} 个文件移动到回收站...`);
        
        // 模拟删除过程
        setTimeout(() => {
          // 刷新文件列表
          this.refreshFiles();
          
          // 显示删除成功提示
          UI.Toast.show('success', '删除成功', `已将 ${fileNames.length} 个文件移动到回收站`);
          
          // 清除选择
          this.clearFileSelection();
          
          // 关闭弹框 - 由于 confirm 方法内部生成的 ID 无法直接获取，这里不调用关闭方法
          // UI.Modal.confirm 方法会自动处理关闭
        }, 800);
      }
    );
  }
};