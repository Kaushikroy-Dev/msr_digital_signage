# Railway Build Analysis - npm-9 Error

## 🔍 Error Analysis

Based on the error you're seeing:
```
error: undefined variable 'npm-9'
at /app/.nixpacks/nixpkgs-ffeebf0acf3ae8b29f8c7049cd911b9636efd7e7.nix:19:21:
    19|         nodejs-18_x npm-9
```

## ✅ Root Cause

Railway's Nixpacks is trying to use `npm-9` which is **invalid syntax**. The issue is:
1. Railway is using a **cached build** with the old `nixpacks.toml` configuration
2. The old config had `nixPkgs = ["nodejs-18_x", "npm-9"]` which is incorrect
3. Nixpacks doesn't support `npm-9` as a package name

## ✅ Fix Applied

**Commit**: `9b57c65` - "Simplify nixpacks.toml: Remove nixPkgs, let Railway auto-detect Node.js"

**Changes**:
- Removed `nixPkgs` section from all `nixpacks.toml` files
- Simplified to minimal configuration
- Railway will auto-detect Node.js and npm from `package.json`

**Current Configuration** (all services):
```toml
[providers]
node = "18"

[phases.install]
cmds = ["npm install"]

[start]
cmd = "npm start"
```

## 🚀 Solution: Force Redeploy

Since Railway is using cached builds, you need to **force a redeploy**:

### Option 1: Via Railway Dashboard (Recommended)

1. Go to: https://railway.com/project/dc8c7d92-b6a2-435f-b882-812bc0a8b4f6
2. For each service:
   - Click on the service
   - Go to **"Deployments"** tab
   - Click **"Redeploy"** or **"Deploy Latest"**
   - This forces a fresh build with the new `nixpacks.toml`

### Option 2: Via Railway CLI

```bash
# Link to a service first (interactive)
cd services/api-gateway
npx @railway/cli service

# Then redeploy
npx @railway/cli redeploy

# Repeat for each service
```

### Option 3: Clear Build Cache

1. Go to each service in Railway dashboard
2. **Settings** → **Build** → **Clear Cache** (if available)
3. Redeploy

## 📊 Expected Build Output (After Fix)

After redeploying, you should see:
```
✓ Detecting Node.js version
✓ Using Node.js 18
✓ npm comes bundled with Node.js
✓ Running: npm install
✓ Build successful
✓ Starting: npm start
```

**No more `npm-9` errors!**

## 🔍 Verify Fix

After redeploy:
1. Check build logs in Railway dashboard
2. Look for:
   - ✅ No "npm-9" errors
   - ✅ Node.js 18 detected
   - ✅ npm install running successfully
   - ✅ Build completing

## 📝 Services to Redeploy

Make sure to redeploy all services:
- [ ] api-gateway
- [ ] auth-service
- [ ] content-service
- [ ] template-service
- [ ] scheduling-service
- [ ] device-service
- [ ] frontend

## 🆘 If Error Persists

If you still see `npm-9` errors after redeploy:

1. **Check if changes are pulled**:
   ```bash
   git log --oneline -3
   # Should see: "Simplify nixpacks.toml..."
   ```

2. **Verify nixpacks.toml files**:
   ```bash
   cat services/api-gateway/nixpacks.toml
   # Should NOT contain "npm-9"
   ```

3. **Delete and recreate service** (last resort):
   - Delete service in Railway
   - Create new service from GitHub repo
   - Set root directory and build commands
   - Deploy

---

**Status**: ✅ Configuration fixed - **Action Required**: Redeploy services to pick up changes
