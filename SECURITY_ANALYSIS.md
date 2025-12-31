# Security Analysis Report

## Executive Summary

This report identifies critical security vulnerabilities in the authentication and authorization system, focusing on login bypass methods and insecure route protection.

---

## 🔴 CRITICAL VULNERABILITIES

### 1. Client-Side Route Protection Only (CRITICAL)

**Location:** `frontend/src/components/ProtectedRoute.tsx`, `frontend/src/components/AdminRoute.tsx`

**Issue:** Route protection is implemented entirely on the client-side. An attacker can bypass this by:
- Disabling JavaScript
- Modifying React state in browser DevTools
- Directly accessing API endpoints without going through the React app
- Manipulating localStorage to inject a fake token

**Vulnerable Code:**
```10:28:frontend/src/components/ProtectedRoute.tsx
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-orange-500" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signup" replace />;
  }

  return <>{children}</>;
}
```

**Impact:** All protected routes can be accessed without authentication by directly calling API endpoints.

**Recommendation:** Client-side route protection is acceptable for UX, but **ALL backend endpoints must enforce authentication**. The backend does this correctly, but the frontend should not be the only line of defense.

---

### 2. Token Stored in localStorage (HIGH)

**Location:** `frontend/src/contexts/AuthContext.tsx`, `frontend/src/lib/api.ts`

**Issue:** JWT tokens are stored in `localStorage`, which is vulnerable to:
- XSS attacks (if any XSS vulnerability exists, tokens can be stolen)
- No automatic expiration handling on the client
- Accessible to any JavaScript running on the domain

**Vulnerable Code:**
```24:24:frontend/src/contexts/AuthContext.tsx
const TOKEN_KEY = 'reci_auth_token';
```

```33:40:frontend/src/contexts/AuthContext.tsx
  useEffect(() => {
    // Load token from localStorage
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      setToken(storedToken);
      // Fetch user info
      fetchUser(storedToken);
    } else {
      setLoading(false);
    }
  }, []);
```

**Impact:** If an XSS vulnerability is introduced, all user tokens can be stolen.

**Recommendation:** 
- Consider using `httpOnly` cookies for token storage (requires backend changes)
- Implement token refresh mechanism
- Add CSRF protection if using cookies
- Sanitize all user inputs to prevent XSS

---

### 3. No Rate Limiting on Login/Register Endpoints (HIGH)

**Location:** `backend/src/routes/auth.ts`

**Issue:** Login and registration endpoints have no rate limiting, allowing:
- Brute force attacks on passwords
- Account enumeration (checking if emails exist)
- DoS attacks

**Vulnerable Endpoints:**
- `POST /api/auth/login` (line 104)
- `POST /api/auth/register` (line 11)
- `POST /api/auth/forgot-password` (line 201)

**Impact:** Attackers can attempt unlimited login attempts or flood the registration endpoint.

**Recommendation:** Implement rate limiting using `express-rate-limit`:
```typescript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later'
});

router.post('/login', loginLimiter, async (req, res) => { ... });
```

---

### 4. Shared Cart Endpoint Allows Unauthenticated Updates (MEDIUM)

**Location:** `backend/src/routes/cart.ts`

**Issue:** The shared cart update endpoint allows anyone with a share token to modify checked items without authentication. While this may be intentional, it could allow:
- Spam/abuse of shared carts
- Denial of service by repeatedly updating carts
- No validation on `checkedItems` array size or content

