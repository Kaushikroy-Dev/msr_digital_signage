# Railway Environment Variables - Complete Setup

## Generated JWT Secret

**IMPORTANT**: Use this JWT secret for ALL services that require it:

```
e0145426455c4529060cd5272701e97d5f87fbfe9a45e003410c0fe76fb3506a3b42900c9f85a775a3b85546ff1c5c31924922d27f455e4da80210e4ce4778ac
```

## Environment Variables by Service

### 1. PostgreSQL Database (Railway Managed)
Railway automatically provides these - use service references:
- `${{Postgres.PGHOST}}`
- `${{Postgres.PGPORT}}`
- `${{Postgres.PGDATABASE}}`
- `${{Postgres.PGUSER}}`
- `${{Postgres.PGPASSWORD}}`

### 2. API Gateway

```env
NODE_ENV=production
PORT=3000
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
AUTH_SERVICE_URL=${{auth-service.RAILWAY_PUBLIC_DOMAIN}}
CONTENT_SERVICE_URL=${{content-service.RAILWAY_PUBLIC_DOMAIN}}
TEMPLATE_SERVICE_URL=${{template-service.RAILWAY_PUBLIC_DOMAIN}}
SCHEDULING_SERVICE_URL=${{scheduling-service.RAILWAY_PUBLIC_DOMAIN}}
DEVICE_SERVICE_URL=${{device-service.RAILWAY_PUBLIC_DOMAIN}}
JWT_SECRET=e0145426455c4529060cd5272701e97d5f87fbfe9a45e003410c0fe76fb3506a3b42900c9f85a775a3b85546ff1c5c31924922d27f455e4da80210e4ce4778ac
JWT_EXPIRY=24h
CORS_ORIGIN=${{frontend.RAILWAY_PUBLIC_DOMAIN}}
```

### 3. Auth Service

```env
NODE_ENV=production
PORT=3001
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
JWT_SECRET=e0145426455c4529060cd5272701e97d5f87fbfe9a45e003410c0fe76fb3506a3b42900c9f85a775a3b85546ff1c5c31924922d27f455e4da80210e4ce4778ac
JWT_EXPIRY=24h
```

### 4. Content Service

```env
NODE_ENV=production
PORT=3002
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
UPLOAD_DIR=/app/storage
```

### 5. Template Service

```env
NODE_ENV=production
PORT=3003
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
JWT_SECRET=e0145426455c4529060cd5272701e97d5f87fbfe9a45e003410c0fe76fb3506a3b42900c9f85a775a3b85546ff1c5c31924922d27f455e4da80210e4ce4778ac
```

### 6. Scheduling Service

```env
NODE_ENV=production
PORT=3004
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
JWT_SECRET=e0145426455c4529060cd5272701e97d5f87fbfe9a45e003410c0fe76fb3506a3b42900c9f85a775a3b85546ff1c5c31924922d27f455e4da80210e4ce4778ac
```

### 7. Device Service

```env
NODE_ENV=production
PORT=3005
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
JWT_SECRET=e0145426455c4529060cd5272701e97d5f87fbfe9a45e003410c0fe76fb3506a3b42900c9f85a775a3b85546ff1c5c31924922d27f455e4da80210e4ce4778ac
```

### 8. Frontend

```env
NODE_ENV=production
VITE_API_URL=${{api-gateway.RAILWAY_PUBLIC_DOMAIN}}
```

## How to Set Variables in Railway

1. Go to Railway dashboard
2. Click on a service
3. Go to **Settings** → **Variables**
4. Click **"New Variable"**
5. Add each variable from the list above
6. Use Railway's service references (e.g., `${{Postgres.PGHOST}}`)

## Important Notes

- **Service References**: Railway provides `${{service-name.VARIABLE}}` syntax for referencing other services
- **Public Domains**: After services are deployed, Railway generates public domains. Use `${{service-name.RAILWAY_PUBLIC_DOMAIN}}` to reference them
- **JWT Secret**: Use the same JWT secret for all services that require authentication
- **Database**: Railway PostgreSQL automatically provides connection variables - use service references
