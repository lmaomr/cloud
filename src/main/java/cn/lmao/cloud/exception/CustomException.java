package cn.lmao.cloud.exception;

import cn.lmao.cloud.model.enums.ExceptionCodeMsg;
import lombok.Getter;

@Getter
public class CustomException extends RuntimeException {

    private final int code;
    private final String msg;

    public CustomException(ExceptionCodeMsg exceptionCodeMsg) {
        super(exceptionCodeMsg.getMsg());  // 传递消息给父类
        this.code = exceptionCodeMsg.getCode();
        this.msg = exceptionCodeMsg.getMsg();
    }

    public CustomException(int code, String msg) {
        super(msg);
        this.code = code;
        this.msg = msg;
    }

}
