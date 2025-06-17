/**
 * 登录页面脚本
 * @module login
 */

import { CloudAPI } from './api/cloud-api.js';

/**
 * 登录页面控制器
 */
class LoginController {
    /**
     * 构造函数
     */
    constructor() {
        // DOM元素引用
        this.loginForm = document.getElementById('loginFormElement');
        this.registerForm = document.getElementById('registerFormElement');
        this.showRegisterBtn = document.getElementById('showRegister');
        this.backToLoginBtn = document.getElementById('backToLogin');
        this.loginFormContainer = document.getElementById('loginForm');
        this.registerFormContainer = document.getElementById('registerForm');
        this.themeToggle = document.getElementById('themeToggle');
        this.toastContainer = document.getElementById('toastContainer');
        
        // 状态变量
        this.darkMode = localStorage.getItem('darkMode') === 'true';
        
        // 初始化
        this.init();
    }
    
    /**
     * 初始化
     */
    init() {
        // 检查是否已登录
        this.checkLoginStatus();
        
        // 应用保存的主题模式
        this.applyTheme();
        
        // 绑定事件
        this.bindEvents();
    }
    
    /**
     * 检查登录状态
     */
    checkLoginStatus() {
        const token = CloudAPI.getAuthToken();
        if (token) {
            // 已登录，跳转到主页
            window.location.href = '/';
        }
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 登录表单提交
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        // 注册表单提交
        if (this.registerForm) {
            console.log('注册表单');
            this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
        
        // 显示注册表单
        if (this.showRegisterBtn) {
            this.showRegisterBtn.addEventListener('click', () => this.toggleForms());
        }
        
        // 返回登录表单
        if (this.backToLoginBtn) {
            this.backToLoginBtn.addEventListener('click', () => this.toggleForms());
        }
        
        // 主题切换
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleDarkMode());
        }
    }
    
    /**
     * 切换表单显示
     */
    toggleForms() {
        this.loginFormContainer.classList.toggle('visible');
        this.loginFormContainer.classList.toggle('hidden');
        this.registerFormContainer.classList.toggle('visible');
        this.registerFormContainer.classList.toggle('hidden');
    }
    
    /**
     * 处理登录
     * @param {Event} e - 表单提交事件
     */
    async handleLogin(e) {
        e.preventDefault();
        
        // 获取表单数据
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        // 清除错误提示
        document.getElementById('loginUsernameError').textContent = '';
        document.getElementById('loginPasswordError').textContent = '';
        
        // 表单验证
        let isValid = true;
        
        if (!username) {
            document.getElementById('loginUsernameError').textContent = '请输入用户名';
            isValid = false;
        }
        
        if (!password) {
            document.getElementById('loginPasswordError').textContent = '请输入密码';
            isValid = false;
        }
        
        if (!isValid) return;
        
        // 禁用登录按钮
        const loginButton = document.getElementById('loginButton');
        loginButton.disabled = true;
        loginButton.textContent = '登录中...';
        
        try {
            // 调用登录API
            await CloudAPI.login(username, password);
            
            // 登录成功
            this.showToast('success', '登录成功', '正在跳转到主页...');
            
            // 跳转到主页
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } catch (error) {
            console.error('登录失败:', error);
            
            // 显示错误信息
            if (error.code === 1001) {
                document.getElementById('loginUsernameError').textContent = '用户名不存在';
            } else if (error.code === 1002) {
                document.getElementById('loginPasswordError').textContent = '密码错误';
            } else {
                this.showToast('error', '登录失败', error.message || '请检查用户名和密码');
            }
            
            // 恢复登录按钮
            loginButton.disabled = false;
            loginButton.textContent = '登录';
        }
    }
    
    /**
     * 处理注册
     * @param {Event} e - 表单提交事件
     */
    async handleRegister(e) {
        e.preventDefault();
        
        // 获取表单数据
        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        
        // 清除错误提示
        document.getElementById('registerUsernameError').textContent = '';
        document.getElementById('registerEmailError').textContent = '';
        document.getElementById('registerPasswordError').textContent = '';
        document.getElementById('registerConfirmPasswordError').textContent = '';
        
        // 表单验证
        let isValid = true;
        if (!username) {
            document.getElementById('registerUsernameError').textContent = '请输入用户名';
            isValid = false;
        } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            document.getElementById('registerUsernameError').textContent = '用户名格式不正确';
            isValid = false;
        }
        
        if (!email) {
            document.getElementById('registerEmailError').textContent = '请输入邮箱';
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            document.getElementById('registerEmailError').textContent = '邮箱格式不正确';
            isValid = false;
        }
        
        if (!password) {
            document.getElementById('registerPasswordError').textContent = '请输入密码';
            isValid = false;
        } else if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password)) {
            document.getElementById('registerPasswordError').textContent = '密码格式不正确';
            isValid = false;
        }
        
        if (!confirmPassword) {
            document.getElementById('registerConfirmPasswordError').textContent = '请确认密码';
            isValid = false;
        } else if (password !== confirmPassword) {
            document.getElementById('registerConfirmPasswordError').textContent = '两次输入的密码不一致';
            isValid = false;
        }
        
        if (!isValid) return;
        
        // 禁用注册按钮
        const registerButton = document.getElementById('registerButton');
        registerButton.disabled = true;
        registerButton.textContent = '注册中...';
        
        try {
            console.log(username, password, email);
            // 调用注册API
            await CloudAPI.register(username, password, email);
            
            // 注册成功
            this.showToast('success', '注册成功', '请登录');
            
            // 切换到登录表单
            this.toggleForms();
            
            // 自动填充用户名
            document.getElementById('loginUsername').value = username;
            document.getElementById('loginPassword').focus();
        } catch (error) {
            console.error('注册失败:', error);
            
            // 显示错误信息
            if (error.code === 1003) {
                document.getElementById('registerUsernameError').textContent = '用户名已存在';
            } else if (error.code === 1004) {
                document.getElementById('registerEmailError').textContent = '邮箱已被使用';
            } else {
                this.showToast('error', '注册失败', error.message || '请检查输入信息');
            }
        } finally {
            // 恢复注册按钮
            registerButton.disabled = false;
            registerButton.textContent = '注册';
        }
    }
    
    /**
     * 切换暗黑模式
     */
    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        this.applyTheme();
        
        // 保存用户偏好
        localStorage.setItem('darkMode', this.darkMode);
    }
    
    /**
     * 应用主题
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
    
    /**
     * 显示通知
     * @param {string} type - 通知类型：success, error, warning, info
     * @param {string} title - 通知标题
     * @param {string} message - 通知内容
     */
    showToast(type = 'info', title = '', message = '') {
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
        if (this.toastContainer) {
            this.toastContainer.appendChild(toast);
        }
        
        // 添加关闭事件
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('toast-hide');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        });
        
        // 自动关闭
        setTimeout(() => {
            toast.classList.add('toast-hide');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new LoginController();
});