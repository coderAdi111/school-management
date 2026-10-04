package com.school.management.Controller;

import com.school.management.Service.AdminAuthService;
import com.school.management.entity.dto.AdminLoginRequest;
import com.school.management.entity.dto.AdminLoginResponse;
import com.school.management.entity.dto.ChangeAdminCredentialsRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AdminAuthController {
    private final AdminAuthService authService;
    public AdminAuthController(AdminAuthService authService) { this.authService = authService; }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AdminLoginRequest request) {
        try {
            AdminLoginResponse response = authService.login(request.getUsername(), request.getPassword());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid admin credentials"));
        }
    }

    @PostMapping("/change-credentials")
    public ResponseEntity<?> changeCredentials(@RequestBody ChangeAdminCredentialsRequest request) {
        try {
            authService.changeCredentials(request.getCurrentPassword(),
                    request.getNewUsername(), request.getNewPassword());
            return ResponseEntity.ok(Map.of("message", "Credentials updated. Please sign in again."));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(value = "Authorization", required = false) String authorization) {
        authService.logout(extractToken(authorization));
        return ResponseEntity.noContent().build();
    }

    private String extractToken(String authorization) {
        return authorization != null && authorization.startsWith("Bearer ")
                ? authorization.substring(7).trim() : null;
    }
}
