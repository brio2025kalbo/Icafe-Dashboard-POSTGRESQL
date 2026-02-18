# iCafe Dashboard (PostgreSQL)

A modern, full-stack Internet Cafe management dashboard built with React, TypeScript, and PostgreSQL. This application integrates with the iCafeCloud API and QuickBooks to provide comprehensive cafe management, real-time PC monitoring, sales reporting, and financial analytics.

## 🚀 Tech Stack

### Frontend
- **Framework**: React 19.2.1 with TypeScript 5.9.3
- **Build Tool**: Vite 7.1.7
- **Routing**: Wouter 3.7.1 (lightweight React router)
- **UI Components**: 
  - Radix UI (headless UI components)
  - Tailwind CSS 4.1.14 (utility-first CSS)
  - shadcn/ui components
  - Lucide React (icons)
  - Framer Motion (animations)
- **State Management**: 
  - TanStack Query 5.90.2 (data fetching & caching)
  - React Hook Form 7.64.0 (form state)
- **Data Visualization**: Recharts 2.15.2
- **AI Integration**: Vercel AI SDK 6.0.38

### Backend
- **Runtime**: Node.js (ESM modules)
- **Framework**: Express.js 4.21.2
- **API Layer**: tRPC 11.6.0 (end-to-end typesafe APIs)
- **Database ORM**: Drizzle ORM 0.44.5
- **Database**: PostgreSQL 8.18.0
- **Authentication**: Jose 6.1.0 (JWT handling)
- **File Storage**: AWS S3 SDK 3.693.0
- **External Integrations**:
  - iCafeCloud API (internet cafe management)
  - QuickBooks API (accounting integration)

### Development Tools
- **Package Manager**: pnpm 10.4.1
- **Testing**: Vitest 2.1.4
- **Build**: esbuild 0.25.0
- **Code Quality**: 
  - TypeScript strict mode
  - Prettier 3.6.2
  - ESLint configuration

### Infrastructure & DevOps
- **Process Management**: tsx 4.19.1 (TypeScript execution)
- **Environment**: dotenv 17.2.2
- **Database Migrations**: Drizzle Kit 0.31.4
- **Cross-platform**: cross-env 10.1.0

## 💻 VPS Hardware Recommendations

### Minimum Requirements (Small Deployment - 1-3 Cafes)
- **CPU**: 2 vCPU cores
- **RAM**: 4 GB
- **Storage**: 25 GB SSD
- **Bandwidth**: 1 TB/month
- **OS**: Ubuntu 22.04 LTS or later

**Recommended VPS Providers:**
- DigitalOcean: Basic Droplet ($24/month)
- Vultr: Regular Performance ($18/month)
- Linode: Nanode 4GB ($18/month)
- AWS: t3.medium EC2 instance

### Recommended Requirements (Medium Deployment - 4-10 Cafes)
- **CPU**: 4 vCPU cores
- **RAM**: 8 GB
- **Storage**: 50 GB SSD
- **Bandwidth**: 2 TB/month
- **OS**: Ubuntu 22.04 LTS or later

**Recommended VPS Providers:**
- DigitalOcean: Production Droplet ($48/month)
- Vultr: High Frequency ($48/month)
- Linode: Dedicated 8GB ($36/month)
- AWS: t3.large EC2 instance

### Production Requirements (Large Deployment - 10+ Cafes)
- **CPU**: 8 vCPU cores
- **RAM**: 16 GB
- **Storage**: 100 GB SSD (NVMe preferred)
- **Bandwidth**: 5 TB/month
- **OS**: Ubuntu 22.04 LTS or later
- **Backup**: Automated daily backups
- **Load Balancer**: Optional for high availability

**Recommended VPS Providers:**
- DigitalOcean: CPU-Optimized Droplet ($96/month)
- Vultr: High Frequency ($96/month)
- Linode: Dedicated 16GB ($72/month)
- AWS: c5.2xlarge EC2 instance

