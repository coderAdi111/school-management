$ErrorActionPreference = 'Stop'

# Run this script from:
# C:\Users\aks30\Downloads\school-management-current-data-filtered-with-teachers\school-management-git

$root = Get-Location
$frontend = Join-Path $root 'school-frontend'
$backend = Join-Path $root 'management'
$bundle = 'C:\Users\aks30\Downloads\admin-login-system\admin-login-system'

if (!(Test-Path $frontend) -or !(Test-Path $backend)) {
    throw 'Run this script from the school-management-git project root.'
}

function Copy-NewFile($source, $destination) {
    $dir = Split-Path -Parent $destination
    New-Item -ItemType Directory -Force $dir | Out-Null
    Copy-Item $source $destination -Force
}

# ---------------- BACKEND ----------------

Copy-NewFile `
    "$bundle\backend\com\school\management\Controller\AdminAuthController.java" `
    "$backend\src\main\java\com\school\management\Controller\AdminAuthController.java"

Copy-NewFile `
    "$bundle\backend\com\school\management\Service\AdminAuthService.java" `
    "$backend\src\main\java\com\school\management\Service\AdminAuthService.java"

Copy-NewFile `
    "$bundle\backend\com\school\management\config\AdminAuthInterceptor.java" `
    "$backend\src\main\java\com\school\management\config\AdminAuthInterceptor.java"

Copy-NewFile `
    "$bundle\backend\com\school\management\config\AdminAuthWebConfig.java" `
    "$backend\src\main\java\com\school\management\config\AdminAuthWebConfig.java"

Copy-NewFile `
    "$bundle\backend\com\school\management\entity\dto\AdminLoginRequest.java" `
    "$backend\src\main\java\com\school\management\entity\dto\AdminLoginRequest.java"

Copy-NewFile `
    "$bundle\backend\com\school\management\entity\dto\AdminLoginResponse.java" `
    "$backend\src\main\java\com\school\management\entity\dto\AdminLoginResponse.java"


# ---------------- FRONTEND ----------------

Copy-NewFile `
    "$bundle\frontend\src\app\auth\auth.service.ts" `
    "$frontend\src\app\auth\auth.service.ts"

Copy-NewFile `
    "$bundle\frontend\src\app\auth\auth.guard.ts" `
    "$frontend\src\app\auth\auth.guard.ts"

Copy-NewFile `
    "$bundle\frontend\src\app\auth\auth.interceptor.ts" `
    "$frontend\src\app\auth\auth.interceptor.ts"

Copy-NewFile `
    "$bundle\frontend\src\app\components\admin-login\admin-login.component.ts" `
    "$frontend\src\app\components\admin-login\admin-login.component.ts"

Copy-NewFile `
    "$bundle\frontend\src\app\components\admin-login\admin-login.component.html" `
    "$frontend\src\app\components\admin-login\admin-login.component.html"

Copy-NewFile `
    "$bundle\frontend\src\app\components\admin-login\admin-login.component.css" `
    "$frontend\src\app\components\admin-login\admin-login.component.css"


# ---------------- ROUTES ----------------

$routesFile = Join-Path $frontend 'src\app\app.routes.ts'

if (!(Test-Path $routesFile)) {
    throw "Missing $routesFile"
}

Copy-Item $routesFile "$routesFile.before-admin-login.bak" -Force

$routes = Get-Content $routesFile -Raw


# Add imports
if ($routes -notmatch 'AdminLoginComponent') {
    $routes = "import { AdminLoginComponent } from './components/admin-login/admin-login.component';`r`n" + $routes
}

if ($routes -notmatch 'authGuard') {
    $routes = "import { authGuard } from './auth/auth.guard';`r`n" + $routes
}


# Add public login route before wildcard route
$loginExistsPattern = 'path:\s*[''"]login[''"]'

if ($routes -notmatch $loginExistsPattern) {

    $loginRoute = "  { path: 'login', component: AdminLoginComponent },`r`n"

    $wildcardPattern = '(?m)^\s*\{\s*path:\s*[''"]\*\*[''"]'

    if ($routes -match $wildcardPattern) {
        $routes = [regex]::Replace(
            $routes,
            $wildcardPattern,
            $loginRoute + '  { path: "**"',
            1
        )
    }
}


# Protect management routes
$protectedPaths = @(
    'dashboard',
    'students',
    'teachers',
    'classes',
    'attendance',
    'timetable',
    'fees',
    'marks'
)

foreach ($path in $protectedPaths) {

    $escapedPath = [regex]::Escape($path)

    $routePattern =
        '(?ms)(\{\s*path:\s*[''"]' +
        $escapedPath +
        '[''"][^\}]*?component:\s*[^,\}]+)(\s*,?\s*)'

    $guardPattern =
        'path:\s*[''"]' +
        $escapedPath +
        '[''"][^\}]*canActivate:\s*\[\s*authGuard\s*\]'

    if (
        $routes -match $routePattern -and
        $routes -notmatch $guardPattern
    ) {

        $routes = [regex]::Replace(
            $routes,
            $routePattern,
            '$1, canActivate: [authGuard]$2',
            1
        )
    }
}


