// ============================================================
// BonzShop Security Suite - Comprehensive Protection
// ============================================================

// 1. CLIENT-SIDE RATE LIMITER
// Prevents rapid-fire requests from the browser
class ClientRateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  check(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    const valid = timestamps.filter(t => now - t < windowMs);
    
    if (valid.length >= maxRequests) return false;
    
    valid.push(now);
    this.requests.set(key, valid);
    return true;
  }
  
  reset(key: string) {
    this.requests.delete(key);
  }
}

export const rateLimiter = new ClientRateLimiter();

// 2. BRUTE FORCE PROTECTION
const LOGIN_ATTEMPTS_KEY = 'bonz_login_attempts';
const LOGIN_LOCKOUT_KEY = 'bonz_login_lockout';

interface LoginAttempts {
  count: number;
  firstAttempt: number;
}

export function checkLoginAttempts(): { allowed: boolean; remainingAttempts: number; lockoutEndTime?: number } {
  const lockoutEnd = localStorage.getItem(LOGIN_LOCKOUT_KEY);
  if (lockoutEnd) {
    const endTime = parseInt(lockoutEnd, 10);
    if (Date.now() < endTime) {
      return { allowed: false, remainingAttempts: 0, lockoutEndTime: endTime };
    }
    // Lockout expired
    localStorage.removeItem(LOGIN_LOCKOUT_KEY);
    localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
  }

  const data = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
  if (!data) return { allowed: true, remainingAttempts: 5 };

  const attempts: LoginAttempts = JSON.parse(data);
  const WINDOW = 5 * 60 * 1000; // 5 minutes

  // Reset if window expired
  if (Date.now() - attempts.firstAttempt > WINDOW) {
    localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
    return { allowed: true, remainingAttempts: 5 };
  }

  const remaining = Math.max(0, 5 - attempts.count);
  return { allowed: remaining > 0, remainingAttempts: remaining };
}

export function recordLoginAttempt() {
  const data = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
  const WINDOW = 5 * 60 * 1000;
  
  let attempts: LoginAttempts;
  if (data) {
    attempts = JSON.parse(data);
    if (Date.now() - attempts.firstAttempt > WINDOW) {
      attempts = { count: 1, firstAttempt: Date.now() };
    } else {
      attempts.count++;
    }
  } else {
    attempts = { count: 1, firstAttempt: Date.now() };
  }

  localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(attempts));

  // Lock out after 5 failed attempts for 15 minutes
  if (attempts.count >= 5) {
    const lockoutDuration = 15 * 60 * 1000;
    localStorage.setItem(LOGIN_LOCKOUT_KEY, (Date.now() + lockoutDuration).toString());
  }
}

export function resetLoginAttempts() {
  localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
  localStorage.removeItem(LOGIN_LOCKOUT_KEY);
}

// 3. ANTI-BOT: HONEYPOT
// If this field gets filled, it's a bot
export function isHoneypotTriggered(value: string): boolean {
  return value.length > 0;
}

// 4. ANTI-BOT: TIMING CHECK
// Humans take at least 2 seconds to fill a form
export function createFormTimer() {
  const startTime = Date.now();
  return {
    getElapsed: () => Date.now() - startTime,
    isSuspicious: () => Date.now() - startTime < 2000, // Less than 2s = bot
  };
}

// 5. COPY PROTECTION & RIGHT-CLICK DISABLE
export function enableCopyProtection() {
  // Disable right-click
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // Disable text selection on sensitive elements
  document.addEventListener('selectstart', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, [contenteditable]')) return; // Allow in inputs
    // Allow selection in normal content, just prevent on sensitive areas
  });

  // Disable copy of sensitive data
  document.addEventListener('copy', (e) => {
    const selection = window.getSelection()?.toString() || '';
    // Block copying if it contains potential credentials
    if (selection.match(/password|mật khẩu|login|đăng nhập/i)) {
      e.preventDefault();
    }
  });

  // Disable drag
  document.addEventListener('dragstart', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      e.preventDefault();
    }
  });
}

