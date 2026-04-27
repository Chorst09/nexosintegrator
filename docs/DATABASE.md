# 🗄️ Database Configuration Guide

## 📋 Overview

This CRM supports multiple database configurations to fit different deployment scenarios:

- **Neon PostgreSQL**: Recommended for production (serverless PostgreSQL)
- **Cloudflare D1**: For edge deployment with Cloudflare Workers
- **Local SQLite**: For development and testing

## 🐘 Neon PostgreSQL Setup

### 1. Create Neon Account
1. Go to [neon.tech](https://neon.tech)
2. Sign up for a free account
3. Create a new project

### 2. Get Connection String
1. In your Neon dashboard, go to "Connection Details"
2. Copy the connection string
3. It should look like: `postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require`

### 3. Configure Backend
Update `backend/.env`:
```env
DATABASE_TYPE=postgresql
NEON_DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require"
DATABASE_URL="postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require"
```

### 4. Run Migrations
```bash
cd backend
npm run db:push
npm run db:seed
```

### 5. Benefits
- ✅ Serverless and auto-scaling
- ✅ Built-in connection pooling
- ✅ Automatic backups
- ✅ Branch-based development
- ✅ PostgreSQL compatibility

## ☁️ Cloudflare D1 Setup

### 1. Install Wrangler CLI
```bash
npm install -g wrangler
wrangler login
```

### 2. Create D1 Database
```bash
wrangler d1 create crm-database
```

### 3. Get Database Configuration
After creation, you'll get:
- Database ID
- Account ID (from dashboard)
- API Token (create in Cloudflare dashboard)

### 4. Configure Backend
Update `backend/.env`:
```env
DATABASE_TYPE=d1
CLOUDFLARE_D1_DATABASE_ID="your-d1-database-id"
CLOUDFLARE_ACCOUNT_ID="your-cloudflare-account-id"
CLOUDFLARE_API_TOKEN="your-cloudflare-api-token"
DATABASE_URL="file:./dev.db"  # For local development
```

### 5. Setup Schema
```bash
# Apply schema to D1
wrangler d1 execute crm-database --file=database/cloudflare-d1/schema.sql

# Seed data
wrangler d1 execute crm-database --file=database/cloudflare-d1/seed.sql
```

### 6. Benefits
- ✅ Edge deployment (ultra-low latency)
- ✅ Global distribution
- ✅ Integrated with Cloudflare Workers
- ✅ Cost-effective for read-heavy workloads
- ✅ SQLite compatibility

## 🔧 Local SQLite Setup (Development)

### 1. Configure Backend
Update `backend/.env`:
```env
DATABASE_TYPE=sqlite
DATABASE_URL="file:./dev.db"
```

### 2. Run Setup
```bash
cd backend
npm run db:push
npm run db:seed
```

### 3. Benefits
- ✅ No external dependencies
- ✅ Fast development setup
- ✅ Perfect for testing
- ✅ File-based database

## 🔄 Migration Between Databases

### From SQLite to Neon
1. Export data from SQLite:
```bash
cd backend
npx prisma db seed  # Ensure data exists
```

2. Setup Neon configuration
3. Run migrations:
```bash
npm run db:push
npm run db:seed
```

### From Neon to D1
1. Export schema and data from Neon
2. Convert to SQLite format using our conversion scripts
3. Apply to D1 using Wrangler

## 📊 Performance Comparison

| Feature | Neon PostgreSQL | Cloudflare D1 | Local SQLite |
|---------|----------------|---------------|--------------|
| **Latency** | ~50-100ms | ~10-30ms | ~1-5ms |
| **Scalability** | Excellent | Good | Limited |
| **Cost** | $0-20/month | $0-5/month | Free |
| **Complexity** | Medium | High | Low |
| **Production Ready** | ✅ Yes | ✅ Yes | ❌ No |

## 🛠️ Advanced Configuration

### Connection Pooling (Neon)
```env
# Add to DATABASE_URL
?pgbouncer=true&connection_limit=10
```

### Read Replicas (Neon)
```env
NEON_DATABASE_URL="postgresql://..."  # Primary
NEON_READ_REPLICA_URL="postgresql://..."  # Read replica
```

### D1 Local Development
```bash
# Use local D1 for development
wrangler d1 execute crm-database --local --file=schema.sql
```

## 🔍 Monitoring and Maintenance

### Neon Monitoring
- Use Neon dashboard for query performance
- Monitor connection usage
- Set up alerts for high usage

### D1 Monitoring
- Use Cloudflare Analytics
- Monitor request patterns
- Track edge cache hit rates

### Backup Strategies
- **Neon**: Automatic backups included
- **D1**: Export data regularly using Wrangler
- **SQLite**: File-based backups

## 🚨 Troubleshooting

### Common Issues

#### Connection Timeouts
```env
# Increase timeout
DATABASE_TIMEOUT=30000
```

#### SSL Issues (Neon)
```env
# Add SSL mode
DATABASE_URL="...?sslmode=require"
```

#### D1 Rate Limits
- Implement request queuing
- Use edge caching
- Optimize query patterns

### Debug Mode
```env
# Enable query logging
DATABASE_LOGGING=true
LOG_LEVEL=debug
```

## 📚 Best Practices

1. **Always use connection pooling in production**
2. **Implement proper error handling**
3. **Monitor query performance**
4. **Use read replicas for heavy read workloads**
5. **Regular backups and disaster recovery testing**
6. **Environment-specific configurations**
7. **Security: Use environment variables for credentials**

## 🔗 Useful Links

- [Neon Documentation](https://neon.tech/docs)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [SQLite Documentation](https://www.sqlite.org/docs.html)