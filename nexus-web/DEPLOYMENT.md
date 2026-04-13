# Deployment Guide

## Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Set environment variable in Vercel dashboard:
- `VITE_API_BASE_URL` → your backend API URL

## Self-Hosted (Docker)

Create a `Dockerfile` in the project root:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
```

Build and run:

```bash
docker build -t nexus-web .
docker run -p 4173:4173 nexus-web
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | `https://api.example.com` |
| `VITE_APP_NAME` | App display name | `Nexus` |

## Static Hosting (Nginx)

After `npm run build`, serve the `dist/` directory:

```nginx
server {
    listen 80;
    root /var/www/nexus-web/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
