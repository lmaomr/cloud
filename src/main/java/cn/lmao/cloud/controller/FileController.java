package cn.lmao.cloud.controller;

import cn.lmao.cloud.model.dto.ApiResponse;
import cn.lmao.cloud.model.dto.FileUploadResponse;
import cn.lmao.cloud.model.entity.Cloud;
import cn.lmao.cloud.model.entity.File;
import cn.lmao.cloud.model.enums.ExceptionCodeMsg;
import cn.lmao.cloud.services.FileService;
import cn.lmao.cloud.services.UserService;
import cn.lmao.cloud.util.LogUtil;
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
}
