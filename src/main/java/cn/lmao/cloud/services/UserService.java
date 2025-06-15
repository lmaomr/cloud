package cn.lmao.cloud.services;

import cn.lmao.cloud.exception.CustomException;
import cn.lmao.cloud.model.entity.Cloud;
import cn.lmao.cloud.model.entity.User;
import cn.lmao.cloud.model.enums.ExceptionCodeMsg;
import cn.lmao.cloud.repository.UserRepository;
import cn.lmao.cloud.util.LogUtil;
import lombok.RequiredArgsConstructor;

import java.util.List;

import org.slf4j.Logger;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Collections;

/**
 * 用户服务类
 * 处理用户相关的业务逻辑
 */
@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final Logger log = LogUtil.getLogger();
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.getUserByUsername(username);
        if (user == null) {
            throw new UsernameNotFoundException(ExceptionCodeMsg.USER_NOT_FOUND.getMsg());
        }
        
        return new org.springframework.security.core.userdetails.User(
            user.getUsername(),
            user.getPassword(),
            Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole()))
        );
    }

    /**
     * 根据用户ID获取用户信息
     * @param userId 用户ID
     * @return 用户信息，如果不存在返回null
     */
    public User getUserById(Long userId) {
        log.debug("正在查询用户ID: {}", userId);
        User user = userRepository.getUsersById(userId);
        if (user == null) {
            log.debug("未找到ID为[{}]的用户", userId);
        } else {
            log.info("成功获取ID为[{}]的用户信息", userId);
        }
        return user;
    }

    /**
     * 根据用户名获取用户信息
     * @param username 用户名
     * @return 用户信息，如果不存在返回null
     */
    public User getUserByName(String username) {
        log.debug("正在通过用户名查询: {}", username);
        User user = userRepository.getUserByUsername(username);
        if (user == null) {
            log.debug("用户名[{}]不存在", username);
        } else {
            log.info("成功获取用户名[{}]的用户信息", username);
        }
        return user;
    }

    /**
     * 根据邮箱获取用户信息
     * @param email 邮箱
     * @return 用户信息，如果不存在返回null
     */
    public User getUserByEmail(String email) {
        log.debug("正在通过邮箱查询: {}", email);
        User user = userRepository.getUsersByEmail(email);
        if (user == null) {
            log.debug("邮箱[{}]未注册", email);
        } else {
            log.info("成功获取邮箱[{}]的用户信息", email);
        }
        return user;
    }

    public Cloud getCloud(Long userId) {
        User user = getUserById(userId);
        if (user == null) {
            throw new CustomException(ExceptionCodeMsg.USER_NOT_FOUND);
        }
        return user.getCloud();
    }

    /**
     * 注册新用户
     * @param user 用户信息
     * @return 注册成功的用户信息
     * @throws CustomException 如果用户名或邮箱已存在则抛出异常
     */
    public User registerUser(User user) {
        log.debug("开始注册新用户: {}", user.getUsername());
        
        // 检查用户名是否已存在
        if (getUserByName(user.getUsername()) != null) {
            log.debug("用户名[{}]已存在，注册失败", user.getUsername());
            throw new CustomException(ExceptionCodeMsg.USERNAME_EXISTS);
        }
        
        // 检查邮箱是否已存在
        if (getUserByEmail(user.getEmail()) != null) {
            log.debug("邮箱[{}]已被注册，注册失败", user.getEmail());
            throw new CustomException(ExceptionCodeMsg.EMAIL_EXISTS);
        }
        
        // 加密密码
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        
        // 保存用户
        User savedUser = userRepository.save(user);
        log.info("用户[{}]注册成功", savedUser.getUsername());
        
        return savedUser;
    }

    //查询所有用户
    public List<User> getAllUsers() {
        log.debug("开始查询所有用户");
        List<User> users = userRepository.findAll();
        log.debug("查询到[{}]个用户", users.size());
        return users;
    }

    //注销用户
    public void deleteUser(Long userId) {
        log.debug("开始注销用户ID: {}", userId);
        userRepository.deleteById(userId);
        log.info("成功注销用户ID: {}", userId);
    }

    //更新用户
    public void updateUser(User user) {
        log.debug("开始更新用户: {}", user.getUsername());
        User newUser = new User();
        newUser.setEmail(user.getEmail());
        newUser.setPassword(passwordEncoder.encode(user.getPassword()));
        userRepository.save(newUser);
        log.info("成功更新用户: {}", user.getUsername());
    }
}