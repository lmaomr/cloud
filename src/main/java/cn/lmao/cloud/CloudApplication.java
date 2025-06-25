package cn.lmao.cloud;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;

@SpringBootApplication
public class CloudApplication {

	private static final Logger logger = LoggerFactory.getLogger(CloudApplication.class);

	public static void main(String[] args) {
		logger.info("正在启动云存储应用...");
		SpringApplication.run(CloudApplication.class, args);
	}

	@EventListener(ApplicationReadyEvent.class)
	public void onApplicationReady(ApplicationReadyEvent event) {
		Environment env = event.getApplicationContext().getEnvironment();
		String port = env.getProperty("server.port", "8080");
		String contextPath = env.getProperty("server.servlet.context-path", "");
		
		logger.info("==========================================================");
		logger.info("应用程序启动成功!");
		logger.info("访问地址: http://localhost:{}{}", port, contextPath);
		logger.info("Swagger UI: http://localhost:{}{}/swagger-ui/index.html", port, contextPath);
		logger.info("==========================================================");
	}
}
