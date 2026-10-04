package com.school.management.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;

@Service
public class JwtService {
    @Value("${admin.jwt-secret}") private String jwtSecret;
    @Value("${admin.jwt-expiration:3600000}") private long jwtExpiration;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
    }

    public String generateToken(String username, long tokenVersion) {
        Date now = new Date();
        return Jwts.builder().subject(username)
                .claim("tokenVersion", tokenVersion)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + jwtExpiration))
                .signWith(getSigningKey()).compact();
    }

    public String extractUsername(String token) { return extractAllClaims(token).getSubject(); }
    public long extractTokenVersion(String token) {
        Number version = extractAllClaims(token).get("tokenVersion", Number.class);
        return version == null ? -1 : version.longValue();
    }
    public boolean isTokenValid(String token, String username) {
        try {
            Claims claims = extractAllClaims(token);
            return username.equals(claims.getSubject()) && claims.getExpiration().after(new Date());
        } catch (Exception ex) { return false; }
    }
    private Claims extractAllClaims(String token) {
        return Jwts.parser().verifyWith(getSigningKey()).build().parseSignedClaims(token).getPayload();
    }
}
