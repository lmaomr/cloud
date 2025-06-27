package cn.lmao.cloud.util;

import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.io.FileInputStream;
import org.springframework.stereotype.Component;

@Component
public class FileHashUtil {
    /**
     * 计算文件的SHA-256哈希值
     * @param file 要计算哈希的文件
     * @return 文件的SHA-256哈希值（十六进制字符串）
     * @throws RuntimeException 如果计算哈希值失败
     */
    public static String calculateSha256(MultipartFile file) {
        try (InputStream is = file.getInputStream()) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[8192];
            int read;
            
            while ((read = is.read(buffer)) > 0) {
                digest.update(buffer, 0, read);
            }
            
            byte[] hashBytes = digest.digest();
            return bytesToHex(hashBytes);
        } catch (IOException | NoSuchAlgorithmException e) {
            throw new RuntimeException("计算文件哈希失败: " + e.getMessage(), e);
        }
    }
    
    /**
     * 计算文件的SHA-256哈希值
     * @param file 要计算哈希的文件
     * @return 文件的SHA-256哈希值（十六进制字符串）
     * @throws RuntimeException 如果计算哈希值失败
     */
    public String calculateSha256(File file) {
        try (InputStream is = new FileInputStream(file)) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[8192];
            int read;
            
            while ((read = is.read(buffer)) > 0) {
                digest.update(buffer, 0, read);
            }
            
            byte[] hashBytes = digest.digest();
            return bytesToHex(hashBytes);
        } catch (IOException | NoSuchAlgorithmException e) {
            throw new RuntimeException("计算文件哈希失败: " + e.getMessage(), e);
        }
    }
    
    /**
     * 将字节数组转换为十六进制字符串
     * @param bytes 要转换的字节数组
     * @return 十六进制字符串
     */
    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}