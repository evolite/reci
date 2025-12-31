import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import recipeRoutes from './routes/recipes';
import authRoutes from './routes/auth';
import inviteRoutes from './routes/invites';
import waitlistRoutes from './routes/waitlist';
import { cartRouter, cartPublicRouter } from './routes/cart';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
// CORS configuration - restrict to specific origins in production
if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  throw new Error('CORS_ORIGIN environment variable is required in production');
}

const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*', // In production, set CORS_ORIGIN to your frontend URL
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
app.use('/api/cart', cartRouter);
app.use('/api/cart', cartPublicRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
