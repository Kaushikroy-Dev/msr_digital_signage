# 🚀 Deployment Instructions

## Step 1: Push to GitHub

### Option A: Using GitHub Personal Access Token (Recommended)

1. **Create a Personal Access Token:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select scopes: `repo` (full control of private repositories)
   - Generate and copy the token

2. **Push using token:**
   ```bash
   git push https://<YOUR_TOKEN>@github.com/Kaushikroy-Dev/msr_digital_signage.git main
   ```

### Option B: Using SSH Key

1. **Check if you have SSH key:**
   ```bash
   ls -la ~/.ssh/id_*.pub
   ```

2. **If no SSH key, generate one:**
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

3. **Add SSH key to GitHub:**
   - Copy public key: `cat ~/.ssh/id_ed25519.pub`
   - Go to: https://github.com/settings/keys
   - Click "New SSH key" and paste

4. **Change remote to SSH:**
   ```bash
   git remote set-url origin git@github.com:Kaushikroy-Dev/msr_digital_signage.git
   git push origin main
   ```

### Option C: Use GitHub Desktop or VS Code Git Extension
- Use the GUI to push (handles authentication automatically)

## Step 2: Check Railway Deployment

### Option A: Using Railway CLI

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Check deployment status:**
   ```bash
   railway status
   railway logs
   ```

4. **List all services:**
   ```bash
   railway service list
   ```

### Option B: Using Railway Web Dashboard

1. **Go to Railway Dashboard:**
   - Visit: https://railway.app/dashboard

2. **Check Deployment Status:**
   - Click on your project
   - Each service will show deployment status
   - Green = Deployed, Yellow = Deploying, Red = Failed

3. **Check Service Logs:**
   - Click on a service
   - Go to "Deployments" tab
   - Click on latest deployment
   - View logs for errors

4. **Verify Environment Variables:**
   - Click on a service
   - Go to "Settings" → "Variables"
   - Verify database connection variables are set

## Step 3: Verify Database Connection

For each service, check logs for:
- ✅ "Database connected successfully"
- ❌ "password authentication failed" → Database variables not set
- ❌ "database 'digital_signage' does not exist" → Using wrong database

### Required Environment Variables (Per Service):

```env
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
JWT_SECRET=<same-for-all-services>
```

## Step 4: Test Create Playlist

1. Open your production frontend URL
2. Log in
3. Navigate to Playlists
4. Click "Create Playlist"
5. Fill in required fields
6. Verify playlist is created

## Troubleshooting

### Git Push Fails
- **Error: "Authentication failed"**
  - Use Personal Access Token (Option A above)
  - Or set up SSH key (Option B above)

### Railway Deployment Fails
- **Check build logs** in Railway dashboard
- **Verify environment variables** are set correctly
- **Check service dependencies** (npm install errors)

### Database Connection Fails
- **Verify PostgreSQL service** exists in Railway
- **Check service references** use correct format: `${{Postgres.PGHOST}}`
- **Verify PGDATABASE** is available (Railway auto-provides this)

### Create Playlist Still Not Working
- **Check browser console** for errors
- **Check API Gateway logs** for 403/500 errors
- **Verify JWT_SECRET** matches across all services
- **Check scheduling-service logs** for validation errors
