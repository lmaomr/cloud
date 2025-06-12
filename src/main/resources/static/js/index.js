document.addEventListener('DOMContentLoaded', function() {
    // 初始化
    initializeApp();
});

function initializeApp() {
    // 绑定事件
    bindEvents();
    
    // 加载文件列表
    loadFileList();
}

function bindEvents() {
    // 文件上传按钮点击事件
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', function() {
            document.getElementById('file-input').click();
        });
    }

    // 文件输入变化事件
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }

    // 新建文件夹按钮点击事件
    const newFolderBtn = document.getElementById('new-folder-btn');
    if (newFolderBtn) {
        newFolderBtn.addEventListener('click', createNewFolder);
    }
    
    // 绑定拖拽上传事件
    setupDragAndDropUpload();
}

// 设置拖拽上传功能
function setupDragAndDropUpload() {
    const fileList = document.querySelector('.file-list');
    if (!fileList) return;
    
    // 阻止默认拖放行为
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileList.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // 高亮显示拖放区域
    ['dragenter', 'dragover'].forEach(eventName => {
        fileList.addEventListener(eventName, highlight, false);
    });
    
    // 移除高亮
    ['dragleave', 'drop'].forEach(eventName => {
        fileList.addEventListener(eventName, unhighlight, false);
    });
    
    // 处理拖放的文件
    fileList.addEventListener('drop', handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight(e) {
        fileList.classList.add('drag-over');
    }
    
    function unhighlight(e) {
        // 确保只有当鼠标真正离开元素时才移除高亮
        // 检查相关目标是否在fileList内部
        const rect = fileList.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        
        // 如果是drop事件或者鼠标确实离开了元素范围
        if (e.type === 'drop' || 
            x < rect.left || x > rect.right || 
            y < rect.top || y > rect.bottom) {
            fileList.classList.remove('drag-over');
        }
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            handleFiles(files);
        }
    }
}

// 处理文件上传
function handleFiles(files) {
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }
    
    // 显示上传进度
    showUploadingStatus(true);
    
    // 发送上传请求
    fetch('/api/file/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('文件上传失败');
        }
        return response.json();
    })
    .then(data => {
        showUploadingStatus(false);
        showMessage('文件上传成功', 'success');
        loadFileList(); // 重新加载文件列表
    })
    .catch(error => {
        showUploadingStatus(false);
        showMessage(error.message || '文件上传失败', 'error');
        console.error('上传错误:', error);
    });
}

// 显示上传状态
function showUploadingStatus(isUploading) {
    // 可以添加上传进度条或提示
    const fileList = document.querySelector('.file-list');
    if (isUploading) {
        const uploadingDiv = document.createElement('div');
        uploadingDiv.className = 'uploading-status';
        uploadingDiv.innerHTML = '<div class="spinner"></div><span>正在上传文件...</span>';
        document.body.appendChild(uploadingDiv);
    } else {
        const uploadingDiv = document.querySelector('.uploading-status');
        if (uploadingDiv) {
            uploadingDiv.remove();
        }
    }
}

// 处理文件上传事件
function handleFileUpload(event) {
    const files = event.target.files;
    if (files.length > 0) {
        handleFiles(files);
    }
}

// 创建新文件夹
function createNewFolder() {
    const folderName = prompt('请输入文件夹名称:');
    if (folderName) {
        // 发送创建文件夹请求
        fetch('/api/folder/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: folderName })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('创建文件夹失败');
            }
            return response.json();
        })
        .then(data => {
            showMessage('文件夹创建成功', 'success');
            loadFileList(); // 重新加载文件列表
        })
        .catch(error => {
            showMessage(error.message || '创建文件夹失败', 'error');
            console.error('创建文件夹错误:', error);
        });
    }
}

// 加载文件列表
function loadFileList() {
    const fileList = document.querySelector('.file-list');
    if (!fileList) return;
    
    // 清空文件列表
    while (fileList.firstChild) {
        fileList.removeChild(fileList.firstChild);
    }
    
    // 添加加载指示器
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.innerHTML = '<div class="spinner"></div><span>加载中...</span>';
    fileList.appendChild(loadingDiv);
    
    // 发送获取文件列表请求
    fetch('/api/file/list')
        .then(response => {
            if (!response.ok) {
                throw new Error('获取文件列表失败');
            }
            return response.json();
        })
        .then(data => {
            // 移除加载指示器
            fileList.removeChild(loadingDiv);
            
            // 创建网格视图
            const gridView = document.createElement('div');
            gridView.className = 'grid-view';
            fileList.appendChild(gridView);
            
            if (!data || data.length === 0) {
                // 显示空文件列表提示
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'empty-file-list';
                emptyDiv.innerHTML = `
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                        <polyline points="13 2 13 9 20 9"></polyline>
                    </svg>
                    <h3>没有文件</h3>
                    <p>上传或拖放文件到此处</p>
                `;
                gridView.appendChild(emptyDiv);
            } else {
                // 渲染文件列表
                data.forEach(file => {
                    const fileItem = createFileItem(file);
                    gridView.appendChild(fileItem);
                });
            }
        })
        .catch(error => {
            // 移除加载指示器
            if (fileList.contains(loadingDiv)) {
                fileList.removeChild(loadingDiv);
            }
            
            // 创建网格视图（即使出错也创建，以便显示错误信息）
            const gridView = document.createElement('div');
            gridView.className = 'grid-view';
            fileList.appendChild(gridView);
            
            // 显示错误信息
            const errorDiv = document.createElement('div');
            errorDiv.className = 'empty-file-list';
            errorDiv.innerHTML = `
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h3>加载文件列表失败</h3>
                <p>请刷新页面重试</p>
            `;
            gridView.appendChild(errorDiv);
            
            console.error('加载文件列表错误:', error);
        });
}

