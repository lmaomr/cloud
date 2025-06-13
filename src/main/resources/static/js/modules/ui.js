/**
 * UI模块 - 处理界面交互和元素操作
 * @module ui
 */

/**
 * 侧边栏管理对象
 */
const SidebarManager = {
  /**
   * 初始化侧边栏
   */
  init() {
    this.sidebar = document.getElementById('sidebar');
    this.mainContent = document.querySelector('.main-content');
    this.sidebarToggle = document.getElementById('sidebarToggle');
    this.navItems = document.querySelectorAll('.nav-group li');
    
    // 根据屏幕尺寸设置侧边栏初始状态
    this.handleResize();
    
    // 绑定侧边栏切换按钮事件
    this.bindEvents();
    
    console.log('侧边栏初始化完成');
  },
  
  /**
   * 绑定侧边栏相关事件
   */
  bindEvents() {
    // 确保元素存在
    if (!this.sidebarToggle || !this.sidebar) {
      console.error('侧边栏元素未找到，无法绑定事件');
      return;
    }
    
    // 侧边栏切换按钮点击事件
    this.sidebarToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleSidebar();
    });
    
    // 点击页面其他区域关闭侧边栏（移动端）
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && 
          this.sidebar.classList.contains('active') &&
          !e.target.closest('.sidebar') && 
          !e.target.closest('#sidebarToggle')) {
        this.hideSidebar();
      }
    });
    
    // 导航项点击事件
    this.navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        if (section) {
          // 移动端点击导航项后关闭侧边栏
          if (window.innerWidth <= 768) {
            this.hideSidebar();
          }
          this.setActiveNavItem(section);
          // 触发自定义事件以通知其他模块
          document.dispatchEvent(new CustomEvent('section:change', { detail: { section } }));
        }
      });
    });
    
    // 窗口大小变化事件
    window.addEventListener('resize', () => this.handleResize());
    
    // 添加键盘快捷键 - Ctrl+Shift+T 触发侧边栏
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        console.log('侧边栏快捷键触发');
        this.toggleSidebar();
      }
    });
  },
  
  /**
   * 切换侧边栏显示状态
   */
  toggleSidebar() {
    if (!this.sidebar || !this.mainContent) return;
    
    console.log('切换侧边栏状态');
    this.sidebar.classList.toggle('active');
    
    if (window.innerWidth > 768) {
      // 电脑端
      if (this.sidebar.classList.contains('active')) {
        // 侧边栏收起
        this.mainContent.style.marginLeft = '0';
        this.sidebar.style.transform = 'translateX(-100%)';
      } else {
        // 侧边栏展开
        const sidebarWidth = getComputedStyle(this.sidebar).width;
        this.mainContent.style.marginLeft = sidebarWidth;
        this.sidebar.style.transform = 'translateX(0)';
      }
    } else {
      // 移动端
      this.sidebar.style.transform = this.sidebar.classList.contains('active') 
        ? 'translateX(0)' 
        : 'translateX(-100%)';
    }
  },
  
  /**
   * 显示侧边栏
   */
  showSidebar() {
    if (!this.sidebar || !this.mainContent) return;
    
    this.sidebar.classList.remove('active');
    
    if (window.innerWidth > 768) {
      const sidebarWidth = getComputedStyle(this.sidebar).width;
      this.mainContent.style.marginLeft = sidebarWidth;
      this.sidebar.style.transform = 'translateX(0)';
    } else {
      this.sidebar.classList.add('active');
      this.sidebar.style.transform = 'translateX(0)';
    }
  },
  
  /**
   * 隐藏侧边栏
   */
  hideSidebar() {
    if (!this.sidebar || !this.mainContent) return;
    
    if (window.innerWidth > 768) {
      this.sidebar.classList.add('active');
      this.mainContent.style.marginLeft = '0';
      this.sidebar.style.transform = 'translateX(-100%)';
    } else {
      this.sidebar.classList.remove('active');
      this.sidebar.style.transform = 'translateX(-100%)';
    }
  },
  
  /**
   * 处理窗口大小变化
   */
  handleResize() {
    if (!this.sidebar || !this.mainContent) return;
    
    if (window.innerWidth > 768) {
      // 电脑端
      if (this.sidebar.classList.contains('active')) {
        // 侧边栏收起状态
        this.mainContent.style.marginLeft = '0';
        this.sidebar.style.transform = 'translateX(-100%)';
      } else {
        // 侧边栏展开状态
        const sidebarWidth = getComputedStyle(this.sidebar).width;
        this.mainContent.style.marginLeft = sidebarWidth;
        this.sidebar.style.transform = 'translateX(0)';
      }
    } else {
      // 移动端
      this.mainContent.style.marginLeft = '0';
      this.sidebar.style.transform = this.sidebar.classList.contains('active') 
        ? 'translateX(0)' 
        : 'translateX(-100%)';
    }
  },
  
  /**
   * 设置激活的导航项
   * @param {string} section - 要激活的部分ID
   */
  setActiveNavItem(section) {
    this.navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.section === section);
    });
  }
};

