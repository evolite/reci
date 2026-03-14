# Reci

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub release](https://img.shields.io/github/v/release/evolite/reci)](https://github.com/evolite/reci/releases)
[![GitHub issues](https://img.shields.io/github/issues/evolite/reci)](https://github.com/evolite/reci/issues)

**A personal recipe video library built for my family and me.**

I built this because I kept finding amazing recipes on YouTube, TikTok, and Instagram, saving them to playlists or screenshots, and then completely forgetting about them. My family and I would stumble upon great recipes on social media, but we never actually used them because they were buried in playlists or lost in photo albums. I don't think that is a problem unique to me...

Reci attempts to solve that problem by turning recipe videos into a searchable, organized collection that we actually use.

## Why I Built This

Most recipe managers expect you to manually type in ingredients, categorize everything, and maintain your own database. That's too much work. I wanted something that my family actually wanted to engage with, KISS:

- **Works with video content**: Built specifically for recipe videos from YouTube, TikTok, Instagram, etc. Just paste a URL and it handles the rest.
- **Actually extracts recipes**: Uses AI to watch the video, read the comments, and extract everything—ingredients, instructions, tags, even cooking tips from the community. No manual data entry.
- **Easy to add**: The whole point is making it effortless to save recipes we find. Paste a URL, done.
- **Everyone Shares Recipes**: A recipe added is visible and editable by all users, perfect for family and friends.
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

Built with TypeScript, React, and Vite. Uses shadcn/ui components for the UI, Prisma with SQLite for the embedded database, and an OpenAI-compatible API for recipe analysis (supports OpenAI, Anthropic Claude, Google Gemini, and self-hosted models). Backend is Express serving both the API and the pre-built frontend. Everything runs in a single container.

## Deployment

### Prerequisites

- Podman (or Docker)
- An API key for your chosen AI provider (OpenAI, Anthropic, Google, or a self-hosted model)

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | Yes | — | Secret for signing JWT tokens |
| `OPENAI_API_KEY` | No | — | Fallback API key if none is configured in admin settings |
| `CORS_ORIGIN` | Yes (production) | `*` (dev only) | Allowed frontend origin (e.g. `https://reci.example.com`) |
| `DATABASE_URL` | No | `file:/data/reci.db` | Prisma database URL |
| `JWT_EXPIRES_IN` | No | `7d` | JWT expiry duration |
| `PORT` | No | `4000` | Port the server listens on |

The SQLite database is created automatically on first run at `/data/reci.db`. Mount a volume at `/data` to persist it across container restarts.

### AI Provider Configuration

The AI provider, model, and API key can be configured directly in the admin panel under **Settings → AI Provider Configuration** — no rebuild required. Supported providers:

| Provider | Notes |
|---|---|
| **OpenAI** | Default. Uses `gpt-4o-mini` unless overridden. |
| **Anthropic Claude** | Uses the OpenAI-compatible endpoint at `https://api.anthropic.com/v1`. |
| **Google Gemini** | Uses the OpenAI-compatible endpoint at `https://generativelanguage.googleapis.com/v1beta/openai/`. |
| **Custom / Self-hosted** | Any OpenAI-compatible server (Ollama, LM Studio, vLLM, etc.). Enter the base URL and model name manually. |

The `OPENAI_API_KEY` environment variable is used as a fallback if no API key has been saved in the database, preserving backward compatibility for existing deployments.

### Run with Podman

```bash
podman run -d \
  -p 4000:4000 \
  -v reci-data:/data \
  -e JWT_SECRET="your-secret" \
  -e OPENAI_API_KEY="sk-..." \
  -e CORS_ORIGIN="https://reci.example.com" \
  ghcr.io/evolite/reci:latest

# Or configure the API key in the admin panel after first run (no env var needed)
```

### Build from Source

```bash
git clone https://github.com/evolite/reci.git
cd reci
podman build -t reci:latest .
podman run -d -p 4000:4000 -v reci-data:/data \
  -e JWT_SECRET="your-secret" \
  reci:latest
```

The app will be available at `http://localhost:4000`.

## Contributing

This is a personal project.

## License

MIT - Do whatever you want with it.

---

**Built for my family and me, for people who love cooking but hate organizing recipes.**
