package cn.lmao.cloud.util;

import cn.lmao.cloud.exception.CustomException;
import cn.lmao.cloud.model.enums.ExceptionCodeMsg;
import jakarta.servlet.http.HttpServletResponse;

import org.apache.commons.io.FilenameUtils;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class FileUtil {
    private static final String USER_SUBDIR_PREFIX = "users/user_";
    private static final Pattern INVALID_PATH_CHARS = Pattern.compile("[\\\\/:*?\"<>|]");
    private final Logger log = LogUtil.getLogger();

    @Value("${file.upload.path}")
    private String uploadRootDir;

    @Value("${spring.servlet.multipart.max-file-size}")
    private String maxFileSize;

    @Value("${spring.servlet.multipart.max-request-size}")
    public String maxRequestSize;

    public String toLocalhostUrl(String absolutePath) {
        // 替换路径分隔符并移除基础路径
        String relativePath = absolutePath
                .replace("\\", "/")
                .replace("D:/Cloud/upload", "");
        
        return "http://localhost:8080/local-upload" + relativePath;
    }

    /**
     * 存储上传的文件，并返回相对路径
     *
     * @param file   上传的文件
     * @param userId 用户ID
     * @return 文件的相对路径（如 "users/user_123/abc.jpg"）
     * @throws CustomException 文件操作失败时抛出
     */
    public String storeFile(MultipartFile file, Long userId) throws CustomException {
        log.info("开始存储文件: fileName={}, userId={}, size={}", 
                file.getOriginalFilename(), userId, file.getSize());
        
        validateFile(file);
        String fileName = sanitizeFileName(generateUniqueFileName(file));
        Path targetPath = buildTargetPath(userId, fileName);
        saveFileToTarget(file, targetPath);
        
        log.info("文件存储成功: path={}", targetPath);
        return targetPath.toString();
    }

    /**
     * 创建文件夹
     *
     * @param path 父路径
     * @param name 文件夹名称
     * @param userId 用户ID
     * @return 创建的文件夹路径
     * @throws CustomException 如果创建失败
     */
    public String createFolder(String path, String name, Long userId) throws CustomException {
        log.info("开始创建文件夹: path={}, name={}, userId={}", path, name, userId);
        
        if (name == null || name.trim().isEmpty()) {
            log.warn("创建文件夹失败: 文件夹名称为空");
            throw new CustomException(ExceptionCodeMsg.PARAM_ERROR);
        }
        
        Path targetPath = buildTargetPath(userId, name);
        
        try {
            // 检查路径是否已存在且不是目录
            if (Files.exists(targetPath) && !Files.isDirectory(targetPath)) {
                log.warn("创建文件夹失败: 路径已存在且不是目录: {}", targetPath);
                throw new CustomException(ExceptionCodeMsg.FILE_EXISTS);
            }
            
            // 创建目录
            ensureDirectoryExists(targetPath);
            log.info("文件夹创建成功: {}", targetPath);
            return targetPath.toString();
        } catch (SecurityException e) {
            log.error("创建文件夹权限不足: {}, 错误: {}", targetPath, e.getMessage());
            throw new CustomException(ExceptionCodeMsg.FILE_PERMISSION_DENIED);
        }
    }

    /**
     * 下载文件
     * 
     * @param filePath 文件路径
     * @param fileName 文件名
     * @param response HTTP响应对象
     * @throws IOException IO异常
     */
    public void downloadFile(Path filePath, String fileName, HttpServletResponse response) throws IOException {
        log.info("开始下载文件: path={}, fileName={}", filePath, fileName);
        
        // 检查文件是否存在
        if (!Files.exists(filePath)) {
            log.warn("下载文件失败: 文件不存在: {}", filePath);
            throw new CustomException(ExceptionCodeMsg.FILE_NOT_FOUND);
        }

        // 重置响应
        response.reset();

        // 设置响应头（支持中文文件名）
        String encodedFileName = URLEncoder.encode(fileName, StandardCharsets.UTF_8);
        response.setContentType("application/octet-stream");
        response.setHeader("Content-Disposition", "attachment; filename*=UTF-8''" + encodedFileName);

        // 分块传输文件
        try (InputStream in = Files.newInputStream(filePath);
                OutputStream out = response.getOutputStream()) {
            byte[] buffer = new byte[8192];
            int bytesRead;
            long totalBytes = 0;
            
            while ((bytesRead = in.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
                totalBytes += bytesRead;
            }
            
            log.info("文件下载完成: fileName={}, size={}", fileName, totalBytes);
        } catch (IOException e) {
            log.error("文件下载失败: {}, 错误: {}", filePath, e.getMessage());
            response.resetBuffer();
            throw new CustomException(ExceptionCodeMsg.FILE_NOT_FOUND);
        }
    }

    /**
     * 删除文件
     * 
     * @param filePath 文件路径
     * @return 是否删除成功
     * @throws CustomException 如果删除失败或文件不存在
     */
    public boolean deleteFile(Path filePath) throws CustomException {
        log.info("开始删除文件: {}", filePath);
        
        try {
            Path validatedPath = validateFilePath(filePath);
            if (!Files.exists(validatedPath)) {
                log.warn("删除文件失败: 文件不存在: {}", validatedPath);
                throw new CustomException(ExceptionCodeMsg.FILE_NOT_FOUND);
            }
            
            boolean result = Files.deleteIfExists(validatedPath);
            if (result) {
                log.info("文件删除成功: {}", validatedPath);
            } else {
                log.warn("文件删除失败: {}", validatedPath);
            }
            return result;
        } catch (IOException e) {
            log.error("删除文件IO异常: {}, 错误: {}", filePath, e.getMessage());
            throw new CustomException(ExceptionCodeMsg.DELETE_FILE_FAIL);
        } catch (SecurityException e) {
            log.error("删除文件权限不足: {}, 错误: {}", filePath, e.getMessage());
            throw new CustomException(ExceptionCodeMsg.FILE_PERMISSION_DENIED);
        }
    }

    /**
     * 获取文件上传根目录
     */
    public String getUploadRootDir() {
        return uploadRootDir;
    }

    // --- 文件非空判断方法 ---
    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            log.warn("文件验证失败: 文件为空");
            throw new CustomException(ExceptionCodeMsg.FILE_EMPTY);
        }
    }

    // --- 安全关键方法 ---
    private String sanitizeFileName(String originalName) {
        if (originalName == null) {
            log.warn("文件名净化: 原始文件名为null");
            return "";
        }

        // 移除路径遍历字符和非法字符
        String safeName = INVALID_PATH_CHARS.matcher(originalName).replaceAll("");
        safeName = safeName.replaceAll("\\.\\.", ""); // 防止 ../

        // 保留最后一个点作为扩展名分隔符
        int lastDot = safeName.lastIndexOf('.');
        if (lastDot > 0) {
            String name = safeName.substring(0, lastDot);
            String ext = safeName.substring(lastDot + 1);
            return name + "." + ext;
        }
        
        if (!safeName.equals(originalName)) {
            log.debug("文件名已净化: {} -> {}", originalName, safeName);
        }
        
        return safeName;
    }

    private Path buildTargetPath(Long userId, String fileName) {
        Path userDir = Paths.get(uploadRootDir, USER_SUBDIR_PREFIX + userId);
        // 检查用户目录是否存在，如果不存在则创建
        ensureDirectoryExists(userDir);
        // 生成唯一文件名并确保文件名不包含非法字符
        return validateFilePath(userDir.resolve(fileName));
    }

    /**
     * 确保目录存在，如果不存在则创建
     *
     * @param path 目录路径
     * @throws CustomException 如果创建目录失败
     */
    private void ensureDirectoryExists(Path path) {
        try {
            if (!Files.exists(path)) {
                log.debug("创建目录: {}", path);
            Files.createDirectories(path);
            }
        } catch (IOException e) {
            log.error("创建目录失败: {}, 错误: {}", path, e.getMessage());
            throw new CustomException(ExceptionCodeMsg.FILE_DIR_CREATE_FAIL);
        }
    }

    /**
     * 生成唯一的文件名，避免文件名冲突
     *
     * @param file 上传的文件
     * @return 唯一的文件名
     */
    private String generateUniqueFileName(MultipartFile file) {
        String originalName = file.getOriginalFilename();
        String extension = FilenameUtils.getExtension(originalName);
        String uniqueName = UUID.randomUUID() + "." + (extension != null ? extension : "");
        log.debug("生成唯一文件名: {} -> {}", originalName, uniqueName);
        return uniqueName;
    }

    /**
     * 将上传的文件保存到目标路径
     *
     * @param file       上传的文件
     * @param targetPath 目标路径
     * @throws CustomException 如果保存文件失败
     */
    private void saveFileToTarget(MultipartFile file, Path targetPath) {
        try (InputStream is = file.getInputStream()) {
            // 判断文件大小是否超过限制
            checkFileSize(file);
            log.debug("保存文件到: {}, 大小: {}", targetPath, file.getSize());
            Files.copy(is, targetPath, StandardCopyOption.REPLACE_EXISTING);
            
            if (!Files.exists(targetPath) || Files.size(targetPath) == 0) {
                log.error("文件保存失败: 目标文件不存在或大小为0: {}", targetPath);
                throw new CustomException(ExceptionCodeMsg.FILE_UPLOAD_FAIL);
            }
        } catch (IOException e) {
            log.error("保存文件IO异常: {}, 错误: {}", targetPath, e.getMessage());
            throw new CustomException(ExceptionCodeMsg.FILE_UPLOAD_FAIL);
        }
    }

    /**
     * 检查文件大小是否超过限制
     *
     * @param file 文件
     * @throws CustomException 如果文件大小超过限制
     */
    public void checkFileSize(MultipartFile file) {
        long maxSize = FileSizeUtil.parseSize(maxFileSize);
        if (file.getSize() > maxSize) {
            log.warn("文件大小超过限制: 当前大小={}, 最大限制={}", file.getSize(), maxSize);
            throw new CustomException(ExceptionCodeMsg.FILE_SIZE_EXCEEDED);
        }
        if (file.getSize() <= 0 || file.isEmpty()) {
            log.warn("文件大小异常: 文件为空或大小为0");
            throw new CustomException(ExceptionCodeMsg.FILE_EMPTY);
        }
    }

    /**
     * 检查文件路径是否合法
     *
     * @param filePath 文件路径
     * @return 规范化后的路径
     * @throws CustomException 如果路径非法
     */
    public Path validateFilePath(Path filePath) {
        // 检查路径是否为空
        if (filePath == null) {
            log.warn("文件路径验证失败: 路径为null");
            throw new CustomException(ExceptionCodeMsg.FILE_PATH_INVALID);
        }

        // 规范化路径
        Path normalizedPath = filePath.normalize();

        // 检查路径是否在允许范围内
        if (!normalizedPath.startsWith(Paths.get(uploadRootDir))) {
            log.warn("文件路径验证失败: 路径不在允许范围内: {}", normalizedPath);
            throw new CustomException(ExceptionCodeMsg.FILE_PATH_INVALID);
        }

        // 检查是否包含系统关键目录
        String pathStr = normalizedPath.toString().toLowerCase();
        if (pathStr.contains("windows") || pathStr.contains("system32") || 
            pathStr.contains("boot") || pathStr.contains("etc") || 
            pathStr.contains("program files")) {
            log.warn("文件路径验证失败: 路径包含系统关键目录: {}", pathStr);
            throw new CustomException(ExceptionCodeMsg.FILE_PATH_INVALID);
        }

        return normalizedPath;
    }
}