package cn.lmao.cloud.util;

import cn.lmao.cloud.exception.CustomException;
import cn.lmao.cloud.model.enums.ExceptionCodeMsg;
import jakarta.servlet.http.HttpServletResponse;

import org.apache.commons.io.FilenameUtils;
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
     * 下载文件
     * 
     * @param filePath 文件路径
     * @param response 响应
     * @throws IOException
     */
    public void downloadFile(Path filePath, Long userId, String fileName, HttpServletResponse response) throws IOException {
        Path resolvedPath = Path.of(generateRelativePath(userId, filePath.toString()));
        System.out.println("下载路径: " + resolvedPath);
        // 2. 检查文件是否存在
        if (!Files.exists(resolvedPath)) {
            throw new CustomException(ExceptionCodeMsg.FILE_NOT_FOUND);
        }

        // 3. 设置响应头（支持中文文件名）
        String encodedFileName = URLEncoder.encode(
                fileName,
                StandardCharsets.UTF_8);
        response.setContentType("application/octet-stream");
        response.setHeader(
                "Content-Disposition",
                "attachment; filename*=UTF-8''" + encodedFileName);

        // 4. 分块传输文件
        try (InputStream in = Files.newInputStream(resolvedPath);
                OutputStream out = response.getOutputStream()) {
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = in.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
            }
        }
    }

    /**
     * 删除文件
     * 
     * @param filePath 文件路径
     * @return 是否删除成功
     * @throws IOException
     */
    public boolean deleteFile(String filePath) throws IOException {
        Path path = Paths.get(uploadRootDir, filePath);
        return Files.deleteIfExists(path);
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
        // 检查用户目录是否存在，如果不存在则创建
        ensureDirectoryExists(userDir);
        // 生成唯一文件名
        // 并确保文件名不包含非法字符
        String fileName = generateUniqueFileName(file);
        return validateFilePath(userDir.resolve(sanitizeFileName(fileName)));
    }

    /**
     * 确保目录存在，如果不存在则创建
     *
     * @param path 目录路径
     * @throws CustomException 如果创建目录失败
     */
    private void ensureDirectoryExists(Path path) {
        try {
            Files.createDirectories(path);
        } catch (IOException e) {
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
        String extension = FilenameUtils.getExtension(file.getOriginalFilename());
        return UUID.randomUUID() + "." + (extension != null ? extension : "");
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
            Files.copy(is, targetPath, StandardCopyOption.REPLACE_EXISTING);
            if (!Files.exists(targetPath) || Files.size(targetPath) == 0) {
                throw new CustomException(ExceptionCodeMsg.FILE_UPLOAD_FAIL);
            }
        } catch (IOException e) {
            throw new CustomException(ExceptionCodeMsg.FILE_UPLOAD_FAIL);
        }
    }

    /**
     * 生成用户文件的相对路径
     *
     * @param userId   用户ID
     * @param fileName 文件名
     * @return 相对路径字符串
     */
    private String generateRelativePath(Long userId, String fileName) {
        return USER_SUBDIR_PREFIX + userId + "/" + fileName;
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
            throw new CustomException(ExceptionCodeMsg.FILE_SIZE_EXCEEDED);
        }
        if (file.getSize() <= 0 || file.isEmpty()) {
            throw new CustomException(ExceptionCodeMsg.FILE_EMPTY);
        }
    }

    /**
     * 检查文件路径是否合法
     *
     * @param filePath 文件路径
     * @throws CustomException 如果路径非法
     */
    public Path validateFilePath(Path filePath) {
        // 检查路径是否为空
        if (filePath == null) {
            throw new CustomException(ExceptionCodeMsg.FILE_PATH_INVALID);
        }

        // // 检查路径是否为绝对路径或空路径
        // if (filePath.isAbsolute() || filePath.getNameCount() == 0) {
        // throw new CustomException(ExceptionCodeMsg.FILE_PATH_INVALID);
        // }

        // 二次验证路径是否在允许范围内
        if (!filePath.startsWith(Paths.get(uploadRootDir).normalize())) {
            throw new CustomException(ExceptionCodeMsg.FILE_PATH_INVALID);
        }

        return filePath.normalize();
    }

}