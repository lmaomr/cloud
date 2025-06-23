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
    
    // 用户信息面板相关元素
    this.userProfilePanel = document.getElementById('userProfilePanel');
    this.closeUserProfileBtn = document.getElementById('closeUserProfileBtn');
    this.changePasswordBtn = document.getElementById('changePasswordBtn');
    this.logoutBtnProfile = document.getElementById('logoutBtnProfile');
    this.desktopUserInfo = document.querySelector('.user-info-area.desktop-only');
    this.mobileUserInfo = document.querySelector('.user-info-area.mobile-only');
    
    // 用户数据
    this.userData = null;
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
      
      // 从localStorage读取当前选中的部分并加载相应内容
      const activeSection = localStorage.getItem('activeSection') || 'my-files';
      
      // 触发部分切换事件以加载正确的内容
      document.dispatchEvent(new CustomEvent('section:change', { 
        detail: { section: activeSection },
        bubbles: true,
        cancelable: true
      }));
      
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
      this.fileInput.addEventListener('click', (e) => e.stopPropagation());
      this.fileInput.addEventListener('change', (e) => uploadManager.handleFileSelect(e));
    }
    
    if (this.folderInput) {
      this.folderInput.addEventListener('click', (e) => e.stopPropagation());
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
    
    // 用户信息区域点击事件 - 桌面版
    if (this.desktopUserInfo) {
      this.desktopUserInfo.addEventListener('click', (e) => {
        // 如果点击的是登出按钮，则不显示用户信息面板
        if (!e.target.closest('.logout-btn')) {
          this.showUserProfilePanel();
        }
      });
    }
    
    // 用户信息区域点击事件 - 移动版
    if (this.mobileUserInfo) {
      this.mobileUserInfo.addEventListener('click', () => {
        this.showUserProfilePanel();
      });
    }
    
    // 关闭用户信息面板按钮点击事件
    if (this.closeUserProfileBtn) {
      this.closeUserProfileBtn.addEventListener('click', () => {
        this.hideUserProfilePanel();
      });
    }
    
    // 用户信息面板中的登出按钮点击事件
    if (this.logoutBtnProfile) {
      this.logoutBtnProfile.addEventListener('click', () => {
        this.handleLogout();
      });
    }
    
    // 修改密码按钮点击事件
    if (this.changePasswordBtn) {
      this.changePasswordBtn.addEventListener('click', () => {
        this.showChangePasswordModal();
      });
    }
    
    // 修改头像按钮点击事件
    const editAvatarBtn = document.getElementById('editAvatarBtn');
    if (editAvatarBtn) {
      editAvatarBtn.addEventListener('click', () => {
        this.showUploadAvatarModal();
      });
    }
    
    // 修改昵称按钮点击事件
    const editNicknameBtn = document.getElementById('editNicknameBtn');
    if (editNicknameBtn) {
      editNicknameBtn.addEventListener('click', () => {
        this.showEditNicknameModal();
      });
    }
    
    // 点击用户信息面板外部关闭面板
    document.addEventListener('click', (e) => {
      if (this.userProfilePanel && 
          this.userProfilePanel.classList.contains('active') && 
          !e.target.closest('#userProfilePanel') && 
          !e.target.closest('.user-info-area') &&
          !e.target.closest('.modal') && // 不关闭模态框内的点击
          !e.target.closest('.modal-overlay')) { // 不关闭模态框遮罩的点击
        this.hideUserProfilePanel();
      }
    });
    
    // 按ESC键关闭用户信息面板
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && 
          this.userProfilePanel && 
          this.userProfilePanel.classList.contains('active')) {
        this.hideUserProfilePanel();
      }
    });
    
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
        // 保存用户数据
        this.userData = userInfo.data;
        
        // 更新用户信息
        const nickname = userInfo.data.nickname;
        const userRole = userInfo.data.role == 'ADMIN' ? '管理员' : '普通用户';
        const email = userInfo.data.email || '未设置邮箱';
        const avatar = nickname.charAt(0).toUpperCase();
        
        // 格式化注册时间
        let registerTime = '未知';
        if (userInfo.data.createTime) {
          const date = new Date(userInfo.data.createTime);
          registerTime = date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
        }

        // 更新桌面版用户信息
        const desktopUserInfo = document.querySelector('.user-info-area.desktop-only');
        if (desktopUserInfo) {
          desktopUserInfo.querySelector('.avatar span').textContent = avatar;
          desktopUserInfo.querySelector('.nickname').textContent = nickname;
          desktopUserInfo.querySelector('.user-role').textContent = userRole;
        }
        
        // 更新移动版用户信息
        const mobileUserInfo = document.querySelector('.user-info-area.mobile-only');
        if (mobileUserInfo) {
          mobileUserInfo.querySelector('.avatar span').textContent = avatar;
        }
        
        // 更新用户信息面板
        if (this.userProfilePanel) {
          document.getElementById('userAvatarLarge').textContent = avatar;
          document.getElementById('profileNickname').textContent = nickname;
          document.getElementById('profileEmail').textContent = email;
          document.getElementById('profileRole').textContent = userRole;
          document.getElementById('profileRegisterTime').textContent = registerTime;
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
        const cloudInfo = await CloudAPI.getUserCloud(this.userData.username);
        
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
   * 显示用户信息面板
   */
  showUserProfilePanel() {
    if (this.userProfilePanel) {
      this.userProfilePanel.classList.add('active');
    }
  }
  
  /**
   * 隐藏用户信息面板
   */
  hideUserProfilePanel() {
    if (this.userProfilePanel) {
      this.userProfilePanel.classList.remove('active');
    }
  }
  
  /**
   * 显示修改密码模态框
   */
  showChangePasswordModal() {
    // 阻止事件冒泡，防止触发关闭侧边栏
    const modalElement = UI.Modal.show('changePasswordModal', '<i class="fas fa-key"></i> 修改密码', `
      <div class="password-form">
        <div class="form-group">
          <label for="currentPassword" class="form-label">当前密码</label>
          <input type="password" id="currentPassword" class="form-input" placeholder="请输入当前密码">
        </div>
        <div class="form-group">
          <label for="newPassword" class="form-label">新密码</label>
          <input type="password" id="newPassword" class="form-input" placeholder="请输入新密码">
        </div>
        <div class="form-group">
          <label for="confirmPassword" class="form-label">确认新密码</label>
          <input type="password" id="confirmPassword" class="form-input" placeholder="请再次输入新密码">
        </div>
      </div>
    `, {
      onConfirm: async () => {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // 验证输入
        if (!currentPassword || !newPassword || !confirmPassword) {
          UI.Toast.show('warning', '修改失败', '请填写所有密码字段');
          return;
        }
        
        if (newPassword !== confirmPassword) {
          UI.Toast.show('warning', '修改失败', '两次输入的新密码不一致');
          return;
        }
        
        try {
          // 显示加载指示器
          const loadingToastId = UI.Toast.loading('处理中', '正在修改密码...');
          
          // 调用API修改密码
          await CloudAPI.changePassword(currentPassword, newPassword);
          
          // 隐藏加载通知
          if (loadingToastId) {
            UI.Toast.hide(loadingToastId);
          }
          
          // 修改成功
          UI.Toast.success('修改成功', '密码已成功修改');
          
          // 关闭模态框
          UI.Modal.close('changePasswordModal');
        } catch (error) {
          // 隐藏可能存在的加载通知
          const loadingToasts = document.querySelectorAll('.toast-loading');
          loadingToasts.forEach(toast => {
            const toastId = toast.id;
            if (toastId) {
              UI.Toast.hide(toastId);
            }
          });
          
          console.error('修改密码失败:', error);
          UI.Toast.error('修改失败', error.message || '无法修改密码');
        }
      },
      // 取消时不关闭侧边栏
      onCancel: () => {
        // 仅关闭模态框，不做其他操作
      }
    });
    
    // 为模态框添加点击事件，阻止冒泡
    if (modalElement) {
      modalElement.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
    
    // 聚焦到当前密码输入框
    setTimeout(() => {
      const input = document.getElementById('currentPassword');
      if (input) input.focus();
    }, 100);
  }
  
  /**
   * 显示上传头像模态框
   */
  showUploadAvatarModal() {
    // 创建一个隐藏的文件输入框
    const avatarInput = document.createElement('input');
    avatarInput.type = 'file';
    avatarInput.accept = 'image/*'; // 只接受图片文件
    avatarInput.style.display = 'none';
    document.body.appendChild(avatarInput);
    
    // 显示模态框
    UI.Modal.show('uploadAvatarModal', '<i class="fas fa-camera"></i> 上传头像', `
      <div class="upload-avatar-form">
        <div class="form-group">
          <p>请选择一张图片作为您的头像</p>
          <p class="form-hint">支持 jpg, jpeg, png 格式，大小不超过 2MB</p>
        </div>
        <div class="form-group text-center">
          <button id="selectAvatarBtn" class="btn btn-secondary">
            <i class="fas fa-file-image"></i> 选择图片
          </button>
          <div id="selectedAvatarPreview" class="avatar-preview" style="display: none; margin-top: 15px;">
            <img id="avatarPreviewImg" src="#" alt="头像预览" style="max-width: 100%; max-height: 200px; border-radius: 5px;">
            <div style="margin-top: 10px;" id="selectedFileName"></div>
          </div>
        </div>
      </div>
    `, {
      onConfirm: async () => {
        // 检查是否已选择文件
        if (!avatarInput.files || avatarInput.files.length === 0) {
          UI.Toast.warning('请选择图片', '请先选择一张图片作为头像');
          return;
        }
        
        const avatarFile = avatarInput.files[0];
        
        // 文件类型验证
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!validTypes.includes(avatarFile.type)) {
          UI.Toast.warning('文件类型错误', '请选择 jpg, jpeg 或 png 格式的图片');
          return;
        }
        
        // 文件大小验证（最大2MB）
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (avatarFile.size > maxSize) {
          UI.Toast.warning('文件过大', '头像图片大小不能超过 2MB');
          return;
        }
        
        try {
          // 显示上传中状态
          const loadingToastId = UI.Toast.loading('上传中', '正在上传头像...');
          
          // 调用API上传头像
          await CloudAPI.uploadAvatar(avatarFile);
          
          // 隐藏加载通知
          if (loadingToastId) {
            UI.Toast.hide(loadingToastId);
          }
          
          // 关闭模态框
          UI.Modal.close('uploadAvatarModal');
          
          // 重新加载用户信息以更新头像
          await this.loadUserInfo();
          
          // 显示成功通知
          UI.Toast.success('上传成功', '头像已成功更新');
        } catch (error) {
          // 隐藏可能存在的加载通知
          const loadingToasts = document.querySelectorAll('.toast-loading');
          loadingToasts.forEach(toast => {
            const toastId = toast.id;
            if (toastId) {
              UI.Toast.hide(toastId);
            }
          });
          
          console.error('上传头像失败:', error);
          UI.Toast.error('上传失败', error.message || '无法上传头像');
        } finally {
          // 删除临时文件输入框
          document.body.removeChild(avatarInput);
        }
      },
      onCancel: () => {
        // 删除临时文件输入框
        document.body.removeChild(avatarInput);
      }
    });
    
    // 为"选择图片"按钮添加事件
    const selectAvatarBtn = document.getElementById('selectAvatarBtn');
    if (selectAvatarBtn) {
      selectAvatarBtn.addEventListener('click', () => {
        avatarInput.click();
      });
    }
    
    // 监听文件选择变化
    avatarInput.addEventListener('change', () => {
      if (avatarInput.files && avatarInput.files.length > 0) {
        const file = avatarInput.files[0];
        const preview = document.getElementById('selectedAvatarPreview');
        const previewImg = document.getElementById('avatarPreviewImg');
        const fileNameDisplay = document.getElementById('selectedFileName');
        
        // 显示预览
        preview.style.display = 'block';
        previewImg.src = URL.createObjectURL(file);
        fileNameDisplay.textContent = `已选择: ${file.name} (${this.formatFileSize(file.size)})`;
      }
    });
  }
  
  /**
   * 显示修改昵称模态框
   */
  showEditNicknameModal() {
    UI.Modal.show('editNicknameModal', '<i class="fas fa-edit"></i> 修改昵称', `
      <div class="edit-nickname-form">
        <div class="form-group">
          <label for="newNickname" class="form-label">新昵称</label>
          <input type="text" id="newNickname" class="form-input" placeholder="请输入新昵称" value="${this.userData?.nickname || ''}">
          <p class="form-hint">昵称长度为2-20个字符，支持字母、数字、下划线</p>
        </div>
      </div>
    `, {
      onConfirm: async () => {
        const newNickname = document.getElementById('newNickname').value.trim();
        
        // 验证输入
        if (!newNickname) {
          UI.Toast.warning('修改失败', '昵称不能为空');
          return;
        }
        
        // 验证昵称格式
        const usernameRegex = /^[a-zA-Z0-9_]{2,20}$/;
        if (!usernameRegex.test(newNickname)) {
          UI.Toast.warning('修改失败', '昵称格式不正确，请使用2-20个字母、数字、下划线');
          return;
        }
        
        // 如果新昵称与当前昵称相同，不进行修改
        if (newNickname === this.userData?.nickname) {
          UI.Toast.info('未修改', '新昵称与当前昵称相同');
          UI.Modal.close('editnicknameModal');
          return;
        }
        
        try {
          // 显示加载指示器
          const loadingToastId = UI.Toast.loading('处理中', '正在修改昵称...');
          
          // 调用API修改昵称
          await CloudAPI.updateNickname(newNickname);
          
          // 隐藏加载通知
          if (loadingToastId) {
            UI.Toast.hide(loadingToastId);
          }
          
          // 关闭模态框
          UI.Modal.close('editNicknameModal');
          
          // 更新本地用户数据
          if (this.userData) {
            this.userData.nickname = newNickname;
          }
          
          // 重新加载用户信息以更新界面
          await this.loadUserInfo();
          
          // 显示成功通知
          UI.Toast.success('修改成功', '昵称已成功修改');
        } catch (error) {
          // 隐藏可能存在的加载通知
          const loadingToasts = document.querySelectorAll('.toast-loading');
          loadingToasts.forEach(toast => {
            const toastId = toast.id;
            if (toastId) {
              UI.Toast.hide(toastId);
            }
          });
          
          console.error('修改昵称失败:', error);
          UI.Toast.error('修改失败', error.message || '无法修改昵称');
        }
      }
    });
    
    // 聚焦到昵称输入框
    setTimeout(() => {
      const input = document.getElementById('newNickname');
      if (input) {
        input.focus();
        input.select(); // 选中当前文本
      }
    }, 100);
  }
  
  /**
   * 格式化文件大小
   * @param {number} bytes - 文件大小（字节）
   * @returns {string} - 格式化后的文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
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