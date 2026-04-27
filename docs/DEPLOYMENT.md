# 🚀 Deployment Guide

## 📋 Overview

This guide covers deployment strategies for both frontend and backend components across different platforms.

## 🎯 Deployment Options

### Frontend Deployment
- **Vercel** (Recommended)
- **Netlify**
- **Cloudflare Pages**
- **AWS S3 + CloudFront**

### Backend Deployment
- **Railway** (Recommended for Neon)
- **Render**
- **Cloudflare Workers** (For D1)
- **AWS Lambda**
- **DigitalOcean App Platform**

## 🔥 Vercel + Railway (Recommended)

### Frontend on Vercel

1. **Connect Repository**
   ```bash
   # Push to GitHub
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Vercel Configuration**
   Create `frontend/vercel.json`:
   ```json
   {
     "framework": "vite",
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "installCommand": "npm install",
     "devCommand": "npm run dev",
     "env": {
       "VITE_API_URL": "https://your-backend.railway.app"
     }
   }
   ```

3. **Deploy**
   - Go to [vercel.com](https://vercel.com)
   - Import your repository
   - Set root directory to `frontend`
   - Deploy

### Backend on Railway

1. **Connect Repository**
   - Go to [railway.app](https://railway.app)
   - Connect your GitHub repository
   - Select the `backend` folder

2. **Environment Variables**
   ```env
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=your-production-jwt-secret
   CORS_ORIGIN=https://your-frontend.vercel.app
   ```

3. **Railway Configuration**
   Create `backend/railway.json`:
   ```json
   {
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "npm start",
       "healthcheckPath": "/api/health"
     }
   }
   ```

## ☁️ Cloudflare Full Stack

### Frontend on Cloudflare Pages

1. **Build Configuration**
   ```bash
   # Build command
   npm run build
   
   # Output directory
   dist
   
   # Root directory
   frontend
   ```

2. **Environment Variables**
   ```env
   VITE_API_URL=https://your-worker.your-subdomain.workers.dev
   ```

### Backend on Cloudflare Workers

1. **Install Wrangler**
   ```bash
   npm install -g wrangler
   wrangler login
   ```

2. **Worker Configuration**
   Create `backend/wrangler.toml`:
   ```toml
   name = "crm-backend"
   main = "src/worker.js"
   compatibility_date = "2024-01-01"

   [env.production]
   vars = { NODE_ENV = "production" }

   [[env.production.d1_databases]]
   binding = "DB"
   database_name = "crm-database"
   database_id = "your-d1-database-id"
   ```

3. **Deploy**
   ```bash
   cd backend
   wrangler deploy
   ```

## 🐳 Docker Deployment

### Docker Compose for Development
Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:3001
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/crm
      - JWT_SECRET=your-jwt-secret
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=crm
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### Frontend Dockerfile
Create `frontend/Dockerfile`:
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Backend Dockerfile
Create `backend/Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start application
CMD ["npm", "start"]
```

## 🔧 Environment Configuration

### Production Environment Variables

#### Frontend (.env.production)
```env
VITE_API_URL=https://your-backend-domain.com
VITE_APP_NAME="CRM Comercial"
VITE_ENABLE_ANALYTICS=true
VITE_SENTRY_DSN=your-sentry-dsn
```

#### Backend (.env.production)
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=your-production-database-url
JWT_SECRET=your-super-secure-jwt-secret
CORS_ORIGIN=https://your-frontend-domain.com
LOG_LEVEL=info
RATE_LIMIT_MAX_REQUESTS=1000
```

## 📊 Monitoring and Logging

### Application Monitoring
```javascript
// backend/src/middleware/monitoring.js
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### Health Check Endpoint
```javascript
// backend/src/routes/health.js
export const healthCheck = async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
};
```

## 🔒 Security Considerations

### Production Security Checklist
- [ ] Use HTTPS everywhere
- [ ] Set secure CORS origins
- [ ] Use strong JWT secrets
- [ ] Enable rate limiting
- [ ] Implement proper error handling
- [ ] Use environment variables for secrets
- [ ] Enable security headers
- [ ] Regular dependency updates
- [ ] Database connection encryption
- [ ] File upload restrictions

### Security Headers
```javascript
// backend/src/middleware/security.js
import helmet from 'helmet';

export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});
```

## 🚀 CI/CD Pipeline

### GitHub Actions Example
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy CRM

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
          
      - name: Build
        run: |
          cd frontend
          npm run build
          
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Railway
        uses: bervProject/railway-deploy@v1.2.0
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: "crm-backend"
```

## 📈 Performance Optimization

### Frontend Optimization
- Code splitting with dynamic imports
- Image optimization
- CDN for static assets
- Service worker for caching
- Bundle analysis and optimization

### Backend Optimization
- Database connection pooling
- Query optimization
- Caching strategies (Redis)
- Load balancing
- Horizontal scaling

## 🔄 Backup and Recovery

### Database Backups
```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backups/backup_$DATE.sql
aws s3 cp backups/backup_$DATE.sql s3://your-backup-bucket/
```

### Disaster Recovery Plan
1. Database restoration procedures
2. Application rollback strategies
3. DNS failover configuration
4. Monitoring and alerting setup

## 📚 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Security review completed
- [ ] Performance testing done

### Post-Deployment
- [ ] Health checks passing
- [ ] Monitoring configured
- [ ] Logs are flowing
- [ ] Backup systems active
- [ ] Team notified

### Rollback Plan
- [ ] Previous version tagged
- [ ] Database rollback scripts ready
- [ ] Quick rollback procedure documented
- [ ] Team trained on rollback process