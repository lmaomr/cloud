package cn.lmao.cloud.model.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Data
@Table(name = "file")
public class File {

    private static final Map<String, Set<String>> FILE_TYPE_EXTENSIONS = new HashMap<>();
    
    static {
        // 图片类型
        FILE_TYPE_EXTENSIONS.put("image", Set.of(".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"));
        // 视频类型
        FILE_TYPE_EXTENSIONS.put("video", Set.of(".mp4", ".avi", ".mov", ".wmv", ".flv", ".mkv"));
        // 音频类型
        FILE_TYPE_EXTENSIONS.put("audio", Set.of(".mp3", ".wav", ".aac", ".m4a", ".ogg", ".flac"));
        // 文档类型
        FILE_TYPE_EXTENSIONS.put("document", Set.of(".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"));
        // PDF类型
        FILE_TYPE_EXTENSIONS.put("pdf", Set.of(".pdf", ".epub", ".mobi", ".azw3"));
        // 文本类型
        FILE_TYPE_EXTENSIONS.put("text", Set.of(".txt", ".log", ".ini", ".conf", ".cfg", ".properties"));
        // 压缩包类型
        FILE_TYPE_EXTENSIONS.put("archive", Set.of(".zip", ".rar", ".7z", ".tar", ".gz", ".bz2"));
        // 可执行文件类型
        FILE_TYPE_EXTENSIONS.put("executable", Set.of(".exe", ".msi", ".dmg", ".pkg"));
        // 代码文件类型
        FILE_TYPE_EXTENSIONS.put("code", Set.of(".html", ".css", ".js", ".json", ".xml", ".yaml", ".yml"));
        // Markdown类型
        FILE_TYPE_EXTENSIONS.put("markdown", Set.of(".md", ".markdown", ".mdx"));
    }

    @Id
    @Column(name = "file_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "file_name", nullable = false)
    private String name;

    @Column(name = "file_path", nullable = false)
    private String path;

    @Column(name = "file_hash", nullable = false, length = 64)
    private String hash;

    @Column(name = "file_size", nullable = false)
    private Long size;

    @Column(name = "file_type")
    private String type;

    @Column(name = "create_time", nullable = false, updatable = false, columnDefinition = "TIMESTAMP(0)")
    private LocalDateTime createTime;

    @ManyToOne(fetch = FetchType.LAZY) //懒加载
    @JoinColumn(name = "cloud_id")
    @JsonBackReference
    private Cloud cloud;

    @PrePersist
    protected void onCreate() {
        createTime = LocalDateTime.now();
        //在这里添加自动识别文件类型
        if (type == null || type.isEmpty()) {
            String extension = name.substring(name.lastIndexOf(".")).toLowerCase();
            type = FILE_TYPE_EXTENSIONS.entrySet().stream()
                    .filter(entry -> entry.getValue().contains(extension))
                    .map(Map.Entry::getKey)
                    .findFirst()
                    .orElse("other");
        }
    }

    public File(File file) {
        this.name = file.getName();
        this.path = file.getPath();
        this.hash = file.getHash();
        this.size = file.getSize();
        this.type = file.getType();
        this.createTime = file.getCreateTime();
    }
}
