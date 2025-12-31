# Security Fixes - Action Items

## 🔴 CRITICAL - Fix Immediately

### 1. Add Rate Limiting to Auth Endpoints
**File:** `backend/src/routes/auth.ts`

- Install: `npm install express-rate-limit`
- Add rate limiters for:
  - Login: 5 attempts per 15 minutes
  - Register: 3 attempts per hour
  - Forgot password: 3 attempts per hour
- Apply to endpoints: `/login`, `/register`, `/forgot-password`

### 2. Add Authorization Checks to Recipe Operations
**File:** `backend/src/routes/recipes.ts`

- Update DELETE endpoint: Check `recipe.userId === req.userId` before deletion
- Update PATCH endpoints: Check ownership or allow admins to modify any
- Update GET `/recipes/:id`: Optional - restrict to owner or make public
- Add ownership check: `where: { id, userId: req.userId }` for user operations

### 3. Fix CORS Configuration
**File:** `backend/src/server.ts`

- Fail if `CORS_ORIGIN` is not set in production
- Only allow `*` in development mode
- Add check: `if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) { throw new Error('CORS_ORIGIN required in production') }`

---

## 🟡 HIGH PRIORITY - Fix Soon

### 4. Add Input Validation to Recipe Updates
**File:** `backend/src/routes/recipes.ts`

- Validate all fields in PATCH `/recipes/:id`:
  - `description`: max length 10000, string
  - `dishName`: max length 200, string, required
  - `cuisineType`: max length 100, string
  - `ingredients`: array of strings, max 500 items
  - `instructions`: max length 50000, string or null
  - `tags`: array of strings, max 50 items, each max 50 chars
- Use validation library (zod/joi) or manual validation

### 5. Add Rate Limiting to Shared Cart Endpoints
**File:** `backend/src/routes/cart.ts`

- Add rate limiter: 20 requests per 5 minutes per IP
- Apply to: `PUT /api/cart/shared/:shareToken`

### 6. Validate Shared Cart Input
**File:** `backend/src/routes/cart.ts`

- Validate `checkedItems` array:
  - Must be array
  - Max 1000 items
  - Each item must be string matching format: `"sectionIndex-ingredientIndex"`

### 7. Add Account Lockout After Failed Logins
**File:** `backend/src/routes/auth.ts`

- Track failed login attempts per email (in-memory or database)
- Lock account after 5 failed attempts for 15 minutes
- Clear attempts on successful login
- Return appropriate error: "Account locked due to too many failed attempts"

---

## 🟢 MEDIUM PRIORITY - Fix When Possible

### 8. Improve Token Storage Security
**File:** `frontend/src/contexts/AuthContext.tsx`

- Consider moving from localStorage to httpOnly cookies (requires backend changes)
- If keeping localStorage: Add token expiration check on client before API calls
- Decode JWT to check `exp` claim before making requests

### 9. Fix Password Reset Race Condition
**File:** `backend/src/routes/auth.ts`

- Wrap password reset in database transaction
- Ensure token is invalidated atomically
- Use Prisma transaction: `prisma.$transaction([...])`

### 10. Add Request Size Limits
**File:** `backend/src/server.ts`

- Already has `express.json({ limit: '10mb' })` - verify this is appropriate
- Consider reducing for specific endpoints (e.g., recipe updates)

---

## 📝 Implementation Notes

### Rate Limiting Example
```typescript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, async (req, res) => { ... });
```

### Authorization Check Example
```typescript
// In DELETE /recipes/:id
const recipe = await prisma.recipe.findUnique({ where: { id } });

if (!recipe) {
  return res.status(404).json({ error: 'Recipe not found' });
}

if (recipe.userId !== req.userId && !req.user.isAdmin) {
  return res.status(403).json({ error: 'Not authorized to delete this recipe' });
}

await prisma.recipe.delete({ where: { id } });
```

### CORS Production Check
```typescript
if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  throw new Error('CORS_ORIGIN environment variable is required in production');
}
```

---

## ✅ Testing Checklist

After implementing fixes, test:

- [ ] Rate limiting blocks after max attempts
- [ ] Users cannot delete/modify other users' recipes
- [ ] CORS fails in production without CORS_ORIGIN set
- [ ] Shared cart updates are rate limited
- [ ] Invalid input is rejected with proper errors
- [ ] Account locks after 5 failed login attempts
- [ ] Locked accounts cannot login until lockout expires
