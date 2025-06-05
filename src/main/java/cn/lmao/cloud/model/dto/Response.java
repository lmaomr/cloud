package cn.lmao.cloud.model.dto;

import cn.lmao.cloud.model.enums.ExceptionCodeMsg;
import lombok.Getter;

/**
 * 统一API响应封装类
 * @param <T> 响应数据类型
 */
@Getter
public class Response<T> {
    private static final int DEFAULT_SUCCESS_CODE = 200;
    private static final String DEFAULT_SUCCESS_MSG = "success";

    private final int code;
    private final String msg;
    private final T data;

    // 私有构造器
    private Response(int code, String msg, T data) {
        this.code = code;
        this.msg = msg;
        this.data = data;
    }

    public static class Builder<T> {
        private int code = DEFAULT_SUCCESS_CODE;
        private String msg = DEFAULT_SUCCESS_MSG;
        private T data;

        public Builder<T> code(int code) {
            this.code = code;
            return this;
        }

        public Builder<T> msg(String msg) {
            this.msg = msg;
            return this;
        }

        public Builder<T> data(T data) {
            this.data = data;
            return this;
        }

        public Response<T> build() {
            return new Response<>(code, msg, data);
        }
    }

    public static <T> Builder<T> builder() {
        return new Builder<>();
    }

    public static <T> Response<T> exception(ExceptionCodeMsg e) {
        return new Response<>(e.getCode(), e.getMsg(), null);
    }

    public static <T> Response<T> success() {
        return new Response<>(DEFAULT_SUCCESS_CODE, DEFAULT_SUCCESS_MSG, null);
    }

    public static <T> Response<T> success(T data) {
        return new Response<>(DEFAULT_SUCCESS_CODE, DEFAULT_SUCCESS_MSG, data);
    }

    public static <T> Response<T> success(String msg, T data) {
        return new Response<>(DEFAULT_SUCCESS_CODE, msg, data);
    }

    public static <T> Response<T> error(int code, String msg) {
        return new Response<>(code, msg, null);
    }

    public <U> Response<U> map(java.util.function.Function<? super T, ? extends U> mapper) {
        return new Response<>(code, msg, mapper.apply(data));
    }

}