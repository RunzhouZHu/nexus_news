# Nexus Backend Docker Deployment Guide

## Quick Start — Local Docker Testing

### 1. Build the Image Locally

```bash
cd nexus
docker build -t nexus-backend:latest .
```

Verify the build:
```bash
docker images | grep nexus-backend
```

### 2. Run Locally with Docker Compose

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your secrets:
# - ANTHROPIC_API_KEY
# - OPENAI_API_KEY
# - NEWSAPI_KEY
# - POSTGRES_PASSWORD (generate: openssl rand -base64 16)
# - REDIS_PASSWORD (generate: openssl rand -base64 16)
# - JWT_SECRET (generate: python -c "import secrets; print(secrets.token_urlsafe(32))")

# Start all services
docker-compose -f docker-compose.production.yml up -d
```

Wait for services to be healthy:
```bash
docker-compose -f docker-compose.production.yml ps
```

Verify the API is running:
```bash
curl http://localhost:3000/api/nodes
```

Run migrations (one-time):
```bash
docker exec nexus-api node src/db/migrate.js
```

View logs:
```bash
docker-compose -f docker-compose.production.yml logs -f api
```

Stop all services:
```bash
docker-compose -f docker-compose.production.yml down
```

---

## Deploy to Cloud Server

### Option 1: AWS EC2 (Recommended)

#### Step 1: Create EC2 Instance
- **AMI:** Ubuntu 22.04 LTS
- **Instance:** t3.medium or larger (2 vCPU, 4GB RAM minimum)
- **Security Group:** Allow inbound 22 (SSH), 3000 (API), 5432 (optional PostgreSQL)
- **Storage:** 30GB+ EBS

#### Step 2: SSH into Instance

```bash
ssh -i your-key.pem ubuntu@your-instance-ip
```

#### Step 3: Install Docker

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group (avoid sudo)
sudo usermod -aG docker ubuntu
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Step 4: Deploy Application

```bash
# Clone repository (or copy files)
git clone your-repo-url nexus
cd nexus

# Create production environment file
cat > .env.production << 'EOF'
NODE_ENV=production
DATABASE_URL=postgresql://nexus:PASSWORD@localhost:5432/nexus
REDIS_URL=redis://:PASSWORD@localhost:6379
ANTHROPIC_API_KEY=sk-ant-XXXXX
OPENAI_API_KEY=sk-XXXXX
NEWSAPI_KEY=XXXXX
JWT_SECRET=RANDOM_SECRET
PORT=3000
POSTGRES_USER=nexus
POSTGRES_PASSWORD=RANDOM_PASSWORD
REDIS_PASSWORD=RANDOM_PASSWORD
ENABLE_WORKER=true
EOF

# Load environment
export $(cat .env.production | xargs)

# Start services
docker-compose -f docker-compose.production.yml up -d

# Run migrations
sleep 5
docker exec nexus-api node src/db/migrate.js
```

#### Step 5: Setup Reverse Proxy (Nginx)

```bash
sudo apt install nginx -y

# Create config
sudo cat > /etc/nginx/sites-available/nexus << 'EOF'
server {
    listen 80;
    server_name api.yourdomain.com;

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
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/nexus /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 6: Setup SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.yourdomain.com
```

---

### Option 2: Push to Docker Hub

#### Step 1: Tag and Push Image

```bash
# Tag image
docker tag nexus-backend:latest YOUR_DOCKERHUB_USERNAME/nexus-backend:latest

# Login
docker login

# Push
docker push YOUR_DOCKERHUB_USERNAME/nexus-backend:latest
```

#### Step 2: Deploy on Any Cloud

On your cloud server, instead of building:

```bash
docker pull YOUR_DOCKERHUB_USERNAME/nexus-backend:latest
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_URL="redis://..." \
  -e ANTHROPIC_API_KEY="..." \
  --name nexus-api \
  YOUR_DOCKERHUB_USERNAME/nexus-backend:latest
```

---

### Option 3: Cloud-Specific Services

#### AWS ECS (Elastic Container Service)
- Push image to **AWS ECR** instead of Docker Hub
- Create **ECS Task Definition** pointing to the image
- Create **ECS Service** with load balancer
- Use **RDS** for PostgreSQL and **ElastiCache** for Redis

#### Google Cloud Run
- Push to **Google Container Registry** (GCR)
- Deploy with: `gcloud run deploy nexus-api --image gcr.io/...`
- Limited to stateless; use **Cloud SQL** + **Memorystore**

#### DigitalOcean App Platform
- Connect GitHub repo
- Specify `docker-compose.production.yml`
- Automatically deploys on push

---

## Monitoring & Maintenance

### View Logs

```bash
# Real-time logs
docker-compose -f docker-compose.production.yml logs -f api

# Last 100 lines
docker-compose -f docker-compose.production.yml logs --tail=100 api
```

### Backup Database

```bash
docker exec nexus-postgres pg_dump -U nexus nexus > backup_$(date +%Y%m%d).sql
```

### Update Application

```bash
cd nexus
git pull origin main
docker-compose -f docker-compose.production.yml down
docker build -t nexus-backend:latest .
docker-compose -f docker-compose.production.yml up -d
docker exec nexus-api node src/db/migrate.js
```

### Check Health

```bash
curl http://localhost:3000/api/nodes
```

---

## Environment Variables Checklist

| Variable | Source | Required |
|----------|--------|----------|
| DATABASE_URL | PostgreSQL connection string | Yes |
| REDIS_URL | Redis connection string | Yes |
| ANTHROPIC_API_KEY | Anthropic Console | Yes |
| OPENAI_API_KEY | OpenAI Platform | Yes |
| NEWSAPI_KEY | NewsAPI.org | Yes |
| JWT_SECRET | Random string (32+ chars) | Yes |
| PORT | Default 3000 | No |
| NODE_ENV | Set to `production` | Yes |
| ENABLE_WORKER | Set to `true` for jobs | Yes |

Generate secure secrets:
```bash
# Linux/Mac
openssl rand -base64 32

# Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## Troubleshooting

### Container won't start
```bash
docker-compose -f docker-compose.production.yml logs api
```

### Database connection error
- Verify `DATABASE_URL` format: `postgresql://user:pass@host:5432/db`
- Check PostgreSQL container: `docker ps | grep postgres`

### API returns 500 errors
- Check logs: `docker logs nexus-api`
- Verify database migrations ran: `docker exec nexus-api node src/db/migrate.js`

### Out of memory
- Increase EC2 instance size or set Docker memory limits:
  ```yaml
  services:
    api:
      memswap_limit: 1g
      memory: 1g
  ```

