package cn.lmao.cloud.model.enums;

import lombok.Getter;

@Getter
public enum FileSizeUnit {
    BYTES(1L),
    KB(1024L),
    MB(1024 * 1024L),
    GB(1024 * 1024 * 1024L),
    TB(1024 * 1024 * 1024 * 1024L);

    private final Long bytes;

    FileSizeUnit(Long bytes) {
        this.bytes = bytes;
    }
}
