package cn.lmao.cloud.controller;

import org.slf4j.Logger;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import cn.lmao.cloud.model.dto.ApiResponse;
import cn.lmao.cloud.model.entity.User;
import cn.lmao.cloud.services.UserService;
import cn.lmao.cloud.util.LogUtil;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final Logger log = LogUtil.getLogger();
    
    @GetMapping("/info")
    public ApiResponse<User> getUserInfo(@RequestHeader("Authorization") String authorization) {
        log.info("接收到获取用户信息请求: authorization={}", authorization.substring(0, 20) + "...");
        
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        log.debug("从SecurityContext中提取的用户名: {}", username);
        
        try {
            User user = userService.getUserByName(username);
            if (user == null) {
                log.warn("获取用户信息失败: 用户不存在, username={}", username);
                return ApiResponse.error(404, "用户不存在");
            }
            
            log.info("获取用户信息成功: userId={}, username={}", user.getId(), user.getUsername());
            return ApiResponse.success(user);
        } catch (Exception e) {
            log.error("获取用户信息异常: username={}, error={}", username, e.getMessage(), e);
            return ApiResponse.error(500, "获取用户信息失败: " + e.getMessage());
        }
    }
}
