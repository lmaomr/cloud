package cn.lmao.cloud.services;

import cn.lmao.cloud.exception.CustomException;
import cn.lmao.cloud.model.entity.Cloud;
import cn.lmao.cloud.model.entity.User;
import cn.lmao.cloud.model.enums.ExceptionCodeMsg;
import cn.lmao.cloud.repository.CloudRepository;
import cn.lmao.cloud.util.LogUtil;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.springframework.stereotype.Service;

/**
 * 云盘服务类
 * 处理用户云盘相关的业务逻辑
 */
@RequiredArgsConstructor
@Service
public class CloudService {

    private final CloudRepository cloudRepository;
    private final Logger log = LogUtil.getLogger();

    /**
     * 根据用户ID获取云盘信息
     * @param userId 用户ID
     * @return 云盘信息，如果不存在返回null
     */
    public Cloud getCloudByUser(User user) {
        log.debug("正在查询用户[{}]的云盘信息", user.getUsername());
        Cloud cloud = cloudRepository.getCloudByUser(user);
        if (cloud == null) {
            log.debug("用户[{}]的云盘不存在", user.getUsername());
        } else {
            log.debug("成功获取用户[{}]的云盘信息", user.getUsername());
        }
        return cloud;
    }

    /**
     * 为用户创建云盘
     * @param user 用户信息
     * @throws CustomException 如果用户已有云盘则抛出异常
     */
    public void createCloud(User user) {
        log.debug("开始为用户[{}]创建云盘", user.getUsername());
        
        //判断该用户云盘是否存在
        if (getCloudByUser(user) != null) {
            log.warn("用户[{}]的云盘已存在，创建失败", user.getUsername());
            throw new CustomException(ExceptionCodeMsg.CLOUD_ALREADY_EXISTS);
        }
        
        Cloud cloud = new Cloud();
        cloud.setUser(user);  // 设置关联关系
        cloudRepository.save(cloud);
        
        log.debug("成功为用户[{}]创建云盘", user.getUsername());
    }

    //注销云盘
    public void deleteCloud(Long userId) {
        log.debug("开始注销用户ID[{}]的云盘", userId);
        cloudRepository.deleteById(userId);
        log.debug("成功注销用户ID[{}]的云盘", userId);
    }

    /**
     * 更新云盘容量
     * @param cloudId 云盘ID
     * @param fileSize 文件大小
     * @param isAdd 是否增加容量
     */
    public void updateCloudCapacity(Long cloudId, Long fileSize, boolean isAdd) {
        log.debug("开始更新云盘容量: cloudId={}, fileSize={}, isAdd={}", cloudId, fileSize, isAdd);
        Cloud cloud = cloudRepository.findById(cloudId)
                .orElseThrow(() -> new CustomException(ExceptionCodeMsg.CLOUD_NOT_FOUND));
        if (isAdd) {
            if (cloud.getUsedCapacity() + fileSize > cloud.getTotalCapacity()) {
                log.warn("云盘容量不足，更新失败: cloudId={}, fileSize={}, isAdd={}", cloudId, fileSize, isAdd);
                throw new CustomException(ExceptionCodeMsg.STORAGE_QUOTA_EXHAUSTED);
            }
            cloud.setUsedCapacity(cloud.getUsedCapacity() + fileSize);
        } else {
            if (cloud.getUsedCapacity() - fileSize < 0) {
                log.warn("更新失败: 文件大小参数错误");
                throw new CustomException(ExceptionCodeMsg.FILE_SIZE_FORMAT_ERROR);
            }
            cloud.setUsedCapacity(cloud.getUsedCapacity() - fileSize);
        }
        cloudRepository.save(cloud);
        log.debug("成功更新云盘容量: cloudId={}, fileSize={}, isAdd={}", cloudId, fileSize, isAdd);
    }
    
}
