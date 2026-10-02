package com.school.management.Controller;

import com.school.management.Service.AdminAuthService;
import com.school.management.entity.dto.AdminLoginRequest;
import com.school.management.entity.dto.AdminLoginResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AdminAuthController {

    private final AdminAuthService authService;

    public AdminAuthController(AdminAuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AdminLoginRequest request) {
        try {
            AdminLoginResponse response = authService.login(
                    request.getUsername(),
                    request.getPassword()
            );
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(java.util.Map.of("message", "Invalid admin credentials"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        authService.logout(extractToken(authorization));
        return ResponseEntity.noContent().build();
    }

    private String extractToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }
        return authorization.substring(7).trim();
    }
}
