package cn.lmao.cloud.config;

import cn.lmao.cloud.exception.CustomException;
import cn.lmao.cloud.model.dto.ApiResponse;
import cn.lmao.cloud.model.enums.ExceptionCodeMsg;
import cn.lmao.cloud.util.JsonUtil;
import cn.lmao.cloud.util.JwtUtil;
import cn.lmao.cloud.util.LogUtil;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.slf4j.Logger;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;
    private final Logger log = LogUtil.getLogger();

    public JwtAuthenticationFilter(JwtUtil jwtUtil, UserDetailsService userDetailsService) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws IOException, ServletException {
        try {
            // 1. 获取并验证 JWT token
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null) {
                // 2. 验证 token 并设置认证信息
                String username = jwtUtil.getUsernameFromHeader(authHeader);
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                // 3. 设置认证信息
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
            // 4. 继续执行过滤器链
            filterChain.doFilter(request, response);
        } catch (JwtException e) {
            // 5. 如果发生异常，不调用 doFilter，直接返回错误响应
            response.setContentType("application/json;charset=UTF-8");
            response.setCharacterEncoding("UTF-8");
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write(JsonUtil.toJson(ApiResponse.exception(ExceptionCodeMsg.TOKEN_FORMAT_ERROR)));
            // 注意：这里没有调用 filterChain.doFilter，因为已经返回了错误响应
        }
    }
}