### Database-Specific Considerations
- **Separate Database Server** (recommended for production):
  - CPU: 4+ vCPU cores
  - RAM: 8+ GB (PostgreSQL benefits from more RAM for caching)
  - Storage: 50+ GB SSD with IOPS optimization
  - Regular automated backups with point-in-time recovery

## 📋 System Requirements

### Node.js Version
- **Required**: Node.js 18.x or later
- **Recommended**: Node.js 20.x LTS

### PostgreSQL Version
- **Required**: PostgreSQL 12.x or later
- **Recommended**: PostgreSQL 15.x or 16.x

### Operating System
- **Linux**: Ubuntu 22.04 LTS, Debian 11+, or RHEL 8+
- **macOS**: 12+ (for development)
- **Windows**: Windows 10/11 with WSL2 (for development)

## 🔧 Installation & Setup

### 1. Prerequisites
```bash
# Install Node.js 20.x (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib
```

### 2. Clone Repository
```bash
git clone https://github.com/brio2025kalbo/Icafe-Dashboard-POSTGRESQL.git
cd Icafe-Dashboard-POSTGRESQL
```

### 3. Install Dependencies
```bash
pnpm install
```

### 4. Environment Configuration
Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/icafe_dashboard

# Server
PORT=3000
NODE_ENV=development

# Authentication (generate secure random strings)
JWT_SECRET=your-jwt-secret-here

# AWS S3 (for file storage)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=your-aws-region
AWS_S3_BUCKET=your-bucket-name

# QuickBooks OAuth (if using QuickBooks integration)
QUICKBOOKS_CLIENT_ID=your-quickbooks-client-id
QUICKBOOKS_CLIENT_SECRET=your-quickbooks-client-secret
QUICKBOOKS_REDIRECT_URI=http://localhost:3000/api/quickbooks/callback

# AI Features (optional)
OPENAI_API_KEY=your-openai-api-key
```

### 5. Database Setup
```bash
# Create database
sudo -u postgres createdb icafe_dashboard

# Run migrations
pnpm db:push

# Setup admin user
pnpm setup:admin
```

### 6. Run Development Server
```bash
pnpm dev
```
The application will be available at `http://localhost:3000`

## 🚀 Production Deployment

### Build for Production
```bash
# Build frontend and backend
pnpm build

# Start production server
pnpm start
```

### Process Management (PM2)
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dist/index.js --name icafe-dashboard

# Enable startup script
pm2 startup
pm2 save
```

### Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL Certificate (Let's Encrypt)
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com
```

## 🔒 Security Considerations

1. **Database**: Use strong passwords, enable SSL connections, restrict network access
2. **API Keys**: Never commit `.env` file, use environment variables in production
3. **Firewall**: Configure UFW or iptables to restrict access to necessary ports only
4. **Updates**: Keep system packages, Node.js, and dependencies up to date
5. **Backups**: Implement automated database backups with off-site storage
6. **Monitoring**: Set up application monitoring (e.g., PM2, New Relic, DataDog)

## 📊 Performance Optimization

### PostgreSQL Tuning
Edit `/etc/postgresql/[version]/main/postgresql.conf`:
```conf
# For 8GB RAM server
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
work_mem = 16MB
max_connections = 100
```

### Node.js Optimization
```bash
# Set Node.js memory limit for large applications
NODE_OPTIONS=--max-old-space-size=4096 pnpm start
```

## 📦 Features

- **Multi-Cafe Management**: Manage multiple internet cafe locations from one dashboard
- **Real-Time PC Monitoring**: Track PC status, availability, and usage in real-time
- **Member Management**: Comprehensive member profiles and session history
- **Sales Reports**: Detailed revenue, expenses, and transaction reports with date filtering
- **Shift Management**: Track staff shifts and per-shift revenue
- **QuickBooks Integration**: Automatic financial data synchronization
- **AI-Powered Chat**: Built-in AI assistant for business insights
- **Dark Mode**: Modern dark theme optimized for extended use
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run type checking
pnpm check

# Format code
pnpm format
```

## 📝 License

MIT

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📧 Support

For support, please contact the repository maintainer or open an issue on GitHub.