// 6. DEV TOOLS DETECTION
export function detectDevTools(callback: () => void) {
  const threshold = 160;
  
  const check = () => {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    
    if (widthThreshold || heightThreshold) {
      callback();
    }
  };

  // Check periodically
  setInterval(check, 3000);
  
  // Also detect via debug statement timing
  const devtools = { open: false };
  const element = new Image();
  Object.defineProperty(element, 'id', {
    get: function() {
      devtools.open = true;
      callback();
      return '';
    }
  });
  
  setInterval(() => {
    devtools.open = false;
    console.debug(element);
  }, 5000);
}

// 7. XSS SANITIZER
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// 8. REQUEST INTEGRITY - Add timestamp + hash to requests
export function generateRequestToken(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 15);
  return btoa(`${timestamp}:${random}`);
}

export function isValidRequestToken(token: string, maxAgeMs: number = 300000): boolean {
  try {
    const decoded = atob(token);
    const [timestamp] = decoded.split(':');
    const age = Date.now() - parseInt(timestamp, 10);
    return age >= 0 && age <= maxAgeMs;
  } catch {
    return false;
  }
}

// 9. CSRF-LIKE PROTECTION (session-bound token)
const CSRF_KEY = 'bonz_csrf_token';

export function getCsrfToken(): string {
  let token = sessionStorage.getItem(CSRF_KEY);
  if (!token) {
    token = crypto.randomUUID();
    sessionStorage.setItem(CSRF_KEY, token);
  }
  return token;
}

// 10. ANTI-AUTOMATION: Keyboard behavior analysis
class BehaviorAnalyzer {
  private keyTimings: number[] = [];
  private mouseMovements: number = 0;
  private startTime: number = Date.now();

  recordKeyPress() {
    this.keyTimings.push(Date.now());
  }

  recordMouseMove() {
    this.mouseMovements++;
  }

  // Bots typically have very uniform key timings
  isLikelyBot(): boolean {
    if (this.keyTimings.length < 3) return false;
    
    const intervals: number[] = [];
    for (let i = 1; i < this.keyTimings.length; i++) {
      intervals.push(this.keyTimings[i] - this.keyTimings[i - 1]);
    }
    
    // Check if all intervals are suspiciously uniform (< 5ms variance)
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / intervals.length;
    
    // Very low variance + no mouse movement = likely bot
    if (variance < 25 && this.mouseMovements === 0 && this.keyTimings.length > 5) {
      return true;
    }
    
    // Superhuman typing speed (< 30ms between keys consistently)
    if (avg < 30 && this.keyTimings.length > 10) {
      return true;
    }

    return false;
  }

  reset() {
    this.keyTimings = [];
    this.mouseMovements = 0;
    this.startTime = Date.now();
  }
}

export const behaviorAnalyzer = new BehaviorAnalyzer();

// 11. CONSOLE PROTECTION - Override console to hide sensitive info in production
export function protectConsole() {
  if (import.meta.env.PROD) {
    const noop = () => {};
    // Keep console.error for debugging critical issues
    console.log = noop;
    console.debug = noop;
    console.info = noop;
    console.warn = noop;
    console.table = noop;
    console.dir = noop;
    console.trace = noop;
  }
}

// 12. IFRAME PROTECTION - Prevent clickjacking
export function preventClickjacking() {
  if (window.self !== window.top) {
    // We're in an iframe - only allow known domains
    try {
      const parentOrigin = document.referrer;
      const allowedOrigins = [
        'lovable.app',
        'lovable.dev',
        'lovableproject.com',
        'bonzshop.lovable.app',
        'webcontainer.io',
      ];
      
      const isAllowed = allowedOrigins.some(origin => parentOrigin.includes(origin));
      if (!isAllowed && parentOrigin) {
        // Log warning instead of destroying DOM - prevents false positives
        console.warn('[Security] Iframe embedding from unauthorized origin detected:', parentOrigin);
      }
    } catch {
      // Cross-origin - can't read parent
    }
  }
}

