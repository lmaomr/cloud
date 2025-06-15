package cn.lmao.cloud.util;

import cn.lmao.cloud.exception.CustomException;
import cn.lmao.cloud.model.enums.ExceptionCodeMsg;

import org.apache.commons.io.FilenameUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
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

    @Value("${file.upload.path}")
    private String uploadRootDir;

    @Value("${spring.servlet.multipart.max-file-size}")
    private String maxFileSize;

    @Value("${spring.servlet.multipart.max-request-size}")
    public String maxRequestSize;

    /**
     * 存储上传的文件，并返回相对路径
     *
     * @param file   上传的文件
     * @param userId 用户ID
     * @return 文件的相对路径（如 "users/user_123/abc.jpg"）
     * @throws CustomException 文件操作失败时抛出
     */
    public String storeFile(MultipartFile file, Long userId) {
        validateFile(file);
        Path targetPath = buildTargetPath(file, userId);
        saveFileToTarget(file, targetPath);
        return generateRelativePath(userId, targetPath.getFileName().toString());
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
            throw new CustomException(ExceptionCodeMsg.FILE_EMPTY);
        }
    }

    // --- 安全关键方法 ---
    private String sanitizeFileName(String originalName) {
        if (originalName == null)
            return "";

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
        return safeName;
    }

    private Path buildTargetPath(MultipartFile file, Long userId) {
        Path userDir = Paths.get(uploadRootDir, USER_SUBDIR_PREFIX + userId);
        ensureDirectoryExists(userDir);

        // 二次验证路径是否在允许范围内
        if (!userDir.startsWith(Paths.get(uploadRootDir).normalize())) {
            throw new CustomException(ExceptionCodeMsg.FILE_PATH_INVALID);
        }

        String fileName = generateUniqueFileName(file);
        return userDir.resolve(sanitizeFileName(fileName));
    }

    private void ensureDirectoryExists(Path path) {
        try {
            Files.createDirectories(path);
        } catch (IOException e) {
            throw new CustomException(ExceptionCodeMsg.FILE_DIR_CREATE_FAIL);
        }
    }

    private String generateUniqueFileName(MultipartFile file) {
        String extension = FilenameUtils.getExtension(file.getOriginalFilename());
        return UUID.randomUUID() + "." + (extension != null ? extension : "");
    }

    private void saveFileToTarget(MultipartFile file, Path targetPath) {
        try (InputStream is = file.getInputStream()) {
            System.out.println("maxFileSize: " + maxFileSize);
            System.out.println("maxRequestSize: " + maxRequestSize);
            Files.copy(is, targetPath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new CustomException(ExceptionCodeMsg.FILE_UPLOAD_FAIL);
        }
    }

    private String generateRelativePath(Long userId, String fileName) {
        return USER_SUBDIR_PREFIX + userId + "/" + fileName;
    }

}