// 创建文件项
function createFileItem(file) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.dataset.id = file.id;
    fileItem.dataset.type = file.isDirectory ? 'folder' : 'file';
    
    const icon = file.isDirectory ? 'folder' : getFileIcon(file.name);
    
    fileItem.innerHTML = `
        <div class="file-icon">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="file-info">
            <div class="file-name" title="${file.name}">${file.name}</div>
            <div class="file-meta">
                ${file.isDirectory ? '' : formatFileSize(file.size)}
                <span class="file-date">${formatDate(file.modifiedTime)}</span>
            </div>
        </div>
        <div class="file-actions">
            <button class="action-btn download-btn" title="下载">
                <i class="fas fa-download"></i>
            </button>
            <button class="action-btn delete-btn" title="删除">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `;
    
    // 绑定文件项事件
    bindFileItemEvents(fileItem, file);
    
    return fileItem;
}

// 绑定文件项事件
function bindFileItemEvents(fileItem, file) {
    // 文件项点击事件
    fileItem.addEventListener('click', function(e) {
        if (e.target.closest('.action-btn')) {
            // 如果点击的是操作按钮，不做处理
            return;
        }
        
        // 切换选中状态
        this.classList.toggle('selected');
    });
    
    // 文件项双击事件
    fileItem.addEventListener('dblclick', function() {
        if (file.isDirectory) {
            // 如果是文件夹，进入该文件夹
            navigateToFolder(file.id);
        } else {
            // 如果是文件，预览或下载
            previewFile(file);
        }
    });
    
    // 下载按钮点击事件
    const downloadBtn = fileItem.querySelector('.download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            downloadFile(file);
        });
    }
    
    // 删除按钮点击事件
    const deleteBtn = fileItem.querySelector('.delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            deleteFile(file);
        });
    }
}

// 获取文件图标
function getFileIcon(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    
    const iconMap = {
        pdf: 'file-pdf',
        doc: 'file-word', docx: 'file-word',
        xls: 'file-excel', xlsx: 'file-excel',
        ppt: 'file-powerpoint', pptx: 'file-powerpoint',
        jpg: 'file-image', jpeg: 'file-image', png: 'file-image', gif: 'file-image',
        zip: 'file-archive', rar: 'file-archive', '7z': 'file-archive',
        mp3: 'file-audio', wav: 'file-audio',
        mp4: 'file-video', avi: 'file-video', mov: 'file-video',
        txt: 'file-alt',
        html: 'file-code', css: 'file-code', js: 'file-code'
    };
    
    return iconMap[extension] || 'file';
}

// 格式化文件大小
function formatFileSize(size) {
    if (size < 1024) {
        return size + ' B';
    } else if (size < 1024 * 1024) {
        return (size / 1024).toFixed(1) + ' KB';
    } else if (size < 1024 * 1024 * 1024) {
        return (size / (1024 * 1024)).toFixed(1) + ' MB';
    } else {
        return (size / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 导航到文件夹
function navigateToFolder(folderId) {
    // 实现文件夹导航功能
    console.log('导航到文件夹:', folderId);
    // TODO: 实现导航到文件夹的功能
}

// 预览文件
function previewFile(file) {
    // 实现文件预览功能
    console.log('预览文件:', file);
    // TODO: 实现文件预览功能
}

// 下载文件
function downloadFile(file) {
    // 实现文件下载功能
    console.log('下载文件:', file);
    
    // 创建下载链接
    const downloadUrl = `/api/file/download/${file.id}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// 删除文件
function deleteFile(file) {
    if (confirm(`确定要删除 ${file.name} 吗？`)) {
        // 发送删除文件请求
        fetch(`/api/file/delete/${file.id}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('删除文件失败');
            }
            return response.json();
        })
        .then(data => {
            showMessage('文件删除成功', 'success');
            loadFileList(); // 重新加载文件列表
        })
        .catch(error => {
            showMessage(error.message || '删除文件失败', 'error');
            console.error('删除文件错误:', error);
        });
    }
}

// 显示消息提示
function showMessage(message, type = 'info', duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 显示提示
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // 自动关闭提示
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, duration);
} 