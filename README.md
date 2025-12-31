# Reci

[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/evolite/reci/build-backend.yml?label=Backend%20Build)](https://github.com/evolite/reci/actions/workflows/build-backend.yml)
[![GitHub Actions](https://img.shields.io/github/actions/workflow/status/evolite/reci/build-frontend.yml?label=Frontend%20Build)](https://github.com/evolite/reci/actions/workflows/build-frontend.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub release](https://img.shields.io/github/v/release/evolite/reci)](https://github.com/evolite/reci/releases)
[![GitHub last commit](https://img.shields.io/github/last-commit/evolite/reci)](https://github.com/evolite/reci/commits)
[![GitHub stars](https://img.shields.io/github/stars/evolite/reci)](https://github.com/evolite/reci/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/evolite/reci)](https://github.com/evolite/reci/network/members)
[![GitHub issues](https://img.shields.io/github/issues/evolite/reci)](https://github.com/evolite/reci/issues)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-25-339933?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.2-000000?logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.0-2D3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![React Router](https://img.shields.io/badge/React%20Router-7.11-CA4245?logo=react-router)](https://reactrouter.com/)
[![TanStack Query](https://img.shields.io/badge/TanStack%20Query-5.90-FF4154?logo=react-query)](https://tanstack.com/query)
[![Zod](https://img.shields.io/badge/Zod-4.2-3E63DD)](https://zod.dev/)
[![OpenAI](https://img.shields.io/badge/OpenAI-6.15-412991?logo=openai)](https://openai.com/)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-000000?logo=shadcnui)](https://ui.shadcn.com/)
[![SonarQube](https://img.shields.io/badge/SonarQube-Enabled-4E9BCD?logo=sonarqube)](https://www.sonarqube.org/)
[![Docker Image](https://img.shields.io/badge/docker-ghcr.io%2Fevolite%2Freci--backend-blue)](https://github.com/evolite/reci/pkgs/container/reci-backend)
[![Docker Image](https://img.shields.io/badge/docker-ghcr.io%2Fevolite%2Freci--frontend-blue)](https://github.com/evolite/reci/pkgs/container/reci-frontend)

**A personal recipe video library built for my family and me.**

I built this because I kept finding amazing recipes on YouTube, TikTok, and Instagram, saving them to playlists or screenshots, and then completely forgetting about them. My family and I would stumble upon great recipes on social media, but we never actually used them because they were buried in playlists or lost in photo albums. I don't think that is a problem unique to me...

Reci attempts to solve that problem by turning recipe videos into a searchable, organized collection that we actually use.

## Why I Built This

Most recipe managers expect you to manually type in ingredients, categorize everything, and maintain your own database. That's too much work. I wanted something that my family actually wanted to engage with, KISS:

- **Works with video content**: Built specifically for recipe videos from YouTube, TikTok, Instagram, etc. Just paste a URL and it handles the rest.
- **Actually extracts recipes**: Uses AI to watch the video, read the comments, and extract everything—ingredients, instructions, tags, even cooking tips from the community. No manual data entry.
- **Easy to add**: The whole point is making it effortless to save recipes we find. Paste a URL, done.
- **Everyoen Shares Recipies**: A recipy added is visible and editable by all users, perfect for family and friends.
- **Easy to search**: Find recipes by ingredient ("what can I make with chicken and tomatoes?"), cuisine type, tags, or just browse. The recipes are actually discoverable.
- **Links to original content**: Every recipe keeps a link to the original video, so you can always access the source to see the steps and follow along with the video while cooking.
- **Smart shopping lists**: Select multiple recipes and get a consolidated shopping list with ingredients grouped by category. Share it with family members.
- **Metric by default**: Automatically converts everything to metric units. No more "how many grams is 2 cups of flour?" moments.
- **Shareable**: Generate shareable links for shopping lists. Perfect for meal planning with family.

## What Makes This Different

**vs. Paprika/AnyList/RecipeBox**: Those are great for typed recipes, but they don't understand video content. Reci extracts recipes directly from video descriptions and comments.

**vs. YouTube Playlists**: Playlists are just links. Reci extracts the actual recipe data, making it searchable and usable even if the video gets deleted. Also can just contain youtube links.

**vs. Pinterest**: Pinterest is visual discovery, but terrible for actually cooking. Reci gives you structured ingredients and instructions, not just pretty pictures.

## Tech Stack

Built with TypeScript, React, and Vite. Uses shadcn/ui components for the UI, Prisma for the database, and OpenAI's API for recipe analysis. Backend is Express with PostgreSQL. Frontend is built with Vite and served via nginx as a reverse proxy that forwards API requests to the backend. Everything runs in Podman containers.

## Deployment

### Prerequisites

- Podman or Docker
- PostgreSQL database
- OpenAI API key (for recipe analysis)

### Environment Variables

**Backend** (`.env`):
```env
DATABASE_URL="postgresql://user:password@host:5432/reci_db"
OPENAI_API_KEY="your-openai-api-key"
JWT_SECRET="your-jwt-secret"
JWT_EXPIRES_IN="7d"
PORT=4000
```

**Frontend** (`.env`):
```env
VITE_API_BASE_URL=""
```

### Installation

1. **Clone the repo:**
```bash
git clone https://github.com/evolite/reci.git
cd reci
```

2. **Build and run with Podman:**
```bash
# Build images
podman build -t localhost/reci-backend:latest ./backend
podman build -t localhost/reci-frontend:latest ./frontend

# Start services
systemctl --user start reci-backend.service
systemctl --user start reci-frontend.service
systemctl --user start reci-db.service
```

Or with Docker:
```bash
# Build images
docker build -t reci-backend:latest ./backend
docker build -t reci-frontend:latest ./frontend

# Run with docker-compose or your preferred orchestration
```

Pre-built images are available on GitHub Container Registry:
- `ghcr.io/evolite/reci-backend:latest`
- `ghcr.io/evolite/reci-frontend:latest`

## Contributing

This is a personal project.

## License

MIT - Do whatever you want with it.

---

**Built for my family and me, for people who love cooking but hate organizing recipes.**

*This project was vibe coded. I make no guarantees about code quality, security, or reliability. That said i have used SonarQube in an attempt to validate quality, Use at your own risk anyway.*
