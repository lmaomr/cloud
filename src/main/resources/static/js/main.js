// 云存储应用主要JavaScript功能
document.addEventListener('DOMContentLoaded', function() {
    // DOM元素引用
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    const fileList = document.getElementById('fileList');
    const emptyFileList = document.getElementById('emptyFileList');
    const viewBtns = document.querySelectorAll('.view-btn');
    const createBtn = document.getElementById('createBtn');
    const fileInput = document.getElementById('fileInput');
    const folderInput = document.getElementById('folderInput');
    const createMenu = document.getElementById('createMenu');
    const refreshBtn = document.getElementById('refreshBtn');
    const fileActionsToolbar = document.getElementById('fileActionsToolbar');
    const selectedCountElement = document.getElementById('selectedCount');
    const uploadProgress = document.getElementById('uploadProgress');
    const uploadItems = document.getElementById('uploadItems');
    const toastContainer = document.getElementById('toastContainer');
    const themeToggle = document.querySelector('.theme-toggle');
    
    // 状态变量
    let selectedFiles = [];
    let currentView = 'grid';
    let currentSort = 'name-asc';
    let darkMode = localStorage.getItem('darkMode') === 'true';
    let isDragging = false; // 添加拖拽状态跟踪
    
    // 初始化函数
    function init() {
        // 应用保存的主题模式
        if (darkMode) {
            document.body.classList.add('dark-mode');
            themeToggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
        }
        
        // 加载文件列表（示例）
        loadFiles();
        
        // 绑定事件监听器
        bindEvents();
        
        // 创建模态框
        createModals();
    }
    
    // 绑定事件监听器
    function bindEvents() {
        // 视图切换
        viewBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                setView(btn.dataset.view);
            });
        });
        
        // 新建按钮
        createBtn.addEventListener('click', toggleCreateMenu);
        
        // 文件选择变化
        fileInput.addEventListener('change', handleFileSelect);
        folderInput.addEventListener('change', handleFileSelect);
        
        // 新建菜单项点击
        document.querySelectorAll('.create-menu-item').forEach(item => {
            item.addEventListener('click', handleCreateAction);
        });
        
        // 刷新按钮
        refreshBtn.addEventListener('click', refreshFiles);
        
        // 排序选项
        document.querySelectorAll('[data-sort]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                sortFiles(item.dataset.sort);
            });
        });

        // 文件项选择
        document.addEventListener('click', handleFileItemClick);
        
        // 文件操作按钮
        document.addEventListener('click', handleFileAction);
        
        // 批量操作按钮
        document.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', handleBulkAction);
        });
        
        // 上传进度条关闭按钮
        if (uploadProgress) {
            uploadProgress.querySelector('.upload-close').addEventListener('click', () => {
                uploadProgress.style.display = 'none';
            });
        }
        
        // 主题切换
        themeToggle.addEventListener('click', toggleDarkMode);
        
        // 点击文档其他地方关闭新建菜单
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#createBtn') && !e.target.closest('#createMenu')) {
                createMenu.style.display = 'none';
            }
        });
        
        // 拖放上传 - 使用全局事件处理
        const dropZone = document.querySelector('.file-container');
        
        // 防止浏览器默认行为
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        
        document.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // 只有当拖入的是文件时才显示拖拽效果
            if (e.dataTransfer.types.includes('Files')) {
                isDragging = true;
                dropZone.classList.add('drag-over');
            }
        });
        
        document.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // 只有当离开的是文档时才移除拖拽效果
            if (e.relatedTarget === null) {
                isDragging = false;
                dropZone.classList.remove('drag-over');
            }
        });
        
        document.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // 移除拖拽效果
            isDragging = false;
            dropZone.classList.remove('drag-over');
            
            // 只有在目标区域内放置才处理文件
            if (isDescendantOf(e.target, dropZone)) {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    uploadFiles(files);
                }
            }
        });
        
        // 添加键盘快捷键
        document.addEventListener('keydown', (e) => {
            // 按下 / 键聚焦搜索框
            if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                const searchInput = document.querySelector('.search-box input');
                if (searchInput) {
                    searchInput.focus();
                }
            }
        });
    }
    
    // 检查元素是否是指定父元素的子元素
    function isDescendantOf(child, parent) {
        let node = child;
        while (node !== null) {
            if (node === parent) {
                return true;
            }
            node = node.parentNode;
        }
        return false;
    }
    
    // 设置视图模式
    function setView(view) {
        currentView = view;
        
        // 更新视图按钮状态
        viewBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // 更新文件列表类
        if (fileList) {
            fileList.classList.remove('grid-view', 'list-view');
            fileList.classList.add(`${view}-view`);
        }
        
        // 保存用户偏好
        localStorage.setItem('view', view);
    }
    
    // 切换新建菜单
    function toggleCreateMenu(e) {
        e.stopPropagation();
        createMenu.style.display = createMenu.style.display === 'none' ? 'block' : 'none';
    }
    
    // 处理新建操作
    function handleCreateAction(e) {
        const action = e.currentTarget.dataset.action;
        createMenu.style.display = 'none';
        
        switch(action) {
            case 'folder':
                createFolder();
                break;
            case 'text':
                createTextFile();
                break;
            case 'upload':
                fileInput.click();
                break;
            case 'upload-folder':
                folderInput.click();
                break;
        }
    }
    
    // 创建模态框
    function createModals() {
        // 创建文件夹模态框
        const folderModal = document.createElement('div');
        folderModal.className = 'modal-overlay';
        folderModal.id = 'folderModal';
        folderModal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title">
                        <i class="fas fa-folder"></i> 新建文件夹
                    </div>
                    <button class="modal-close" data-dismiss="modal"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="folderName" class="form-label">文件夹名称</label>
                        <input type="text" id="folderName" class="form-input" placeholder="请输入文件夹名称">
                        <div class="form-hint">文件夹名称不能包含特殊字符 \\ / : * ? " < > |</div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-cancel" data-dismiss="modal">取消</button>
                    <button class="btn btn-submit" id="createFolderBtn">创建</button>
                </div>
            </div>
        `;
        
        // 创建文本文件模态框
        const textFileModal = document.createElement('div');
        textFileModal.className = 'modal-overlay';
        textFileModal.id = 'textFileModal';
        textFileModal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div class="modal-title">
                        <i class="fas fa-file-alt"></i> 新建文本文档
                    </div>
                    <button class="modal-close" data-dismiss="modal"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="fileName" class="form-label">文件名称</label>
                        <input type="text" id="fileName" class="form-input" placeholder="请输入文件名称">
                        <div class="form-hint">文件名称不能包含特殊字符 \\ / : * ? " < > |</div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-cancel" data-dismiss="modal">取消</button>
                    <button class="btn btn-submit" id="createFileBtn">创建</button>
                </div>
            </div>
        `;
        
        // 添加到文档中
        document.body.appendChild(folderModal);
        document.body.appendChild(textFileModal);
        
        // 绑定模态框事件
        bindModalEvents();
    }
    
    // 绑定模态框事件
    function bindModalEvents() {
        // 关闭模态框
        document.querySelectorAll('[data-dismiss="modal"]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.modal-overlay').forEach(modal => {
                    modal.classList.remove('active');
                });
            });
        });
        
        // 创建文件夹按钮点击事件
        document.getElementById('createFolderBtn').addEventListener('click', () => {
            const folderName = document.getElementById('folderName').value.trim();
            if (folderName) {
                // 这里应该调用API创建文件夹
                console.log('创建文件夹:', folderName);
                showToast('success', '创建成功', `文件夹 "${folderName}" 已创建`);
                refreshFiles();
                
                // 关闭模态框并清空输入
                document.getElementById('folderModal').classList.remove('active');
                document.getElementById('folderName').value = '';
            } else {
                showToast('warning', '创建失败', '请输入文件夹名称');
            }
        });
        
        // 创建文本文件按钮点击事件
        document.getElementById('createFileBtn').addEventListener('click', () => {
            const fileName = document.getElementById('fileName').value.trim();
            if (fileName) {
                // 这里应该调用API创建文本文件
                console.log('创建文本文件:', fileName);
                showToast('success', '创建成功', `文件 "${fileName}" 已创建`);
                refreshFiles();
                
                // 关闭模态框并清空输入
                document.getElementById('textFileModal').classList.remove('active');
                document.getElementById('fileName').value = '';
            } else {
                showToast('warning', '创建失败', '请输入文件名称');
            }
        });
        
        // 按下回车键提交表单
        document.getElementById('folderName').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('createFolderBtn').click();
            }
        });
        
        document.getElementById('fileName').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('createFileBtn').click();
            }
        });
    }
    
    // 创建文件夹
    function createFolder() {
        // 显示模态框
        document.getElementById('folderModal').classList.add('active');
        // 聚焦输入框
        setTimeout(() => {
            document.getElementById('folderName').focus();
        }, 100);
    }
    
    // 创建文本文件
    function createTextFile() {
        // 显示模态框
        document.getElementById('textFileModal').classList.add('active');
        // 聚焦输入框
        setTimeout(() => {
            document.getElementById('fileName').focus();
        }, 100);
    }
    
    // 处理文件选择
    function handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            uploadFiles(files);
        }
        // 清空 file input 的值，以便下次选择相同文件也能触发 change 事件
        e.target.value = null;
    }
    
    // 上传文件
    async function uploadFiles(files) {
        // 显示上传进度条
        uploadProgress.style.display = 'block';
        uploadItems.innerHTML = '';
        
        // 创建上传项
        const uploadItemsMap = new Map(); // 存储文件和对应的上传项
        
        for (const file of files) {
            const uploadItem = createUploadItem(file);
            uploadItems.appendChild(uploadItem);
            uploadItemsMap.set(file, uploadItem);
            
            // 启动模拟进度作为备用（如果实际进度事件不工作）
            startSimulatedProgress(uploadItem);
        }
        
        // 实际上传逻辑
        try {
            const formData = new FormData();
            for (const file of files) {
                formData.append('file', file);
            }
            
            // 获取token
            const token = getAuthToken();
            const requestId = crypto.randomUUID();
            
            // 使用XMLHttpRequest替代fetch，以便跟踪上传进度
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                let progressUpdated = false; // 标记是否收到过进度更新
                
                // 监听上传进度
                xhr.upload.addEventListener('progress', (event) => {
                    console.log('上传进度:', event.loaded, '/', event.total, (event.loaded / event.total) * 100 + '%');
                    progressUpdated = true; // 标记已收到进度更新
                    
                    if (event.lengthComputable) {
                        const percentComplete = (event.loaded / event.total) * 100;
                        console.log('百分比:', percentComplete);
                        
                        // 如果只有一个文件，直接更新该文件的进度
                        if (files.length === 1) {
                            const uploadItem = uploadItemsMap.get(files[0]);
                            updateItemProgress(uploadItem, percentComplete);
                        } else {
                            // 多个文件时，更新所有文件的进度
                            files.forEach(file => {
                                const uploadItem = uploadItemsMap.get(file);
                                if (uploadItem) {
                                    updateItemProgress(uploadItem, percentComplete);
                                }
                            });
                        }
                    }
                });
                
                // 单独的函数更新进度，避免代码重复
                function updateItemProgress(item, percent) {
                    if (!item) return;
                    
                    // 停止模拟进度
                    if (item._simulationInterval) {
                        clearInterval(item._simulationInterval);
                        item._simulationInterval = null;
                    }
                    
                    const progressBar = item.querySelector('.upload-progress-inner');
                    const percentage = item.querySelector('.upload-percentage');
                    
                    if (progressBar) progressBar.style.width = `${percent}%`;
                    if (percentage) percentage.textContent = `${Math.round(percent)}%`;
                }
                
                // 启动模拟进度
                function startSimulatedProgress(item) {
                    let progress = 0;
                    const progressBar = item.querySelector('.upload-progress-inner');
                    const percentage = item.querySelector('.upload-percentage');
                    
                    const interval = setInterval(() => {
                        // 如果已收到实际进度更新，则停止模拟
                        if (progressUpdated) {
                            clearInterval(interval);
                            return;
                        }
                        
                        // 根据当前进度调整增量，使进度条增长速度逐渐减慢
                        let increment;
                        if (progress < 30) {
                            increment = 1 + Math.random() * 2; // 快速增长到30%
                        } else if (progress < 70) {
                            increment = 0.5 + Math.random() * 1; // 中速增长到70%
                        } else if (progress < 90) {
                            increment = 0.1 + Math.random() * 0.3; // 慢速增长到90%
                        } else {
                            increment = 0.01 + Math.random() * 0.05; // 非常慢地增长到接近但不到100%
                        }
                        
                        progress += increment;
                        
                        // 确保模拟进度不会到达100%（留给实际完成事件）
                        if (progress >= 99) {
                            progress = 99;
                            clearInterval(interval);
                        }
                        
                        if (progressBar) progressBar.style.width = `${progress}%`;
                        if (percentage) percentage.textContent = `${Math.round(progress)}%`;
                    }, 200);
                    
                    // 保存interval ID以便后续清除
                    item._simulationInterval = interval;
                }
                
                // 监听请求完成
                xhr.addEventListener('load', () => {
                    console.log('上传完成, 状态:', xhr.status, xhr.statusText);
                    
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const result = JSON.parse(xhr.responseText);
                            console.log('服务器响应:', result);
                            
                            // 检查业务状态码
                            if (result.code !== 200) {
                                reject(new Error(result.msg || '上传失败'));
                                return;
                            }
                            
                            // 上传成功，将所有进度设为100%
                            files.forEach(file => {
                                const uploadItem = uploadItemsMap.get(file);
                                if (uploadItem) {
                                    updateItemProgress(uploadItem, 100);
                                }
                            });
                            
                            // 上传成功
                            console.log('上传成功:', result);
                            showToast('success', '上传成功', `已成功上传 ${files.length} 个文件`);
                            
                            // 刷新文件列表
                            refreshFiles();
                            
                            // 延迟关闭上传进度条
                            setTimeout(() => {
                                uploadProgress.style.display = 'none';
                            }, 2000);
                            
                            resolve(result);
                        } catch (error) {
                            console.error('解析响应失败:', error);
                            reject(new Error('解析响应失败'));
                        }
                    } else {
                        console.error('HTTP错误:', xhr.status, xhr.statusText);
                        reject(new Error(`HTTP错误: ${xhr.status}`));
                    }
                });
                
                // 监听错误
                xhr.addEventListener('error', (e) => {
                    console.error('上传错误:', e);
                    reject(new Error('网络错误'));
                });
                
                // 监听中止
                xhr.addEventListener('abort', () => {
                    console.log('上传已取消');
                    reject(new Error('上传已取消'));
                });
                
                // 发送请求
                console.log('开始上传文件...');
                xhr.open('POST', '/files/upload');
                xhr.setRequestHeader('Authorization', "Bearer eyJhbGciOiJIUzM4NCJ9.eyJ1c2VybmFtZSI6InRlc3QiLCJpYXQiOjE3NDk3MjM5NzksImV4cCI6MTc0OTczODM3OX0.V5p2ryUMKe3ZxAukrWoDqrUTRUCg8hyL3VR5WrThwHch4MfJQBeNIVhG9dMAuqUE");
                xhr.setRequestHeader('X-Request-ID', requestId);
                xhr.send(formData);
            });
        } catch (error) {
            console.error('上传过程中发生错误:', error);
            
            // 显示错误信息
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                showToast('error', '上传失败', '服务器连接失败，请检查服务器是否正常运行');
            } else if (error.message.includes('Maximum upload size exceeded')) {
                showToast('error', '上传失败', '文件大小超过限制，请上传小于100MB的文件');
            } else {
                showToast('error', '上传失败', error.message);
            }
        }
    }
    
    // 创建上传项UI
    function createUploadItem(file) {
        const item = document.createElement('div');
        item.className = 'upload-item';
        
        const fileIcon = getFileIcon(file.name);
        const fileSize = formatFileSize(file.size);
        
        item.innerHTML = `
            <div class="upload-item-info">
                <i class="${fileIcon}"></i>
                <span class="upload-filename">${file.name}</span>
                <span class="upload-filesize">${fileSize}</span>
            </div>
            <div class="upload-item-progress">
                <div class="upload-progress-bar">
                    <div class="upload-progress-inner" style="width: 0%"></div>
                </div>
                <span class="upload-percentage">0%</span>
            </div>
        `;
        
        return item;
    }
    
    // 获取文件图标
    function getFileIcon(fileName) {
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
    }
    
    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // 加载文件列表
    function loadFiles() {
        // 这里应该调用API获取文件列表
        // 示例数据
        const hasFiles = true; // 假设有文件
        
        if (hasFiles) {
            // 显示文件列表，隐藏空状态
            if (fileList) fileList.style.display = 'grid';
            if (emptyFileList) emptyFileList.style.display = 'none';
        } else {
            // 显示空状态，隐藏文件列表
            if (fileList) fileList.style.display = 'none';
            if (emptyFileList) emptyFileList.style.display = 'flex';
        }
    }
    
    // 刷新文件列表
    function refreshFiles() {
        // 显示加载指示器
        showToast('info', '刷新中', '正在刷新文件列表...');
        
        // 这里应该调用API刷新文件列表
        setTimeout(() => {
            loadFiles();
            showToast('success', '刷新完成', '文件列表已更新');
        }, 1000);
    }
    
    // 排序文件
    function sortFiles(sortType) {
        currentSort = sortType;
        console.log('排序方式:', sortType);
        
        // 这里应该根据排序类型重新排序文件列表
        refreshFiles();
    }
    
    // 处理文件项点击
    function handleFileItemClick(e) {
        const fileItem = e.target.closest('.file-item');
        if (!fileItem) return;
        
        // 如果点击的是文件操作按钮，不处理选择逻辑
        if (e.target.closest('.file-actions') || e.target.closest('.file-checkbox')) {
            return;
        }
        
        // 处理Ctrl/Cmd键多选
        if (e.ctrlKey || e.metaKey) {
            toggleFileSelection(fileItem);
        } 
        // 处理Shift键范围选择
        else if (e.shiftKey && selectedFiles.length > 0) {
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
                clearFileSelection();
                
                // 选择范围内的所有文件
                range.forEach(item => {
                    selectFile(item);
                });
            }
        }
        // 普通点击
        else {
            // 如果是文件夹，模拟导航进入
            if (fileItem.classList.contains('folder')) {
                navigateToFolder(fileItem.querySelector('.file-name').textContent);
            } 
            // 如果是文件，模拟打开文件
            else {
                // 清除之前的选择
                clearFileSelection();
                
                // 选择当前文件
                selectFile(fileItem);
                
                // 模拟打开文件
                const fileName = fileItem.querySelector('.file-name').textContent;
                console.log('打开文件:', fileName);
            }
        }
        
        // 更新工具栏状态
        updateToolbar();
    }
    
    // 切换文件选择状态
    function toggleFileSelection(fileItem) {
        if (fileItem.classList.contains('selected')) {
            deselectFile(fileItem);
        } else {
            selectFile(fileItem);
        }
    }
    
    // 选择文件
    function selectFile(fileItem) {
        fileItem.classList.add('selected');
        const checkbox = fileItem.querySelector('.item-checkbox');
        if (checkbox) checkbox.checked = true;
        
        // 添加到选中文件数组
        const fileName = fileItem.querySelector('.file-name').textContent;
        if (!selectedFiles.includes(fileName)) {
            selectedFiles.push(fileName);
        }
    }
    
    // 取消选择文件
    function deselectFile(fileItem) {
        fileItem.classList.remove('selected');
        const checkbox = fileItem.querySelector('.item-checkbox');
        if (checkbox) checkbox.checked = false;
        
        // 从选中文件数组中移除
        const fileName = fileItem.querySelector('.file-name').textContent;
        selectedFiles = selectedFiles.filter(name => name !== fileName);
    }
    
    // 清除所有文件选择
    function clearFileSelection() {
        document.querySelectorAll('.file-item.selected').forEach(item => {
            deselectFile(item);
        });
        selectedFiles = [];
    }
    
    // 更新工具栏状态
    function updateToolbar() {
        if (selectedFiles.length > 0) {
            fileActionsToolbar.style.display = 'flex';
            selectedCountElement.textContent = selectedFiles.length;
        } else {
            fileActionsToolbar.style.display = 'none';
        }
    }
    
    // 处理文件操作
    function handleFileAction(e) {
        const actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;
        
        e.stopPropagation();
        const action = actionBtn.dataset.action;
        const fileItem = actionBtn.closest('.file-item');
        const fileName = fileItem.querySelector('.file-name').textContent;
        
        switch(action) {
            case 'download':
                downloadFile(fileName);
                break;
            case 'share':
                shareFile(fileName);
                break;
            case 'delete':
                deleteFile(fileName);
                break;
        }
    }
    
    // 处理批量操作
    function handleBulkAction(e) {
        const action = e.currentTarget.title.toLowerCase();
        
        switch(action) {
            case '下载':
                downloadFiles(selectedFiles);
                break;
            case '分享':
                shareFiles(selectedFiles);
                break;
            case '移动':
                moveFiles(selectedFiles);
                break;
            case '重命名':
                if (selectedFiles.length === 1) {
                    renameFile(selectedFiles[0]);
                } else {
                    showToast('warning', '操作受限', '一次只能重命名一个文件');
                }
                break;
            case '删除':
                deleteFiles(selectedFiles);
                break;
        }
    }
    
    // 下载文件
    function downloadFile(fileName) {
        console.log('下载文件:', fileName);
        showToast('info', '开始下载', `正在下载 ${fileName}`);
    }
    
    // 批量下载文件
    function downloadFiles(fileNames) {
        console.log('批量下载文件:', fileNames);
        showToast('info', '开始下载', `正在下载 ${fileNames.length} 个文件`);
    }
    
    // 分享文件
    function shareFile(fileName) {
        console.log('分享文件:', fileName);
        showToast('success', '分享成功', `已创建 ${fileName} 的分享链接`);
    }
    
    // 批量分享文件
    function shareFiles(fileNames) {
        console.log('批量分享文件:', fileNames);
        showToast('success', '分享成功', `已创建 ${fileNames.length} 个文件的分享链接`);
    }
    
    // 移动文件
    function moveFiles(fileNames) {
        console.log('移动文件:', fileNames);
        // 这里应该显示文件夹选择对话框
        showToast('info', '功能开发中', '文件移动功能正在开发中');
    }
    
    // 重命名文件
    function renameFile(fileName) {
        const newName = prompt('请输入新的文件名:', fileName);
        if (newName && newName !== fileName) {
            console.log('重命名文件:', fileName, '->', newName);
            showToast('success', '重命名成功', `${fileName} 已重命名为 ${newName}`);
            refreshFiles();
        }
    }
    
    // 删除文件
    function deleteFile(fileName) {
        if (confirm(`确定要删除 ${fileName} 吗？`)) {
            console.log('删除文件:', fileName);
            showToast('success', '删除成功', `${fileName} 已移至回收站`);
            refreshFiles();
        }
    }
    
    // 批量删除文件
    function deleteFiles(fileNames) {
        if (confirm(`确定要删除这 ${fileNames.length} 个文件吗？`)) {
            console.log('批量删除文件:', fileNames);
            showToast('success', '删除成功', `${fileNames.length} 个文件已移至回收站`);
            refreshFiles();
        }
    }
    
    // 导航到文件夹
    function navigateToFolder(folderName) {
        console.log('进入文件夹:', folderName);
        
        // 更新面包屑导航
        const breadcrumb = document.querySelector('.breadcrumb');
        if (breadcrumb) {
            const currentPath = breadcrumb.querySelector('.current');
            if (currentPath) {
                // 将当前路径变为普通路径
                currentPath.classList.remove('current');
                
                // 添加分隔符
                const separator = document.createElement('i');
                separator.className = 'fas fa-chevron-right path-separator';
                breadcrumb.appendChild(separator);
                
                // 添加新路径
                const newPath = document.createElement('span');
                newPath.className = 'path-item current';
                newPath.innerHTML = `<i class="fas fa-folder"></i> ${folderName}`;
                breadcrumb.appendChild(newPath);
            }
        }
        
        // 这里应该调用API获取文件夹内容
        refreshFiles();
    }
    
    // 获取认证Token
    function getAuthToken() {
        // 实际应用中应该从安全的地方获取，而不是硬编码
        return localStorage.getItem('token') || 'Bearer eyJhbGciOiJIUzM4NCJ9.eyJ1c2VybmFtZSI6InRlc3QiLCJpYXQiOjE3NDk3MDkxMjUsImV4cCI6MTc0OTcyMzUyNX0.J0_50b3C6pW7ab27SPiBMYvK7T14aQ_pYFaluue1VAnIWF1_UlaUxV91TxfExJIp';
    }
    
    // 显示通知消息
    function showToast(type, title, message) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon;
        switch(type) {
            case 'success':
                icon = 'fas fa-check-circle';
                break;
            case 'error':
                icon = 'fas fa-exclamation-circle';
                break;
            case 'warning':
                icon = 'fas fa-exclamation-triangle';
                break;
            case 'info':
            default:
                icon = 'fas fa-info-circle';
                break;
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
        
        toastContainer.appendChild(toast);
        
        // 添加关闭事件
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });
        
        // 自动关闭
        setTimeout(() => {
            toast.classList.add('toast-hide');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 5000);
    }
    
    // 切换暗黑模式
    function toggleDarkMode() {
        darkMode = !darkMode;
        document.body.classList.toggle('dark-mode', darkMode);
        
        // 切换图标
        const icon = themeToggle.querySelector('i');
        if (darkMode) {
            icon.classList.replace('fa-moon', 'fa-sun');
        } else {
            icon.classList.replace('fa-sun', 'fa-moon');
        }
        
        // 保存用户偏好
        localStorage.setItem('darkMode', darkMode);
        
        // 显示提示
        showToast('info', darkMode ? '已切换到暗黑模式' : '已切换到亮色模式', '您可以随时通过右上角的按钮切换主题');
    }
    
    // 初始化应用
    init();
}); 