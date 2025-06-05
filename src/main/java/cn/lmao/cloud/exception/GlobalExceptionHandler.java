package cn.lmao.cloud.exception;

import cn.lmao.cloud.model.dto.Response;
import cn.lmao.cloud.model.enums.ExceptionCodeMsg;
import cn.lmao.cloud.util.LogUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
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

    private final Logger log = LogUtils.getLogger();

    private void pvfLog(HttpServletRequest request, String errorMsg) {
        log.warn("参数校验失败 [traceId={}]: {}", getTraceId(request), errorMsg);
    }

    /**
     * 处理自定义业务异常
     */
    @ExceptionHandler(CustomException.class)
    public <T> Response<T> handleCustomException(CustomException e, HttpServletRequest request) {
        log.error("业务异常: [traceId={}]: code={}, msg={}",
                getTraceId(request), e.getCode(), sanitize(e.getMsg()), e);
        return Response.error(e.getCode(), e.getMsg());
    }

    /**
     * 处理404资源未找到异常
     */
    @ExceptionHandler(NoResourceFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public <T> Response<T> handleNoHandlerFoundException(NoResourceFoundException e, HttpServletRequest request) {
        log.warn("资源不存在 [traceId={}]: method={}, uri={}",
                getTraceId(request), request.getMethod(), request.getRequestURI());
        return Response.exception(ExceptionCodeMsg.RESOURCE_NOT_FOUND);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public <T> Response<T> handleTypeNotSupportedException(
            HttpMediaTypeNotSupportedException e, HttpServletRequest request) {
        String contentType = request.getContentType();
        String mimeType = (contentType != null) ? contentType.split(";")[0] : "null";

        log.warn("不支持此请求类型[traceId={}]: type={}, uri={}",
                getTraceId(request),
                mimeType, // 直接取 MIME 类型（如 "multipart/form-data"）
                request.getRequestURI());

        return Response.exception(ExceptionCodeMsg.PARAM_TYPE_NOT_FOUND);
    }

    /**
     * 处理请求方法不支持异常
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    @ResponseStatus(HttpStatus.METHOD_NOT_ALLOWED)
    public <T> Response<T> handleMethodNotSupportedException(
            HttpRequestMethodNotSupportedException e, HttpServletRequest request) {
        log.warn("方法不支持 [traceId={}]: uri={}, supported={}",
                getTraceId(request), request.getRequestURI(), e.getSupportedHttpMethods());
        return Response.exception(ExceptionCodeMsg.PARAM_METHOD_NOT_FOUND);
    }

    /**
     * 处理参数校验异常(@Validated @Valid)
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public <T> Response<T> handleMethodArgumentNotValidException(
            MethodArgumentNotValidException e, HttpServletRequest request) {

        String errorMsg = e.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + sanitize(error.getDefaultMessage()))
                .collect(Collectors.joining("; "));

        pvfLog(request, errorMsg);
        return Response.error(HttpStatus.BAD_REQUEST.value(), "参数校验失败: " + errorMsg);
    }

    /**
     * 处理参数绑定异常
     */
    @ExceptionHandler(BindException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public <T> Response<T> handleBindException(BindException e, HttpServletRequest request) {
        String errorMsg = e.getBindingResult().getFieldErrors().stream()
                .map(error -> error.getField() + ": " + sanitize(error.getDefaultMessage()))
                .collect(Collectors.joining("; "));

        log.warn("参数绑定失败 [traceId={}]: {}", getTraceId(request), errorMsg);
        return Response.error(HttpStatus.BAD_REQUEST.value(), "参数绑定失败: " + errorMsg);
    }

    /**
     * 处理参数校验异常(@RequestParam、@PathVariable)
     */
    @ExceptionHandler(ConstraintViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public <T> Response<T> handleConstraintViolationException(
            ConstraintViolationException e, HttpServletRequest request) {

        String errorMsg = e.getConstraintViolations().stream()
                .map(v -> {
                    String path = v.getPropertyPath().toString();
                    String field = path.contains(".") ? path.substring(path.lastIndexOf('.') + 1) : path;
                    return field + ": " + sanitize(v.getMessage());
                })
                .collect(Collectors.joining("; "));

        pvfLog(request, errorMsg);
        return Response.error(HttpStatus.BAD_REQUEST.value(), "参数校验失败: " + errorMsg);
    }

    /**
     * 处理请求参数缺失异常
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public <T> Response<T> handleMissingParameterException(
            MissingServletRequestParameterException e, HttpServletRequest request) {

        log.warn("缺少参数 [traceId={}]: name={}, type={}",
                getTraceId(request), e.getParameterName(), e.getParameterType());
        return Response.error(HttpStatus.BAD_REQUEST.value(),
                "缺少必要参数: " + e.getParameterName());
    }

    /**
     * 处理参数类型不匹配异常
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public <T> Response<T> handleMethodArgumentTypeMismatchException(
            MethodArgumentTypeMismatchException e, HttpServletRequest request) {

        log.warn("参数类型不匹配 [traceId={}]: name={}, requiredType={}, value={}",
                getTraceId(request), e.getName(),
                e.getRequiredType() != null ? e.getRequiredType().getSimpleName() : "null",
                sanitize(String.valueOf(e.getValue())));

        return Response.error(HttpStatus.BAD_REQUEST.value(),
                "参数类型不匹配: " + e.getName() + " 需要 " +
                        (e.getRequiredType() != null ? e.getRequiredType().getSimpleName() : "未知") + " 类型");
    }

    /**
     * 处理请求体不可读异常(如JSON格式错误)
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public <T> Response<T> handleHttpMessageNotReadableException(
            HttpMessageNotReadableException e, HttpServletRequest request) {

        log.warn("请求体不可读 [traceId={}]: {}", getTraceId(request), e.getMessage());
        return Response.exception(ExceptionCodeMsg.REQUEST_BODY_INVALID);
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public Response<?> handleOptimisticLockingFailure(ObjectOptimisticLockingFailureException ex) {
        log.warn("乐观锁冲突: {}", ex.getMessage());
        return Response.exception(ExceptionCodeMsg.OPTIMISTIC_LOCK_CONFLICT);
    }

    @ExceptionHandler(AuthenticationException.class) // 捕获所有认证异常
    public <T> Response<T> handleAuthException(AuthenticationException e) {
        log.warn("认证失败");
        return Response.exception(e instanceof BadCredentialsException ? ExceptionCodeMsg.BAD_CREDENTIALS
                : ExceptionCodeMsg.AUTH_FAIL);
    }

    /**
     * 处理所有未捕获的异常
     */
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public <T> Response<T> handleAllException(Exception e, HttpServletRequest request) {
        log.error("系统异常 [traceId={}]: {}", getTraceId(request), e.getMessage(), e);
        return Response.exception(ExceptionCodeMsg.INTERNAL_ERROR);
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

    /**
     * 获取请求的追踪ID
     */
    private String getTraceId(HttpServletRequest request) {
        return request.getHeader("X-Trace-Id");
    }
}