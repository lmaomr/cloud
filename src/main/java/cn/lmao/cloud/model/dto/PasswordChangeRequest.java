package cn.lmao.cloud.model.dto;

public class PasswordChangeRequest {
    private String oldPassword;
    private String newPassword;
    
    // getters和setters
    public String getOldPassword() {
        return oldPassword;
    }
    
    public void setOldPassword(String oldPassword) {
        this.oldPassword = oldPassword;
    }
    
    public String getNewPassword() {
        return newPassword;
    }
    
    public void setNewPassword(String newPassword) {
        this.newPassword = newPassword;
    }
}