package cn.lmao.cloud.controller;


import cn.lmao.cloud.model.dto.ApiResponse;
import cn.lmao.cloud.model.entity.Cloud;
import cn.lmao.cloud.model.entity.User;
import cn.lmao.cloud.model.enums.ExceptionCodeMsg;
import cn.lmao.cloud.services.CloudService;
import cn.lmao.cloud.services.UserService;
import lombok.RequiredArgsConstructor;
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


    /**
     * 获取用户云盘信息
     * @param username 用户信息
     * @return 用户云盘信息
     */
    @GetMapping("/user")
    public ApiResponse<Cloud> getUserCloud(@RequestParam String username) {
        User user = userService.getUserByName(username);
        if (user == null) {
            return ApiResponse.exception(ExceptionCodeMsg.EMPTY_USERNAME);
        }
        // 获取用户云盘信息
        Cloud cloud = cloudService.getCloudByUser(user);
        if (cloud == null) {
            return ApiResponse.error(404,"用户信息不能为空");
        }
        // 返回用户云盘信息
        return ApiResponse.success(cloud);
    }
}