Set-Content `
    $routesFile `
    $routes `
    -NoNewline `
    -Encoding utf8


# ---------------- HTTP INTERCEPTOR ----------------

$configFile = Join-Path $frontend 'src\app\app.config.ts'

if (Test-Path $configFile) {

    Copy-Item $configFile "$configFile.before-admin-login.bak" -Force

    $config = Get-Content $configFile -Raw


    # Add interceptor import
    if ($config -notmatch 'auth\.interceptor') {
        $config =
            "import { authInterceptor } from './auth/auth.interceptor';`r`n" +
            $config
    }


    # Add withInterceptors import
    if ($config -notmatch 'withInterceptors') {

        $httpImportPattern =
            "import \{\s*provideHttpClient\s*\}\s+from '@angular/common/http';"

        if ($config -match $httpImportPattern) {

            $config = $config -replace `
                $httpImportPattern, `
                "import { provideHttpClient, withInterceptors } from '@angular/common/http';"

        }
        elseif ($config -notmatch 'withInterceptors') {

            $config =
                "import { withInterceptors } from '@angular/common/http';`r`n" +
                $config
        }


        # Replace provideHttpClient()
        $config = $config -replace `
            'provideHttpClient\(\s*\)', `
            'provideHttpClient(withInterceptors([authInterceptor]))'
    }


    if ($config -notmatch 'withInterceptors\(\[authInterceptor\]\)') {
        throw 'Could not safely add authInterceptor to app.config.ts. Open the backup and add provideHttpClient(withInterceptors([authInterceptor])).'
    }


    Set-Content `
        $configFile `
        $config `
        -NoNewline `
        -Encoding utf8
}


# ---------------- GLOBAL LOGOUT LINK ----------------

$appHtml = Join-Path $frontend 'src\app\app.html'

if (Test-Path $appHtml) {

    Copy-Item $appHtml "$appHtml.before-admin-login.bak" -Force

    $html = Get-Content $appHtml -Raw

    if ($html -notmatch 'school-admin-logout') {

        $logout = @'

<a class="school-admin-logout" href="/login" onclick="localStorage.removeItem('school_admin_token');localStorage.removeItem('school_admin_user');">
  🔒 Logout
</a>

<style>
.school-admin-logout{
    position:fixed;
    right:22px;
    bottom:20px;
    z-index:9998;
    padding:11px 15px;
    border-radius:14px;
    background:rgba(17,24,39,.92);
    color:#fff;
    text-decoration:none;
    font:700 12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    box-shadow:0 12px 30px rgba(15,23,42,.2);
    backdrop-filter:blur(14px);
    transition:.2s ease;
}

.school-admin-logout:hover{
    transform:translateY(-2px);
    background:#111827;
}
</style>

'@

        $html += $logout

        Set-Content `
            $appHtml `
            $html `
            -NoNewline `
            -Encoding utf8
    }
}


# ---------------- ADMIN CREDENTIALS ----------------

$properties = Join-Path `
    $backend `
    'src\main\resources\application.properties'

if (Test-Path $properties) {

    $p = Get-Content $properties -Raw

    if ($p -notmatch '(?m)^admin\.username=') {
        Add-Content $properties "`r`nadmin.username=admin"
    }

    if ($p -notmatch '(?m)^admin\.password=') {
        Add-Content $properties "admin.password=admin@123"
    }

}
else {

    Write-Warning `
        'application.properties was not found. Backend defaults are admin / admin@123. Prefer setting ADMIN credentials through Render environment/application properties.'
}


# ---------------- SUCCESS ----------------

Write-Host ''
Write-Host '============================================' -ForegroundColor Green
Write-Host 'ADMIN LOGIN SYSTEM INSTALLED' -ForegroundColor Green
Write-Host '============================================' -ForegroundColor Green

Write-Host 'Login URL:  http://localhost:4200/login'
Write-Host 'Username:   admin'
Write-Host 'Password:   admin@123'
Write-Host ''

Write-Host `
    'Protected: Dashboard, Students, Teachers, Classes, Attendance, Timetable, Fees, Marks' `
    -ForegroundColor Cyan

Write-Host `
    'Backups: *.before-admin-login.bak' `
    -ForegroundColor DarkGray

Write-Host ''
Write-Host 'Next:'
Write-Host '  cd management'
Write-Host '  .\mvnw.cmd clean package -DskipTests'
Write-Host '  cd ..\school-frontend'
Write-Host '  npm run build'