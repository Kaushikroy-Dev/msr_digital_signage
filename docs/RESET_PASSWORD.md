# How to Reset User Password

After implementing the new password validation requirements, you may need to reset existing user passwords. Here are several methods:

## Method 1: Using the Admin Reset Endpoint (Recommended)

The auth service includes a temporary admin endpoint for password resets.

### Step 1: Set Admin Key (Optional)
Set an environment variable in your Railway service:
```
ADMIN_RESET_KEY=your-secure-random-key-here
```

If not set, it defaults to `CHANGE_THIS_IN_PRODUCTION` (change this in production!).

### Step 2: Call the Endpoint
Make a POST request to:
```
POST https://your-api-gateway-url/api/auth/admin/reset-password
```

**Request Body:**
```json
{
  "email": "demo@example.com",
  "newPassword": "Test@123",
  "adminKey": "your-admin-key"
}
```

**Example using curl:**
```bash
curl -X POST https://your-api-gateway-url/api/auth/admin/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "newPassword": "Test@123",
    "adminKey": "CHANGE_THIS_IN_PRODUCTION"
  }'
```

**Password Requirements:**
- At least 8 characters long
- At least one uppercase letter (A-Z)
- At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
- At least one numeric digit (0-9)

## Method 2: Using the Reset Script (Local Development)

If you have local database access, you can use the provided script:

```bash
node scripts/reset-user-password.js <email> <newPassword>
```

**Example:**
```bash
node scripts/reset-user-password.js demo@example.com Test@123
```

**Requirements:**
- Node.js installed
- Database connection configured in `.env` file
- `bcryptjs` package installed (should be in auth-service)

## Method 3: Create a New User via UI

If you can access the application with another admin account:

1. Log in with an existing admin account
2. Navigate to **User Management** (requires super_admin role)
3. Click **Add New User**
4. Fill in the form with:
   - Email
   - Password (must meet requirements)
   - Confirm Password
   - First Name, Last Name
   - Role
5. Click **Create User**

## Method 4: Using Registration Endpoint

If you have a tenant ID, you can register a new user:

```bash
POST https://your-api-gateway-url/api/auth/register
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "NewPass@123",
  "confirmPassword": "NewPass@123",
  "firstName": "New",
  "lastName": "User",
  "tenantId": "your-tenant-uuid",
  "role": "super_admin"
}
```

## Default Demo User

The system automatically creates/updates a demo user on startup:
- **Email:** `demo@example.com`
- **Password:** `Test@123` (after latest deployment)
- **Role:** `super_admin`

If the password hasn't updated yet, wait for the service to restart or use Method 1 to reset it manually.

## Security Notes

⚠️ **Important:**
- The admin reset endpoint should be disabled or heavily secured in production
- Consider removing it after initial setup
- Always use strong admin keys
- Never commit admin keys to version control

## Troubleshooting

**"Invalid credentials" error:**
- Verify the password meets all requirements
- Check that the user exists in the database
- Ensure the password hash was updated correctly

**"User not found" error:**
- Verify the email address is correct
- Check that the user exists in the database

**Script fails to connect:**
- Verify database connection string in `.env`
- Ensure database is accessible
- Check that required packages are installed
