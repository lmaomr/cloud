package cn.lmao.cloud.model.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@NoArgsConstructor
@AllArgsConstructor
@Data
@Table(name = "file")
public class File {

    @Id
    @Column(name = "file_id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "file_name", nullable = false)
    private String name;

    @Column(name = "file_path", nullable = false)
    private String path;

    @Column(name = "file_hash", nullable = false)
    private Long hash;

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
    }
}
