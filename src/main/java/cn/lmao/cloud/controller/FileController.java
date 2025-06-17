package cn.lmao.cloud.controller;

import cn.lmao.cloud.exception.CustomException;
import cn.lmao.cloud.model.dto.ApiResponse;
import cn.lmao.cloud.model.dto.FileUploadResponse;
import cn.lmao.cloud.model.entity.Cloud;
import cn.lmao.cloud.model.entity.File;
import cn.lmao.cloud.model.enums.ExceptionCodeMsg;
import cn.lmao.cloud.services.FileService;
import cn.lmao.cloud.services.UserService;
import cn.lmao.cloud.util.LogUtil;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

import org.slf4j.Logger;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/file")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;
    private final UserService userService;
    private final Logger log = LogUtil.getLogger();

    /**
     * 文件上传接口
     * 
     * @throws IOException
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<FileUploadResponse> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestHeader("Authorization") String authorization) throws IOException {
        log.info("上传文件: {}", file.getOriginalFilename());
        if (file.isEmpty()) {
            return ApiResponse.exception(ExceptionCodeMsg.FILE_EMPTY);
        }
        // 2. 从Token中提取用户ID
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Long userId = userService.getUserByName(username).getId();
        // 3. 处理文件上传
        return ApiResponse.success(fileService.uploadFile(file, userId));
    }

    /**
     * 文件下载接口
     * 
     * @param fileId 文件ID
     * @return 文件下载响应
     */
    @GetMapping("/download/{fileId}")
    public void downloadFile(@PathVariable String fileId, HttpServletResponse response) throws IOException {
        log.info("下载文件: 文件ID={}", fileId);

        if (fileId == null || fileId.trim().isEmpty()) {
            throw new CustomException(ExceptionCodeMsg.FILE_NOT_FOUND);
        }

        // 从安全上下文中获取当前用户
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Long userId = userService.getUserByName(username).getId();

        // 下载文件
        fileService.downloadFile(Long.parseLong(fileId), userId, response);
    }

    /**
     * 获取文件列表
     * 
     * @param path 文件路径，默认为根目录
     * @param sort 排序方式，默认按名称升序
     * @return 文件列表
     */
    @GetMapping("/list")
    public ApiResponse<List<File>> getFileList(
            @RequestParam(value = "path", defaultValue = "/") String path,
            @RequestParam(value = "sort", defaultValue = "name-asc") String sort) {
        log.info("获取文件列表: 路径={}, 排序方式={}", path, sort);

        // 从安全上下文中获取当前用户
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Long userId = userService.getUserByName(username).getId();
        Cloud userCloud = userService.getCloud(userId);

        return ApiResponse.success(fileService.getFileList(userCloud, path, sort));
    }

    /**
     * 创建文件夹
     * 
     * @param requestBody 包含路径和文件夹名称的请求体
     * @return 创建的文件夹信息
     */
    @PostMapping("/directory")
    public ApiResponse<File> createFolder(@RequestBody Map<String, String> requestBody) {
        String path = requestBody.get("path");
        String name = requestBody.get("name");

        log.info("创建文件夹: 路径={}, 名称={}", path, name);

        if (name == null || name.trim().isEmpty()) {
            return ApiResponse.exception(ExceptionCodeMsg.PARAM_ERROR);
        }

        // 从安全上下文中获取当前用户
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Long userId = userService.getUserByName(username).getId();

        // 创建文件夹
        File folder = fileService.createFolder(path, name, userId);

        return ApiResponse.success(folder);
    }

    /**
     * 文件重命名
     */
    @PostMapping("/rename")
    public ApiResponse<File> renameFile(@RequestBody Map<String, String> requestBody) {
        try {
            log.info("重命名文件请求: {}", requestBody);
            String fileId = requestBody.get("fileId");
            String newName = requestBody.get("newName");

            log.info("重命名文件: 文件ID={}, 新名称={}", fileId, newName);

            if (fileId == null || fileId.trim().isEmpty() || newName == null || newName.trim().isEmpty()) {
                return ApiResponse.exception(ExceptionCodeMsg.PARAM_ERROR);
            }

            // 从安全上下文中获取当前用户
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            Long userId = userService.getUserByName(username).getId();

            // 重命名文件
            File renamedFile = fileService.renameFile(Long.parseLong(fileId), newName, userId);
            return ApiResponse.success(renamedFile);
        } catch (Exception e) {
            log.error("重命名文件请求异常: {}", e.getMessage());
            return ApiResponse.exception(ExceptionCodeMsg.FILE_RENAME_FAILED);
        }
    }

    /**
     * 删除文件
     */
    @PostMapping("/delete")
    public ApiResponse<String> deleteFile(@RequestBody Map<String, String> requestBody) {
        String fileId = requestBody.get("fileId");

        log.info("删除文件: 文件ID={}", fileId);

        if (fileId == null || fileId.trim().isEmpty()) {
            return ApiResponse.exception(ExceptionCodeMsg.PARAM_ERROR);
        }

        // 从安全上下文中获取当前用户
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Long userId = userService.getUserByName(username).getId();

        // 删除文件
        fileService.deleteFile(Long.parseLong(fileId), userId);

        return ApiResponse.success("删除成功");
    }

    /**
     * 删除回收站文件
     */
    @PostMapping("/trash/delete")
    public ApiResponse<String> deleteTrashFile(@RequestBody Map<String, String> requestBody) {
        try {
            String fileId = requestBody.get("fileId");

            log.info("删除回收站文件: 文件ID={}", fileId);

            if (fileId == null || fileId.trim().isEmpty()) {
                return ApiResponse.exception(ExceptionCodeMsg.PARAM_ERROR);
            }

            // 从安全上下文中获取当前用户
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            Long userId = userService.getUserByName(username).getId();

            // 删除回收站文件
            fileService.deleteTrashFile(Long.parseLong(fileId), userId);
            return ApiResponse.success("删除成功");
        } catch (Exception e) {
            log.error("删除回收站文件请求异常: {}", e.getMessage());
            return ApiResponse.exception(ExceptionCodeMsg.DELETE_FILE_FAIL);
        }
    }

    /**
     * 恢复回收站文件
     * @return
     */
    @PostMapping("/trash/restore")
    public ApiResponse<String> restoreTrashFile(@RequestBody Map<String, String> requestBody) {
        String fileId = requestBody.get("fileId");

        log.info("恢复回收站文件: 文件ID={}", fileId);

        if (fileId == null || fileId.trim().isEmpty()) {
            return ApiResponse.exception(ExceptionCodeMsg.PARAM_ERROR);
        }

        // 从安全上下文中获取当前用户
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Long userId = userService.getUserByName(username).getId();

        // 恢复回收站文件
        fileService.restoreTrashFile(Long.parseLong(fileId), userId);
        return ApiResponse.success("恢复成功: " + fileId);
    }

    /**
     * 获取回收站文件列表
     */
    @GetMapping("/trash")
    public ApiResponse<List<File>> getTrashFiles() {
        log.info("获取回收站文件列表");

        // 从安全上下文中获取当前用户
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Long userId = userService.getUserByName(username).getId();

        // 获取回收站文件列表
        List<File> trashFiles = fileService.getTrashFiles(userId);

        return ApiResponse.success(trashFiles);
    }
}
