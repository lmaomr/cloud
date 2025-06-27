package cn.lmao.cloud.services;

import org.slf4j.Logger;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

import cn.lmao.cloud.exception.CustomException;
import cn.lmao.cloud.model.dto.FileUploadResponse;
import cn.lmao.cloud.model.dto.ChunkInfo;
import cn.lmao.cloud.model.dto.InitUploadResponse;
import cn.lmao.cloud.model.entity.Cloud;
import cn.lmao.cloud.model.entity.File;
import cn.lmao.cloud.model.entity.User;
import cn.lmao.cloud.model.enums.ExceptionCodeMsg;
import cn.lmao.cloud.model.enums.FileSizeUnit;
import cn.lmao.cloud.repository.FileRepository;
import cn.lmao.cloud.util.FileHashUtil;
import cn.lmao.cloud.util.FileUtil;
import cn.lmao.cloud.util.LogUtil;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.locks.ReentrantLock;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.Files;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class FileService {

    private final Logger log = LogUtil.getLogger();
    private final FileRepository fileRepository;
    private final UserService userService;
    private final CloudService cloudService;
    private final FileUtil fileUtil;
    private final FileHashUtil fileHashUtil;

    // 可重入锁，用于保证文件操作的线程安全
    private final ReentrantLock fileLock = new ReentrantLock();

    /**
     * 存储分片上传的临时信息
     */
    private final ConcurrentHashMap<String, InitUploadResponse> uploadTasks = new ConcurrentHashMap<>();
    
    /**
     * 存储已上传分片信息
     */
    private final ConcurrentHashMap<String, ConcurrentHashMap<Integer, Boolean>> uploadedChunks = new ConcurrentHashMap<>();

    @Value("${file.upload.path}")
    private String uploadPath;

    /**
     * 文件上传方法
     * 
     * @param file   上传的文件对象
     * @param userId 当前用户ID
     * @return 文件上传响应DTO
     * @throws IOException 文件操作异常
     * 
     *                     处理流程：
     *                     1. 获取用户云盘信息
     *                     2. 检查云盘剩余空间
     *                     3. 存储物理文件到磁盘
     *                     4. 保存文件元数据到数据库
     *                     5. 更新云盘使用空间
     */
    @Transactional(rollbackFor = Exception.class)
    public FileUploadResponse uploadFile(MultipartFile file, Long userId) throws IOException, CustomException {
        fileLock.lock(); // 获取锁，保证线程安全
        try {
            log.info("开始上传文件: fileName={}, size={}, userId={}", 
                    file.getOriginalFilename(), file.getSize(), userId);
            
            // 1. 验证用户云盘是否存在
            Cloud cloud = userService.getCloud(userId);

            if (cloud == null) {
                log.warn("上传失败: 用户云盘不存在, userId={}", userId);
                throw new CustomException(ExceptionCodeMsg.CLOUD_NOT_FOUND);
            }

            // 2. 检查云盘空间是否足够
            if (cloud.getUsedCapacity() + file.getSize() > cloud.getTotalCapacity()) {
                log.warn("上传失败: 云盘空间不足, userId={}, 当前已用={}, 总容量={}, 文件大小={}", 
                        userId, cloud.getUsedCapacity(), cloud.getTotalCapacity(), file.getSize());
                throw new CustomException(ExceptionCodeMsg.STORAGE_QUOTA_EXHAUSTED);
            }

            String fileHash = FileHashUtil.calculateSha256(file);
            Optional<File> hashFile = fileRepository.findFirstByHashOrderByIdDesc(fileHash);
            if (hashFile.isPresent()) {
                if (hashFile.get().getCloud().getUser().equals(cloud.getUser())
                        && hashFile.get().getStatus() == File.FileStatus.ACTIVE) {
                    log.info("文件已存在, 跳过上传: hash={}, fileName={}", fileHash, file.getOriginalFilename());
                    return new FileUploadResponse(hashFile.get(), true);
                }
                // 如果文件已存在，直接返回已存在的文件信息
                log.info("文件哈希已存在, 复用文件: hash={}", fileHash);
                // 5. 保存到数据库
                File existingFile = hashFile
                        .map(f -> {
                            File newFile = new File(f);
                            newFile.setCloud(cloud); // 关联云盘
                            // 确保文件路径是根目录（默认上传到根目录）
                            newFile.setPath(f.getPath());
                            return fileRepository.save(newFile);
                        })
                        .orElseThrow(() -> new CustomException(ExceptionCodeMsg.FILE_EMPTY));
                // 6. 更新云盘已用空间
                cloudService.updateCloudCapacity(cloud.getId(), file.getSize(), true);
                log.info("文件上传成功(复用): fileId={}, fileName={}, size={}", 
                        existingFile.getId(), existingFile.getName(), existingFile.getSize());
                return new FileUploadResponse(existingFile);
            }

            // 4. 构建文件元数据实体
            File newFile = new File();
            newFile.setName(file.getOriginalFilename()); // 原始文件名
            newFile.setSize(file.getSize()); // 文件大小
            newFile.setType(file.getContentType()); // 文件类型
            newFile.setHash(fileHash); // 文件哈希
            newFile.setCloud(cloud); // 关联云盘

            // 3. 存储物理文件到磁盘
            String filePath = fileUtil.storeFile(file, userId);
            if (filePath == null) {
                log.error("文件上传失败: 存储物理文件失败, fileName={}", file.getOriginalFilename());
                throw new CustomException(ExceptionCodeMsg.FILE_UPLOAD_FAILED);
            }
            // 确保文件路径是根目录（默认上传到根目录）
            newFile.setPath(filePath);

            // 5. 保存到数据库
            File savedFile = fileRepository.save(newFile);
            // 6. 更新云盘已用空间
            cloudService.updateCloudCapacity(cloud.getId(), file.getSize(), true);
            
            log.info("文件上传成功: fileId={}, fileName={}, path={}, size={}", 
                    savedFile.getId(), savedFile.getName(), savedFile.getPath(), savedFile.getSize());
            return new FileUploadResponse(savedFile);
        } finally {
            fileLock.unlock(); // 释放锁
        }
    }

    /**
     * 上传头像
     * 
     * @param avatar 头像文件
     * @param userId 用户ID
     * @return 头像上传响应DTO
     */
    @Transactional
    public FileUploadResponse uploadAvatar(MultipartFile avatar, User user) {
        log.info("开始上传头像: fileName={}, size={}, userId={}", 
                avatar.getOriginalFilename(), avatar.getSize(), user.getId());
        
        // 2. 验证头像文件是否为图片
        if (!avatar.getContentType().startsWith("image/")) {
            log.warn("上传头像失败: 头像文件不是图片, userId={}", user.getUsername());
            throw new CustomException(ExceptionCodeMsg.FILE_NOT_IMAGE);
        }

        //判断图片大小是否超过2MB
        if (avatar.getSize() > FileSizeUnit.MB.getBytes() * 2) {
            log.warn("上传头像失败: 头像文件大小超过2MB, userId={}", user.getUsername());
            throw new CustomException(ExceptionCodeMsg.FILE_SIZE_EXCEEDED);
        }

        String avatarPath = fileUtil.storeFile(avatar, user.getId());
        if (avatarPath == null) {
            log.error("上传头像失败: 存储物理文件失败, userId={}", user.getUsername());
            throw new CustomException(ExceptionCodeMsg.FILE_UPLOAD_FAILED);
        }

        user.setAvatarUrl(fileUtil.toLocalhostUrl(avatarPath));
        userService.updateUser(user);
        return new FileUploadResponse(avatarPath);
    }

    /**
     * 下载文件
     * 
     * @param fileId 文件ID
     * @param userId 用户ID
     * @param response HTTP响应对象
     * @throws IOException IO异常
     */
    @Transactional
    public void downloadFile(Long fileId, Long userId, HttpServletResponse response) throws IOException {
        log.info("开始下载文件: fileId={}, userId={}", fileId, userId);
        
        // 1. 验证用户云盘是否存在
        Cloud cloud = userService.getCloud(userId);
        if (cloud == null) {
            log.warn("下载失败: 用户云盘不存在, userId={}", userId);
            throw new CustomException(ExceptionCodeMsg.CLOUD_NOT_FOUND);
        }

        // 2. 验证文件是否存在
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> {
                    log.warn("下载失败: 文件不存在, fileId={}", fileId);
                    return new CustomException(ExceptionCodeMsg.FILE_EMPTY);
                });

        // 3. 验证文件是否属于当前用户
        if (!file.getCloud().getUser().getId().equals(userId)) {
            log.warn("下载失败: 文件不属于当前用户, fileId={}, userId={}, ownerId={}", 
                    fileId, userId, file.getCloud().getUser().getId());
            throw new CustomException(ExceptionCodeMsg.FILE_EMPTY);
        }

        Path filePath = file.getPath() == null ? null : Path.of(file.getPath());
        
        // 3. 验证文件状态
        if (file.getStatus() != File.FileStatus.ACTIVE) {
            log.warn("下载失败: 文件状态异常, fileId={}, status={}", fileId, file.getStatus());
            throw new CustomException(ExceptionCodeMsg.FILE_NOT_FOUND);
        }

        // 5. 返回文件下载响应
        fileUtil.downloadFile(filePath, file.getName(), response);
    }

    /**
     * 获取文件列表（基础方法，不包含排序和路径过滤）
     * 
     * @param cloud 用户云盘
     * @return 文件列表
     */
    public List<File> getFileList(Cloud cloud) {
        if (cloud == null) {
            log.error(ExceptionCodeMsg.CLOUD_NOT_FOUND.getMsg());
            throw new CustomException(ExceptionCodeMsg.CLOUD_NOT_FOUND);
        }
        return fileRepository.findByCloudAndStatus(cloud, File.FileStatus.ACTIVE);
    }

    /**
     * 获取文件列表（支持路径过滤和排序）
     * 
     * @param cloud 用户云盘
     * @param path  文件路径
     * @param sort  排序方式
     * @return 文件列表
     */
    public List<File> getFileList(Cloud cloud, String path, String sort) {
        if (cloud == null) {
            log.error(ExceptionCodeMsg.CLOUD_NOT_FOUND.getMsg());
            throw new CustomException(ExceptionCodeMsg.CLOUD_NOT_FOUND);
        }

        log.info("获取文件列表: 用户ID={}, 路径={}, 排序={}", cloud.getUser().getId(), path, sort);

        // 获取用户所有文件
        List<File> allFiles = fileRepository.findByCloudAndStatus(cloud, File.FileStatus.ACTIVE);
        log.info("用户总文件数: {}", allFiles.size());

        List<File> filteredFiles = new ArrayList<>();

        // 根据路径过滤文件
        for (File file : allFiles) {
            // 获取文件所在目录
            String fileDirectory = getFileDirectory(file);

            // 如果文件路径与当前请求路径相符，则添加到过滤后的列表中
            if (fileDirectory.equals(path)) {
                filteredFiles.add(file);
                log.debug("文件匹配当前路径: 名称={}, 路径={}, 目录={}",
                        file.getName(), file.getPath(), fileDirectory);
            } else {
                log.debug("文件不匹配当前路径: 名称={}, 路径={}, 目录={}, 请求路径={}",
                        file.getName(), file.getPath(), fileDirectory, path);
            }
        }

        log.info("过滤后文件数: {}", filteredFiles.size());

        // 根据排序参数对文件列表进行排序
        sortFiles(filteredFiles, sort);

        return filteredFiles;
    }

    /**
     * 获取文件所在目录
     * 
     * @param file 文件对象
     * @return 文件所在目录路径
     */
    private String getFileDirectory(File file) {
        // 从文件路径中提取目录信息
        String filePath = file.getPath();
        log.debug("获取文件目录: 文件名={}, 路径={}", file.getName(), filePath);

        if (filePath == null || filePath.isEmpty()) {
            return "/"; // 默认为根目录
        }

        // 如果路径就是文件名（没有目录部分），则返回根目录
        if (filePath.equals("/" + file.getName())) {
            return "/";
        }

        // 提取目录部分
        int lastSlashIndex = filePath.lastIndexOf('/');
        if (lastSlashIndex <= 0) {
            return "/"; // 如果没有斜杠或斜杠在开头，返回根目录
        }

        String directory = filePath.substring(0, lastSlashIndex);
        // 确保目录以/开头
        if (!directory.startsWith("/")) {
            directory = "/" + directory;
        }

        log.debug("文件 {} 所在目录: {}", file.getName(), directory);
        return directory;
    }

    /**
     * 根据排序参数对文件列表进行排序
     * 
     * @param files 文件列表
     * @param sort  排序参数
     */
    private void sortFiles(List<File> files, String sort) {
        if (sort == null || sort.isEmpty()) {
            return;
        }

        switch (sort) {
            case "name-asc":
                files.sort(Comparator.comparing(File::getName));
                break;
            case "name-desc":
                files.sort(Comparator.comparing(File::getName).reversed());
                break;
            case "time-asc":
                files.sort(Comparator.comparing(File::getCreateTime));
                break;
            case "time-desc":
                files.sort(Comparator.comparing(File::getCreateTime).reversed());
                break;
            case "size-asc":
                files.sort(Comparator.comparing(File::getSize));
                break;
            case "size-desc":
                files.sort(Comparator.comparing(File::getSize).reversed());
                break;
            default:
                // 默认按名称升序排序
                files.sort(Comparator.comparing(File::getName));
                break;
        }
    }

    /**
     * 创建文件夹
     * 
     * @param path   父路径
     * @param name   文件夹名称
     * @param userId 用户ID
     * @return 创建的文件夹实体
     */
    public File createFolder(String path, String name, Long userId) {
        fileLock.lock(); // 获取锁，保证线程安全
        try {
            log.info("开始创建文件夹: path={}, name={}, userId={}", path, name, userId);
            
            // 1. 验证用户云盘是否存在
            Cloud cloud = userService.getCloud(userId);
            if (cloud == null) {
                log.warn("创建文件夹失败: 用户云盘不存在, userId={}", userId);
                throw new CustomException(ExceptionCodeMsg.CLOUD_NOT_FOUND);
            }

            // 2. 构建文件夹元数据
            File folder = new File();
            folder.setName(name);
            folder.setType("folder"); // 设置类型为文件夹
            folder.setSize(0L); // 文件夹大小为0
            folder.setCloud(cloud); // 关联云盘

            // 3. 构建文件夹路径
            String folderPath = fileUtil.createFolder(path, name, userId);
            folder.setPath(folderPath);

            // 4. 生成文件夹哈希值（可以使用路径作为哈希）
            folder.setHash("folder_" + folderPath.hashCode());

            // 5. 保存到数据库
            File savedFolder = fileRepository.save(folder);
            log.info("文件夹创建成功: folderId={}, name={}, path={}", 
                    savedFolder.getId(), savedFolder.getName(), savedFolder.getPath());
            return savedFolder;
        } finally {
            fileLock.unlock(); // 释放锁
        }
    }

    /**
     * 文件重命名
     * 
     * @param fileId 文件ID
     * @param newName 新文件名
     * @param userId 用户ID
     * @return 重命名后的文件实体
     * @throws IOException IO异常
     */
    @Transactional
    public File renameFile(Long fileId, String newName, Long userId) throws IOException {
        fileLock.lock(); // 获取锁，保证线程安全
        try {
            log.info("开始重命名文件: fileId={}, newName={}, userId={}", fileId, newName, userId);
            
            // 1. 验证用户云盘是否存在
            Cloud cloud = userService.getCloud(userId);
            if (cloud == null) {
                log.warn("重命名失败: 用户云盘不存在, userId={}", userId);
                throw new CustomException(ExceptionCodeMsg.CLOUD_NOT_FOUND);
            }

            // 2. 验证文件是否存在
            File file = fileRepository.findById(fileId)
                    .orElseThrow(() -> {
                        log.warn("重命名失败: 文件不存在, fileId={}", fileId);
                        return new CustomException(ExceptionCodeMsg.FILE_EMPTY);
                    });

            // 3. 验证文件是否属于当前用户
            if (!file.getCloud().getUser().getId().equals(userId)) {
                log.warn("重命名失败: 文件不属于当前用户, fileId={}, userId={}, ownerId={}", 
                        fileId, userId, file.getCloud().getUser().getId());
                throw new CustomException(ExceptionCodeMsg.FILE_EMPTY);
            }

            // 4. 更新文件名
            String oldName = file.getName();
            file.setName(newName);
            file.setPath(file.getPath().replace(file.getName(), newName));
            File savedFile = fileRepository.save(file);
            
            log.info("文件重命名成功: fileId={}, oldName={}, newName={}", 
                    fileId, oldName, newName);
            return savedFile;
        } finally {
            fileLock.unlock(); // 释放锁
        }
    }

    /**
     * 删除文件
     * 
     * @param fileId 文件ID
     * @param userId 用户ID
     */
    @Transactional
    public void deleteFile(Long fileId, Long userId) {
        fileLock.lock(); // 获取锁，保证线程安全
        try {
            log.info("开始删除文件: fileId={}, userId={}", fileId, userId);
            
            // 1. 验证用户云盘是否存在
            Cloud cloud = userService.getCloud(userId);
            if (cloud == null) {
                log.warn("删除失败: 用户云盘不存在, userId={}", userId);
                throw new CustomException(ExceptionCodeMsg.CLOUD_NOT_FOUND);
            }

            // 2. 验证文件是否属于当前用户
            File file = fileRepository.findById(fileId)
                    .orElseThrow(() -> {
                        log.warn("删除失败: 文件不存在, fileId={}", fileId);
                        return new CustomException(ExceptionCodeMsg.FILE_EMPTY);
                    });
                    
            if (!file.getCloud().getUser().getId().equals(userId)) {
                log.warn("删除失败: 文件不属于当前用户, fileId={}, userId={}, ownerId={}", 
                        fileId, userId, file.getCloud().getUser().getId());
                throw new CustomException(ExceptionCodeMsg.FILE_EMPTY);
            }

            // 3. 更新文件状态为已删除
            file.setStatus(File.FileStatus.DELETED);
            fileRepository.save(file);
            
            log.info("文件删除成功(移至回收站): fileId={}, fileName={}", fileId, file.getName());
        } finally {
            fileLock.unlock(); // 释放锁
        }
    }

    /**
     * 删除回收站文件
     * 
     * @param fileId 文件ID
     * @param userId 用户ID
     */
    @Transactional
    public void deleteTrashFile(Long fileId, Long userId) {
        fileLock.lock(); // 获取锁，保证线程安全
        try {
            log.info("开始永久删除回收站文件: fileId={}, userId={}", fileId, userId);
            
            // 1. 验证用户云盘是否存在
            Cloud cloud = userService.getCloud(userId);
            if (cloud == null) {
                log.warn("永久删除失败: 用户云盘不存在, userId={}", userId);
                throw new CustomException(ExceptionCodeMsg.CLOUD_NOT_FOUND);
            }

            // 2. 验证文件是否属于当前用户
            File file = fileRepository.findById(fileId)
                    .orElseThrow(() -> {
                        log.warn("永久删除失败: 文件不存在, fileId={}", fileId);
                        return new CustomException(ExceptionCodeMsg.FILE_EMPTY);
                    });
                    
            if (!file.getCloud().getUser().getId().equals(userId)) {
                log.warn("永久删除失败: 文件不属于当前用户, fileId={}, userId={}, ownerId={}", 
                        fileId, userId, file.getCloud().getUser().getId());
                throw new CustomException(ExceptionCodeMsg.FILE_EMPTY);
            }

            // 3. 删除数据库文件
            fileRepository.delete(file);

            // 4. 验证文件是否有其他用户在使用
            if (fileRepository.existsByHashAndOtherCloud(file.getHash(), cloud)) {
                log.info("文件正在被其他用户使用，跳过物理文件删除: fileId={}, hash={}", fileId, file.getHash());
                cloudService.updateCloudCapacity(cloud.getId(), file.getSize(), false);
                return;
            }

            // 5. 删除物理文件
            fileUtil.deleteFile(Path.of(file.getPath()));
            
            // 更新云盘已用空间
            cloudService.updateCloudCapacity(cloud.getId(), file.getSize(), false);
            
            log.info("文件永久删除成功: fileId={}, fileName={}, size={}", 
                    fileId, file.getName(), file.getSize());
        } finally {
            fileLock.unlock(); // 释放锁
        }
    }

    /**
     * 恢复回收站文件
     * 
     * @param fileId 文件ID
     * @param userId 用户ID
     */
    @Transactional
    public void restoreTrashFile(Long fileId, Long userId) {
        fileLock.lock(); // 获取锁，保证线程安全
        try {
            log.info("开始恢复回收站文件: fileId={}, userId={}", fileId, userId);
            
            // 1. 验证用户云盘是否存在
            Cloud cloud = userService.getCloud(userId);
            if (cloud == null) {
                log.warn("恢复失败: 用户云盘不存在, userId={}", userId);
                throw new CustomException(ExceptionCodeMsg.CLOUD_NOT_FOUND);
            }

            // 2. 验证文件是否属于当前用户
            File file = fileRepository.findById(fileId)
                    .orElseThrow(() -> {
                        log.warn("恢复失败: 文件不存在, fileId={}", fileId);
                        return new CustomException(ExceptionCodeMsg.FILE_EMPTY);
                    });
                    
            if (!file.getCloud().getUser().getId().equals(userId)) {
                log.warn("恢复失败: 文件不属于当前用户, fileId={}, userId={}, ownerId={}", 
                        fileId, userId, file.getCloud().getUser().getId());
                throw new CustomException(ExceptionCodeMsg.FILE_EMPTY);
            }

            // 3. 恢复文件状态
            file.setStatus(File.FileStatus.ACTIVE);
            fileRepository.save(file);
            
            log.info("文件恢复成功: fileId={}, fileName={}", fileId, file.getName());
        } finally {
            fileLock.unlock(); // 释放锁
        }
    }

    /**
     * 获取回收站列表
     * 
     * @param userId 用户ID
     * @return 回收站列表
     */
    public List<File> getTrashFiles(Long userId) {
        log.info("获取回收站文件列表: userId={}", userId);
        
        Cloud cloud = userService.getCloud(userId);
        if (cloud == null) {
            log.warn("获取回收站失败: 用户云盘不存在, userId={}", userId);
            throw new CustomException(ExceptionCodeMsg.CLOUD_NOT_FOUND);
        }

        List<File> trashFiles = fileRepository.findByCloudAndStatus(cloud, File.FileStatus.DELETED)
                .stream()
                .sorted(Comparator.comparing(File::getCreateTime).reversed())
                .toList();
                
        log.info("回收站文件列表获取成功: userId={}, fileCount={}", userId, trashFiles.size());
        return trashFiles;
    }
    
    /**
     * 初始化分片上传
     * 
     * @param fileName 文件名
     * @param fileSize 文件大小
     * @param chunkSize 分片大小
     * @param path 上传路径
     * @param userId 用户ID
     * @return 初始化上传响应
     */
    public InitUploadResponse initChunkedUpload(String fileName, Long fileSize, Integer chunkSize, String path, Long userId) {
        log.info("初始化分片上传: fileName={}, fileSize={}, chunkSize={}, path={}, userId={}",
                fileName, fileSize, chunkSize, path, userId);
        
        // 检查用户存储空间是否足够
        Cloud userCloud = userService.getCloud(userId);
        if (userCloud.getUsedCapacity() + fileSize > userCloud.getTotalCapacity()) {
            log.warn("存储空间不足: userId={}, fileSize={}, usedCapacity={}, totalCapacity={}",
                    userId, fileSize, userCloud.getUsedCapacity(), userCloud.getTotalCapacity());
            throw new CustomException(ExceptionCodeMsg.CLOUD_CAPACITY_NOT_ENOUGH);
        }
        
        // 生成唯一的上传ID
        String uploadId = UUID.randomUUID().toString();
        
        // 计算总分片数
        int totalChunks = (int) Math.ceil((double) fileSize / chunkSize);
        
        // 创建上传任务信息
        InitUploadResponse uploadInfo = new InitUploadResponse(
                uploadId, fileName, fileSize, chunkSize, totalChunks, path);
        
        // 存储上传任务信息
        uploadTasks.put(uploadId, uploadInfo);
        
        // 初始化分片记录
        uploadedChunks.put(uploadId, new ConcurrentHashMap<>());
        
        // 创建临时目录
        try {
            java.io.File tempDir = new java.io.File(uploadPath, "temp/" + uploadId);
            if (!tempDir.exists()) {
                tempDir.mkdirs();
            }
        } catch (Exception e) {
            log.error("创建临时目录失败: uploadId={}, error={}", uploadId, e.getMessage(), e);
            throw new CustomException(ExceptionCodeMsg.FILE_UPLOAD_FAIL);
        }
        
        log.info("初始化分片上传成功: uploadId={}, totalChunks={}", uploadId, totalChunks);
        return uploadInfo;
    }
    
    /**
     * 上传分片
     * 
     * @param uploadId 上传ID
     * @param chunkIndex 分片索引
     * @param file 分片文件
     * @param userId 用户ID
     * @return 分片信息
     */
    public ChunkInfo uploadChunk(String uploadId, Integer chunkIndex, MultipartFile file, Long userId) throws IOException {
        log.info("上传分片: uploadId={}, chunkIndex={}, fileSize={}, userId={}",
                uploadId, chunkIndex, file.getSize(), userId);
        
        // 检查上传任务是否存在
        InitUploadResponse uploadInfo = uploadTasks.get(uploadId);
        if (uploadInfo == null) {
            log.warn("上传任务不存在: uploadId={}", uploadId);
            throw new CustomException(ExceptionCodeMsg.FILE_UPLOAD_FAIL);
        }
        
        // 检查分片索引是否有效
        if (chunkIndex < 0 || chunkIndex >= uploadInfo.getTotalChunks()) {
            log.warn("分片索引无效: uploadId={}, chunkIndex={}, totalChunks={}",
                    uploadId, chunkIndex, uploadInfo.getTotalChunks());
            throw new CustomException(ExceptionCodeMsg.FILE_UPLOAD_FAIL);
        }
        
        // 获取分片记录
        ConcurrentHashMap<Integer, Boolean> chunks = uploadedChunks.get(uploadId);
        
        // 检查分片是否已上传
        if (chunks.containsKey(chunkIndex) && chunks.get(chunkIndex)) {
            log.warn("分片已上传: uploadId={}, chunkIndex={}", uploadId, chunkIndex);
            
            // 返回已上传分片数量
            int uploadedCount = chunks.size();
            return new ChunkInfo(uploadId, chunkIndex, uploadInfo.getTotalChunks(), uploadedCount, file.getSize());
        }
        
        // 保存分片文件
        try {
            // 创建临时文件路径
            String tempDirPath = uploadPath + "/temp/" + uploadId;
            Path chunkPath = Paths.get(tempDirPath, String.format("%d", chunkIndex));
            
            // 保存分片
            Files.copy(file.getInputStream(), chunkPath, StandardCopyOption.REPLACE_EXISTING);
            
            // 标记分片已上传
            chunks.put(chunkIndex, true);
            
            // 返回已上传分片数量
            int uploadedCount = chunks.size();
            log.info("分片上传成功: uploadId={}, chunkIndex={}, uploadedChunks={}/{}",
                    uploadId, chunkIndex, uploadedCount, uploadInfo.getTotalChunks());
            
            return new ChunkInfo(uploadId, chunkIndex, uploadInfo.getTotalChunks(), uploadedCount, file.getSize());
        } catch (IOException e) {
            log.error("保存分片失败: uploadId={}, chunkIndex={}, error={}", uploadId, chunkIndex, e.getMessage(), e);
            throw new CustomException(ExceptionCodeMsg.FILE_UPLOAD_FAIL);
        }
    }
    
    /**
     * 完成分片上传
     * 
     * @param uploadId 上传ID
     * @param userId 用户ID
     * @return 文件上传响应
     */
    public FileUploadResponse completeChunkedUpload(String uploadId, Long userId) throws IOException {
        log.info("完成分片上传: uploadId={}, userId={}", uploadId, userId);
        
        // 检查上传任务是否存在
        InitUploadResponse uploadInfo = uploadTasks.get(uploadId);
        if (uploadInfo == null) {
            log.warn("上传任务不存在: uploadId={}", uploadId);
            throw new CustomException(ExceptionCodeMsg.FILE_UPLOAD_FAIL);
        }
        
        // 获取分片记录
        ConcurrentHashMap<Integer, Boolean> chunks = uploadedChunks.get(uploadId);
        
        // 检查是否所有分片都已上传
        if (chunks.size() != uploadInfo.getTotalChunks()) {
            log.warn("分片上传不完整: uploadId={}, uploadedChunks={}, totalChunks={}",
                    uploadId, chunks.size(), uploadInfo.getTotalChunks());
            throw new CustomException(ExceptionCodeMsg.FILE_UPLOAD_FAIL);
        }
        
        try {
            // 合并分片
            String tempDirPath = uploadPath + "/temp/" + uploadId;
            String finalFilePath = getFinalFilePath(uploadInfo.getFileName(), uploadInfo.getPath());
            
            // 确保目标目录存在
            java.io.File targetDir = new java.io.File(finalFilePath).getParentFile();
            if (!targetDir.exists()) {
                targetDir.mkdirs();
            }
            
            // 创建目标文件
            java.io.File targetFile = new java.io.File(finalFilePath);
            
            // 使用NIO合并文件
            try (java.io.FileOutputStream fos = new java.io.FileOutputStream(targetFile)) {
                for (int i = 0; i < uploadInfo.getTotalChunks(); i++) {
                    Path chunkPath = Paths.get(tempDirPath, String.format("%d", i));
                    Files.copy(chunkPath, fos);
                }
            }
            
            // 计算文件哈希
            String fileHash = fileHashUtil.calculateSha256(targetFile);
            
            // 检查文件是否已存在（通过哈希值）
            File existingFile = fileRepository.findByHash(fileHash);
            if (existingFile != null) {
                log.info("文件已存在，使用现有文件: hash={}, existingFileId={}", fileHash, existingFile.getId());
                
                // 删除临时文件
                cleanupTempFiles(uploadId);
                
                // 更新用户云存储空间
                updateCloudStorage(userId, existingFile.getSize());
                
                // 返回现有文件信息
                return new FileUploadResponse(existingFile, true);
            }
            
            // 创建新文件记录
            File newFile = new File();
            newFile.setName(uploadInfo.getFileName());
            newFile.setPath(finalFilePath);
            newFile.setRelativePath(uploadInfo.getPath());
            newFile.setSize(uploadInfo.getFileSize());
            newFile.setHash(fileHash);
            
            // 设置文件类型
            String fileExtension = getFileExtension(uploadInfo.getFileName());
            newFile.setType(determineFileType(fileExtension));
            
            // 设置文件所属的云存储空间
            Cloud userCloud = userService.getCloud(userId);
            newFile.setCloud(userCloud);
            
            // 保存文件记录
            File savedFile = fileRepository.save(newFile);
            
            // 更新用户云存储空间
            updateCloudStorage(userId, savedFile.getSize());
            
            // 删除临时文件
            cleanupTempFiles(uploadId);
            
            // 从上传任务列表中移除
            uploadTasks.remove(uploadId);
            uploadedChunks.remove(uploadId);
            
            log.info("完成分片上传成功: uploadId={}, fileId={}, fileName={}, fileSize={}",
                    uploadId, savedFile.getId(), savedFile.getName(), savedFile.getSize());
            
            return new FileUploadResponse(savedFile, false);
        } catch (IOException e) {
            log.error("合并分片失败: uploadId={}, error={}", uploadId, e.getMessage(), e);
            
            // 清理临时文件
            cleanupTempFiles(uploadId);
            
            throw new CustomException(ExceptionCodeMsg.FILE_UPLOAD_FAIL);
        }
    }
    
    /**
     * 获取最终文件路径
     * 
     * @param fileName 文件名
     * @param relativePath 相对路径
     * @return 最终文件路径
     */
    private String getFinalFilePath(String fileName, String relativePath) {
        String baseDir = uploadPath;
        String path = relativePath.endsWith("/") ? relativePath : relativePath + "/";
        return baseDir + path + fileName;
    }
    
    /**
     * 获取文件扩展名
     * 
     * @param fileName 文件名
     * @return 文件扩展名
     */
    private String getFileExtension(String fileName) {
        int lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex > 0) {
            return fileName.substring(lastDotIndex + 1).toLowerCase();
        }
        return "";
    }
    
    /**
     * 根据文件扩展名确定文件类型
     * 
     * @param extension 文件扩展名
     * @return 文件类型
     */
    private String determineFileType(String extension) {
        if (extension.isEmpty()) {
            return "other";
        }
        
        switch (extension.toLowerCase()) {
            case "jpg":
            case "jpeg":
            case "png":
            case "gif":
            case "bmp":
                return "image/" + extension;
            case "doc":
            case "docx":
                return "application/msword";
            case "xls":
            case "xlsx":
                return "application/vnd.ms-excel";
            case "pdf":
                return "application/pdf";
            case "txt":
                return "text/plain";
            case "mp3":
            case "wav":
                return "audio/" + extension;
            case "mp4":
            case "avi":
            case "mkv":
                return "video/" + extension;
            default:
                return "application/octet-stream";
        }
    }
    
    /**
     * 更新云存储空间使用量
     * 
     * @param userId 用户ID
     * @param fileSize 文件大小
     */
    private void updateCloudStorage(Long userId, Long fileSize) {
        Cloud cloud = userService.getCloud(userId);
        if (cloud != null) {
            cloudService.updateCloudCapacity(cloud.getId(), fileSize, true);
        }
    }

    /**
     * 清理临时文件
     * 
     * @param uploadId 上传ID
     */
    private void cleanupTempFiles(String uploadId) {
        try {
            String tempDirPath = uploadPath + "/temp/" + uploadId;
            java.io.File tempDir = new java.io.File(tempDirPath);
            
            if (tempDir.exists() && tempDir.isDirectory()) {
                // 删除所有分片文件
                java.io.File[] files = tempDir.listFiles();
                if (files != null) {
                    for (java.io.File file : files) {
                        file.delete();
                    }
                }
                
                // 删除临时目录
                tempDir.delete();
            }
        } catch (Exception e) {
            log.warn("清理临时文件失败: uploadId={}, error={}", uploadId, e.getMessage());
        }
    }

}