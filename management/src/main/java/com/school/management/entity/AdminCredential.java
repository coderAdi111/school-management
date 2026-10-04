package com.school.management.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "admin_credentials")
public class AdminCredential {
    @Id
    private Long id = 1L;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(name = "token_version", nullable = false)
    private long tokenVersion = 0;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public long getTokenVersion() { return tokenVersion; }
    public void setTokenVersion(long tokenVersion) { this.tokenVersion = tokenVersion; }
}
