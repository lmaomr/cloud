package cn.lmao.cloud.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import cn.lmao.cloud.util.LogUtil;
import org.slf4j.Logger;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final Logger log = LogUtil.getLogger();

    @Value("${file.upload.path}")
    private String uploadPath;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        log.info("配置资源处理器，上传路径: {}", uploadPath);

        // 将本地路径映射到 "/upload/**" URL
        registry.addResourceHandler("/upload/**")
                .addResourceLocations("file:" + uploadPath + "/");

        // 添加静态资源映射
        registry.addResourceHandler("/static/**")
                .addResourceLocations("classpath:/static/");

        // 确保常用静态资源路径正确映射
        registry.addResourceHandler("/js/**")
                .addResourceLocations("classpath:/static/js/");
        registry.addResourceHandler("/css/**")
                .addResourceLocations("classpath:/static/css/");
        registry.addResourceHandler("/image/**")
                .addResourceLocations("classpath:/static/image/");
        
        registry.addResourceHandler("/favicon.ico")
                .addResourceLocations("classpath:/static/image/favicon.ico");
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("Authorization")
                .allowCredentials(true)
                .maxAge(3600);
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // 将根路径重定向到登录页面
        // registry.addRedirectViewController("/", "/index.html");
        // registry.addRedirectViewController("/login", "/login.html");
        registry.addViewController("/").setViewName("forward:/index.html");
        registry.addViewController("/login").setViewName("forward:/login.html");
        // 可以添加更多的视图控制器
    }
}