/**
 * 主题管理对象
 */
const ThemeManager = {
  /**
   * 初始化主题管理
   */
  init() {
    this.themeToggle = document.querySelector('.theme-toggle');
    this.darkMode = localStorage.getItem('darkMode') === 'true';
    
    // 应用保存的主题
    this.applyTheme();
    
    // 绑定事件
    if (this.themeToggle) {
      this.themeToggle.addEventListener('click', () => this.toggleDarkMode());
    }
  },
  
  /**
   * 切换暗黑模式
   */
  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    this.applyTheme();
    
    // 保存用户偏好
    localStorage.setItem('darkMode', this.darkMode);
    
    // 触发主题变更事件
    document.dispatchEvent(new CustomEvent('theme:change', { 
      detail: { darkMode: this.darkMode } 
    }));
  },
  
  /**
   * 应用当前主题
   */
  applyTheme() {
    document.body.classList.toggle('dark-mode', this.darkMode);
    
    // 更新图标
    if (this.themeToggle) {
      const icon = this.themeToggle.querySelector('i');
      if (icon) {
        if (this.darkMode) {
          icon.classList.replace('fa-moon', 'fa-sun');
        } else {
          icon.classList.replace('fa-sun', 'fa-moon');
        }
      }
    }
  }
};

/**
 * Toast通知系统
 */
