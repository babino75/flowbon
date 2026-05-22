#!/usr/bin/env bash
set -e

echo "Waiting for database to become available..."
python - <<'PY'
import os
import time
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    raise SystemExit('DATABASE_URL is not set')

engine = create_engine(DATABASE_URL)
for _ in range(30):
    try:
        with engine.connect() as conn:
            conn.execute(text('SELECT 1'))
        break
    except OperationalError:
        time.sleep(2)
else:
    raise SystemExit('Database is not available after waiting')
PY

echo "Database is ready. Running migrations..."
alembic upgrade head

echo "Starting application..."
exec "$@"
