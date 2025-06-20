package cn.lmao.cloud.controller;

import cn.lmao.cloud.model.dto.ApiResponse;
import cn.lmao.cloud.model.entity.User;
import cn.lmao.cloud.model.enums.ExceptionCodeMsg;
import cn.lmao.cloud.services.CloudService;
import cn.lmao.cloud.services.UserService;
import cn.lmao.cloud.util.JwtUtil;
import cn.lmao.cloud.util.LogUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "认证管理", description = "用户认证相关的接口")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserService userService;
    private final CloudService cloudService;
    private final Logger log = LogUtil.getLogger();

    @Operation(summary = "用户登录", description = "使用用户名和密码进行登录认证")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "登录成功"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "认证失败")
    })
    
    @PostMapping("/login")
    public ApiResponse<String> login(
        @Parameter(description = "登录信息", required = true)
        @RequestBody User loginRequest
    ) {
        String username = loginRequest.getUsername();
        log.info("接收到用户登录请求: username={}", username);
        
        try {
            if (username == null || username.isEmpty() || loginRequest.getPassword() == null) {
                log.warn("登录失败: 用户名或密码为空, username={}", username);
                return ApiResponse.error(400, "用户名或密码不能为空");
            }
            
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    username,
                    loginRequest.getPassword()
                )
            );
    
            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = jwtUtil.generateToken(username);
            
            // 记录安全审计日志
            LogUtil.audit("USER_LOGIN", Map.of("username", username, "success", true));
            
            log.info("用户登录成功: username={}", username);
            return ApiResponse.success("登录成功", jwt);
        } catch (BadCredentialsException e) {
            // 记录安全审计日志
            LogUtil.audit("USER_LOGIN", Map.of("username", username, "success", false, "reason", "密码错误"));
            
            log.warn("用户登录失败: 用户名或密码错误, username={}", username);
            return ApiResponse.exception(ExceptionCodeMsg.BAD_CREDENTIALS);
        } catch (Exception e) {
            log.error("用户登录异常: username={}, error={}", username, e.getMessage(), e);
            return ApiResponse.error(500, "登录失败: " + e.getMessage());
        }
    }

    @Operation(summary = "用户注册", description = "输入邮箱、用户名和密码进行注册")
    @ApiResponses(value = {
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "注册成功"),
        @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "401", description = "注册失败")
    })

    @PostMapping("/register")
    public ApiResponse<String> register(
        @Parameter(description = "注册信息", required = true)
        @RequestBody User registUser
    ) {
        String username = registUser.getUsername();
        String email = registUser.getEmail();
        log.info("接收到用户注册请求: username={}, email={}", username, email);
        
        try {
            // 1. 检查注册信息是否为空
            if (username == null || registUser.getPassword() == null || email == null) {
                log.warn("注册失败: 注册信息不完整, username={}, email={}", username, email);
                return ApiResponse.error(400, "注册信息不能为空");
            }
    
            // 2. 注册用户
            User user = userService.registerUser(registUser);
            log.info("用户注册成功: userId={}, username={}, email={}", user.getId(), username, email);
    
            // 3. 创建云盘
            cloudService.createCloud(user);
            log.info("用户云盘创建成功: userId={}, username={}", user.getId(), username);
            
            // 记录安全审计日志
            LogUtil.audit("USER_REGISTER", Map.of("username", username, "email", email, "userId", user.getId()));
    
            return ApiResponse.success("注册成功");
        } catch (Exception e) {
            log.error("用户注册异常: username={}, email={}, error={}", username, email, e.getMessage(), e);
            return ApiResponse.error(500, "注册失败: " + e.getMessage());
        }
    }
} 