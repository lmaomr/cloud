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
    
    // 设置默认激活项
    const defaultActiveItem = document.querySelector('.nav-group li[data-section="my-files"]');
    if (defaultActiveItem) {
      this.setActiveNavItem('my-files');
    }
    
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
      // 在移动端，当侧边栏处于显示状态时，点击其他区域关闭侧边栏
      if (window.innerWidth <= 768 && 
          this.sidebar.classList.contains('active') && // 在移动端，active类表示侧边栏显示状态
          !e.target.closest('.sidebar') && 
          !e.target.closest('#sidebarToggle')) {
        this.hideSidebar();
      }
    });
    
    // 导航项点击事件
    this.navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // 防止事件冒泡
        
        const section = item.dataset.section;
        if (section) {
          console.log('导航项点击:', section);
          
          // 移动端点击导航项后关闭侧边栏
          if (window.innerWidth <= 768) {
            this.hideSidebar();
          }
          
          // 设置当前活动项
          this.setActiveNavItem(section);
          
          // 触发自定义事件以通知其他模块
          const event = new CustomEvent('section:change', { 
            detail: { section },
            bubbles: true,
            cancelable: true
          });
          
          console.log('触发部分切换事件:', section);
          document.dispatchEvent(event);
          
          // 确保事件被处理
          setTimeout(() => {
            // 检查是否有事件处理程序响应
            console.log('检查事件处理状态:', section);
          }, 100);
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
      // 移动端 - 在移动端，active类表示侧边栏显示状态
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
    
    if (window.innerWidth > 768) {
      // 电脑端 - 移除active类表示显示侧边栏
      this.sidebar.classList.remove('active');
      const sidebarWidth = getComputedStyle(this.sidebar).width;
      this.mainContent.style.marginLeft = sidebarWidth;
      this.sidebar.style.transform = 'translateX(0)';
    } else {
      // 移动端 - 添加active类表示显示侧边栏
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
      // 电脑端 - 添加active类表示隐藏侧边栏
      this.sidebar.classList.add('active');
      this.mainContent.style.marginLeft = '0';
      this.sidebar.style.transform = 'translateX(-100%)';
    } else {
      // 移动端 - 移除active类表示隐藏侧边栏
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
      // 在移动端，active类表示侧边栏显示状态
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
 * Toast通知管理器
 */
const ToastManager = {
  /**
   * 通知类型枚举
   */
  TYPE: {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    LOADING: 'loading'
  },
  
  /**
   * 通知优先级枚举
   */
  PRIORITY: {
    LOW: 0,
    NORMAL: 1,
    HIGH: 2,
    URGENT: 3
  },
  
  /**
   * 初始化Toast管理器
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
    
    // 存储活动的toast定时器
    this.activeToasts = new Map();
    
    // 存储当前显示的通知信息，用于防止重复
    this.currentToasts = new Set();
    
    // 通知队列
    this.queue = [];
    
    // 最大同时显示的通知数量
    this.maxVisibleToasts = 5;
    
    // 通知组
    this.groups = new Map();
    
    // 处理通知队列的定时器ID
    this.queueProcessorId = null;
    
    // 开始处理队列
    this.startQueueProcessor();
  },
  
  /**
   * 开始处理通知队列
   */
  startQueueProcessor() {
    if (this.queueProcessorId) return;
    
    this.queueProcessorId = setInterval(() => this.processQueue(), 300);
  },
  
  /**
   * 停止处理通知队列
   */
  stopQueueProcessor() {
    if (this.queueProcessorId) {
      clearInterval(this.queueProcessorId);
      this.queueProcessorId = null;
    }
  },
  
  /**
   * 处理通知队列
   */
  processQueue() {
    // 如果当前显示的通知数量已达上限，不处理队列
    if (this.activeToasts.size >= this.maxVisibleToasts) return;
    
    // 从队列中取出优先级最高的通知
    if (this.queue.length === 0) return;
    
    // 按优先级排序
    this.queue.sort((a, b) => b.priority - a.priority);
    
    // 取出第一个通知
    const nextToast = this.queue.shift();
    
    // 显示通知
    this._createToast(
      nextToast.type,
      nextToast.title,
      nextToast.message,
      nextToast.duration,
      nextToast.options
    );
  },
  
  /**
   * 显示通知
   * @param {string} type - 通知类型：success, error, warning, info, loading
   * @param {string} title - 通知标题
   * @param {string} message - 通知内容
   * @param {number} duration - 显示时间（毫秒），0表示不自动关闭
   * @param {Object} options - 额外选项
   * @returns {string} toast ID
   */
  show(type = this.TYPE.INFO, title = '', message = '', duration = 5000, options = {}) {
    // 确保容器存在
    if (!this.container) {
      this.init();
    }
    
    // 默认选项
    const defaultOptions = {
      priority: this.PRIORITY.NORMAL,
      group: null,
      onClose: null,
      actions: [],
      replaceGroup: true,
      queue: false
    };
    
    // 合并选项
    const mergedOptions = { ...defaultOptions, ...options };
    
    // 创建通知标识符
    const toastIdentifier = `${type}:${title}:${message}`;
    
    // 检查是否已有相同的通知
    if (this.currentToasts.has(toastIdentifier)) {
      console.log('防止重复通知:', toastIdentifier);
      return null;
    }
    
    // 处理通知组
    if (mergedOptions.group) {
      // 如果设置了替换组内通知
      if (mergedOptions.replaceGroup && this.groups.has(mergedOptions.group)) {
        // 关闭同组的其他通知
        const groupToasts = this.groups.get(mergedOptions.group);
        groupToasts.forEach(toastId => this.hide(toastId));
        
        // 清空组
        this.groups.set(mergedOptions.group, []);
      }
    }
    
    // 如果需要排队且当前显示的通知数量已达上限
    if (mergedOptions.queue && this.activeToasts.size >= this.maxVisibleToasts) {
      // 添加到队列
      this.queue.push({
        type,
        title,
        message,
        duration,
        options: mergedOptions,
        priority: mergedOptions.priority
      });
      
      return null;
    }
    
    // 直接创建并显示通知
    return this._createToast(type, title, message, duration, mergedOptions);
  },
  
  /**
   * 创建并显示通知
   * @private
   */
  _createToast(type, title, message, duration, options) {
    // 创建通知标识符
    const toastIdentifier = `${type}:${title}:${message}`;
    
    // 添加到当前通知集合
    this.currentToasts.add(toastIdentifier);
    
    // 创建toast元素
    const toast = document.createElement('div');
    const toastId = `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    toast.id = toastId;
    toast.className = `toast toast-${type}`;
    
    // 根据优先级添加类
    if (options.priority === this.PRIORITY.HIGH) {
      toast.classList.add('toast-high-priority');
    } else if (options.priority === this.PRIORITY.URGENT) {
      toast.classList.add('toast-urgent-priority');
    }
    
    // 根据类型设置图标
    let icon;
    switch(type) {
      case this.TYPE.SUCCESS: icon = 'fas fa-check-circle'; break;
      case this.TYPE.ERROR: icon = 'fas fa-exclamation-circle'; break;
      case this.TYPE.WARNING: icon = 'fas fa-exclamation-triangle'; break;
      case this.TYPE.LOADING: icon = 'fas fa-spinner fa-spin'; break;
      case this.TYPE.INFO:
      default: icon = 'fas fa-info-circle';
    }
    
    // 构建操作按钮HTML
    let actionsHtml = '';
    if (options.actions && options.actions.length > 0) {
      actionsHtml = `
        <div class="toast-actions">
          ${options.actions.map(action => 
            `<button class="toast-action-btn ${action.class || ''}" data-action="${action.id}">${action.text}</button>`
          ).join('')}
        </div>
      `;
    }
    
    // 设置内容
    toast.innerHTML = `
      <div class="toast-icon">
        <i class="${icon}"></i>
      </div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
        ${actionsHtml}
      </div>
      ${type !== this.TYPE.LOADING ? 
        `<button class="toast-close" aria-label="关闭通知">
          <i class="fas fa-times"></i>
        </button>` : ''}
    `;
    
    // 添加到容器
    this.container.appendChild(toast);
    
    // 添加关闭事件
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide(toastId));
    }
    
    // 添加操作按钮事件
    const actionBtns = toast.querySelectorAll('.toast-action-btn');
    actionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const actionId = btn.dataset.action;
        const action = options.actions.find(a => a.id === actionId);
        if (action && typeof action.onClick === 'function') {
          action.onClick(e);
        }
        
        // 如果设置了点击后关闭
        if (action && action.closeOnClick !== false) {
          this.hide(toastId);
        }
      });
    });
    
    // 自动关闭（如果duration > 0）
    let timeoutId = null;
    if (duration > 0 && type !== this.TYPE.LOADING) {
      timeoutId = setTimeout(() => this.hide(toastId), duration);
    }
    
    // 存储toast信息
    const toastInfo = { 
      toast, 
      timeoutId, 
      identifier: toastIdentifier,
      type,
      options
    };
    
    this.activeToasts.set(toastId, toastInfo);
    
    // 如果指定了组，将通知添加到组中
    if (options.group) {
      if (!this.groups.has(options.group)) {
        this.groups.set(options.group, []);
      }
      this.groups.get(options.group).push(toastId);
    }
    
    return toastId;
  },
  
  /**
   * 隐藏通知
   * @param {string} toastId - 通知ID
   */
  hide(toastId) {
    if (!this.activeToasts.has(toastId)) return;
    
    const { toast, timeoutId, identifier, options } = this.activeToasts.get(toastId);
    
    // 添加隐藏动画
    toast.classList.add('toast-hide');
    
    // 清除定时器
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // 从当前通知集合中移除
    if (identifier) {
      this.currentToasts.delete(identifier);
    }
    
    // 从组中移除
    if (options.group && this.groups.has(options.group)) {
      const groupToasts = this.groups.get(options.group);
      const index = groupToasts.indexOf(toastId);
      if (index !== -1) {
        groupToasts.splice(index, 1);
      }
    }
    
    // 执行关闭回调
    if (options.onClose && typeof options.onClose === 'function') {
      options.onClose();
    }
    
    // 从活动通知中移除
    this.activeToasts.delete(toastId);
    
    // 动画结束后移除元素
    const removeTimeout = setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      
      // 处理队列中的下一个通知
      this.processQueue();
    }, 300);
  },
  
  /**
   * 更新通知内容
   * @param {string} toastId - 通知ID
   * @param {Object} updates - 要更新的内容
   */
  update(toastId, updates = {}) {
    if (!this.activeToasts.has(toastId)) return;
    
    const { toast, type: oldType } = this.activeToasts.get(toastId);
    
    // 更新类型
    if (updates.type && updates.type !== oldType) {
      toast.classList.remove(`toast-${oldType}`);
      toast.classList.add(`toast-${updates.type}`);
      
      // 更新图标
      let icon;
      switch(updates.type) {
        case this.TYPE.SUCCESS: icon = 'fas fa-check-circle'; break;
        case this.TYPE.ERROR: icon = 'fas fa-exclamation-circle'; break;
        case this.TYPE.WARNING: icon = 'fas fa-exclamation-triangle'; break;
        case this.TYPE.LOADING: icon = 'fas fa-spinner fa-spin'; break;
        case this.TYPE.INFO:
        default: icon = 'fas fa-info-circle';
      }
      
      const iconElement = toast.querySelector('.toast-icon i');
      if (iconElement) {
        iconElement.className = icon;
      }
      
      // 更新存储的类型
      this.activeToasts.get(toastId).type = updates.type;
    }
    
    // 更新标题
    if (updates.title !== undefined) {
      const titleElement = toast.querySelector('.toast-title');
      if (titleElement) {
        titleElement.textContent = updates.title;
      }
    }
    
    // 更新消息
    if (updates.message !== undefined) {
      const messageElement = toast.querySelector('.toast-message');
      if (messageElement) {
        messageElement.textContent = updates.message;
      }
    }
    
    // 更新持续时间
    if (updates.duration !== undefined && updates.duration > 0) {
      const { timeoutId } = this.activeToasts.get(toastId);
      
      // 清除旧的定时器
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // 设置新的定时器
      const newTimeoutId = setTimeout(() => this.hide(toastId), updates.duration);
      this.activeToasts.get(toastId).timeoutId = newTimeoutId;
    }
  },
  
  /**
   * 显示成功通知
   * @param {string} title - 通知标题
   * @param {string} message - 通知内容
   * @param {number} duration - 显示时间（毫秒）
   * @param {Object} options - 额外选项
   * @returns {string} toast ID
   */
  success(title, message, duration = 5000, options = {}) {
    return this.show(this.TYPE.SUCCESS, title, message, duration, options);
  },
  
  /**
   * 显示错误通知
   * @param {string} title - 通知标题
   * @param {string} message - 通知内容
   * @param {number} duration - 显示时间（毫秒）
   * @param {Object} options - 额外选项
   * @returns {string} toast ID
   */
  error(title, message, duration = 8000, options = {}) {
    return this.show(this.TYPE.ERROR, title, message, duration, 
      { priority: this.PRIORITY.HIGH, ...options });
  },
  
  /**
   * 显示警告通知
   * @param {string} title - 通知标题
   * @param {string} message - 通知内容
   * @param {number} duration - 显示时间（毫秒）
   * @param {Object} options - 额外选项
   * @returns {string} toast ID
   */
  warning(title, message, duration = 7000, options = {}) {
    return this.show(this.TYPE.WARNING, title, message, duration, options);
  },
  
  /**
   * 显示信息通知
   * @param {string} title - 通知标题
   * @param {string} message - 通知内容
   * @param {number} duration - 显示时间（毫秒）
   * @param {Object} options - 额外选项
   * @returns {string} toast ID
   */
  info(title, message, duration = 5000, options = {}) {
    return this.show(this.TYPE.INFO, title, message, duration, options);
  },
  
  /**
   * 显示加载通知
   * @param {string} title - 通知标题
   * @param {string} message - 通知内容
   * @param {Object} options - 额外选项
   * @returns {string} toast ID
   */
  loading(title, message, options = {}) {
    return this.show(this.TYPE.LOADING, title, message, 0, options);
  },
  
  /**
   * 显示操作通知（带确认和取消按钮）
   * @param {string} title - 通知标题
   * @param {string} message - 通知内容
   * @param {Function} onConfirm - 确认回调
   * @param {Function} onCancel - 取消回调
   * @param {number} duration - 显示时间（毫秒）
   * @param {Object} options - 额外选项
   * @returns {string} toast ID
   */
  action(title, message, onConfirm, onCancel, duration = 10000, options = {}) {
    const actions = [
      {
        id: 'confirm',
        text: '确认',
        class: 'toast-confirm-btn',
        onClick: onConfirm
      },
      {
        id: 'cancel',
        text: '取消',
        class: 'toast-cancel-btn',
        onClick: onCancel
      }
    ];
    
    return this.show(this.TYPE.INFO, title, message, duration, {
      actions,
      priority: this.PRIORITY.HIGH,
      ...options
    });
  },
  
  /**
   * 清除所有通知
   */
  clearAll() {
    // 清除所有定时器
    this.activeToasts.forEach(({ timeoutId, toast }) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // 立即移除元素
      if (toast && toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    });
    
    // 清空队列
    this.queue = [];
    
    // 清空Map和Set
    this.activeToasts.clear();
    this.currentToasts.clear();
    this.groups.clear();
    
    // 清空容器
    if (this.container) {
      this.container.innerHTML = '';
    }
  },
  
  /**
   * 清除特定组的通知
   * @param {string} groupName - 组名
   */
  clearGroup(groupName) {
    if (!this.groups.has(groupName)) return;
    
    // 获取组内所有通知ID
    const toastIds = [...this.groups.get(groupName)];
    
    // 隐藏所有通知
    toastIds.forEach(id => this.hide(id));
    
    // 清空组
    this.groups.set(groupName, []);
  },
  
  /**
   * 销毁Toast管理器
   */
  destroy() {
    // 清除所有通知
    this.clearAll();
    
    // 停止队列处理器
    this.stopQueueProcessor();
    
    // 移除容器
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    this.container = null;
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
    
    const modal = this.show(id, title, content, {
      onConfirm: () => {
        // 执行确认回调
        if (typeof onConfirm === 'function') {
          onConfirm();
        }
        // 关闭弹框
        this.close(id);
      },
      onCancel,
      confirmText: '确认',
      cancelText: '取消',
      modalClass: 'confirm-modal'
    });
    
    return modal;
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