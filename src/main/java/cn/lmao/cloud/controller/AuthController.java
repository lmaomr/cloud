package cn.lmao.cloud.controller;

import cn.lmao.cloud.model.dto.ApiResponse;
import cn.lmao.cloud.model.entity.User;
import cn.lmao.cloud.services.CloudService;
import cn.lmao.cloud.services.UserService;
import cn.lmao.cloud.util.JwtUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "认证管理", description = "用户认证相关的接口")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserService userService;
    private final CloudService cloudService;

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
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                loginRequest.getUsername(),
                loginRequest.getPassword()
            )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtil.generateToken(loginRequest.getUsername());
        
        return ApiResponse.success("登录成功", jwt);
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
        // 1. 检查注册信息是否为空
        if(registUser.getUsername() == null || registUser.getPassword() == null || registUser.getEmail() == null) {
            return ApiResponse.error(400, "注册信息不能为空");
        }

        // 2. 注册用户
        User user = userService.registerUser(registUser);

        // 3. 创建云盘
        cloudService.createCloud(user);

        return ApiResponse.success("注册成功");
    }


} 