package com.school.management.entity.dto;

public class AdminLoginResponse {
    private final String token;
    private final String username;
    private final String role;

    public AdminLoginResponse(String token, String username, String role) {
        this.token = token;
        this.username = username;
        this.role = role;
    }

    public String getToken() { return token; }
    public String getUsername() { return username; }
    public String getRole() { return role; }
}
