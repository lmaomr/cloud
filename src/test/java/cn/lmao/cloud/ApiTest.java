package cn.lmao.cloud;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public class ApiTest {

    @LocalServerPort
    private int port;

    private TestRestTemplate restTemplate = new TestRestTemplate();

    @Test
    public void testRootEndpoint() {
        String url = "http://localhost:" + port + "/";
        
        // 不带Authorization头的请求
        ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
        System.out.println("访问根路径状态码: " + response.getStatusCodeValue());
        
        // 带无效Authorization头的请求
        HttpHeaders headers = new HttpHeaders();
        headers.add("Authorization", "Bearer invalid-token");
        HttpEntity<String> entity = new HttpEntity<>(null, headers);
        
        ResponseEntity<String> responseWithToken = restTemplate.exchange(
            url, HttpMethod.GET, entity, String.class);
        
        System.out.println("带无效token访问根路径状态码: " + responseWithToken.getStatusCodeValue());
    }
} 