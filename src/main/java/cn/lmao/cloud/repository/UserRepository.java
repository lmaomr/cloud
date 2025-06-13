package cn.lmao.cloud.repository;

import cn.lmao.cloud.model.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

    User getUsersByEmail(String email);

    User getUsersById(Long id);

    User getUserByUsername(String username);
}
