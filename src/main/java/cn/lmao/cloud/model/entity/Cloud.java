package cn.lmao.cloud.model.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "cloud")
public class Cloud {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cloud_id", nullable = false, columnDefinition = "BIGINT")
    private Long id;
    //已使用空间
    @Column(name = "used_capacity", nullable = false, columnDefinition = "BIGINT DEFAULT 0")
    private Long usedCapacity = 0L;

    @Column(name = "total_capacity", nullable = false, columnDefinition = "BIGINT DEFAULT 10485760")
    private Long totalCapacity = 10 * 1024 * 1024 * 1024L;

    @OneToMany(mappedBy = "cloud", orphanRemoval = true)
    @JsonIgnore  // 避免序列化时出现懒加载问题
    private List<File> files = new ArrayList<>();

    @OneToOne
    @JoinColumn(name = "user_id")
    @JsonBackReference
    private User user;

}
