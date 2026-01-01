# Database Setup

## First-Time Database Initialization

The database needs to be initialized with the Prisma schema on first deployment. This guide assumes you're using the Podman database container in the `services-network` network.

### Steps

1. **Start the database container:**
```bash
systemctl --user start reci-db.service
```

2. **Wait for PostgreSQL to be ready** (usually takes 10-20 seconds):
```bash
# Check if database is ready
podman exec reci-db pg_isready -U reci
```

3. **Set up the database schema:**

Run Prisma schema setup from a temporary container connected to the same network:
```bash
# Navigate to backend directory
cd backend

# Push the Prisma schema to the database using a temporary Node.js container
podman run --rm \
  --network services-network \
  -v $(pwd):/app \
  -w /app \
  -e DATABASE_URL="postgresql://reci:reci_password@reci-db:5432/reci_db" \
  node:20-alpine sh -c "npm install && npx prisma db push"
```

## Database Connection String

The `DATABASE_URL` for the containerized database (when connecting from within the Podman network):
```
postgresql://reci:reci_password@reci-db:5432/reci_db
```

## Verifying Database Setup

After setting up the database schema, you can verify it was initialized correctly:

```bash
# Connect to the database
podman exec -it reci-db psql -U reci -d reci_db

# List all tables
\dt

# You should see tables: users, invites, recipes, waitlist, shopping_carts, settings, recipe_ratings
```

## Using Prisma Studio (for development)

You can also use Prisma Studio to inspect and manage your database:
```bash
cd backend
podman run --rm \
  --network services-network \
  -v $(pwd):/app \
  -w /app \
  -e DATABASE_URL="postgresql://reci:reci_password@reci-db:5432/reci_db" \
  -p 5555:5555 \
  node:20-alpine sh -c "npm install && npx prisma studio --port 5555 --hostname 0.0.0.0"
```

Then open `http://localhost:5555` in your browser.