const ToastManager = {
  /**
   * 初始化Toast通知系统
   */
  init() {
    this.container = document.getElementById('toastContainer');
    
    // 如果容器不存在则创建
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toastContainer';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  
  /**
   * 显示通知
   * @param {string} type - 通知类型：success, error, warning, info
   * @param {string} title - 通知标题
   * @param {string} message - 通知内容
   * @param {number} duration - 显示时长(毫秒)
   */
  show(type = 'info', title = '', message = '', duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon;
    switch(type) {
      case 'success': icon = 'fas fa-check-circle'; break;
      case 'error': icon = 'fas fa-exclamation-circle'; break;
      case 'warning': icon = 'fas fa-exclamation-triangle'; break;
      case 'info':
      default: icon = 'fas fa-info-circle';
    }
    
    toast.innerHTML = `
      <div class="toast-icon">
        <i class="${icon}"></i>
      </div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    // 添加到容器
    this.container.appendChild(toast);
    
    // 添加关闭事件
    toast.querySelector('.toast-close').addEventListener('click', () => {
      this.hideToast(toast);
    });
    
    // 自动关闭
    if (duration > 0) {
      setTimeout(() => this.hideToast(toast), duration);
    }
    
    return toast;
  },
  
  /**
   * 隐藏并移除Toast
   * @param {HTMLElement} toast - Toast元素
   */
  hideToast(toast) {
    toast.classList.add('toast-hide');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }
};

/**
 * 模态框管理器
 */
const ModalManager = {
  /**
   * 显示模态框
   * @param {string} id - 模态框ID
   * @param {string} title - 模态框标题
   * @param {string} content - 模态框内容HTML
   * @param {Object} options - 配置选项
   * @returns {HTMLElement} 模态框元素
   */
  show(id, title, content, options = {}) {
    // 移除同ID模态框
    this.close(id);
    
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = id;
    
    // 默认选项
    const defaultOptions = {
      showClose: true,
      confirmText: '确定',
      cancelText: '取消',
      confirmClass: 'btn-submit',
      cancelClass: 'btn-cancel',
      onConfirm: null,
      onCancel: null,
      showFooter: true,
      modalClass: ''
    };
    
    // 合并选项
    const mergedOptions = { ...defaultOptions, ...options };
    
    // 构建模态框HTML
    modal.innerHTML = `
      <div class="modal ${mergedOptions.modalClass}">
        <div class="modal-header">
          <div class="modal-title">
            ${title}
          </div>
          ${mergedOptions.showClose ? '<button class="modal-close" data-dismiss="modal"><i class="fas fa-times"></i></button>' : ''}
        </div>
        <div class="modal-body">
          ${content}
        </div>
        ${mergedOptions.showFooter ? `
        <div class="modal-footer">
          <button class="btn ${mergedOptions.cancelClass}" data-dismiss="modal">${mergedOptions.cancelText}</button>
          <button class="btn ${mergedOptions.confirmClass}" id="${id}-confirm">${mergedOptions.confirmText}</button>
        </div>
        ` : ''}
      </div>
    `;
    
    // 添加到文档
    document.body.appendChild(modal);
    
    // 显示模态框
    setTimeout(() => modal.classList.add('show'), 10);
    
    // 绑定事件
    const closeButtons = modal.querySelectorAll('[data-dismiss="modal"]');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (typeof mergedOptions.onCancel === 'function') {
          mergedOptions.onCancel();
        }
        this.close(id);
      });
    });
    
    // 确认按钮
    const confirmBtn = document.getElementById(`${id}-confirm`);
    if (confirmBtn && typeof mergedOptions.onConfirm === 'function') {
      confirmBtn.addEventListener('click', mergedOptions.onConfirm);
    }
    
    return modal;
  },
  
  /**
   * 关闭模态框
   * @param {string} id - 模态框ID
   */
  close(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('show');
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 300);
    }
  },
  
  /**
   * 显示确认对话框
   * @param {string} title - 对话框标题
   * @param {string} message - 对话框消息
   * @param {Function} onConfirm - 确认回调
   * @param {Function} onCancel - 取消回调
   * @returns {HTMLElement} 模态框元素
   */
  confirm(title, message, onConfirm, onCancel) {
    const id = 'confirm-modal-' + Date.now();
    const content = `
      <div class="modal-icon">
        <i class="fas fa-question-circle"></i>
      </div>
      <div class="modal-message">
        ${message}
      </div>
    `;
    
    return this.show(id, title, content, {
      onConfirm,
      onCancel,
      confirmText: '确认',
      cancelText: '取消',
      modalClass: 'confirm-modal'
    });
  }
};

/**
 * 加载器管理
 */
const LoaderManager = {
  /**
   * 初始化加载器
   */
  init() {
    this.pageLoader = document.getElementById('pageLoader');
    this.contentLoader = null;
  },
  
  /**
   * 显示页面加载器
   */
  showPageLoader() {
    if (this.pageLoader) {
      this.pageLoader.classList.remove('hidden');
      this.pageLoader.style.display = 'block';
    }
  },
  
  /**
   * 隐藏页面加载器
   */
  hidePageLoader() {
    if (this.pageLoader) {
      this.pageLoader.classList.add('hidden');
      setTimeout(() => {
        this.pageLoader.style.display = 'none';
      }, 500);
    }
  },
  
  /**
   * 显示内容加载器
   * @param {string} containerId - 容器ID
   */
  showContentLoader(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // 创建加载器
    this.contentLoader = document.createElement('div');
    this.contentLoader.id = 'content-loader';
    this.contentLoader.className = 'content-loader';
    this.contentLoader.innerHTML = '<div class="loader-spinner"></div>';
    
    // 添加到容器
    container.appendChild(this.contentLoader);
  },
  
  /**
   * 隐藏内容加载器
   */
  hideContentLoader() {
    if (this.contentLoader && this.contentLoader.parentNode) {
      this.contentLoader.parentNode.removeChild(this.contentLoader);
      this.contentLoader = null;
    }
  }
};

/**
 * 搜索功能管理
 */
const SearchManager = {
  /**
   * 初始化搜索功能
   */
  init() {
    this.searchBox = document.querySelector('.search-box');
    this.searchIcon = this.searchBox ? this.searchBox.querySelector('i') : null;
    this.searchInput = this.searchBox ? this.searchBox.querySelector('input') : null;
    
    this.bindEvents();
  },
  
  /**
   * 绑定搜索相关事件
   */
  bindEvents() {
    if (!this.searchBox || !this.searchIcon || !this.searchInput) {
      console.error('搜索框元素未找到，无法绑定事件');
      return;
    }
    
    // 搜索图标点击事件
    this.searchIcon.addEventListener('click', () => {
      if (this.searchBox.classList.contains('expanded') && this.searchInput.value.trim() !== '') {
        // 如果搜索框已展开且有内容，执行搜索
        this.performSearch();
      } else {
        // 否则切换搜索框状态
        this.toggleSearch();
      }
    });
    
    // 搜索框失去焦点事件
    this.searchInput.addEventListener('blur', () => {
      if (this.searchInput.value.trim() === '') {
        // 延迟收缩，确保点击事件先处理
        setTimeout(() => {
          this.searchBox.classList.remove('expanded');
        }, 150);
      }
    });
    
    // 搜索框键盘事件
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.searchInput.value = '';
        this.searchInput.blur();
        // 延迟收缩，确保动画流畅
        setTimeout(() => {
          this.searchBox.classList.remove('expanded');
        }, 50);
      } else if (e.key === 'Enter') {
        this.performSearch();
      }
    });
    
    // 全局快捷键 - 按下 / 开始搜索
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && 
          document.activeElement !== this.searchInput) {
        e.preventDefault();
        this.toggleSearch(true);
      }
    });
  },
  
  /**
   * 切换搜索框状态
   * @param {boolean} [expand=null] - 强制展开状态
   */
  toggleSearch(expand = null) {
    if (!this.searchBox) return;
    
    const shouldExpand = expand !== null ? expand : !this.searchBox.classList.contains('expanded');
    
    if (shouldExpand) {
      this.searchBox.classList.add('expanded');
      setTimeout(() => {
        this.searchInput.focus();
      }, 50);
    } else {
      if (this.searchInput.value.trim() === '') {
        this.searchBox.classList.remove('expanded');
      }
    }
  },
  
  /**
   * 执行搜索
   */
  performSearch() {
    const query = this.searchInput.value.trim();
    if (!query) return;
    
    console.log('执行搜索:', query);
    // 触发搜索事件
    document.dispatchEvent(new CustomEvent('search:perform', { 
      detail: { query } 
    }));
  }
};

/**
 * 导出UI模块
 */
export const UI = {
  Sidebar: SidebarManager,
  Theme: ThemeManager,
  Toast: ToastManager,
  Modal: ModalManager,
  Loader: LoaderManager,
  Search: SearchManager,
  
  /**
   * 初始化所有UI组件
   */
  init() {
    this.Sidebar.init();
    this.Theme.init();
    this.Toast.init();
    this.Loader.init();
    this.Search.init();
    
    console.log('UI模块初始化完成');
  }
};

export default UI; 