#!/bin/sh
set -e
[ -z "$JWT_SECRET" ] && echo "ERROR: JWT_SECRET required" >&2 && exit 1
[ -z "$DATABASE_URL" ] && export DATABASE_URL="file:/data/reci.db"
echo "Running prisma db push..."
npx prisma db push --skip-generate
exec node dist/server.js
