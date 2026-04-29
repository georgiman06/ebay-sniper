# Use official Playwright image which has Python and Chromium pre-installed
FROM mcr.microsoft.com/playwright/python:v1.44.0-jammy

WORKDIR /app

# Install system dependencies required for psycopg2/asyncpg/scipy
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Uvicorn will be started by the docker-compose command, but we provide a default
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
