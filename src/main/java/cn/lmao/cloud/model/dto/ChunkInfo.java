package cn.lmao.cloud.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 分片信息DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChunkInfo {
    
    /**
     * 上传ID
     */
    private String uploadId;
    
    /**
     * 分片索引
     */
    private Integer chunkIndex;
    
    /**
     * 总分片数
     */
    private Integer totalChunks;
    
    /**
     * 已上传分片数
     */
    private Integer uploadedChunks;
    
    /**
     * 分片大小
     */
    private Long chunkSize;
} 