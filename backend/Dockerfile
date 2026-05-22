FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh || true

RUN adduser --disabled-password --gecos '' --uid 1000 flowbon \
    && chown -R flowbon:flowbon /app

USER flowbon

# Use shell to run the entrypoint so bind-mounted files without executable
# permission (e.g. on some host filesystems) still run inside the container.
ENTRYPOINT ["sh", "/app/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

