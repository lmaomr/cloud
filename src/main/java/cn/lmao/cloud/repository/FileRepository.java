package cn.lmao.cloud.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import cn.lmao.cloud.model.entity.File;

public interface FileRepository extends JpaRepository<File, Long> {

    // 根据哈希值查找文件
    // 自动实现只返回第一个结果
    Optional<File> findFirstByHashOrderByIdDesc(String hash);

}