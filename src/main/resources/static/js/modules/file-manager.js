/**
 * 文件管理模块 - 处理文件列表显示和操作
 * @module file-manager
 */

import { CloudAPI } from '../api/cloud-api.js';
import { UI } from './ui.js';

/**
 * 创建防抖函数
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖处理后的函数
 */
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

/**
 * 创建节流函数
 * @param {Function} func - 要执行的函数
 * @param {number} limit - 限制时间（毫秒）
 * @returns {Function} 节流处理后的函数
 */
function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 文件类型扩展名映射
 */
const FILE_TYPE_EXTENSIONS = {
  // 使用与侧边栏data-section属性一致的键名
  videos: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', '3gp', 'mpeg', 'mpg'],
  images: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff', 'ico'],
  music: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'aiff', 'alac'],
  documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'rtf', 'odt', 'ods', 'odp', 'md', 'markdown'],
  // // 兼容旧版本的键名
  // video: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', '3gp', 'mpeg', 'mpg'],
  // image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tiff', 'ico'],
  // audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'aiff', 'alac'],
  // document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'rtf', 'odt', 'ods', 'odp', 'md', 'markdown']
};

/**
 * 文件类型对应的accept属性
 */
const FILE_TYPE_ACCEPT = {
  video: '.mp4,.avi,.mov,.wmv,.flv,.mkv,.webm,.3gp,.mpeg,.mpg',
  images: '.jpg,.jpeg,.png,.gif,.bmp,.svg,.webp,.tiff,.ico',
  audio: '.mp3,.wav,.ogg,.flac,.aac,.m4a,.wma,.aiff,.alac',
  document: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods,.odp,.md,.markdown'
};

/**
 * 文件类型对应的空状态配置
 */
