package cn.lmao.cloud.repository;

import cn.lmao.cloud.model.entity.Cloud;
import cn.lmao.cloud.model.entity.User;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CloudRepository extends JpaRepository<Cloud, Long> {

    Cloud getCloudByUser(User user);

}
