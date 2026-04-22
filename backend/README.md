# eBay Deal Finder Backend

This is the FastAPI backend for the eBay Deal Finder. It runs entirely inside Docker to ensure a consistent environment.

## 🚀 Step-by-Step Startup Guide

### 1. Make sure your `.env` is configured
Ensure your `.env` file exists in this `backend/` folder and contains the required eBay credentials and database URL:
```env
# eBay Credentials
ebay_client_id=your_client_id_here
ebay_client_secret=your_client_secret_here

# Database (This is the internal docker network URL)
database_url=postgresql+asyncpg://user:password@db:5432/ebay_deal_finder
```

### 2. Enter the Correct Directory
Always make sure you are in the project's root folder (where `docker-compose.yml` lives) before running Docker commands.
```powershell
cd C:\georgi\ebay-sniper\ebay-deal-finder
```

### 3. Start the Backend and Database
Run this command to build the backend Docker container and start the Postgres database in the background:
```powershell
docker compose up --build -d
```
*(The `-d` flag means "detached" so it runs in the background and frees up your terminal).*

### 4. Check the Logs
To make sure everything started successfully without errors:
```powershell
docker logs ebay-deal-finder-backend-1 --tail 50 -f
```
*(Press `Ctrl+C` to stop watching the logs).*

---

## 🛠️ Alembic Database Migrations

Whenever you add a NEW table or modify an EXISTING table in the Python code (`app/models/`), you must tell the database to update its structure.

**Step 1: Generate a Migration**
Run this to compare your Python models against the actual database and generate the modification script:
```powershell
docker exec -it ebay-deal-finder-backend-1 alembic revision --autogenerate -m "a_short_description_of_change"
```

**Step 2: Apply the Migration**
Run this to actually execute the changes on the Postgres database:
```powershell
docker exec -it ebay-deal-finder-backend-1 alembic upgrade head
```

---

## 🛑 Useful Docker Commands

**Stop everything safely:**
```powershell
docker compose stop
```

**Tear down everything (CAUTION: This will optionally delete data if you add -v):**
```powershell
docker compose down
```

**Restart just the backend container (Useful if you change `main.py` startup logic):**
```powershell
docker restart ebay-deal-finder-backend-1
```
