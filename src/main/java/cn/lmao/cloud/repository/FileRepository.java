package cn.lmao.cloud.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import cn.lmao.cloud.model.entity.File;

public interface FileRepository extends JpaRepository<File, Long> {

}