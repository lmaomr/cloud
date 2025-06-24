package cn.lmao.cloud.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 将本地路径映射到 "/local-upload/**" URL
        registry.addResourceHandler("/local-upload/**")
                .addResourceLocations("file:D:/Cloud/upload/");
    }
}