**Vulnerable Code:**
```189:220:backend/src/routes/cart.ts
// PUT /api/cart/shared/:shareToken - Update shared cart checked items
publicRouter.put('/shared/:shareToken', async (req: Request, res: Response) => {
  try {
    const { shareToken } = req.params;
    const { checkedItems } = req.body;

    if (!Array.isArray(checkedItems)) {
      return res.status(400).json({ error: 'checkedItems must be an array' });
    }

    const cart = await prisma.shoppingCart.findUnique({
      where: { shareToken },
    });

    if (!cart) {
      return res.status(404).json({ error: 'Shared cart not found' });
    }

    await prisma.shoppingCart.update({
      where: { shareToken },
      data: {
        checkedItems,
        updatedAt: new Date(),
      },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error updating shared cart:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Impact:** Shared carts can be abused or spammed. An attacker could send extremely large arrays to cause DoS.

**Recommendation:** 
- Add rate limiting to shared cart endpoints
- Validate array size (e.g., max 1000 items)
- Validate array content (should be strings matching expected format)
- Consider requiring authentication even for shared carts (optional auth)

---

### 5. CORS Configuration Allows All Origins in Development (MEDIUM)

**Location:** `backend/src/server.ts`

**Issue:** CORS is set to allow all origins (`*`) if `CORS_ORIGIN` is not set, which could allow unauthorized domains to make requests.

**Vulnerable Code:**
```16:22:backend/src/server.ts
// CORS configuration - restrict to specific origins in production
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*', // In production, set CORS_ORIGIN to your frontend URL
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
```

**Impact:** In production, if `CORS_ORIGIN` is not set, any website can make requests to your API.

**Recommendation:** 
- Fail fast if `CORS_ORIGIN` is not set in production
- Use environment detection to default to `*` only in development

---

### 6. No Input Validation on Recipe Updates (MEDIUM)

**Location:** `backend/src/routes/recipes.ts`

**Issue:** Recipe update endpoints accept arbitrary data without proper validation, potentially allowing:
- SQL injection (though Prisma should protect against this)
- Data corruption
- XSS if data is rendered without sanitization

**Vulnerable Code:**
```253:337:backend/src/routes/recipes.ts
// PATCH /api/recipes/:id - Update recipe fields
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { description, dishName, cuisineType, ingredients, instructions, tags } = req.body;

    // Get existing recipe to check if instructions changed
    const existing = await prisma.recipe.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Prepare update data from request body
    let updateData: any;
    try {
      const prepared = prepareUpdateData({ description, dishName, cuisineType, ingredients, instructions, tags });
      updateData = prepared.updateData;
      // ... rest of the code
```

**Impact:** Malicious data could be stored and later rendered, causing XSS.

**Recommendation:** 
- Validate all input fields (length, type, format)
- Sanitize HTML content if instructions/description allow HTML
- Use a validation library like `zod` or `joi`

---

### 7. JWT Token Expiration Not Enforced on Client (LOW)

**Location:** `frontend/src/contexts/AuthContext.tsx`

**Issue:** The client doesn't check JWT expiration before making requests. It relies on the backend to reject expired tokens, which means:
- Unnecessary API calls with expired tokens
- Poor user experience (user only finds out token is expired after API call fails)

**Vulnerable Code:**
```43:57:frontend/src/contexts/AuthContext.tsx
  const fetchUser = async (authToken: string) => {
    try {
      const response = await getCurrentUser(authToken);
      setUser(response.user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      // Token might be invalid or expired, clear it
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      // Don't redirect here - let the ProtectedRoute handle it
    } finally {
      setLoading(false);
    }
  };
```

**Impact:** Minor - causes unnecessary API calls but backend correctly rejects expired tokens.

**Recommendation:** Decode JWT on client to check expiration before making requests (note: this doesn't replace backend validation).

---

### 8. No Authorization Checks on Recipe Operations (MEDIUM)

**Location:** `backend/src/routes/recipes.ts`

**Issue:** While recipes require authentication, there's no check to ensure users can only modify/delete their own recipes. Any authenticated user can:
- Delete any recipe
- Update any recipe
- Access any recipe

**Vulnerable Code:**
```540:557:backend/src/routes/recipes.ts
// DELETE /api/recipes/:id - Delete recipe
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.recipe.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting recipe:', error);
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Impact:** Users can delete or modify recipes created by other users.

**Recommendation:** 
- Add ownership checks: `where: { id, userId: req.userId }`
- Or implement role-based access (admins can modify all, users can only modify their own)

---

## 🟡 MEDIUM PRIORITY ISSUES

### 9. Password Reset Token Not Invalidated After Use

**Location:** `backend/src/routes/auth.ts`

**Issue:** While the reset token is cleared after use, there's a potential race condition if the same token is used twice simultaneously.

**Recommendation:** Use database transactions to ensure atomic token invalidation.

---

### 10. No Account Lockout After Failed Login Attempts

**Location:** `backend/src/routes/auth.ts`

**Issue:** No mechanism to lock accounts after multiple failed login attempts.

**Recommendation:** Implement account lockout after N failed attempts (e.g., 5 attempts = 15 minute lockout).

---

### 11. Email Verification Not Enforced

**Location:** `backend/src/routes/auth.ts`

**Issue:** Users can register and use the system without verifying their email. The `emailVerificationToken` field exists but isn't checked anywhere. Users can login immediately after registration.

**Vulnerable Code:**
```62:77:backend/src/routes/auth.ts
    // Create user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name ? name.trim().substring(0, 100) : null, // Sanitize name
        isAdmin,
        emailVerificationToken: generateVerificationToken(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        emailVerified: true,
      },
    });
```

**Impact:** Users can create accounts with fake emails and use the system.

**Recommendation:** 
- Require email verification before allowing login
- Or restrict certain features until email is verified
- Check `emailVerified` in login endpoint and reject if false

---

## ✅ SECURITY STRENGTHS

1. **Backend Authentication Middleware:** All protected routes correctly use `authenticate` middleware
2. **Password Hashing:** Uses bcrypt with salt rounds of 10
3. **JWT Token Verification:** Tokens are properly verified on the backend
4. **Admin Route Protection:** Admin routes use both `authenticate` and `requireAdmin` middleware
5. **Email Normalization:** Email addresses are normalized before storage
6. **Password Validation:** Password strength is validated before registration
7. **XSS Protection:** React automatically escapes content - no `dangerouslySetInnerHTML` or `eval()` usage found
8. **Input Sanitization:** Basic input sanitization exists in `backend/src/utils/validation.ts`

---

## 📋 RECOMMENDATIONS SUMMARY

### Immediate Actions (Critical/High Priority):
1. ✅ **Backend already enforces authentication** - Good!
2. ⚠️ **Add rate limiting** to login/register/forgot-password endpoints
3. ⚠️ **Add authorization checks** to recipe operations (users can only modify their own)
4. ⚠️ **Implement account lockout** after failed login attempts
5. ⚠️ **Add input validation** to all endpoints using a validation library

### Short-term Improvements (Medium Priority):
6. Consider moving tokens from localStorage to httpOnly cookies
7. Add CSRF protection if using cookies
8. Enforce email verification before allowing full access
9. Add rate limiting to shared cart endpoints
10. Validate CORS_ORIGIN is set in production

### Long-term Enhancements (Low Priority):
11. Implement token refresh mechanism
12. Add security headers (Helmet.js)
13. Implement request logging and monitoring
14. Add security testing to CI/CD pipeline
15. Regular security audits

---

## 🔍 TESTING RECOMMENDATIONS

To test for these vulnerabilities:

1. **Bypass Client-Side Routes:**
   - Open browser DevTools → Network tab
   - Directly call `GET /api/recipes` without authentication
   - Should return 401 (currently works correctly)

2. **Test Rate Limiting:**
   - Make 10+ rapid login attempts
   - Should be rate limited (currently not implemented)

3. **Test Authorization:**
   - Create recipe as User A
   - Login as User B
   - Try to delete User A's recipe
   - Should fail but currently succeeds

4. **Test Token Expiration:**
   - Wait for token to expire (7 days default)
   - Make API request
   - Should return 401 (works correctly)

---

## 📝 NOTES

- The backend authentication is **correctly implemented** - all protected routes require valid JWT tokens
- The main risks are:
  1. **Client-side route protection is cosmetic only** (but backend protects APIs)
  2. **No rate limiting** allows brute force attacks
  3. **No authorization checks** allow users to modify others' data
  4. **localStorage tokens** are vulnerable to XSS (if XSS exists)

- The system follows security best practices for:
  - Password hashing (bcrypt)
  - Token generation (crypto.randomBytes)
  - JWT signing and verification
  - Email normalization

---

---

## 🔐 ADDITIONAL SECURITY OBSERVATIONS

### Frontend Route Security

The React Router setup correctly uses `ProtectedRoute` and `AdminRoute` components. However, these are **client-side only** protections:

- **Public Routes:** `/signup`, `/register`, `/login`, `/forgot-password`, `/reset-password`, `/verify-email`, `/cart/shared/:shareToken`
- **Protected Routes:** `/` (HomePage)
- **Admin Routes:** `/admin/invites`

**Note:** The `/cart/shared/:shareToken` route is public, which is intentional for sharing functionality. The backend correctly validates share tokens.

### XSS Protection Status

✅ **Good:** No `dangerouslySetInnerHTML` or `eval()` usage found in the codebase. React automatically escapes content, providing good XSS protection.

⚠️ **Caution:** If recipe descriptions or instructions are ever rendered as HTML (e.g., for rich text), ensure proper sanitization is added.

### Token Security

- **Storage:** Tokens stored in `localStorage` (vulnerable to XSS if XSS exists)
- **Expiration:** 7 days default (configurable via `JWT_EXPIRES_IN`)
- **Validation:** Backend correctly validates tokens on every request
- **No Refresh Tokens:** Single token used for entire session duration

---

**Report Generated:** 2024
**Analyzed By:** Security Audit
**Severity Levels:** 🔴 Critical | 🟡 Medium | 🟢 Low | ✅ Good Practice
