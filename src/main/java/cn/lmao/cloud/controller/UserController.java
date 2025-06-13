package cn.lmao.cloud.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import cn.lmao.cloud.model.dto.ApiResponse;
import cn.lmao.cloud.model.entity.User;
import cn.lmao.cloud.services.UserService;
import cn.lmao.cloud.util.JwtUtil;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final JwtUtil jwtUtil;
    
    @GetMapping("/info")
    public ApiResponse<User> getUserInfo(@RequestHeader("Authorization") String authorization) {
        String username = jwtUtil.getUsernameFromHeader(authorization);
        User user = userService.getUserByName(username);
        return ApiResponse.success(user);
    }
}
