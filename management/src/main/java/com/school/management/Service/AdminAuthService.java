package com.school.management.Service;

import com.school.management.entity.AdminCredential;
import com.school.management.entity.dto.AdminLoginResponse;
import com.school.management.repository.AdminCredentialRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminAuthService {
    @Value("${admin.username:admin}") private String initialUsername;
    @Value("${admin.password-hash}") private String initialPasswordHash;

    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AdminCredentialRepository repository;

    public AdminAuthService(PasswordEncoder passwordEncoder, JwtService jwtService,
                            AdminCredentialRepository repository) {
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.repository = repository;
    }

    @PostConstruct
    @Transactional
    public void initializeCredentials() {
        if (repository.findById(1L).isEmpty()) {
            AdminCredential credential = new AdminCredential();
            credential.setId(1L);
            credential.setUsername(initialUsername);
            credential.setPasswordHash(initialPasswordHash);
            credential.setTokenVersion(0);
            repository.save(credential);
        }
    }

    public AdminLoginResponse login(String username, String password) {
        AdminCredential credential = repository.findById(1L)
                .orElseThrow(() -> new IllegalStateException("Admin credentials are not initialized"));
        if (username == null || password == null
                || !credential.getUsername().equals(username.trim())
                || !passwordEncoder.matches(password, credential.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid admin credentials");
        }
        String token = jwtService.generateToken(credential.getUsername(), credential.getTokenVersion());
        return new AdminLoginResponse(token, credential.getUsername(), "ADMIN");
    }

    public boolean isValidToken(String token) {
        if (token == null || token.isBlank()) return false;
        try {
            AdminCredential credential = repository.findById(1L).orElse(null);
            if (credential == null) return false;
            String username = jwtService.extractUsername(token);
            return credential.getUsername().equals(username)
                    && jwtService.isTokenValid(token, username)
                    && jwtService.extractTokenVersion(token) == credential.getTokenVersion();
        } catch (Exception ex) { return false; }
    }

    @Transactional
    public void changeCredentials(String currentPassword, String newUsername, String newPassword) {
        AdminCredential credential = repository.findById(1L)
                .orElseThrow(() -> new IllegalStateException("Admin credentials are not initialized"));
        if (currentPassword == null || !passwordEncoder.matches(currentPassword, credential.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect.");
        }
        if (newUsername == null || newUsername.trim().isEmpty()) {
            throw new IllegalArgumentException("New username is required.");
        }
        if (newPassword == null || newPassword.length() < 8) {
            throw new IllegalArgumentException("New password must be at least 8 characters.");
        }
        credential.setUsername(newUsername.trim());
        credential.setPasswordHash(passwordEncoder.encode(newPassword));
        credential.setTokenVersion(credential.getTokenVersion() + 1);
        repository.save(credential);
    }

    public void logout(String token) {
        // Client removes the token. Credentials updates increment tokenVersion to revoke all existing JWTs.
    }
}
