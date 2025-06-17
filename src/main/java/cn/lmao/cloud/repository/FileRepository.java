package cn.lmao.cloud.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import cn.lmao.cloud.model.entity.Cloud;
import cn.lmao.cloud.model.entity.File;
import cn.lmao.cloud.model.entity.File.FileStatus;

public interface FileRepository extends JpaRepository<File, Long> {

    // 根据哈希值查找文件
    // 自动实现只返回第一个结果
    Optional<File> findFirstByHashOrderByIdDesc(String hash);

    @Query("SELECT CASE WHEN COUNT(f) > 0 THEN true ELSE false END " +
            "FROM File f " +
            "WHERE f.hash = :hash AND f.cloud <> :cloud")
    Boolean existsByHashAndOtherCloud(@Param("hash") String hash,
            @Param("cloud") Cloud cloud);

    // 获取回收站文件列表
    List<File> findByCloudAndStatus(Cloud cloud, FileStatus status);

}