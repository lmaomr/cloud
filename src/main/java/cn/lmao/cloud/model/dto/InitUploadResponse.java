package cn.lmao.cloud.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 初始化上传响应DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InitUploadResponse {
    
    /**
     * 上传ID
     */
    private String uploadId;
    
    /**
     * 文件名
     */
    private String fileName;
    
    /**
     * 文件大小
     */
    private Long fileSize;
    
    /**
     * 分片大小
     */
    private Integer chunkSize;
    
    /**
     * 总分片数
     */
    private Integer totalChunks;
    
    /**
     * 上传路径
     */
    private String path;
} 