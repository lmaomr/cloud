package cn.lmao.cloud.services;


import org.springframework.stereotype.Service;

import cn.lmao.cloud.model.entity.File;
import cn.lmao.cloud.repository.FileRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FileService {

    private final FileRepository fileRepository;

    /**
     * 文件上传service
     */
    public File upload() {
        
        return new File();
    }
}