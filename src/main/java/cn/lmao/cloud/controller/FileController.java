package cn.lmao.cloud.controller;

import cn.lmao.cloud.model.dto.ApiResponse;
import cn.lmao.cloud.model.dto.FileUploadResponse;
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
}