const EMPTY_STATE_CONFIG = {
  video: {
    iconClass: 'fas fa-film',
    title: '暂无视频',
    description: '您可以拖拽视频文件至此上传，或点击下方按钮选择文件',
    buttonText: '上传视频'
  },
  images: {
    iconClass: 'fas fa-image',
    title: '暂无图片',
    description: '您可以拖拽图片文件至此上传，或点击下方按钮选择文件',
    buttonText: '上传图片'
  },
  audio: {
    iconClass: 'fas fa-music',
    title: '暂无音乐',
    description: '您可以拖拽音频文件至此上传，或点击下方按钮选择文件',
    buttonText: '上传音乐'
  },
  document: {
    iconClass: 'fas fa-file-alt',
    title: '暂无文档',
    description: '您可以拖拽文档文件至此上传，或点击下方按钮选择文件',
    buttonText: '上传文档'
  },
  others: {
    iconClass: 'fas fa-file-archive',
    title: '暂无其他文件',
    description: '您可以拖拽其他类型文件至此上传，或点击下方按钮选择文件',
    buttonText: '上传文件'
  },
  default: {
    iconClass: 'fas fa-file',
    title: '暂无文件',
    description: '您可以拖拽文件至此上传，或点击下方按钮选择文件',
    buttonText: '上传文件'
  }
};

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
    this.listView = document.getElementsByClassName('list-view');

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
      sectionChange: (e) => {
        if (e.detail && e.detail.section) {
          this.handleSectionChange(e.detail.section);
        }
      },
      searchPerform: debounce((e) => {
        if (e.detail && e.detail.query) {
          this.searchFiles(e.detail.query);
        }
      }, 300),
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

    // 初始化右键菜单
    this._initContextMenu();

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

    // 刷新按钮 - 添加节流处理，防止频繁刷新
    if (this.refreshBtn) {
      this.refreshBtn.addEventListener('click', throttle(() => this.refreshFiles(), 1000));
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
    }
  },

  /**
   * 处理部分切换
   * @param {string} section - 部分ID
   */
  handleSectionChange(section) {
    console.log('切换到部分:', section);

    // 清除选择
    this.clearFileSelection();

    // 强制隐藏工具栏，确保不会持续显示
    if (this.fileActionsToolbar) {
      this.fileActionsToolbar.style.display = 'none';

      // 如果工具栏有回收站特定样式，重置它
      if (this.fileActionsToolbar.classList.contains('trash-toolbar-styled')) {
        this.fileActionsToolbar.classList.remove('trash-toolbar-styled');
      }

      // 强制重置工具栏状态，确保切换部分时工具栏总是正确的
      this._resetToolbar();
    }

    // 重置当前路径
    this.currentPath = '/';

    // 移除可能存在的回收站操作栏
    this.removeTrashActionBar();

    // 根据不同的部分加载不同内容
    switch (section) {
      case 'my-files':
        this.refreshFiles();
        break;
      case 'images':
        this.loadFilteredContent('images');
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
      case 'others':
        this.loadFilteredContent('others');
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
    console.log(view);
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
    this.renderFiles(this.currentFiles);
  },

  /**
   * 禁用视图切换按钮
   * @private
   */
  _disableViewToggleButtons() {
    this.viewBtns.forEach(btn => {
      btn.disabled = true;
      btn.classList.add('disabled');
    });
  },

  /**
   * 启用视图切换按钮
   * @private
   */
  _enableViewToggleButtons() {
    this.viewBtns.forEach(btn => {
      btn.disabled = false;
      btn.classList.remove('disabled');
    });
  },

  /**
   * 加载文件列表
   */
  async loadFiles() {
    try {
      // 显示加载指示器
      UI.Loader.showContentLoader('fileContainer');

      // 重新绑定拖放事件监听器（以防在回收站页面解绑过）
      this._reattachDropEventListeners();

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

      // 启用视图切换按钮
      this._enableViewToggleButtons();
    } catch (error) {
      console.error('加载文件列表失败:', error);

      // 隐藏加载指示器
      UI.Loader.hideContentLoader();

      // 显示错误提示
      if (this.fileList) {
        this.fileList.className = 'file-list error-view';
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

      // 禁用视图切换按钮
      this._disableViewToggleButtons();

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
      this.fileList.style.display = localStorage.getItem('view') === 'list' ? 'flex' : 'grid';
      this.fileList.className = 'file-list';
      this.fileList.classList.add(`${this.currentView}-view`);

      // 隐藏空状态
      if (this.emptyFileList) {
        this.emptyFileList.style.display = 'none';
      }

      // 使用文档片段减少DOM重绘次数
      const fragment = document.createDocumentFragment();

      // 创建文件项
      files.forEach(file => {
        const fileItem = this.createFileItem(file);
        fragment.appendChild(fileItem);
      });

      // 一次性将所有文件项添加到DOM
      this.fileList.appendChild(fragment);

      // 启用视图切换按钮
      this._enableViewToggleButtons();
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

      // 禁用视图切换按钮
      this._disableViewToggleButtons();
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

    // 获取当前选中的部分
    const activeSection = localStorage.getItem('activeSection') || 'my-files';

    // 根据当前部分刷新相应内容
    switch (activeSection) {
      case 'my-files':
        // 重新加载文件
        await this.loadFiles();
        break;
      case 'images':
        this.loadFilteredContent('images');
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
      case 'others':
        this.loadFilteredContent('others');
        break;
      case 'shared':
        this.loadSharedContent();
        break;
      case 'trash':
        this.loadTrashContent();
        break;
      default:
        // 默认刷新当前文件列表
        await this.loadFiles();
    }

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
    const fileIcon = this.getFileIcon(file.name);
    const fileSize = isFolder ? '' : this.formatFileSize(file.size);
    const fileDate = new Date(file.createTime).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    // 创建文件项元素
    const fileItem = document.createElement('div');
    fileItem.className = `file-item ${isFolder ? 'folder' : 'file'}`;
    fileItem.setAttribute('tabindex', '0');
    fileItem.setAttribute('role', 'button');
    fileItem.setAttribute('aria-label', `${isFolder ? '文件夹: ' : '文件: '}${file.name}`);
    fileItem.setAttribute('data-id', file.id);
    fileItem.setAttribute('data-path', file.path);
    fileItem.setAttribute('data-name', file.name);
    fileItem.setAttribute('data-type', file.type);
    fileItem.setAttribute('data-is-trash', isTrash.toString());

    // 使用模板字符串设置内容
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

    // 使用对象映射代替switch语句
    const iconMap = {
      // 文档类
      'pdf': 'fas fa-file-pdf',
      'doc': 'fas fa-file-word',
      'docx': 'fas fa-file-word',
      'xls': 'fas fa-file-excel',
      'xlsx': 'fas fa-file-excel',
      'ppt': 'fas fa-file-powerpoint',
      'pptx': 'fas fa-file-powerpoint',
      'txt': 'fas fa-file-alt',
      'rtf': 'fas fa-file-alt',
      'odt': 'fas fa-file-alt',
      'ods': 'fas fa-file-excel',
      'odp': 'fas fa-file-powerpoint',
      'md': 'fas fa-file-alt',
      'markdown': 'fas fa-file-alt',
      'csv': 'fas fa-file-csv',

      // 图像类
      'jpg': 'fas fa-file-image',
      'jpeg': 'fas fa-file-image',
      'png': 'fas fa-file-image',
      'gif': 'fas fa-file-image',
      'bmp': 'fas fa-file-image',
      'svg': 'fas fa-file-image',
      'webp': 'fas fa-file-image',
      'tiff': 'fas fa-file-image',
      'ico': 'fas fa-file-image',

      // 音频类
      'mp3': 'fas fa-file-audio',
      'wav': 'fas fa-file-audio',
      'ogg': 'fas fa-file-audio',
      'flac': 'fas fa-file-audio',
      'aac': 'fas fa-file-audio',
      'm4a': 'fas fa-file-audio',
      'wma': 'fas fa-file-audio',
      'aiff': 'fas fa-file-audio',
      'alac': 'fas fa-file-audio',

      // 视频类
      'mp4': 'fas fa-file-video',
      'avi': 'fas fa-file-video',
      'mov': 'fas fa-file-video',
      'wmv': 'fas fa-file-video',
      'flv': 'fas fa-file-video',
      'mkv': 'fas fa-file-video',
      'webm': 'fas fa-file-video',
      '3gp': 'fas fa-file-video',
      'mpeg': 'fas fa-file-video',
      'mpg': 'fas fa-file-video',

      // 压缩文件类
      'zip': 'fas fa-file-archive',
      'rar': 'fas fa-file-archive',
      '7z': 'fas fa-file-archive',
      'tar': 'fas fa-file-archive',
      'gz': 'fas fa-file-archive',

      // 代码类
      'html': 'fas fa-file-code',
      'css': 'fas fa-file-code',
      'js': 'fas fa-file-code',
      'ts': 'fas fa-file-code',
      'jsx': 'fas fa-file-code',
      'tsx': 'fas fa-file-code',
      'php': 'fas fa-file-code',
      'py': 'fas fa-file-code',
      'java': 'fas fa-file-code',
      'c': 'fas fa-file-code',
      'cpp': 'fas fa-file-code',
      'h': 'fas fa-file-code',
      'cs': 'fas fa-file-code',
      'rb': 'fas fa-file-code',
      'go': 'fas fa-file-code',
      'swift': 'fas fa-file-code',
      'json': 'fas fa-file-code',
      'xml': 'fas fa-file-code',
      'yml': 'fas fa-file-code',
      'yaml': 'fas fa-file-code',
    };

    // 返回匹配的图标或默认图标
    return iconMap[extension] || 'fas fa-file';
  },

  /**
   * 格式化文件大小
   * @param {number} bytes - 文件大小（字节）
   * @returns {string} 格式化后的文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const base = 1024;
    const unitIndex = Math.floor(Math.log(bytes) / Math.log(base));

    // 限制单位索引不超过数组长度
    const safeUnitIndex = Math.min(unitIndex, units.length - 1);

    // 计算大小并保留两位小数
    const size = bytes / Math.pow(base, safeUnitIndex);

    // 如果是整数，不显示小数点
    return size % 1 === 0
      ? `${size} ${units[safeUnitIndex]}`
      : `${size.toFixed(2)} ${units[safeUnitIndex]}`;
  },

  /**
   * 处理文件项点击
   * @param {Event} e - 点击事件
   */
  handleFileItemClick(e) {
    const fileItem = e.target.closest('.file-item');
    if (!fileItem) return;

    // 如果点击的是复选框，让浏览器处理复选框的状态变化
    if (e.target.classList.contains('item-checkbox')) {
      return;
    }

    // 为文件夹添加双击检测
  if (fileItem.classList.contains('folder')) {
    // 使用自定义属性存储上次点击时间
    const now = Date.now();
    const lastClickTime = parseInt(fileItem.dataset.lastClickTime || 0);
    
    // 更新点击时间
    fileItem.dataset.lastClickTime = now;
    
    // 如果两次点击间隔小于300ms，视为双击
    if (now - lastClickTime < 300) {
      // 双击操作：进入文件夹
      this.navigateToFolder(fileItem);
      return;
    }
    
    // 单击文件夹时，延迟处理选择操作，给双击留出时间
    setTimeout(() => {
      // 检查是否在延迟期间发生了双击
      const currentLastClick = parseInt(fileItem.dataset.lastClickTime || 0);
      if (currentLastClick === now) {  // 如果最后点击时间没变，说明没有发生双击
        // 执行单击操作：切换选择状态
        const checkbox = fileItem.querySelector('.item-checkbox');
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          
          // 触发change事件，以便更新选择状态
          const changeEvent = new Event('change', { bubbles: true });
          checkbox.dispatchEvent(changeEvent);
        }
        
        // 更新工具栏状态
        this.updateToolbar();
      }
    }, 200);  // 延迟200ms，等待可能的双击
    
    return;
  }

    // 其他情况下，切换选择状态
    const checkbox = fileItem.querySelector('.item-checkbox');
    if (checkbox) {
      checkbox.checked = !checkbox.checked;

      // 触发change事件，以便更新选择状态
      const changeEvent = new Event('change', { bubbles: true });
      checkbox.dispatchEvent(changeEvent);
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
    const fileName = fileItem.getAttribute('data-name');
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
    const fileName = fileItem.getAttribute('data-name');
    this.selectedFiles = this.selectedFiles.filter(name => name !== fileName);
  },

  /**
   * 清除所有文件选择
   */
  clearFileSelection() {
    console.log('清除文件选择，当前已选择:', this.selectedFiles.length);

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
    console.log('选择已清除，当前已选择:', this.selectedFiles.length);

    // 隐藏工具栏
    if (this.fileActionsToolbar) {
      this.fileActionsToolbar.style.display = 'none';

      // 重置工具栏内容和样式
      if (this.fileActionsToolbar.classList.contains('trash-toolbar-styled')) {
        console.log('重置回收站特定工具栏样式');
        this.fileActionsToolbar.classList.remove('trash-toolbar-styled');
        this.fileActionsToolbar.innerHTML = ''; // 清空回收站特定工具栏内容

        // 恢复默认工具栏内容
        const defaultToolbarHTML = `
          <div class="selected-count">已选择 <span id="selectedCount">0</span> 项</div>
          <div class="toolbar-actions">
            <button class="toolbar-btn" title="下载"><i class="fas fa-download"></i></button>
            <button class="toolbar-btn" title="分享"><i class="fas fa-share-alt"></i></button>
            <button class="toolbar-btn" title="移动"><i class="fas fa-arrows-alt"></i></button>
            <button class="toolbar-btn" title="删除"><i class="fas fa-trash"></i></button>
          </div>
        `;
        this.fileActionsToolbar.innerHTML = defaultToolbarHTML;
        this.selectedCountElement = document.getElementById('selectedCount');
      }
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

      // 如果工具栏有回收站特定样式，重置它
      if (this.fileActionsToolbar.classList.contains('trash-toolbar-styled')) {
        console.log('在updateToolbar中重置回收站特定样式');
        this.fileActionsToolbar.classList.remove('trash-toolbar-styled');
        this.fileActionsToolbar.innerHTML = '';

        // 恢复默认工具栏内容
        const defaultToolbarHTML = `
          <div class="selected-count">已选择 <span id="selectedCount">0</span> 项</div>
          <div class="toolbar-actions">
            <button class="toolbar-btn" title="下载"><i class="fas fa-download"></i></button>
            <button class="toolbar-btn" title="分享"><i class="fas fa-share-alt"></i></button>
            <button class="toolbar-btn" title="移动"><i class="fas fa-arrows-alt"></i></button>
            <button class="toolbar-btn" title="删除"><i class="fas fa-trash"></i></button>
          </div>
        `;
        this.fileActionsToolbar.innerHTML = defaultToolbarHTML;
        this.selectedCountElement = document.getElementById('selectedCount');
      }
    }
  },

  /**
   * 处理文件操作 (已弃用，仅保留以防其他地方调用)
   * @param {Event} e - 点击事件
   * @deprecated 请使用_handleContextMenuAction方法代替
   */
  // handleFileAction(e) {
  //   // 删除警告日志
  //   console.warn('handleFileAction方法已弃用，请使用_handleContextMenuAction方法代替');
  //   const actionBtn = e.target.closest('[data-action]');
  //   if (!actionBtn) return;

  //   e.stopPropagation();
  //   const action = actionBtn.dataset.action;
  //   const fileItem = actionBtn.closest('.file-item');

  //   // 确保fileItem存在
  //   if (!fileItem) {
  //     console.error('找不到文件项元素');
  //     return;
  //   }

  //   const fileName = fileItem.getAttribute('data-name');
  //   const fileId = fileItem.dataset.id;

  //   this._handleContextMenuAction(action, fileName, fileItem);
  // },

  /**
   * 重置文件操作工具栏为默认状态
   * @private
   */
  _resetToolbar() {
    console.log('重置工具栏到默认状态');

    if (!this.fileActionsToolbar) return;

    // 移除回收站特定样式
    this.fileActionsToolbar.classList.remove('trash-toolbar-styled');

    // 清空工具栏内容
    this.fileActionsToolbar.innerHTML = '';

    // 恢复默认工具栏内容
    const defaultToolbarHTML = `
      <div class="selected-count">已选择 <span id="selectedCount">0</span> 项</div>
      <div class="toolbar-actions">
        <button class="toolbar-btn" title="下载"><i class="fas fa-download"></i></button>
        <button class="toolbar-btn" title="分享"><i class="fas fa-share-alt"></i></button>
        <button class="toolbar-btn" title="移动"><i class="fas fa-arrows-alt"></i></button>
        <button class="toolbar-btn" title="删除"><i class="fas fa-trash"></i></button>
      </div>
    `;
    this.fileActionsToolbar.innerHTML = defaultToolbarHTML;
    this.selectedCountElement = document.getElementById('selectedCount');

    // 确保工具栏隐藏
    this.fileActionsToolbar.style.display = 'none';

    // 重新绑定工具栏按钮事件
    const toolbarBtns = this.fileActionsToolbar.querySelectorAll('.toolbar-btn');
    toolbarBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleBulkAction(e));
    });
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
      async () => {
        // 显示恢复进度
        const loadingToastId = UI.Toast.loading('恢复中', `正在恢复 ${fileName}...`, {
          group: 'trashOperations'
        });

        try {
          // 调用API恢复文件
          await CloudAPI.restoreFile(fileId);

          // 隐藏加载通知
          UI.Toast.hide(loadingToastId);

          // 重置工具栏到默认状态
          this._resetToolbar();

          // 刷新回收站
          this.loadTrashContent();

          // 恢复操作不更新存储空间信息，因为只是文件位置变化，不影响总存储量

          // 显示恢复成功提示
          UI.Toast.success('恢复成功', `已恢复 ${fileName}`, 5000, {
            group: 'trashOperations'
          });
        } catch (error) {
          // 隐藏加载通知
          UI.Toast.hide(loadingToastId);

          console.error('恢复文件失败:', error);
          UI.Toast.error('恢复失败', error.message || '无法恢复文件', 5000, {
            group: 'trashOperations'
          });
        }
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
      async () => {
        // 显示删除进度
        const loadingToastId = UI.Toast.loading('删除中', `正在永久删除 ${fileName}...`, {
          group: 'trashOperations'
        });

        try {
          // 调用API永久删除文件
          await CloudAPI.deletePermanentFile(fileId);

          // 隐藏加载通知
          UI.Toast.hide(loadingToastId);

          // 刷新回收站
          this.loadTrashContent();

          // 更新存储空间信息
          await this.updateStorageInfo();

          // 显示删除成功提示
          UI.Toast.success('删除成功', `已永久删除 ${fileName}`, 5000, {
            group: 'trashOperations'
          });
        } catch (error) {
          // 隐藏加载通知
          UI.Toast.hide(loadingToastId);

          console.error('永久删除文件失败:', error);
          UI.Toast.error('删除失败', error.message || '无法删除文件', 5000, {
            group: 'trashOperations'
          });
        }
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
      switch (action) {
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
      switch (action) {
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
      async () => {
        try {
          // 显示恢复进度
          const loadingToastId = UI.Toast.loading('恢复中', `正在恢复 ${fileNames.length} 个文件...`, {
            group: 'trashOperations'
          });

          // 创建所有恢复操作的Promise数组
          const restorePromises = fileNames.map(fileName => {
            const fileItem = this.findFileItemByName(fileName);
            if (!fileItem) return Promise.reject(new Error(`找不到文件: ${fileName}`));

            const fileId = fileItem.dataset.id;
            if (!fileId) return Promise.reject(new Error(`无效的文件ID: ${fileName}`));

            return CloudAPI.restoreFile(fileId);
          });

          // 等待所有恢复操作完成
          await Promise.all(restorePromises);

          // 隐藏加载通知
          UI.Toast.hide(loadingToastId);

          // 重置工具栏到默认状态
          this._resetToolbar();

          // 刷新回收站
          this.loadTrashContent();

          // 恢复操作不更新存储空间信息，因为只是文件位置变化，不影响总存储量

          // 显示恢复成功提示
          UI.Toast.success('恢复成功', `已恢复 ${fileNames.length} 个文件`, 5000, {
            group: 'trashOperations'
          });
        } catch (error) {
          console.error('批量恢复文件失败:', error);
          UI.Toast.error('恢复失败', error.message || '无法恢复选中的文件', 5000, {
            group: 'trashOperations'
          });
        }
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
      async () => {
        try {
          // 显示删除进度
          const loadingToastId = UI.Toast.loading('删除中', `正在永久删除 ${fileNames.length} 个文件...`, {
            group: 'trashOperations'
          });

          // 创建所有删除操作的Promise数组
          const deletePromises = fileNames.map(fileName => {
            const fileItem = this.findFileItemByName(fileName);
            if (!fileItem) return Promise.reject(new Error(`找不到文件: ${fileName}`));

            const fileId = fileItem.dataset.id;
            if (!fileId) return Promise.reject(new Error(`无效的文件ID: ${fileName}`));

            return CloudAPI.deletePermanentFile(fileId);
          });

          // 等待所有删除操作完成
          await Promise.all(deletePromises);

          // 隐藏加载通知
          UI.Toast.hide(loadingToastId);

          // 刷新回收站
          this.loadTrashContent();

          // 更新存储空间信息
          await this.updateStorageInfo();

          // 显示删除成功提示
          UI.Toast.success('删除成功', `已永久删除 ${fileNames.length} 个文件`, 5000, {
            group: 'trashOperations'
          });
        } catch (error) {
          console.error('批量永久删除文件失败:', error);
          UI.Toast.error('删除失败', error.message || '无法删除选中的文件', 5000, {
            group: 'trashOperations'
          });
        }
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
    // const folderPath = folderItem.dataset.path || `${this.currentPath}${this.currentPath.endsWith('/') ? '' : '/'}${folderName}`;
    const folderPath = `${this.currentPath}${this.currentPath.endsWith('/') ? '' : '/'}${folderName}`;
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

    // 移除拖放事件监听器，开发中页面不需要上传功能
    this._removeDropEventListeners();

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

      // 禁用视图切换按钮
      this._disableViewToggleButtons();
    }
  },

  /**
   * 加载按类型筛选的内容
   * @param {string} type - 文件类型
   */
  loadFilteredContent(type) {
    // 显示加载指示器
    UI.Loader.showContentLoader('fileContainer');

    // 重新绑定拖放事件监听器（以防在回收站页面解绑过）
    this._reattachDropEventListeners();

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

        // 根据类型过滤文件，使用更简洁的过滤逻辑
        let filteredFiles = [];

        // 使用映射表简化过滤逻辑
        const filterFunctions = {
          'video': file => file.type !== 'folder' && this.isVideoFile(file.name),
          'images': file => file.type !== 'folder' && this.isImageFile(file.name),
          'audio': file => file.type !== 'folder' && this.isAudioFile(file.name),
          'document': file => file.type !== 'folder' && this.isDocumentFile(file.name),
          'others': file => file.type !== 'folder' && this.isOtherFile(file.name)
        };

        // 使用对应的过滤函数
        if (filterFunctions[type]) {
          filteredFiles = allFiles.filter(filterFunctions[type]);
        }

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
            // 根据用户保存的视图模式设置显示方式，保持与主页面一致
            this.fileList.style.display = localStorage.getItem('view') === 'list' ? 'flex' : 'grid';
            this.fileList.className = 'file-list';
            this.fileList.classList.add(`${this.currentView}-view`);
            this.fileList.innerHTML = ''; // 清空现有内容

            // 使用文档片段减少DOM重绘次数
            const fragment = document.createDocumentFragment();

            // 创建文件项
            filteredFiles.forEach(file => {
              const fileItem = this.createFileItem(file);
              fragment.appendChild(fileItem);
            });

            // 一次性将所有文件项添加到DOM
            this.fileList.appendChild(fragment);
          }

          // 隐藏空状态
          if (this.emptyFileList) {
            this.emptyFileList.style.display = 'none';
          }

          // 启用视图切换按钮
          this._enableViewToggleButtons();

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

            // 使用配置对象获取空状态信息
            const emptyConfig = EMPTY_STATE_CONFIG[type] || EMPTY_STATE_CONFIG.default;

            this.emptyFileList.innerHTML = `
              <div class="empty-file-icon">
                <i class="${emptyConfig.iconClass}"></i>
              </div>
              <div class="empty-file-title">${emptyConfig.title}</div>
              <div class="empty-file-description">${emptyConfig.description}</div>
              <div class="empty-file-actions">
                <button class="btn btn-primary upload-btn" data-type="${type}">
                  <i class="fas fa-upload"></i> ${emptyConfig.buttonText}
                </button>
              </div>
            `;

            // 绑定上传按钮事件，添加文件类型验证
            const uploadBtn = this.emptyFileList.querySelector('.upload-btn');
            if (uploadBtn) {
              uploadBtn.addEventListener('click', () => {
                const fileInput = document.getElementById('fileInput');
                if (fileInput) {
                  // 设置接受的文件类型
                  const acceptType = FILE_TYPE_ACCEPT[type];
                  if (acceptType) {
                    fileInput.setAttribute('accept', acceptType);
                  } else {
                    fileInput.removeAttribute('accept');
                  }

                  // 直接触发文件选择，不进行文件类型检查和跳转

                  // 触发文件选择对话框
                  fileInput.click();
                }
              });
            }
          }

          // 禁用视图切换按钮
          this._disableViewToggleButtons();

          // 显示无内容提示
          UI.Toast.info('无内容', `未找到${this.getTypeName(type)}文件`, 5000, {
            group: 'fileOperations'
          });
        }
      })
      .catch(error => {
        // 隐藏加载指示器
        UI.Loader.hideContentLoader();

        // 显示错误提示
        if (this.fileList) {
          this.fileList.className = 'file-list error-view';
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

        // 禁用视图切换按钮
        this._disableViewToggleButtons();

        // 显示错误提示
        UI.Toast.error('加载失败', `无法加载${this.getTypeName(type)}文件`, 8000, {
          group: 'fileOperations'
        });
      });
  },

  /**
   * 检查文件类型
   * @param {string} fileName - 文件名
   * @param {string} fileType - 文件类型（video, image, audio, document）
   * @returns {boolean} 是否为指定类型的文件
   */
  checkFileType(fileName, fileType) {
    if (!fileName || typeof fileName !== 'string') {
      return false;
    }

    // 确保文件名包含扩展名
    const parts = fileName.split('.');
    if (parts.length < 2) {
      return false;
    }

    const extension = parts[parts.length - 1].toLowerCase();
    const extensions = FILE_TYPE_EXTENSIONS[fileType];

    if (!extensions) {
      return false;
    }

    return extensions.includes(extension);
  },

  /**
   * 判断文件是否为视频文件
   * @param {string} fileName - 文件名
   * @returns {boolean} 是否为视频文件
   */
  isVideoFile(fileName) {
    return this.checkFileType(fileName, 'videos');
  },

  /**
   * 判断文件是否为图片文件
   * @param {string} fileName - 文件名
   * @returns {boolean} 是否为图片文件
   */
  isImageFile(fileName) {
    return this.checkFileType(fileName, 'images');
  },

  /**
   * 判断文件是否为音频文件
   * @param {string} fileName - 文件名
   * @returns {boolean} 是否为音频文件
   */
  isAudioFile(fileName) {
    return this.checkFileType(fileName, 'music');
  },

  /**
   * 判断文件是否为文档文件
   * @param {string} fileName - 文件名
   * @returns {boolean} 是否为文档文件
   */
  isDocumentFile(fileName) {
    return this.checkFileType(fileName, 'documents');
  },

  /**
   * 判断文件是否为其他类型文件（非视频、音频、文档、图片的文件）
   * @param {string} fileName - 文件名
   * @returns {boolean} 是否为其他类型文件
   */
  isOtherFile(fileName) {
    // 首先检查是否为视频、音频、文档或图片文件
    return !(this.isVideoFile(fileName) || this.isAudioFile(fileName) ||
      this.isDocumentFile(fileName) || this.isImageFile(fileName));
  },

  /**
   * 获取类型名称
   * @param {string} type - 文件类型
   * @returns {string} 类型名称
   */
  getTypeName(type) {
    switch (type) {
      case 'videos': return '视频';
      case 'music': return '音乐';
      case 'documents': return '文档';
      case 'images': return '图片';
      case 'others': return '其他';
      // 兼容旧版本
      case 'video': return '视频';
      case 'audio': return '音乐';
      case 'document': return '文档';
      case 'image': return '图片';
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

    // 移除拖放事件监听器，共享视图不需要上传功能
    this._removeDropEventListeners();

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
          ...myShares.map(item => ({ ...item, shareType: 'outgoing' })),
          ...sharedWithMe.map(item => ({ ...item, shareType: 'incoming' }))
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
            // 根据用户保存的视图模式设置显示方式，保持与主页面一致
            this.fileList.style.display = localStorage.getItem('view') === 'list' ? 'flex' : 'grid';
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

            // 添加复制链接按钮的事件处理
            this._setupCopyLinkButtons();

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

                  // 重新绑定复制链接按钮
                  this._setupCopyLinkButtons();
                }
              });
            });
          }

          // 禁用视图切换按钮，因为共享内容有自己的视图模式
          this._disableViewToggleButtons();

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

          // 禁用视图切换按钮
          this._disableViewToggleButtons();

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
          this.fileList.className = 'file-list error-view';
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

        // 禁用视图切换按钮
        this._disableViewToggleButtons();

        // 显示错误提示
        UI.Toast.error('加载失败', error.message || '无法加载共享内容', 8000, {
          group: 'shareOperations'
        });
      });
  },

  /**
   * 设置复制链接按钮的事件处理
   * @private
   */
  _setupCopyLinkButtons() {
    const copyButtons = document.querySelectorAll('.copy-link-btn');
    copyButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const link = btn.getAttribute('data-link');
        if (link) {
          // 创建临时输入框
          const tempInput = document.createElement('input');
          tempInput.value = link;
          document.body.appendChild(tempInput);

          // 选中并复制
          tempInput.select();
          tempInput.setSelectionRange(0, 99999);

          try {
            // 使用现代clipboard API
            navigator.clipboard.writeText(link)
              .then(() => {
                UI.Toast.success('复制成功', '分享链接已复制到剪贴板', 3000);
              })
              .catch(err => {
                // 如果clipboard API不可用，使用传统方法
                document.execCommand('copy');
                UI.Toast.success('复制成功', '分享链接已复制到剪贴板', 3000);
              });
          } catch (err) {
            console.error('复制失败:', err);
            UI.Toast.error('复制失败', '无法复制到剪贴板，请手动复制', 5000);
          }

          // 移除临时输入框
          document.body.removeChild(tempInput);
        }
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
  * 下载文件 - 兼容iOS Safari
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

      // 获取认证令牌
      const token = CloudAPI.getAuthToken();

      // 检测是否为iOS设备
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

      if (isIOS || isSafari) {
        // iOS Safari 特殊处理
        await this.downloadFileForIOS(downloadUrl, token, fileName);
      } else {
        // 其他浏览器使用标准方法
        await this.downloadFileStandard(downloadUrl, token, fileName);
      }

      UI.Toast.success('下载开始', `文件 ${fileName} 开始下载`, 3000);

    } catch (error) {
      console.error('下载文件失败:', error);
      UI.Toast.error('下载失败', error.message || '下载文件时出错', 5000);
    }
  },

  /**
   * iOS Safari 专用下载方法
   * @param {string} downloadUrl - 下载链接
   * @param {string} token - 认证令牌
   * @param {string} fileName - 文件名
   */
  async downloadFileForIOS(downloadUrl, token, fileName) {
    try {
      // 方法1: 尝试直接跳转下载（适用于支持直接下载的文件类型）
      const directDownloadUrl = `${downloadUrl}${downloadUrl.includes('?') ? '&' : '?'}download=1`;

      // 创建一个隐藏的iframe来处理下载
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = directDownloadUrl;
      document.body.appendChild(iframe);

      // 设置超时清理iframe
      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }, 3000);

      // 同时尝试新窗口打开（作为备选方案）
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = directDownloadUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        // 尝试触发下载
        if (token) {
          // 如果需要认证，构造包含token的URL
          const urlWithAuth = `${directDownloadUrl}&token=${encodeURIComponent(token)}`;
          link.href = urlWithAuth;
        }

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, 500);

    } catch (error) {
      // 如果直接下载失败，尝试blob方法
      await this.downloadFileStandard(downloadUrl, token, fileName);
    }
  },

  /**
   * 标准浏览器下载方法
   * @param {string} downloadUrl - 下载链接
   * @param {string} token - 认证令牌
   * @param {string} fileName - 文件名
   */
  async downloadFileStandard(downloadUrl, token, fileName) {
    // 使用fetch API下载文件，确保包含认证信息
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Authorization': token || '',
        'Content-Type': 'application/octet-stream',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`下载失败: ${response.statusText}`);
    }

    // 将响应转换为blob
    const blob = await response.blob();

    // 检测浏览器支持情况
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      // IE浏览器
      window.navigator.msSaveOrOpenBlob(blob, fileName);
    } else {
      // 现代浏览器
      const objectUrl = URL.createObjectURL(blob);

      // 使用a标签下载文件
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fileName;
      a.style.display = 'none';

      // 添加到DOM并触发点击
      document.body.appendChild(a);

      // 使用用户交互事件触发点击（重要：iOS需要）
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
      });

      a.dispatchEvent(clickEvent);

      // 延迟清理，给iOS更多时间处理
      setTimeout(() => {
        try {
          if (a.parentNode) {
            document.body.removeChild(a);
          }
          URL.revokeObjectURL(objectUrl);
        } catch (cleanupError) {
          console.warn('清理下载元素时出错:', cleanupError);
        }
      }, 1000); // 增加延迟时间
    }
  },

  /**
   * 备选下载方法 - 打开新窗口
   * @param {string} fileName - 文件名
   */
  openDownloadInNewWindow(fileName) {
    try {
      const fileItem = this.findFileItemByName(fileName);
      if (!fileItem) {
        throw new Error(`找不到文件: ${fileName}`);
      }

      const fileId = fileItem.dataset.id;
      if (!fileId) {
        throw new Error(`无效的文件ID: ${fileName}`);
      }

      const downloadUrl = CloudAPI.getFileDownloadUrl(fileId);
      const token = CloudAPI.getAuthToken();

      // 构造包含认证信息的URL
      let finalUrl = downloadUrl;
      if (token) {
        const separator = downloadUrl.includes('?') ? '&' : '?';
        finalUrl = `${downloadUrl}${separator}token=${encodeURIComponent(token)}&download=1`;
      }

      // 在新窗口中打开下载链接
      const newWindow = window.open(finalUrl, '_blank', 'noopener,noreferrer');

      if (!newWindow) {
        UI.Toast.warning('弹窗被阻止', '请允许弹窗后重试，或手动复制链接下载', 5000);

        // 提供复制链接的选项
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(finalUrl).then(() => {
            UI.Toast.info('链接已复制', '下载链接已复制到剪贴板', 3000);
          }).catch(() => {
            console.warn('复制到剪贴板失败');
          });
        }
      }

    } catch (error) {
      console.error('新窗口下载失败:', error);
      UI.Toast.error('下载失败', error.message || '打开下载链接时出错', 5000);
    }
  },

  /**
   * 查找文件项
   * @param {string} fileName - 文件名
   * @returns {HTMLElement|null} 文件项元素
   */
  findFileItemByName(fileName) {
    // 使用属性选择器直接查找匹配的文件项，避免遍历所有文件项
    return document.querySelector(`.file-item[data-name="${CSS.escape(fileName)}"]`);
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
              <button class="btn btn-primary copy-btn" id="copyLinkBtn">复制</button>
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

          // 添加复制功能
          const copyBtn = document.getElementById('copyLinkBtn');
          if (copyBtn) {
            copyBtn.addEventListener('click', () => {
              const linkInput = document.getElementById('shareLink');
              if (linkInput) {
                // 选中文本
                linkInput.select();
                linkInput.setSelectionRange(0, 99999); // 适用于移动设备

                // 复制文本
                try {
                  // 使用现代clipboard API
                  navigator.clipboard.writeText(linkInput.value)
                    .then(() => {
                      UI.Toast.success('复制成功', '分享链接已复制到剪贴板', 3000);
                    })
                    .catch(err => {
                      // 如果clipboard API不可用，使用传统方法
                      document.execCommand('copy');
                      UI.Toast.success('复制成功', '分享链接已复制到剪贴板', 3000);
                    });
                } catch (err) {
                  console.error('复制失败:', err);
                  UI.Toast.error('复制失败', '无法复制到剪贴板，请手动复制', 5000);
                }
              }
            });
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
            <button class="btn btn-primary copy-btn" id="copyLinkBtn">复制</button>
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

        // 添加复制功能
        const copyBtn = document.getElementById('copyLinkBtn');
        if (copyBtn) {
          copyBtn.addEventListener('click', () => {
            const linkInput = document.getElementById('shareLink');
            if (linkInput) {
              // 选中文本
              linkInput.select();
              linkInput.setSelectionRange(0, 99999); // 适用于移动设备

              // 复制文本
              try {
                // 使用现代clipboard API
                navigator.clipboard.writeText(linkInput.value)
                  .then(() => {
                    UI.Toast.success('复制成功', '批量分享链接已复制到剪贴板', 3000);
                  })
                  .catch(err => {
                    // 如果clipboard API不可用，使用传统方法
                    document.execCommand('copy');
                    UI.Toast.success('复制成功', '批量分享链接已复制到剪贴板', 3000);
                  });
              } catch (err) {
                console.error('复制失败:', err);
                UI.Toast.error('复制失败', '无法复制到剪贴板，请手动复制', 5000);
              }
            }
          });
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

          // 普通删除不更新存储空间信息，因为文件只是移动到回收站而非真正删除

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
          storageText.textContent = `${this.formatFileSize(usedCapacity)} / ${this.formatFileSize(totalCapacity)}`;
        }

        console.log('存储空间信息已更新');
      }
    } catch (error) {
      console.error('更新存储空间信息失败:', error);
    }
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

            const fileId = fileItem.dataset.id;
            if (!fileId) return Promise.reject(new Error(`无效的文件ID: ${fileName}`));
            return CloudAPI.deleteFile(fileId);
          });

          // 等待所有删除操作完成
          await Promise.all(deletePromises);

          // 隐藏加载通知
          UI.Toast.hide(loadingToastId);

          // 刷新文件列表
          this.refreshFiles();

          // 普通删除不更新存储空间信息，因为文件只是移动到回收站而非真正删除

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

    // 移除回收站页面的拖动上传功能
    this._removeDropEventListeners();

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
            // 根据用户保存的视图模式设置显示方式，保持与主页面一致
            this.fileList.style.display = localStorage.getItem('view') === 'list' ? 'flex' : 'grid';
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

          // 启用视图切换按钮
          this._enableViewToggleButtons();

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

            // 更新提示内容 - 移除上传按钮
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

          // 禁用视图切换按钮
          this._disableViewToggleButtons();

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
          this.fileList.className = 'file-list error-view';
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

        // 禁用视图切换按钮
        this._disableViewToggleButtons();

        // 显示错误提示
        UI.Toast.error('加载失败', error.message || '无法加载回收站内容', 8000, {
          group: 'trashOperations'
        });
      });
  },

  /**
   * 移除拖放事件监听器
   * @private
   */
  _removeDropEventListeners() {
    const dropTargets = [this.fileList, this.emptyFileList];
    dropTargets.forEach(target => {
      if (target) {
        target.removeEventListener('dragover', this._eventHandlers.dragOver);
        target.removeEventListener('dragenter', this._eventHandlers.dragEnter);
        target.removeEventListener('dragleave', this._eventHandlers.dragLeave);
        target.removeEventListener('drop', this._eventHandlers.drop);

        // 移除拖放样式类
        target.classList.remove('drag-over');
      }
    });
  },

  /**
   * 重新绑定拖放事件监听器
   * @private
   */
  _reattachDropEventListeners() {
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
      // 检查是否在回收站或共享页面，这些页面不允许上传
      const activeSection = document.querySelector('.nav-group li.active');
      if (activeSection) {
        const section = activeSection.dataset.section;
        if (section === 'trash' || section === 'shared') {
          UI.Toast.error('上传失败', '不能在回收站或共享页面上传文件', 3000);
          return;
        }
      }

      // 直接上传文件
      this.uploadDroppedFiles(files);
    }
  },



  /**
   * 上传拖拽的文件
   * @param {FileList} files - 文件列表
   */
  uploadDroppedFiles(files) {
    // 确保有文件需要上传
    if (!files || files.length === 0) {
      return;
    }

    // 动态导入上传管理器
    import('./upload-manager.js')
      .then(module => {
        const uploadManager = module.default;

        if (!uploadManager) {
          throw new Error('无法获取上传管理器实例');
        }

        // 显示上传进度条
        const uploadProgressContainer = document.getElementById('uploadProgress');
        if (uploadProgressContainer) {
          uploadProgressContainer.style.display = 'block';
        }

        // 获取当前路径
        const currentPath = this.currentPath || '/';

        // 创建FormData对象
        const formData = new FormData();
        formData.append('path', currentPath);

        // 处理每个文件上传
        const uploadIds = [];

        // 处理每个文件
        Array.from(files).forEach(file => {
          // 生成唯一ID
          const id = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
          uploadIds.push(id);

          // 添加文件到FormData - 使用'files'作为字段名，与后端多文件上传接口匹配
          formData.append('files', file);

          // 添加上传项到UI
          try {
            uploadManager.addUploadItem(id, file.name);
          } catch (err) {
            console.error('添加上传项失败:', err);
            UI.Toast.error('上传准备失败', `文件 ${file.name} 添加失败: ${err.message || '未知错误'}`, 5000);
          }
        });

        // 直接执行上传
        return uploadManager.performUpload(formData);
      })
      .then(result => {
        // 上传成功，不需要额外操作，uploadManager会处理UI更新
      })
      .catch(error => {
        UI.Toast.error('上传失败', error.message || '文件上传过程中发生错误', 5000);
      });
  },

  /**
   * 初始化右键菜单
   * @private
   */
  _initContextMenu() {
    // 创建右键菜单元素
    if (!document.getElementById('fileContextMenu')) {
      const contextMenu = document.createElement('div');
      contextMenu.id = 'fileContextMenu';
      contextMenu.className = 'context-menu';
      contextMenu.style.display = 'none';
      document.body.appendChild(contextMenu);

      // 使用事件委托处理菜单项点击，减少事件监听器数量
      contextMenu.addEventListener('click', (e) => {
        const menuItem = e.target.closest('.menu-item');
        if (!menuItem) return;

        const action = menuItem.dataset.action;
        const fileName = menuItem.dataset.file;
        const fileItem = document.querySelector(`.file-item[data-name="${CSS.escape(fileName)}"]`);

        if (action && fileName && fileItem) {
          this._handleContextMenuAction(action, fileName, fileItem);
          this._hideContextMenu();
        }
      });
    }

    // 为文档添加点击事件，点击其他区域时隐藏右键菜单
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#fileContextMenu')) {
        this._hideContextMenu();
      }
    });

    // 为文档添加右键菜单事件
    document.addEventListener('contextmenu', (e) => {
      const fileItem = e.target.closest('.file-item');
      if (fileItem) {
        e.preventDefault(); // 阻止默认的右键菜单
        this._showContextMenu(e, fileItem);
      }
    });

    // 为移动设备添加长按事件
    this._addLongPressHandler();
  },

  /**
   * 添加长按事件处理
   * @private
   */
  _addLongPressHandler() {
    let longPressTimer;
    let touchStartTarget = null;
    const longPressDuration = 500; // 长按时间（毫秒）

    // 触摸开始 - 使用passive: true提高性能
    document.addEventListener('touchstart', (e) => {
      const fileItem = e.target.closest('.file-item');
      if (!fileItem) return;

      touchStartTarget = fileItem;

      longPressTimer = setTimeout(() => {
        // 长按触发"右键菜单"
        if (touchStartTarget === fileItem) {
          this._showContextMenu(e, fileItem);
        }
      }, longPressDuration);
    }, { passive: true });

    // 触摸结束 - 使用passive: true提高性能
    document.addEventListener('touchend', () => {
      clearTimeout(longPressTimer);
      touchStartTarget = null;
    }, { passive: true });

    // 触摸移动 - 使用passive: true提高性能
    document.addEventListener('touchmove', () => {
      clearTimeout(longPressTimer);
      touchStartTarget = null;
    }, { passive: true });
  },

  /**
   * 显示右键菜单
   * @param {Event} e - 事件对象
   * @param {HTMLElement} fileItem - 文件项元素
   * @private
   */
  _showContextMenu(e, fileItem) {
    const contextMenu = document.getElementById('fileContextMenu');
    if (!contextMenu) return;

    // 获取文件信息
    const fileName = fileItem.getAttribute('data-name');
    const isTrash = fileItem.getAttribute('data-is-trash') === 'true';
    const isFolder = fileItem.classList.contains('folder');

    // 创建右键菜单内容
    let menuHTML = '';

    if (isTrash) {
      // 回收站文件菜单
      menuHTML = `
        <div class="menu-item" data-action="restore" data-file="${fileName}">
          <i class="fas fa-trash-restore"></i> 恢复
        </div>
        <div class="menu-item" data-action="delete-permanent" data-file="${fileName}">
          <i class="fas fa-trash-alt"></i> 永久删除
        </div>
      `;
    } else {
      // 普通文件菜单
      if (!isFolder) {
        menuHTML += `
          <div class="menu-item" data-action="download" data-file="${fileName}">
            <i class="fas fa-download"></i> 下载
          </div>
        `;
      }

      menuHTML += `
        <div class="menu-item" data-action="share" data-file="${fileName}">
          <i class="fas fa-share-alt"></i> 分享
        </div>
        <div class="menu-item" data-action="rename" data-file="${fileName}">
          <i class="fas fa-edit"></i> 重命名
        </div>
        <div class="menu-item" data-action="delete" data-file="${fileName}">
          <i class="fas fa-trash"></i> 删除
        </div>
      `;
    }

    // 更新菜单内容
    contextMenu.innerHTML = menuHTML;

    // 定位菜单 - 获取鼠标或触摸位置
    const posX = e.type.startsWith('touch') ?
      (e.touches[0] || e.changedTouches[0]).clientX : e.clientX;
    const posY = e.type.startsWith('touch') ?
      (e.touches[0] || e.changedTouches[0]).clientY : e.clientY;

    // 设置菜单位置
    contextMenu.style.left = `${posX}px`;
    contextMenu.style.top = `${posY}px`;

    // 显示菜单
    contextMenu.style.display = 'block';

    // 确保菜单不超出视口
    requestAnimationFrame(() => {
      const rect = contextMenu.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        contextMenu.style.left = `${posX - rect.width}px`;
      }
      if (rect.bottom > window.innerHeight) {
        contextMenu.style.top = `${posY - rect.height}px`;
      }
    });
  },

  /**
   * 隐藏右键菜单
   * @private
   */
  _hideContextMenu() {
    const contextMenu = document.getElementById('fileContextMenu');
    if (contextMenu) {
      contextMenu.style.display = 'none';
    }
  },

  /**
   * 处理右键菜单操作
   * @param {string} action - 操作类型
   * @param {string} fileName - 文件名
   * @param {HTMLElement} fileItem - 文件项元素
   * @private
   */
  _handleContextMenuAction(action, fileName, fileItem) {
    const fileId = fileItem.getAttribute('data-id');

    switch (action) {
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
}