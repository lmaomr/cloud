package cn.lmao.cloud.model.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "user")
@Data
@AllArgsConstructor
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(name = "user_email" ,nullable = false)
    private String email;

    @Column(name = "nick_name", nullable = false)
    private String nickname;

    //头像
    @Column(name = "avatar_url")
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_role", nullable = false)
    private Role role = Role.USER;

    @Column(name = "create_time", nullable = false, updatable = false, columnDefinition = "TIMESTAMP(0)")
    private LocalDateTime createTime;

    @Column(name = "update_time", nullable = false, columnDefinition = "TIMESTAMP(0)")
    private LocalDateTime updateTime;

    @Column(name = "last_login_time", columnDefinition = "TIMESTAMP(0)")
    private LocalDateTime lastLoginTime;

    @OneToOne(cascade = CascadeType.ALL, mappedBy = "user")
    @JsonManagedReference
    private Cloud cloud;

    @PrePersist
    protected void onCreate() {
        createTime = LocalDateTime.now();
        updateTime = createTime;
    }

    @PreUpdate
    protected void onUpdate() {
        updateTime = LocalDateTime.now();
    }

    //设置角色枚举
    public enum Role {
        //管理员
        ADMIN,
        //用户
        USER,
        //游客
        GUEST
    }

}
