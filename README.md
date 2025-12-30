# Reci - Recipe Video Manager

A modern full-stack application for managing and organizing recipe videos from YouTube with AI-powered tagging and smart search capabilities.

## Features

- 🎥 **Quick Add**: Paste any YouTube recipe URL and let AI automatically extract ingredients, instructions, and tags
- 🔍 **Smart Search**: Find recipes by dish name, cuisine, ingredients, or tags
- 🤖 **AI-Powered**: Advanced AI analyzes videos and comments to automatically tag and organize recipes
- 👥 **Multi-User**: Invite-based registration system with admin controls
- 📱 **Responsive**: Modern UI built with React, TypeScript, and Tailwind CSS

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite
- Shadcn/ui components
- Tailwind CSS
- TanStack Query
- React Router

### Backend
- Node.js with Express
- TypeScript
- Prisma ORM
- PostgreSQL
- OpenAI API (GPT-4, GPT-4o)
- JWT authentication

### Infrastructure
- Podman containers
- Docker images
- GitHub Actions for CI/CD

## Getting Started

### Prerequisites

- Node.js 20+
- Podman or Docker
- PostgreSQL database
- OpenAI API key

### Environment Variables

#### Backend (`.env`)
```env
DATABASE_URL="postgresql://user:password@host:5432/reci_db"
OPENAI_API_KEY="your-openai-api-key"
JWT_SECRET="your-jwt-secret"
JWT_EXPIRES_IN="7d"
PORT=4000
```

#### Frontend (`.env`)
```env
VITE_API_BASE_URL=""
```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/evolite/reci.git
cd reci
```

2. Install dependencies:
```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma db push

# Frontend
cd ../frontend
npm install
```

3. Build and run with Podman:
```bash
# Build images
podman build -t localhost/reci-backend:latest ./backend
podman build -t localhost/reci-frontend:latest ./frontend

# Start services
systemctl --user start reci-backend.service
systemctl --user start reci-frontend.service
systemctl --user start reci-db.service
```

## Docker Images

Docker images are automatically built and pushed to GitHub Container Registry (ghcr.io) on push to main/master branch:

- `ghcr.io/evolite/reci-backend:latest`
- `ghcr.io/evolite/reci-frontend:latest`

## Development

### Backend
```bash
cd backend
npm run dev
```

### Frontend
```bash
cd frontend
npm run dev
```

## Project Structure

```
reci/
├── backend/          # Express API server
│   ├── src/         # TypeScript source files
│   ├── prisma/      # Database schema
│   └── Dockerfile
├── frontend/         # React application
│   ├── src/         # React components and pages
│   └── Dockerfile
├── containers/       # Podman quadlet service files
└── .github/         # GitHub Actions workflows
```

## License

MIT
