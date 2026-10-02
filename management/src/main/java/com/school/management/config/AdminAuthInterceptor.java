package com.school.management.config;

import com.school.management.Service.AdminAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AdminAuthInterceptor implements HandlerInterceptor {

    private final AdminAuthService authService;

    public AdminAuthInterceptor(AdminAuthService authService) {
        this.authService = authService;
    }

    @Override
    public boolean preHandle(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler
    ) throws Exception {
        String path = request.getRequestURI();

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())
                || path.equals("/api/auth/login")
                || path.equals("/api/auth/logout")) {
            return true;
        }

        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ")) {
            String token = authorization.substring(7).trim();
            if (authService.isValidToken(token)) {
                return true;
            }
        }

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write("{\"message\":\"Admin login required\"}");
        return false;
    }
}
