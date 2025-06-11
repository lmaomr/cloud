package cn.lmao.cloud.model.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ExceptionCodeMsg {
    /* ========== 基础认证异常 (4xx) ========== */
    AUTH_FAIL(401, "认证失败"),
    BAD_CREDENTIALS(401, "用户名或密码错误"),
    ACCOUNT_LOCKED(401, "账号已被锁定"),
    TOKEN_EXPIRED(401, "令牌已过期"),
    TOKEN_INVALID(401, "无效的令牌"),
    TOKEN_FORMAT_ERROR(401, "无效的Authorization头格式"),
    ACCESS_DENIED(403, "无权访问该资源"),

    /* ========== 请求参数异常 (4xx) ========== */
    PARAM_REQUIRED(400, "缺少必要参数"),
    PARAM_INVALID(400, "参数格式错误"),
    PARAM_TYPE_NOT_FOUND(400, "不支持该请求类型"),
    PARAM_METHOD_NOT_FOUND(400, "不支持该请求方法"),
    PARAM_TYPE_MISMATCH(400, "参数类型不匹配"),
    REQUEST_BODY_INVALID(400, "请求体解析失败"),
    FILE_UPLOAD_FAILED(400, "文件上传失败, 请检查文件大小和类型"),
    FILE_SIZE_FORMAT_ERROR(400, "文件大小格式错误"),
    
    /* ========== 系统异常 (5xx) ========== */
    INTERNAL_ERROR(500, "服务器内部错误"),
    DATABASE_ERROR(501, "数据库操作异常"),
    THIRD_PARTY_SERVICE_ERROR(502, "第三方服务异常"),

    /* ========== 业务逻辑异常 (10xxx) ========== */
    // 空值校验相关（新增）
    EMPTY_PARAMETER(10401, "参数不能为空"),
    EMPTY_USERNAME(10402, "用户名不能为空"),
    EMPTY_PASSWORD(10403, "密码不能为空"),
    EMPTY_EMAIL(10404, "邮箱不能为空"),
    EMPTY_PHONE(10405, "手机号不能为空"),
    EMPTY_FILE(10406, "上传文件不能为空"),
    EMPTY_CLOUD_NAME(10407, "云盘名称不能为空"),
    EMPTY_SEARCH_KEYWORD(10408, "搜索关键词不能为空"),
    EMPTY_VERIFICATION_CODE(10409, "验证码不能为空"),

    // 用户相关
    USER_NOT_FOUND(10001, "用户不存在"),
    USERNAME_EXISTS(10002, "用户名已存在"),
    EMAIL_EXISTS(10003, "邮箱已注册"),
    PHONE_EXISTS(10004, "手机号已注册"),
    INVALID_VERIFICATION_CODE(10005, "验证码无效或已过期"),

    // 资源相关
    RESOURCE_NOT_FOUND(10101, "请求的资源不存在"),
    RESOURCE_ALREADY_EXISTS(10102, "资源已存在"),
    RESOURCE_OPERATION_FORBIDDEN(10103, "不允许操作该资源"),

    // 文件/云盘相关
    FILE_SIZE_EXCEEDED(10201, "文件大小超过限制"),
    STORAGE_QUOTA_EXHAUSTED(10202, "存储空间不足"),
    FILE_TYPE_NOT_ALLOWED(10203, "不支持的文件类型"),
    FILE_DIR_CREATE_FAIL(10204, "文件路径创建失败"),
    FILE_UPLOAD_CONFLICT(10205, "文件已存在，请勿重复上传"),
    FILE_EMPTY(10206, "上传的文件为空"),
    FILE_UPLOAD_FAIL(10207, "文件上传失败"),
    FILE_PATH_INVALID(10208, "文件路径非法"),
    CLOUD_NOT_FOUND(10211, "云盘不存在或已被删除"),
    CLOUD_ALREADY_EXISTS(10212, "云盘名称已存在"),
    CLOUD_QUOTA_EXCEEDED(10213, "云盘容量配额不足"),

    // 系统/数据相关
    DATA_INTEGRITY_VIOLATION(10301, "数据完整性冲突"),
    OPTIMISTIC_LOCK_CONFLICT(10302, "数据版本冲突，请重试"),
    SERVICE_UNAVAILABLE(10303, "服务暂时不可用"),
    ;
    

    private final int code;
    private final String msg;

}
