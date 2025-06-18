/**
 * 云存储系统API接口封装
 * @module cloud-api
 */

// API基础URL
const API_BASE_URL = '/api';

// API请求超时时间(ms)
const API_TIMEOUT = 30000;

// 日志级别控制
const LOG_LEVEL = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

// 检测是否为生产环境
const IS_PRODUCTION = window.location.hostname !== 'localhost' && 
                      !window.location.hostname.includes('127.0.0.1') && 
                      !window.location.hostname.includes('.local');

// 当前环境的日志级别 (生产环境可设置为WARN或ERROR)
const CURRENT_LOG_LEVEL = IS_PRODUCTION ? LOG_LEVEL.ERROR : LOG_LEVEL.DEBUG;

/**
 * 日志工具
 */
const Logger = {
  debug: (message, ...args) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVEL.DEBUG) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
  info: (message, ...args) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVEL.INFO) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  warn: (message, ...args) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVEL.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  error: (message, ...args) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVEL.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
};

/**
 * 生成UUID的兼容方法
 * @returns {string} UUID
 */
function generateUUID() {
  // 使用crypto.randomUUID如果可用
  if (window.crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // 兼容方法：生成随机UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 云存储API客户端
 */
export class CloudAPI {
  /**
   * 发送API请求的通用方法
   * @param {string} url - 请求URL
   * @param {Object} options - 请求选项
   * @returns {Promise} - 返回Promise对象
   */
  static async request(url, options = {}) {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    };

    // 合并默认选项和用户选项
    const mergedOptions = { ...defaultOptions, ...options };
    
    // 如果有认证令牌，添加到请求头
    const token = this.getAuthToken();
    if (token) {
      mergedOptions.headers.Authorization = token;
    }

    // 添加请求ID
    const requestId = generateUUID();
    mergedOptions.headers['X-Request-ID'] = requestId;

    try {
      // 创建AbortController用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
      mergedOptions.signal = controller.signal;

      const response = await fetch(`${API_BASE_URL}${url}`, mergedOptions);
      clearTimeout(timeoutId);

      // 处理HTTP错误
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          status: response.status,
          message: errorData.message || response.statusText,
          code: errorData.code || response.status,
        };
      }

      // 解析响应
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        
        // 检查API响应状态码
        if (data.code !== undefined && data.code !== 200) {
          throw {
            status: response.status,
            message: data.msg || '请求失败',
            code: data.code,
            data: data.data,
          };
        }
        
        return data;
      } else if (contentType && contentType.includes('text/')) {
        return await response.text();
      } else {
        return await response.blob();
      }
    } catch (error) {
      // 处理请求被中止的情况
      if (error.name === 'AbortError') {
        throw { status: 408, message: '请求超时', code: 408 };
      }
      throw error;
    }
  }

  /**
   * 获取认证令牌
   * @returns {string|null} - 认证令牌
   */
  static getAuthToken() {
    return localStorage.getItem('token') || null;
  }

  /**
   * 设置认证令牌
   * @param {string} token - 认证令牌
   */
  static setAuthToken(token) {
    localStorage.setItem('token', token);
  }

  /**
   * 清除认证令牌
   */
  static clearAuthToken() {
    localStorage.removeItem('token');
  }

  /**
   * 用户登录
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise} - 返回Promise对象
   */
  static async login(username, password) {
    try {
      const response = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      
      if (response.code === 200 && response.data) {
        // 保存token，添加Bearer前缀
        const token = response.data.startsWith('Bearer ') 
          ? response.data
          : `Bearer ${response.data}`;
        this.setAuthToken(token);
        return response;
      } else {
        throw new Error(response.message || '登录失败');
      }
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  }

  /**
   * 用户注册
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @param {string} email - 邮箱
   * @returns {Promise} - 返回Promise对象
   */
  static async register(username, password, email) {
    return await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, email }),
    });
  }

  /**
   * 获取用户信息
   * @returns {Promise} - 返回Promise对象
   */
  static async getUserInfo() {
    return await this.request('/user/info');
  }

  /**
   * 获取用户云盘信息
   * @param {string} username - 用户名
   * @returns {Promise} - 返回Promise对象
   */
  static async getUserCloud(username) {
    return await this.request(`/cloud/user?username=${encodeURIComponent(username)}`);
  }

  /**
   * 获取文件列表
   * @param {string} path - 文件路径
   * @param {string} sort - 排序方式
   * @returns {Promise} - 返回Promise对象
   */
  static async getFileList(path = '/', sort = 'name-asc') {
    try {
      // 正常调用API
      const response = await this.request(`/file/list?path=${encodeURIComponent(path)}&sort=${encodeURIComponent(sort)}`);
      return response;
    } catch (error) {
      console.error('获取文件列表失败:', error);
      throw error;
    }
  }

  /**
   * 创建文件夹
   * @param {string} path - 父路径
   * @param {string} name - 文件夹名称
   * @returns {Promise} - 返回Promise对象
   */
  static async createFolder(path, name) {
    return await this.request('/file/directory', {
      method: 'POST',
      body: JSON.stringify({ path, name }),
    });
  }

  /**
   * 创建文本文件
   * @param {string} path - 父路径
   * @param {string} name - 文件名
   * @param {string} content - 文件内容
   * @returns {Promise} - 返回Promise对象
   */
  static async createTextFile(path, name, content = '') {
    return await this.request('/file/text', {
      method: 'POST',
      body: JSON.stringify({ path, name, content }),
    });
  }

  /**
   * 删除文件
   * @param {string} fileId - 文件ID
   * @returns {Promise} - 返回Promise对象
   */
  static async deleteFile(fileId) {
    return await this.request('/file/delete', {
      method: 'POST',
      body: JSON.stringify({ fileId }),
    });
  }

  /**
   * 重命名文件
   * @param {string} path - 文件路径
   * @param {string} newPath - 新路径
   * @returns {Promise} - 返回Promise对象
   */
  static async renameFile(fileId, newName) {
    return await this.request('/file/rename', {
      method: 'POST',
      body: JSON.stringify({ fileId, newName }),
    });
  }

  /**
   * 移动文件
   * @param {string} sourcePath - 源路径
   * @param {string} targetPath - 目标路径
   * @returns {Promise} - 返回Promise对象
   */
  static async moveFile(sourcePath, targetPath) {
    return await this.request('/file/move', {
      method: 'POST',
      body: JSON.stringify({ sourcePath, targetPath }),
    });
  }

  /**
   * 分享文件
   * @param {string} path - 文件路径
   * @param {number} expireHours - 过期小时数
   * @returns {Promise} - 返回Promise对象
   */
  static async shareFile(path, expireHours = 24) {
    return await this.request('/share/create', {
      method: 'POST',
      body: JSON.stringify({ path, expireHours }),
    });
  }

  /**
   * 获取分享列表
   * @returns {Promise} - 返回Promise对象
   */
  static async getShareList() {
    return await this.request('/share/list');
  }

  /**
   * 取消分享
   * @param {string} shareId - 分享ID
   * @returns {Promise} - 返回Promise对象
   */
  static async cancelShare(shareId) {
    return await this.request('/share/cancel', {
      method: 'POST',
      body: JSON.stringify({ shareId }),
    });
  }

  /**
   * 上传文件
   * @param {FormData} formData - 包含文件的FormData对象
   * @param {Function} onProgress - 进度回调函数，接收参数(progress, event, isError)
   * @returns {Promise} - 返回Promise对象
   */
  static async uploadFiles(formData, onProgress) {
    return new Promise((resolve, reject) => {
      // 获取认证令牌
      const token = this.getAuthToken();
      const requestId = generateUUID();
      
      // 使用XMLHttpRequest以支持进度监控
      const xhr = new XMLHttpRequest();
      
      // 监听上传进度
      if (typeof onProgress === 'function') {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            onProgress(percentComplete, event);
          }
        });
      }
      
      // 监听请求完成
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            
            // 检查业务状态码
            if (result.code !== 200) {
              // 如果有进度回调，通知上传失败
              if (typeof onProgress === 'function') {
                onProgress(100, null, true); // 标记为错误
              }
              reject(new Error(result.msg || '上传失败'));
              return;
            }
            
            resolve(result);
          } catch (error) {
            // 如果有进度回调，通知上传失败
            if (typeof onProgress === 'function') {
              onProgress(100, null, true); // 标记为错误
            }
            reject(new Error('解析响应失败'));
          }
        } else {
          // 如果有进度回调，通知上传失败
          if (typeof onProgress === 'function') {
            onProgress(100, null, true); // 标记为错误
          }
          reject(new Error(`HTTP错误: ${xhr.status}`));
        }
      });
      
      // 监听错误
      xhr.addEventListener('error', () => {
        // 如果有进度回调，通知上传失败
        if (typeof onProgress === 'function') {
          onProgress(100, null, true); // 标记为错误
        }
        reject(new Error('网络错误'));
      });
      
      // 监听中止
      xhr.addEventListener('abort', () => {
        // 如果有进度回调，通知上传取消
        if (typeof onProgress === 'function') {
          onProgress(100, null, true); // 标记为错误
        }
        reject(new Error('上传已取消'));
      });
      
      // 发送请求
      xhr.open('POST', `${API_BASE_URL}/file/upload/multiple`);
      
      // 设置请求头
      if (token) xhr.setRequestHeader('Authorization', token);
      xhr.setRequestHeader('X-Request-ID', requestId);
      
      xhr.send(formData);
    });
  }

  /**
   * 获取回收站列表
   * @returns {Promise} - 返回Promise对象
   */
  static async getTrashList() {
    return await this.request('/file/trash');
  }

  /**
   * 获取他人分享给我的文件列表
   * @returns {Promise} - 返回Promise对象
   */
  static async getSharedWithMe() {
    return await this.request('/share/received');
  }

  /**
   * 获取文件下载链接
   * @param {string} fileId - 文件ID
   * @returns {string} - 下载链接
   */
  static getFileDownloadUrl(fileId) {
    // 直接返回下载URL
    return `${API_BASE_URL}/file/download/${fileId}`;
  }

  /**
   * 从回收站恢复文件
   * @param {string} fileId - 文件ID
   * @returns {Promise} - 返回Promise对象
   */
  static async restoreFile(fileId) {
    return await this.request('/file/trash/restore', {
      method: 'POST',
      body: JSON.stringify({ fileId }),
    });
  }
  
  /**
   * 永久删除回收站中的文件
   * @param {string} fileId - 文件ID
   * @returns {Promise} - 返回Promise对象
   */
  static async deletePermanentFile(fileId) {
    return await this.request('/file/trash/delete', {
      method: 'POST',
      body: JSON.stringify({ fileId }),
    });
  }
}

export default CloudAPI; 