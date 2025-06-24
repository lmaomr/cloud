package cn.lmao.cloud.services;

import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.Data;

@Service
public class LoginAttemptService {
    private static final int MAX_ATTEMPTS = 5;
    private static final long BLOCK_DURATION = 30 * 60 * 1000; // 30分钟
    
    // 使用ConcurrentHashMap存储尝试次数
    private final Map<String, AttemptInfo> attemptsCache = new ConcurrentHashMap<>();
    
    public void loginFailed(String key) {
        AttemptInfo info = attemptsCache.getOrDefault(key, new AttemptInfo());
        info.incrementAttempts();
        info.setLastAttemptTime(System.currentTimeMillis());
        attemptsCache.put(key, info);
    }
    
    public void loginSucceeded(String key) {
        attemptsCache.remove(key);
    }
    
    public boolean isBlocked(String key) {
        AttemptInfo info = attemptsCache.get(key);
        if (info == null) {
            return false;
        }
        
        // 检查是否超过最大尝试次数
        if (info.getAttempts() >= MAX_ATTEMPTS) {
            // 检查是否还在封锁期内
            if ((System.currentTimeMillis() - info.getLastAttemptTime()) < BLOCK_DURATION) {
                return true;
            } else {
                // 封锁期已过，重置计数器
                attemptsCache.remove(key);
                return false;
            }
        }
        return false;
    }
    
    @Data
    private static class AttemptInfo {
        private int attempts;
        private long lastAttemptTime;
        
        public void incrementAttempts() {
            this.attempts++;
        }
    }
}