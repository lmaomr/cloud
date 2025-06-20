package cn.lmao.cloud.controller;


import cn.lmao.cloud.model.dto.ApiResponse;
import cn.lmao.cloud.model.entity.Cloud;
import cn.lmao.cloud.model.entity.User;
import cn.lmao.cloud.model.enums.ExceptionCodeMsg;
import cn.lmao.cloud.services.CloudService;
import cn.lmao.cloud.services.UserService;
import cn.lmao.cloud.util.LogUtil;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/cloud")
public class CloudController {

    private final CloudService cloudService;
    private final UserService userService;
    private final Logger log = LogUtil.getLogger();

    /**
     * 获取用户云盘信息
     * @param username 用户信息
     * @return 用户云盘信息
     */
    @GetMapping("/user")
    public ApiResponse<Cloud> getUserCloud(@RequestParam String username) {
        log.info("接收到获取用户云盘信息请求: username={}", username);
        
        try {
            if (username == null || username.trim().isEmpty()) {
                log.warn("获取云盘信息失败: 用户名为空");
                return ApiResponse.exception(ExceptionCodeMsg.EMPTY_USERNAME);
            }
            
            User user = userService.getUserByName(username);
            if (user == null) {
                log.warn("获取云盘信息失败: 用户不存在, username={}", username);
                return ApiResponse.exception(ExceptionCodeMsg.USER_NOT_FOUND);
            }
            
            // 获取用户云盘信息
            Cloud cloud = cloudService.getCloudByUser(user);
            if (cloud == null) {
                log.warn("获取云盘信息失败: 云盘不存在, userId={}, username={}", user.getId(), username);
                return ApiResponse.exception(ExceptionCodeMsg.CLOUD_NOT_FOUND);
            }
            
            log.info("获取用户云盘信息成功: cloudId={}, userId={}, username={}, 已用空间={}, 总空间={}", 
                    cloud.getId(), user.getId(), username, cloud.getUsedCapacity(), cloud.getTotalCapacity());
            
            // 返回用户云盘信息
            return ApiResponse.success(cloud);
        } catch (Exception e) {
            log.error("获取用户云盘信息异常: username={}, error={}", username, e.getMessage(), e);
            return ApiResponse.error(500, "获取云盘信息失败: " + e.getMessage());
        }
    }
}
