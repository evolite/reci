# Reci

**A personal recipe video library for my family and me.**

I built this because I kept finding amazing recipes on YouTube, TikTok, and Instagram, saving them to playlists or screenshots, and then completely forgetting about them. My family and I would stumble upon great recipes on social media, but we never actually used them because they were buried in playlists or lost in photo albums.

Reci solves that problem by turning recipe videos into a searchable, organized collection that we actually use.

## Why I Built This

Most recipe managers expect you to manually type in ingredients, categorize everything, and maintain your own database. That's too much work. I wanted something that:

- **Works with video content**: Built specifically for recipe videos from YouTube, TikTok, Instagram, etc. Just paste a URL and it handles the rest.
- **Actually extracts recipes**: Uses AI to watch the video, read the comments, and extract everything—ingredients, instructions, tags, even cooking tips from the community. No manual data entry.
- **Easy to add**: The whole point is making it effortless to save recipes we find. Paste a URL, done.
- **Easy to search**: Find recipes by ingredient ("what can I make with chicken and tomatoes?"), cuisine type, tags, or just browse. The recipes are actually discoverable.
- **Smart shopping lists**: Select multiple recipes and get a consolidated shopping list with ingredients grouped by category. Share it with family members.
- **Metric by default**: Automatically converts everything to metric units. No more "how many grams is 2 cups of flour?" moments.
- **Shareable**: Generate shareable links for shopping lists. Perfect for meal planning with family.

## What Makes This Different

**vs. Paprika/AnyList/RecipeBox**: Those are great for typed recipes, but they don't understand video content. Reci extracts recipes directly from video descriptions and comments.

**vs. YouTube Playlists**: Playlists are just links. Reci extracts the actual recipe data, making it searchable and usable even if the video gets deleted.

**vs. Pinterest**: Pinterest is visual discovery, but terrible for actually cooking. Reci gives you structured ingredients and instructions, not just pretty pictures.

**vs. ChatGPT/Claude**: AI assistants can help, but they don't remember your saved recipes or generate shopping lists from multiple dishes.

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

*This project was vibe coded. I make no guarantees about code quality, security, or reliability. That said i have used SonarQube to validate quality, Use at your own risk anyway.*