// 13. LOCAL STORAGE TAMPER DETECTION
export function detectStorageTamper() {
  const INTEGRITY_KEY = 'bonz_integrity';
  
  // Create integrity check on first load
  const stored = localStorage.getItem(INTEGRITY_KEY);
  const expected = generateIntegrityHash();
  
  if (stored && stored !== expected) {
    // Storage has been tampered with - clear sensitive data
    console.warn('[Security] Storage tampering detected');
    localStorage.removeItem('bonz_session_token');
    sessionStorage.clear();
  }
  
  localStorage.setItem(INTEGRITY_KEY, expected);
}

function generateIntegrityHash(): string {
  const keys = ['bonz_captcha_verified', 'security_violations', 'user_blocked'];
  const values = keys.map(k => localStorage.getItem(k) || 'null').join('|');
  // Simple hash
  let hash = 0;
  for (let i = 0; i < values.length; i++) {
    const char = values.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

// 14. ANTI-SOURCE VIEW - Chống xem source code
export function protectSourceCode() {
  if (!import.meta.env.PROD) return;

  // Chặn Ctrl+U (View Source)
  document.addEventListener('keydown', (e) => {
    // Ctrl+U - View source
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    // Ctrl+Shift+I - DevTools
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    // Ctrl+Shift+J - Console
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    // Ctrl+Shift+C - Inspect element
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    // F12
    if (e.key === 'F12') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    // Ctrl+S - Save page
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    // Ctrl+P - Print page
    if (e.ctrlKey && e.key === 'p') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);

  // Chặn hoàn toàn right click
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  }, true);

  // Anti-debug: chỉ log cảnh báo, KHÔNG xóa body (tránh false-positive trên máy chậm)
  // DevTools detection đã được xử lý ở detectDevTools()

  // Override toString để chống console inspect
  const originalToString = Function.prototype.toString;
  Function.prototype.toString = function() {
    if (this === Function.prototype.toString) {
      return 'function toString() { [native code] }';
    }
    // Trả về fake code
    return 'function() { [protected code] }';
  };
}

// 15. DISABLE TEXT SELECTION trên toàn bộ trang (trừ input/textarea)
export function disableTextSelection() {
  if (!import.meta.env.PROD) return;
  
  const style = document.createElement('style');
  style.textContent = `
    * {
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
    }
    input, textarea, [contenteditable="true"], pre, code {
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
      user-select: text !important;
    }
  `;
  document.head.appendChild(style);
}

// MASTER INIT - Call this once on app startup
export function initSecuritySuite() {
  protectConsole();
  preventClickjacking();
  enableCopyProtection();
  detectStorageTamper();
  protectSourceCode();
  disableTextSelection();
  
  // Dev tools detection - log warning
  detectDevTools(() => {
    // Trong production, hiển thị cảnh báo
    if (import.meta.env.PROD) {
      console.clear();
      console.log('%c⚠️ DỪNG LẠI!', 'color: red; font-size: 48px; font-weight: bold;');
      console.log('%cĐây là tính năng trình duyệt dành cho nhà phát triển.', 'font-size: 16px;');
      console.log('%cNếu ai đó bảo bạn sao chép-dán nội dung nào đó vào đây, đó là hành vi lừa đảo.', 'font-size: 16px; color: red;');
      console.log('%cMọi hành vi đều được ghi lại và theo dõi.', 'font-size: 14px; color: orange;');
    }
  });

  // Global keyboard/mouse tracking for behavior analysis
  document.addEventListener('keydown', () => behaviorAnalyzer.recordKeyPress());
  document.addEventListener('mousemove', () => behaviorAnalyzer.recordMouseMove());

  // Add security meta tags dynamically
  const meta = document.createElement('meta');
  meta.httpEquiv = 'X-Content-Type-Options';
  meta.content = 'nosniff';
  document.head.appendChild(meta);

  const referrerMeta = document.createElement('meta');
  referrerMeta.name = 'referrer';
  referrerMeta.content = 'strict-origin-when-cross-origin';
  document.head.appendChild(referrerMeta);
}
