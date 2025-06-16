/**
 * 云存储应用主入口
 * @module app
 */

import { CloudAPI } from './api/cloud-api.js';
import { UI } from './modules/ui.js';
import { FileManager } from './modules/file-manager.js';
import uploadManager from './modules/upload-manager.js';

// 环境检测
const IS_PRODUCTION = window.location.hostname !== 'localhost' && 
                      !window.location.hostname.includes('127.0.0.1') && 
                      !window.location.hostname.includes('.local');

// 日志工具
const Logger = {
  debug: (message, ...args) => {
    if (!IS_PRODUCTION) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
  info: (message, ...args) => {
    if (!IS_PRODUCTION) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  warn: (message, ...args) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error: (message, ...args) => {
    console.error(`[ERROR] ${message}`, ...args);
  }
};

/**
 * 应用程序类
 */
class CloudApp {
  /**
   * 构造函数
   */
  constructor() {
    // 应用状态
    this.initialized = false;
    this.createBtn = document.getElementById('createBtn');
    this.createMenu = document.getElementById('createMenu');
    this.fileInput = document.getElementById('fileInput');
    this.folderInput = document.getElementById('folderInput');
    this.logoutBtn = document.querySelector('.logout-btn');
  }
  
  /**
   * 初始化应用
   */
  async init() {
    Logger.info('初始化云存储应用...');
    
    try {
      // 检查登录状态
      const token = CloudAPI.getAuthToken();
      if (!token) {
        // 未登录，跳转到登录页面
        window.location.href = 'login.html';
        return;
      }
      
      // 显示页面加载指示器
      UI.Loader.showPageLoader();
      
      // 初始化UI组件
      UI.init();
      
      // 初始化文件管理器
      FileManager.init();
      
      // 初始化上传管理器
      uploadManager.init();
      
      // 绑定应用级事件
      this.bindEvents();
      
      // 加载用户信息
      await this.loadUserInfo();
      
      // 创建模态框
      this.createModals();
      
      // 应用初始化完成
      this.initialized = true;
      Logger.info('应用初始化完成');
      
      // 隐藏页面加载指示器
      setTimeout(() => UI.Loader.hidePageLoader(), 800);
    } catch (error) {
      Logger.error('应用初始化失败:', error);
      
      // 检查是否是认证错误
      if (error.status === 401 || error.code === 401) {
        // 清除认证令牌
        CloudAPI.clearAuthToken();
        
        // 跳转到登录页面
        window.location.href = 'login.html';
        return;
      }
      
      UI.Toast.show('error', '初始化失败', error.message || '发生未知错误');
      
      // 隐藏页面加载指示器
      UI.Loader.hidePageLoader();
    }
  }
  
  /**
   * 绑定应用级事件
   */
  bindEvents() {
    // 新建按钮点击事件
    if (this.createBtn) {
      this.createBtn.addEventListener('click', (e) => this.toggleCreateMenu(e));
    }
    
    // 文件选择变化事件
    if (this.fileInput) {
      this.fileInput.addEventListener('change', (e) => uploadManager.handleFileSelect(e));
    }
    
    if (this.folderInput) {
      this.folderInput.addEventListener('change', (e) => uploadManager.handleFileSelect(e));
    }
    
    // 新建菜单项点击事件
    document.querySelectorAll('.create-menu-item').forEach(item => {
      item.addEventListener('click', (e) => this.handleCreateAction(e));
    });
    
    // 点击文档其他地方关闭新建菜单
    document.addEventListener('click', (e) => {
      if (this.createMenu && !e.target.closest('#createBtn') && !e.target.closest('#createMenu')) {
        this.createMenu.style.display = 'none';
      }
    });
    
    // 登出按钮点击事件
    if (this.logoutBtn) {
      this.logoutBtn.addEventListener('click', () => this.handleLogout());
    }
    
    // 页面卸载前清理资源
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }
  
  /**
   * 切换新建菜单
   * @param {Event} e - 点击事件
   */
  toggleCreateMenu(e) {
    e.stopPropagation();
    if (this.createMenu) {
      this.createMenu.style.display = this.createMenu.style.display === 'none' ? 'block' : 'none';
    }
  }
  
  /**
   * 处理新建操作
   * @param {Event} e - 点击事件
   */
  handleCreateAction(e) {
    const action = e.currentTarget.dataset.action;
    if (this.createMenu) {
      this.createMenu.style.display = 'none';
    }
    
    switch(action) {
      case 'folder':
        this.createFolder();
        break;
      case 'text':
        this.createTextFile();
        break;
      case 'upload':
        if (this.fileInput) this.fileInput.click();
        break;
      case 'upload-folder':
        if (this.folderInput) this.folderInput.click();
        break;
    }
  }
  
  /**
   * 创建文件夹
   */
  createFolder() {
    // 显示创建文件夹模态框
    UI.Modal.show('folderModal', '<i class="fas fa-folder"></i> 新建文件夹', `
      <div class="form-group">
        <label for="folderName" class="form-label">文件夹名称</label>
        <input type="text" id="folderName" class="form-input" placeholder="请输入文件夹名称">
        <div class="form-hint">文件夹名称不能包含特殊字符 \\ / : * ? " < > |</div>
      </div>
    `, {
      onConfirm: async () => {
        const folderName = document.getElementById('folderName').value.trim();
        if (folderName) {
          try {
            // 显示加载指示器
            UI.Toast.show('info', '创建中', `正在创建文件夹 "${folderName}"...`);
            
            // 调用API创建文件夹
            await CloudAPI.createFolder(FileManager.currentPath, folderName);
            
            // 创建成功
            UI.Toast.show('success', '创建成功', `文件夹 "${folderName}" 已创建`);
            
            // 刷新文件列表
            FileManager.refreshFiles();
            
            // 关闭模态框
            UI.Modal.close('folderModal');
          } catch (error) {
            console.error('创建文件夹失败:', error);
            UI.Toast.show('error', '创建失败', error.message || '无法创建文件夹');
          }
        } else {
          UI.Toast.show('warning', '创建失败', '请输入文件夹名称');
        }
      }
    });
    
    // 聚焦到输入框
    setTimeout(() => {
      const input = document.getElementById('folderName');
      if (input) input.focus();
    }, 100);
  }
  
  /**
   * 创建文本文件
   */
  createTextFile() {
    // 显示创建文本文件模态框
    UI.Modal.show('textFileModal', '<i class="fas fa-file-alt"></i> 新建文本文档', `
      <div class="form-group">
        <label for="fileName" class="form-label">文件名称</label>
        <input type="text" id="fileName" class="form-input" placeholder="请输入文件名称">
        <div class="form-hint">文件名称不能包含特殊字符 \\ / : * ? " < > |</div>
      </div>
    `, {
      onConfirm: async () => {
        const fileName = document.getElementById('fileName').value.trim();
        if (fileName) {
          try {
            // 显示加载指示器
            UI.Toast.show('info', '创建中', `正在创建文件 "${fileName}"...`);
            
            // 调用API创建文本文件
            await CloudAPI.createTextFile(FileManager.currentPath, fileName);
            
            // 创建成功
            UI.Toast.show('success', '创建成功', `文件 "${fileName}" 已创建`);
            
            // 刷新文件列表
            FileManager.refreshFiles();
            
            // 关闭模态框
            UI.Modal.close('textFileModal');
          } catch (error) {
            console.error('创建文本文件失败:', error);
            UI.Toast.show('error', '创建失败', error.message || '无法创建文本文件');
          }
        } else {
          UI.Toast.show('warning', '创建失败', '请输入文件名称');
        }
      }
    });
    
    // 聚焦到输入框
    setTimeout(() => {
      const input = document.getElementById('fileName');
      if (input) input.focus();
    }, 100);
  }
  
  /**
   * 创建模态框
   */
  createModals() {
    // 无需手动创建模态框，使用UI.Modal动态创建
  }
  
  /**
   * 加载用户信息
   */
  async loadUserInfo() {
    try {
      // 获取用户信息
      const userInfo = await CloudAPI.getUserInfo();
      
      if (userInfo && userInfo.data) {
        // 更新用户信息
        const username = userInfo.data.username;
        const userRole = userInfo.data.role == 'ADMIN' ? '管理员' : '普通用户';
        const avatar = username.charAt(0).toUpperCase();
        
        // 更新桌面版用户信息
        const desktopUserInfo = document.querySelector('.user-info-area.desktop-only');
        if (desktopUserInfo) {
          desktopUserInfo.querySelector('.avatar span').textContent = avatar;
          desktopUserInfo.querySelector('.username').textContent = username;
          desktopUserInfo.querySelector('.user-role').textContent = userRole;
        }
        
        // 更新移动版用户信息
        const mobileUserInfo = document.querySelector('.user-info-area.mobile-only');
        if (mobileUserInfo) {
          mobileUserInfo.querySelector('.avatar span').textContent = avatar;
        }
        
        // 根据用户权限控制管理面板选项的显示
        const adminPanelItem = document.querySelector('[data-section="admin-panel"]');
        if (adminPanelItem) {
          if (userInfo.data.role == 'ADMIN') {
            // 如果是管理员，显示管理面板选项
            adminPanelItem.style.display = 'list-item';
          } else {
            // 如果不是管理员，隐藏管理面板选项
            adminPanelItem.style.display = 'none';
          }
        }
        
        // 获取用户云盘信息
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
            storageText.textContent = `${FileManager.formatFileSize(usedCapacity)} / ${FileManager.formatFileSize(totalCapacity)}`;
          }
        }
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
      throw error;
    }
  }
  
  /**
   * 处理登出
   */
  handleLogout() {
    UI.Modal.confirm('<i class="fas fa-sign-out-alt"></i> 退出登录', `
      <h3>确定要退出登录吗？</h3>
      <p>退出后需要重新登录才能访问您的文件</p>
    `, () => {
      // 清除认证令牌
      CloudAPI.clearAuthToken();
      
      // 显示提示
      UI.Toast.show('info', '退出成功', '您已成功退出登录');
      
      // 跳转到登录页面
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1000);
    });
  }
  
  /**
   * 清理应用资源
   */
  cleanup() {
    // 清理文件管理器
    if (FileManager && typeof FileManager.destroy === 'function') {
      FileManager.destroy();
    }
    
    // 清理上传管理器
    if (uploadManager && typeof uploadManager.destroy === 'function') {
      uploadManager.destroy();
    }
    
    if (UI) {
      // 清理UI模块资源
      if (UI.Toast && typeof UI.Toast.destroy === 'function') {
        UI.Toast.destroy();
      }
      
      if (UI.Modal && typeof UI.Modal.destroy === 'function') {
        UI.Modal.destroy();
      }
    }
    
    console.log('应用资源已清理');
  }
}

// 实例化应用并初始化
document.addEventListener('DOMContentLoaded', () => {
  const app = new CloudApp();
  app.init();
});

export default CloudApp; 