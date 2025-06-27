package cn.lmao.cloud.controller;

import cn.lmao.cloud.exception.CustomException;
import cn.lmao.cloud.model.dto.ApiResponse;
import cn.lmao.cloud.model.dto.FileUploadResponse;
import cn.lmao.cloud.model.dto.ChunkInfo;
import cn.lmao.cloud.model.dto.InitUploadResponse;
import cn.lmao.cloud.model.entity.Cloud;
import cn.lmao.cloud.model.entity.File;
import cn.lmao.cloud.model.entity.User;
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
import java.util.ArrayList;
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
     * 头像上传接口
     * 
     * @throws IOException
     */
    @PostMapping(value = "/avatar/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<FileUploadResponse> uploadAvatar(
            @RequestParam("avatar") MultipartFile avatar,
            @RequestHeader("Authorization") String authorization) throws IOException {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userService.getUserByName(username);
        try {
            log.info("接收到头像上传请求: fileName={}, size={}, username={}",
                    avatar.getOriginalFilename(), avatar.getSize(), username);

            if (avatar.isEmpty()) {
                log.warn("文件上传失败: 文件为空, username={}", username);
                return ApiResponse.exception(ExceptionCodeMsg.FILE_EMPTY);
            }

            // 处理文件上传
            FileUploadResponse response = fileService.uploadAvatar(avatar, user);
            log.info("头像上传请求处理完成: fileName={}, fileId={}, username={}",
                    avatar.getOriginalFilename(), response.getFileId(), username);
            return ApiResponse.success(response);
        } catch (CustomException e) {
            log.error("头像上传失败: username={}, error={}", username, e.getMessage());
            return ApiResponse.exception(e);
        } catch (Exception e) {
            log.error("头像上传失败: username={}, error={}", username, e.getMessage());
            return ApiResponse.exception(ExceptionCodeMsg.FILE_UPLOAD_FAIL);
        }
    }

    /**
     * 多文件上传接口
     * 
     * @throws IOException
     */
    @PostMapping(value = "/upload/multiple", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<List<FileUploadResponse>> uploadMultipleFiles(
            @RequestParam("files") MultipartFile[] files,
            @RequestHeader("Authorization") String authorization) throws IOException {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Long userId = userService.getUserByName(username).getId();

        log.info("接收到批量文件上传请求: fileCount={}, username={}", files.length, username);

        List<FileUploadResponse> responses = new ArrayList<>();

        int requestCount = 0;
        int successCount = 0;
        int failCount = 0;
        // 处理每个文件的上传
        for (MultipartFile file : files) {
            requestCount++;
            if (!file.isEmpty()) {
                try {
                    FileUploadResponse response = fileService.uploadFile(file, userId);
                    responses.add(response);
                    successCount++;
                    log.debug("批量上传-单个文件成功: fileName={}, fileId={}",
                            file.getOriginalFilename(), response.getFileId());
                } catch (Exception e) {
                    log.error("批量上传-单个文件失败: fileName={}, error={}",
                            file.getOriginalFilename(), e.getMessage());
                    failCount++;
                    return ApiResponse.exception(ExceptionCodeMsg.FILE_UPLOAD_FAIL);
                }
            }
        }

        log.info("文件上传所有请求处理完成: 总共处理请求数量={}, 成功数量={}, 失败数量={}, username={}",
                requestCount, successCount, failCount, username);
        return ApiResponse.success(responses);
    }

    /**
     * 初始化分片上传
     * 
     * @param requestBody 包含文件名、文件大小、分片大小等信息
     * @return 初始化上传响应，包含上传ID等信息
     */
    @PostMapping("/upload/init")
    public ApiResponse<InitUploadResponse> initUpload(@RequestBody Map<String, Object> requestBody) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Long userId = userService.getUserByName(username).getId();
        
        String fileName = (String) requestBody.get("fileName");
        Long fileSize = Long.valueOf(requestBody.get("fileSize").toString());
        Integer chunkSize = Integer.valueOf(requestBody.get("chunkSize").toString());
        String path = (String) requestBody.getOrDefault("path", "/");
        
        log.info("接收到初始化分片上传请求: fileName={}, fileSize={}, chunkSize={}, path={}, username={}", 
                fileName, fileSize, chunkSize, path, username);
        
        try {
            // 初始化上传
            InitUploadResponse response = fileService.initChunkedUpload(fileName, fileSize, chunkSize, path, userId);
            
            log.info("初始化分片上传成功: fileName={}, uploadId={}, totalChunks={}, username={}", 
                    fileName, response.getUploadId(), response.getTotalChunks(), username);
            
            return ApiResponse.success(response);
        } catch (Exception e) {
            log.error("初始化分片上传失败: fileName={}, error={}", fileName, e.getMessage(), e);
            return ApiResponse.exception(ExceptionCodeMsg.FILE_UPLOAD_FAIL);
        }
    }
    
    /**
     * 上传文件分片
     * 
     * @param uploadId 上传ID
     * @param chunkIndex 分片索引
     * @param file 分片文件
     * @return 上传结果
     */
    @PostMapping(value = "/upload/chunk/{uploadId}/{chunkIndex}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ChunkInfo> uploadChunk(
            @PathVariable String uploadId,
            @PathVariable Integer chunkIndex,
            @RequestParam("file") MultipartFile file) {
        
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Long userId = userService.getUserByName(username).getId();
        
        log.info("接收到分片上传请求: uploadId={}, chunkIndex={}, chunkSize={}, username={}", 
                uploadId, chunkIndex, file.getSize(), username);
        
        try {
            if (file.isEmpty()) {
                log.warn("分片上传失败: 分片为空, uploadId={}, chunkIndex={}, username={}", 
                        uploadId, chunkIndex, username);
                return ApiResponse.exception(ExceptionCodeMsg.FILE_EMPTY);
            }
            
            // 上传分片
            ChunkInfo chunkInfo = fileService.uploadChunk(uploadId, chunkIndex, file, userId);
            
            log.info("分片上传成功: uploadId={}, chunkIndex={}/{}, username={}", 
                    uploadId, chunkIndex, chunkInfo.getTotalChunks(), username);
            
            return ApiResponse.success(chunkInfo);
        } catch (Exception e) {
            log.error("分片上传失败: uploadId={}, chunkIndex={}, error={}", 
                    uploadId, chunkIndex, e.getMessage(), e);
            return ApiResponse.exception(ExceptionCodeMsg.FILE_UPLOAD_FAIL);
        }
    }
    
    /**
     * 完成分片上传
     * 
     * @param requestBody 包含上传ID等信息
     * @return 文件上传响应
     */
    @PostMapping("/upload/complete")
    public ApiResponse<FileUploadResponse> completeUpload(@RequestBody Map<String, String> requestBody) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Long userId = userService.getUserByName(username).getId();
        
        String uploadId = requestBody.get("uploadId");
        
        log.info("接收到完成分片上传请求: uploadId={}, username={}", uploadId, username);
        
        try {
            // 完成上传
            FileUploadResponse response = fileService.completeChunkedUpload(uploadId, userId);
            
            log.info("完成分片上传成功: uploadId={}, fileId={}, fileName={}, username={}", 
                    uploadId, response.getFileId(), response.getFileName(), username);
            
            return ApiResponse.success(response);
        } catch (Exception e) {
            log.error("完成分片上传失败: uploadId={}, error={}", uploadId, e.getMessage(), e);
            return ApiResponse.exception(ExceptionCodeMsg.FILE_UPLOAD_FAIL);
        }
    }

    /**
     * 文件下载接口
     * 
     * @param fileId 文件ID
     * @return 文件下载响应
     */
    @GetMapping("/download/{fileId}")
    public void downloadFile(@PathVariable String fileId, HttpServletResponse response) throws IOException {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Long userId = userService.getUserByName(username).getId();

        log.info("接收到文件下载请求: fileId={}, username={}", fileId, username);

        if (fileId == null || fileId.trim().isEmpty()) {
            log.warn("文件下载失败: 文件ID为空, username={}", username);
            throw new CustomException(ExceptionCodeMsg.FILE_NOT_FOUND);
        }

        // 下载文件
        fileService.downloadFile(Long.parseLong(fileId), userId, response);
        // 注意: 下载完成的日志已在FileService中记录
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
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Long userId = userService.getUserByName(username).getId();

        log.info("接收到获取文件列表请求: path={}, sort={}, username={}", path, sort, username);

        Cloud userCloud = userService.getCloud(userId);
        List<File> files = fileService.getFileList(userCloud, path, sort);

        log.info("文件列表获取成功: path={}, fileCount={}, username={}", path, files.size(), username);
        return ApiResponse.success(files);
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
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Long userId = userService.getUserByName(username).getId();

        log.info("接收到创建文件夹请求: path={}, name={}, username={}", path, name, username);

        if (name == null || name.trim().isEmpty()) {
            log.warn("创建文件夹失败: 文件夹名称为空, username={}", username);
            return ApiResponse.exception(ExceptionCodeMsg.PARAM_ERROR);
        }

        // 创建文件夹
        File folder = fileService.createFolder(path, name, userId);

        log.info("文件夹创建成功: folderId={}, name={}, username={}", folder.getId(), folder.getName(), username);
        return ApiResponse.success(folder);
    }

    /**
     * 文件重命名
     */
    @PostMapping("/rename")
    public ApiResponse<File> renameFile(@RequestBody Map<String, String> requestBody) {
        String fileId = requestBody.get("fileId");
        String newName = requestBody.get("newName");
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Long userId = userService.getUserByName(username).getId();

        log.info("接收到文件重命名请求: fileId={}, newName={}, username={}", fileId, newName, username);

        try {
            if (fileId == null || fileId.trim().isEmpty() || newName == null || newName.trim().isEmpty()) {
                log.warn("文件重命名失败: 参数错误, fileId={}, newName={}, username={}",
                        fileId, newName, username);
                return ApiResponse.exception(ExceptionCodeMsg.PARAM_ERROR);
            }

            // 重命名文件
            File renamedFile = fileService.renameFile(Long.parseLong(fileId), newName, userId);

            log.info("文件重命名成功: fileId={}, newName={}, username={}",
                    renamedFile.getId(), renamedFile.getName(), username);
            return ApiResponse.success(renamedFile);
        } catch (Exception e) {
            log.error("文件重命名异常: fileId={}, newName={}, username={}, error={}",
                    fileId, newName, username, e.getMessage());
            return ApiResponse.exception(ExceptionCodeMsg.FILE_RENAME_FAILED);
        }
    }

    /**
     * 删除文件
     */
    @PostMapping("/delete")
    public ApiResponse<String> deleteFile(@RequestBody Map<String, String> requestBody) {
        String fileId = requestBody.get("fileId");
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Long userId = userService.getUserByName(username).getId();

        log.info("接收到文件删除请求: fileId={}, username={}", fileId, username);

        if (fileId == null || fileId.trim().isEmpty()) {
            log.warn("文件删除失败: 文件ID为空, username={}", username);
            return ApiResponse.exception(ExceptionCodeMsg.PARAM_ERROR);
        }

        // 删除文件
        fileService.deleteFile(Long.parseLong(fileId), userId);

        log.info("文件删除成功(移至回收站): fileId={}, username={}", fileId, username);
        return ApiResponse.success("删除成功");
    }

    /**
     * 删除回收站文件
     */
    @PostMapping("/trash/delete")
    public ApiResponse<String> deleteTrashFile(@RequestBody Map<String, String> requestBody) {
        String fileId = requestBody.get("fileId");
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Long userId = userService.getUserByName(username).getId();

        log.info("接收到永久删除文件请求: fileId={}, username={}", fileId, username);

        if (fileId == null || fileId.trim().isEmpty()) {
            log.warn("永久删除文件失败: 文件ID为空, username={}", username);
            return ApiResponse.exception(ExceptionCodeMsg.PARAM_ERROR);
        }

        // 永久删除文件
        fileService.deleteTrashFile(Long.parseLong(fileId), userId);

        log.info("永久删除文件成功: fileId={}, username={}", fileId, username);
        return ApiResponse.success("删除成功");
    }

    /**
     * 恢复回收站文件
     */
    @PostMapping("/trash/restore")
    public ApiResponse<String> restoreTrashFile(@RequestBody Map<String, String> requestBody) {
        String fileId = requestBody.get("fileId");
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Long userId = userService.getUserByName(username).getId();

        log.info("接收到恢复回收站文件请求: fileId={}, username={}", fileId, username);

        if (fileId == null || fileId.trim().isEmpty()) {
            log.warn("恢复文件失败: 文件ID为空, username={}", username);
            return ApiResponse.exception(ExceptionCodeMsg.PARAM_ERROR);
        }

        // 恢复文件
        fileService.restoreTrashFile(Long.parseLong(fileId), userId);

        log.info("恢复文件成功: fileId={}, username={}", fileId, username);
        return ApiResponse.success("恢复成功");
    }

    /**
     * 获取回收站文件列表
     */
    @GetMapping("/trash")
    public ApiResponse<List<File>> getTrashFiles() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        Long userId = userService.getUserByName(username).getId();

        log.info("接收到获取回收站文件列表请求: username={}", username);

        // 获取回收站文件列表
        List<File> files = fileService.getTrashFiles(userId);

        log.info("获取回收站文件列表成功: fileCount={}, username={}", files.size(), username);
        return ApiResponse.success(files);
    }
}
