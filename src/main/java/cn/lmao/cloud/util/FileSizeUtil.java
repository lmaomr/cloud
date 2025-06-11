package cn.lmao.cloud.util;

import cn.lmao.cloud.exception.CustomException;
import cn.lmao.cloud.model.enums.ExceptionCodeMsg;
import cn.lmao.cloud.model.enums.FileSizeUnit;
import java.util.regex.Pattern;

import org.slf4j.Logger;

/**
 * 文件大小工具类
 * 用于文件大小的解析和转换
 */
public class FileSizeUtil {
    private static final Logger log = LogUtil.getLogger();
    private static final Pattern SIZE_PATTERN = Pattern.compile("^(\\d+)([A-Za-z]{2})$", Pattern.CASE_INSENSITIVE);
    
    public static long parseSize(String size) {
        try {
            if (size == null || size.isEmpty()) {
                return 0;
            }
            
            size = size.trim();
            var matcher = SIZE_PATTERN.matcher(size);
            if (!matcher.matches()) {
                throw new CustomException(ExceptionCodeMsg.FILE_SIZE_FORMAT_ERROR);
            }
            
            long value = Long.parseLong(matcher.group(1));
            String unit = matcher.group(2).toUpperCase();
            
            try {
                FileSizeUnit sizeUnit = FileSizeUnit.valueOf(unit);
                return value * sizeUnit.getBytes();
            } catch (IllegalArgumentException e) {
                log.error("无效的文件大小单位: {}", unit);
                throw new CustomException(ExceptionCodeMsg.FILE_SIZE_FORMAT_ERROR);
            }
        } catch (CustomException e) {
            log.error("解析文件大小时发生错误: {}", size, e);
            throw new CustomException(ExceptionCodeMsg.FILE_SIZE_FORMAT_ERROR);
        } catch (Exception e) {
            log.error("解析文件大小时发生未知错误: {}", size, e);
            throw new CustomException(ExceptionCodeMsg.FILE_SIZE_FORMAT_ERROR);
        }
    }
}