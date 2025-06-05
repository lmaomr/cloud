// 简单的交互效果
document.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('click', function (e) {
        if (!e.target.closest('.file-action')) {
            this.classList.toggle('selected');
        }
    });
});

document.querySelectorAll('.file-action').forEach(btn => {
    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        alert('文件操作菜单');
    });
});

// 视图切换效果
document.querySelectorAll('.view-option').forEach(option => {
    option.addEventListener('click', function () {
        document.querySelector('.view-option.active').classList.remove('active');
        this.classList.add('active');

        // 这里可以添加实际的视图切换逻辑
        if (this.querySelector('.fa-list')) {
            console.log('切换到列表视图');
        } else {
            console.log('切换到网格视图');
        }
    });
});
