package cn.lmao.cloud.controller;

import cn.lmao.cloud.model.dto.Response;
import cn.lmao.cloud.model.entity.User;
import cn.lmao.cloud.services.UserService;
import cn.lmao.cloud.util.JwtUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "认证管理", description = "用户认证相关的接口")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UserService userService;

    @Operation(summary = "用户登录", description = "使用用户名和密码进行登录认证")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "登录成功"),
        @ApiResponse(responseCode = "401", description = "认证失败")
    })
    
    @PostMapping("/login")
    public Response<String> login(
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
        String jwt = jwtUtils.generateToken(loginRequest.getUsername());
        
        return Response.success("登录成功", jwt);
    }

    @Operation(summary = "用户注册", description = "输入邮箱、用户名和密码进行注册")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "注册成功"),
        @ApiResponse(responseCode = "401", description = "注册失败")
    })

    @PostMapping("/register")
    public Response<String> register(
        @Parameter(description = "注册信息", required = true)
        @RequestBody User registUser
    ) {
        if(registUser.getUsername() == null || registUser.getPassword() == null || registUser.getEmail() == null) {
            return Response.error(400, "注册信息不能为空");
        }
        userService.registerUser(registUser);
        return Response.success("注册成功");
    }


} 