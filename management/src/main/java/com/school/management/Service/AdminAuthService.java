package com.school.management.Service;

import com.school.management.entity.dto.AdminLoginResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AdminAuthService {

    @Value("${admin.username:admin}")
    private String adminUsername;

    @Value("${admin.password:admin@123}")
    private String adminPassword;

    private final Map<String, String> activeTokens = new ConcurrentHashMap<>();

    public AdminLoginResponse login(String username, String password) {
        if (username == null || password == null
                || !adminUsername.equals(username.trim())
                || !adminPassword.equals(password)) {
            throw new IllegalArgumentException("Invalid admin credentials");
        }

        String token = UUID.randomUUID().toString();
        activeTokens.put(token, adminUsername);

        return new AdminLoginResponse(token, adminUsername, "ADMIN");
    }

    public boolean isValidToken(String token) {
        return token != null && activeTokens.containsKey(token);
    }

    public void logout(String token) {
        if (token != null) {
            activeTokens.remove(token);
        }
    }
}
