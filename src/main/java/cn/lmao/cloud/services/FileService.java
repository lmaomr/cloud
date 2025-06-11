package cn.lmao.cloud.services;


import org.slf4j.Logger;
import org.springframework.stereotype.Service;

import cn.lmao.cloud.exception.CustomException;
import cn.lmao.cloud.model.dto.FileUploadResponse;
import cn.lmao.cloud.model.entity.Cloud;
import cn.lmao.cloud.model.entity.File;
import cn.lmao.cloud.model.enums.ExceptionCodeMsg;
import cn.lmao.cloud.repository.FileRepository;
import cn.lmao.cloud.util.FileHashUtil;
import cn.lmao.cloud.util.FileUploadUtil;
import cn.lmao.cloud.util.LogUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.NoSuchAlgorithmException;
import java.util.Optional;
import java.util.concurrent.locks.ReentrantLock;

@Service
@RequiredArgsConstructor
public class FileService {

    private final Logger log = LogUtil.getLogger();
    private final FileRepository fileRepository;
    private final UserService userService;
    private final CloudService cloudService;
    private final FileUploadUtil fileUploadUtil;

    // 可重入锁，用于保证文件操作的线程安全
    private final ReentrantLock fileLock = new ReentrantLock();
    /**
     * 文件上传方法
     * 
     * @param file   上传的文件对象
     * @param userId 当前用户ID
     * @return 文件上传响应DTO
     * @throws IOException 文件操作异常
     * 
     * 处理流程：
     * 1. 获取用户云盘信息
     * 2. 检查云盘剩余空间
     * 3. 存储物理文件到磁盘
     * 4. 保存文件元数据到数据库
     * 5. 更新云盘使用空间
     */
    @Transactional(rollbackFor = Exception.class)
    public FileUploadResponse uploadFile(MultipartFile file, Long userId) throws IOException {
        fileLock.lock(); // 获取锁，保证线程安全
        try {
            // 1. 验证用户云盘是否存在
            Cloud cloud = userService.getCloud(userId);

            if (cloud == null) {
                throw new CustomException(ExceptionCodeMsg.CLOUD_NOT_FOUND);
            }

            // 2. 检查云盘空间是否足够
            if (cloud.getUsedCapacity() + file.getSize() > cloud.getTotalCapacity()) {
                throw new CustomException(ExceptionCodeMsg.STORAGE_QUOTA_EXHAUSTED);
            }

            String fileHash = FileHashUtil.calculateSha256(file);
            Optional<File> hashFile = fileRepository.findFirstByHashOrderByIdDesc(fileHash);
            if (hashFile.isPresent()) {
                // newFile.setFileUrl(storedPath); // 存储路径
                log.info("文件已存在，直接返回已存在的文件信息：" + fileHash);
                // 如果文件已存在，直接返回已存在的文件信息
                // 5. 保存到数据库
                File existingFile = hashFile
                        .map(f -> {
                            File newFile = new File(f);
                            newFile.setCloud(cloud); // 关联云盘
                            return fileRepository.save(newFile);
                        })
                        .orElseThrow(() -> new CustomException(ExceptionCodeMsg.FILE_EMPTY));
                // 6. 更新云盘已用空间
                cloudService.updateCloudCapacity(cloud.getId(),file.getSize(), true);
                return new FileUploadResponse(existingFile);
            }

            // 4. 构建文件元数据实体
            File newFile = new File();
            newFile.setName(file.getOriginalFilename()); // 原始文件名
            newFile.setSize(file.getSize()); // 文件大小
            newFile.setType(file.getContentType()); // 文件类型
            newFile.setHash(FileHashUtil.calculateSha256(file)); // 文件哈希
            newFile.setCloud(cloud); // 关联云盘

            // 3. 存储物理文件到磁盘
            String filePath = fileUploadUtil.storeFile(file, userId);
            newFile.setPath(filePath); // 存储路径
            // 5. 保存到数据库
            File savedFile = fileRepository.save(newFile);
            // 6. 更新云盘已用空间
            cloudService.updateCloudCapacity(cloud.getId(),file.getSize(), true);
            return new FileUploadResponse(savedFile);
        } finally {
            fileLock.unlock(); // 释放锁
        }
    }

}