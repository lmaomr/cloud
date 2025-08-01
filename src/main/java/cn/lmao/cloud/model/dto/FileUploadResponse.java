package cn.lmao.cloud.model.dto;

import cn.lmao.cloud.model.entity.File;
import lombok.Data;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

/**
 * 文件上传响应DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FileUploadResponse {
    /**
     * 文件ID
     */
    private Long fileId;
    
    /**
     * 文件名
     */
    private String fileName;
    
    /**
     * 文件路径
     */
    private String filePath;
    
    /**
     * 文件大小
     */
    private Long fileSize;
    
    /**
     * 文件类型
     */
    private String fileType;

    private String originalName;
    private String storedName;
    private String fileUrl;
    private LocalDateTime uploadTime;
    private boolean success;
    private String message;

    // 基础构造函数（新上传文件）
    public FileUploadResponse(File file) {
        this(file, false);
    }

    // 添加接收 File 实体的构造函数
    public FileUploadResponse(File file, boolean existingFile) {
        this.fileId = file.getId();
        this.fileName = file.getName();
        this.filePath = file.getPath();
        this.fileSize = file.getSize();
        this.fileType = file.getType();
        this.originalName = file.getName();
        this.storedName = file.getPath();
        this.fileUrl = "/api/files/" + file.getId();
        this.uploadTime = file.getCreateTime();
        this.success = true;
        this.message = existingFile ? "文件已存在,请勿重复上传" : "文件上传成功";
    }

    // 失败情况的构造函数
    public FileUploadResponse(String errorMessage) {
        this.success = false;
        this.message = errorMessage;
    }
}