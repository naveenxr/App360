# Zoho Catalyst Deployment Guide – App360

This guide provides step-by-step instructions for deploying the **App360 Network Monitoring and Alarm Management System** to **Zoho Catalyst Serverless Cloud**.

---

## 1. Architecture Overview on Zoho Catalyst

```
┌─────────────────────────────────────────────────────────────┐
│                    ZOHO CATALYST CLOUD                      │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │         Catalyst Web Client Hosting (CDN)           │   │
│   │     Next.js Production Assets & Static Routes       │   │
│   │        https://app360.catalystserverless.com        │   │
│   └──────────────────────────┬──────────────────────────┘   │
│                              │ HTTPS / REST API             │
│   ┌──────────────────────────▼──────────────────────────┐   │
│   │              Catalyst AppSail Container             │   │
│   │            Node.js 20 Express.js Backend            │   │
│   │       https://app360-backend.appsail.catalyst.com   │   │
│   └──────────────────────────┬──────────────────────────┘   │
└──────────────────────────────┼──────────────────────────────┘
                               │ TLS 1.3 Encrypted Connection
    ┌──────────────────────────▼──────────────────────────┐
    │          External Managed Database Tier             │
    │               MongoDB Atlas Cluster                 │
    │           (Roles, Alarms, Events, Audits)           │
    └─────────────────────────────────────────────────────┘
```

---

## 2. Prerequisites

1. **Zoho Catalyst Account**: Sign up at [https://catalyst.zoho.com](https://catalyst.zoho.com).
2. **Catalyst CLI**: Installed globally on your machine:
   ```bash
   npm install -g zcatalyst-cli
   ```
3. **MongoDB Atlas Cluster**: A running M0/M10+ MongoDB Atlas cluster with TLS 1.3 enabled and network access configured.

---

## 3. Catalyst Configuration Files

The project contains a pre-configured [`catalyst.json`](../catalyst.json) at root:

```json
{
  "$schema": "https://raw.githubusercontent.com/zoho/catalyst-cli/master/schemas/catalyst.schema.json",
  "name": "app360",
  "client": {
    "source": "frontend/out"
  },
  "appsail": [
    {
      "name": "app360-backend",
      "source": "backend",
      "stack": "node20",
      "build": "npm install",
      "run": "node src/server.js",
      "env_variables": {
        "NODE_ENV": "production",
        "PORT": "5000",
        "BCRYPT_SALT_ROUNDS": "12",
        "JWT_EXPIRES_IN": "1d"
      }
    }
  ]
}
```

---

## 4. Step-by-Step Deployment Procedure

### Step 1: Login to Catalyst
```bash
catalyst login
```
Follow the browser authentication prompt to link your Zoho developer identity.

### Step 2: Initialize or Link Your Project
From the repository root (`e:\App360`):
```bash
catalyst init
```
- Select your existing Catalyst project (or create `App360-NOC`).
- Associate `Client` with `frontend/out` and `AppSail` with `backend`.

### Step 3: Configure Environment Variables in Catalyst Console
In the **Zoho Catalyst Console** under **AppSail > Configuration > Environment Variables**, add the following production secrets:

| Variable | Description | Example / Recommended Value |
|---|---|---|
| `MONGO_URI` | MongoDB Atlas Connection String | `mongodb+srv://app360_user:<password>@cluster0.mongodb.net/app360?retryWrites=true&w=majority` |
| `JWT_SECRET` | 256-bit Cryptographic Secret | Generated 64-char hex key |
| `JWT_EXPIRES_IN` | Token Expiry Lifetime | `1d` |
| `BCRYPT_SALT_ROUNDS` | Password Hashing Salt Rounds | `12` |
| `NODE_ENV` | Runtime Environment | `production` |
| `PORT` | AppSail Listener Port | `5000` |
| `CLIENT_URL` | Frontend Catalyst URL | `https://<project-domain>.catalystserverless.com` |
| `ADMIN_EMAIL` | Bootstrap Admin Email | `admin@app360.internal` |
| `ADMIN_PASSWORD` | Bootstrap Admin Password | Secure evaluation password |

### Step 4: Build the Frontend
Export or build the frontend static output:
```bash
cd frontend
npm run build
```

### Step 5: Deploy to Catalyst
From the project root:
```bash
catalyst deploy
```
Catalyst will:
1. Package and upload the Next.js static client to Catalyst CDN.
2. Containerize the Node.js Express backend and launch it on **AppSail**.
3. Provision automated TLS/SSL certificates and custom endpoints.

---

## 5. Verification & Health Monitoring

Once deployed, verify the live AppSail endpoints:
```bash
# Verify health
curl -s https://<your-appsail-domain>/api/health

# Verify system roles and users seeded
curl -s https://<your-appsail-domain>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@app360.internal","password":"<your-password>"}'
```

---

## 6. Zero-Downtime Updates & Rollbacks

- **Zero-Downtime Deployments**: Catalyst AppSail runs container health checks prior to traffic switching.
- **Rollbacks**: The Catalyst console maintains container version history; roll back with one click under **AppSail > Deployments > Rollback**.

