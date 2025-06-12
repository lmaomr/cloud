package cn.lmao.cloud.exception;

import cn.lmao.cloud.model.dto.ApiResponse;
import cn.lmao.cloud.model.enums.ExceptionCodeMsg;
import cn.lmao.cloud.util.LogUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.BindException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.stream.Collectors;

import org.springframework.security.core.AuthenticationException;

/**
 * 全局异常处理器
 * 1. 统一异常处理
 * 2. 结构化日志记录
 * 3. 安全敏感信息过滤
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private final Logger log = LogUtil.getLogger();

    private void pvfLog(HttpServletRequest request, String errorMsg) {
        log.warn("参数校验失败 [traceId={}]: {}", MDC.get("traceId"), errorMsg);
    }

    /**
     * 处理自定义业务异常
     */
    @ExceptionHandler(CustomException.class)
    public <T> ApiResponse<T> handleCustomException(CustomException e, HttpServletRequest request) {
        log.error("业务异常: [traceId={}]: code={}, msg={}",
                MDC.get("traceId"), e.getCode(), sanitize(e.getMsg()), e);
        return ApiResponse.error(e.getCode(), e.getMsg());
    }

    @ExceptionHandler(AuthenticationException.class) // 捕获所有认证异常
    public <T> ApiResponse<T> handleAuthException(AuthenticationException e) {
        log.warn("认证失败");
        return ApiResponse.exception(e instanceof BadCredentialsException ? ExceptionCodeMsg.BAD_CREDENTIALS
                : ExceptionCodeMsg.AUTH_FAIL);
    }

    // 处理文件上传大小超限异常
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public <T> ApiResponse<T> handleMaxSizeException(MaxUploadSizeExceededException e) {
        log.error("文件大小超过限制: {}", e.getMessage());
        return ApiResponse.exception(ExceptionCodeMsg.FILE_SIZE_EXCEEDED);
    }

    // 处理其他文件上传异常
    @ExceptionHandler(MultipartException.class)
    public <T> ApiResponse<T> handleMultipartException(MultipartException e) {
        log.error("文件上传异常: {}", e.getMessage());
        return ApiResponse.exception(ExceptionCodeMsg.FILE_UPLOAD_FAILED);
    }

    /**
     * 处理404资源未找到异常
     */
    @ExceptionHandler(NoResourceFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public <T> ApiResponse<T> handleNoHandlerFoundException(NoResourceFoundException e, HttpServletRequest request) {
        log.warn("资源不存在 [traceId={}]: method={}, uri={}",
                MDC.get("traceId"), request.getMethod(), request.getRequestURI());
        return ApiResponse.exception(ExceptionCodeMsg.RESOURCE_NOT_FOUND);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public <T> ApiResponse<T> handleTypeNotSupportedException(
            HttpMediaTypeNotSupportedException e, HttpServletRequest request) {
        String contentType = request.getContentType();
        String mimeType = (contentType != null) ? contentType.split(";")[0] : "null";

        log.warn("不支持此请求类型[traceId={}]: type={}, uri={}",
                MDC.get("traceId"),
                mimeType, // 直接取 MIME 类型（如 "multipart/form-data"）
                request.getRequestURI());

        return ApiResponse.exception(ExceptionCodeMsg.PARAM_TYPE_NOT_FOUND);
    }

    /**
     * 处理请求方法不支持异常
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    @ResponseStatus(HttpStatus.METHOD_NOT_ALLOWED)
    public <T> ApiResponse<T> handleMethodNotSupportedException(
            HttpRequestMethodNotSupportedException e, HttpServletRequest request) {
        log.warn("方法不支持 [traceId={}]: uri={}, supported={}",
                MDC.get("traceId"), request.getRequestURI(), e.getSupportedHttpMethods());
        return ApiResponse.exception(ExceptionCodeMsg.PARAM_METHOD_NOT_FOUND);
    }

    /**
     * 处理参数校验异常(@Validated @Valid)
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public <T> ApiResponse<T> handleMethodArgumentNotValidException(
            MethodArgumentNotValidException e, HttpServletRequest request) {

        String errorMsg = e.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + sanitize(error.getDefaultMessage()))
                .collect(Collectors.joining("; "));

        pvfLog(request, errorMsg);
        return ApiResponse.error(HttpStatus.BAD_REQUEST.value(), "参数校验失败: " + errorMsg);
    }

    /**
     * 处理参数绑定异常
     */
    @ExceptionHandler(BindException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public <T> ApiResponse<T> handleBindException(BindException e, HttpServletRequest request) {
        String errorMsg = e.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + sanitize(error.getDefaultMessage()))
                .collect(Collectors.joining("; "));

        log.warn("参数绑定失败 [traceId={}]: {}", MDC.get("traceId"), errorMsg);
        return ApiResponse.error(HttpStatus.BAD_REQUEST.value(), "参数绑定失败: " + errorMsg);
    }

    /**
     * 处理参数校验异常(@RequestParam、@PathVariable)
     */
    @ExceptionHandler(ConstraintViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public <T> ApiResponse<T> handleConstraintViolationException(
            ConstraintViolationException e, HttpServletRequest request) {

        String errorMsg = e.getConstraintViolations().stream()
                .map(v -> {
                    String path = v.getPropertyPath().toString();
                    String field = path.contains(".") ? path.substring(path.lastIndexOf('.') + 1) : path;
                    return field + ": " + sanitize(v.getMessage());
                })
                .collect(Collectors.joining("; "));

        pvfLog(request, errorMsg);
        return ApiResponse.error(HttpStatus.BAD_REQUEST.value(), "参数校验失败: " + errorMsg);
    }

    /**
     * 处理请求参数缺失异常
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public <T> ApiResponse<T> handleMissingParameterException(
            MissingServletRequestParameterException e, HttpServletRequest request) {

        log.warn("缺少参数 [traceId={}]: name={}, type={}",
                MDC.get("traceId"), e.getParameterName(), e.getParameterType());
        return ApiResponse.error(HttpStatus.BAD_REQUEST.value(),
                "缺少必要参数: " + e.getParameterName());
    }

    /**
     * 处理参数类型不匹配异常
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public <T> ApiResponse<T> handleMethodArgumentTypeMismatchException(
            MethodArgumentTypeMismatchException e, HttpServletRequest request) {

        log.warn("参数类型不匹配 [traceId={}]: name={}, requiredType={}, value={}",
                MDC.get("traceId"), e.getName(),
                e.getRequiredType() != null ? e.getRequiredType().getSimpleName() : "null",
                sanitize(String.valueOf(e.getValue())));

        return ApiResponse.error(HttpStatus.BAD_REQUEST.value(),
                "参数类型不匹配: " + e.getName() + " 需要 " +
                        (e.getRequiredType() != null ? e.getRequiredType().getSimpleName() : "未知") + " 类型");
    }

    /**
     * 处理请求体不可读异常(如JSON格式错误)
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public <T> ApiResponse<T> handleHttpMessageNotReadableException(
            HttpMessageNotReadableException e, HttpServletRequest request) {

        log.warn("请求体不可读 [traceId={}]: {}", MDC.get("traceId"), e.getMessage());
        return ApiResponse.exception(ExceptionCodeMsg.REQUEST_BODY_INVALID);
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ApiResponse<?> handleOptimisticLockingFailure(ObjectOptimisticLockingFailureException ex) {
        log.warn("乐观锁冲突: {}", ex.getMessage());
        return ApiResponse.exception(ExceptionCodeMsg.OPTIMISTIC_LOCK_CONFLICT);
    }

    /**
     * 处理所有未捕获的异常
     */
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public <T> ApiResponse<T> handleAllException(Exception e, HttpServletRequest request) {
        log.error("系统异常 [traceId={}]: {}", MDC.get("traceId"), e.getMessage(), e);
        return ApiResponse.exception(ExceptionCodeMsg.INTERNAL_ERROR);
    }

    /**
     * 敏感信息脱敏处理
     */
    private String sanitize(String input) {
        if (input == null)
            return null;
        // 手机号脱敏
        input = input.replaceAll("(\\d{3})\\d{4}(\\d{4})", "$1****$2");
        // 邮箱脱敏
        input = input.replaceAll("(\\w{2})[^@]*(@.*)", "$1****$2");
        return input;
    }

}