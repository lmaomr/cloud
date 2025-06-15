package cn.lmao.cloud.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import cn.lmao.cloud.model.entity.Cloud;
import cn.lmao.cloud.model.entity.File;
import cn.lmao.cloud.model.entity.File.FileStatus;

public interface FileRepository extends JpaRepository<File, Long> {

    // 根据哈希值查找文件
    // 自动实现只返回第一个结果
    Optional<File> findFirstByHashOrderByIdDesc(String hash);

    //获取回收站文件列表
    List<File> findByCloudAndStatus(Cloud cloud, FileStatus status);

}