// 文件操作相关功能
document.addEventListener('DOMContentLoaded', function() {
    // 视图切换
    const viewBtns = document.querySelectorAll('.view-btn');
    const fileList = document.querySelector('.file-list');
    
    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (btn.dataset.view === 'grid') {
                fileList.classList.remove('list-view');
            } else {
                fileList.classList.add('list-view');
            }
        });
    });

    // 侧边栏切换
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    // const mainContent = document.querySelector('.main-content'); // 这行注释掉，因为不再直接控制样式

    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        // 注意：这里移除了直接修改 mainContent 和 sidebarToggle 样式的代码，
        // 这些应该通过 CSS 的 @media 查询和 .sidebar.active 状态来控制。
    });

    // 文件操作
    const fileItems = document.querySelectorAll('.file-item');
    
    fileItems.forEach(item => {
        // 点击文件项
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.file-actions')) {
                console.log('打开文件:', item.querySelector('.file-name').textContent);
            }
        });

        // 文件操作按钮
        const actions = item.querySelectorAll('.file-actions i');
        actions.forEach(action => {
            action.addEventListener('click', (e) => {
                e.stopPropagation();
                const actionType = action.dataset.action;
                const fileName = item.querySelector('.file-name').textContent;
                
                switch(actionType) {
                    case 'download':
                        console.log('下载文件:', fileName);
                        break;
                    case 'share':
                        console.log('分享文件:', fileName);
                        break;
                    case 'delete':
                        console.log('删除文件:', fileName);
                        break;
                }
            });
        });
    });

    // 上传文件函数
    async function uploadFiles(files) {
        localStorage.setItem('token', 'Bearer eyJhbGciOiJIUzM4NCJ9.eyJ1c2VybmFtZSI6InRlc3QiLCJpYXQiOjE3NDk2NDkwOTMsImV4cCI6MTc0OTY2MzQ5M30.6nkootDckL9qj7nO1LFg2hhudNF9-DDf9M6tP7fSzwdEN6cUT_0YdilfzYzqd91G');
        const formData = new FormData();
        for (const file of files) {
            formData.append('file', file); // 后端接口的参数名是 'file'
        }

        try {
            // 假设后端上传接口是 /apis/files/upload
            const response = await fetch('/files/upload', {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': localStorage.getItem('token')
                }
            });

            const result = await response.json(); // 根据后端返回类型可能需要调整

            if (response.ok) {
                console.log(result.msg, result);
                // TODO: 上传成功后刷新文件列表
            } else {
                console.error('上传失败:', result);
                alert('上传失败: ' + result);
            }
        } catch (error) {
            console.error('上传过程中发生错误:', error);
            alert('上传过程中发生错误');
        }
    }

    // 上传按钮逻辑
    const uploadBtn = document.querySelector('.btn-primary');
    const fileInput = document.getElementById('fileInput');

    // 点击"新建"按钮触发文件选择
    uploadBtn.addEventListener('click', (e) => {
        // 阻止默认行为，防止触发表单提交或其他默认操作
        e.preventDefault(); 
        console.log('点击新建按钮，触发文件选择');
        fileInput.click(); // 触发隐藏的文件输入框点击事件
    });

    // 监听文件选择的变化
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            uploadFiles(files); // 调用上传函数
        } else {
            console.log('没有选择文件');
        }
        // 清空 file input 的值，以便下次选择相同文件也能触发 change 事件
        e.target.value = null;
    });

    // 搜索功能
    const searchInput = document.querySelector('.search-box input');
    searchInput.addEventListener('input', (e) => {
        console.log('搜索:', e.target.value);
    });

    // 导航菜单
    const navItems = document.querySelectorAll('nav ul li');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}); 