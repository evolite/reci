import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import recipeRoutes from './routes/recipes';
import authRoutes from './routes/auth';
import inviteRoutes from './routes/invites';
import waitlistRoutes from './routes/waitlist';
import { cartRouter, cartPublicRouter } from './routes/cart';
import settingsRoutes from './routes/settings';
import ratingsRoutes from './routes/ratings';
import { IMAGE_DIR, IMAGE_ROUTE, ensureImageDir } from './services/imageService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Behind cloudflared, so X-Forwarded-For is set. Without this express-rate-limit
// cannot identify clients and throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
app.set('trust proxy', 1);

// Fail fast in production if CORS_ORIGIN is not set
if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  console.error('FATAL: CORS_ORIGIN must be set in production. Refusing to start with wildcard CORS.');
  process.exit(1);
}

// Security headers.
// helmet's default CSP sets `img-src 'self' data:`, which blocks every remote
// thumbnail. Recipe images are stored locally (and so are same-origin), but
// `https:` is allowed as a fallback for recipes whose image has not been
// downloaded yet.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'img-src': ["'self'", 'data:', 'https:'],
      },
    },
  })
);

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/cart', cartRouter);
app.use('/api/cart', cartPublicRouter);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Locally stored recipe thumbnails. Served same-origin so they satisfy CSP and
// keep working after the source CDN URL expires.
ensureImageDir();
app.use(
  IMAGE_ROUTE,
  express.static(IMAGE_DIR, {
    maxAge: '30d',
    fallthrough: false,
  })
);

// Static frontend + SPA fallback
const staticDir = path.join(__dirname, '..', 'public');
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    },
  }));
  app.use((req, res) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
