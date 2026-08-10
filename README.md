# ⚡ eBay Deal Finder & Sniper Suite (PC Builder Edition)

> **Client Project Showcase**: Built specifically for a **custom PC builder & hardware reseller** who uses this tool regularly to source underpriced computer components (GPUs, CPUs, RAM, Motherboards, Storage, PSUs), automate market analysis, calculate real-time profit margins, and snipe deals before competitors.

---

## 🎯 Background & Client Use Case

Building custom PCs and flipping hardware manually requires endless hours of scouring eBay for underpriced listings, calculating potential profit margins after eBay fees and shipping, and guessing fair market values.

This application was engineered as an **automated, autonomous deal-hunting and price-analytics platform** tailored for a PC builder client. The client uses this application daily to:
- **Track high-demand PC hardware** (e.g., RTX 3080, RTX 4070, Ryzen 7 7800X3D, i7-13700K, DDR5 kits).
- **Automatically scan live eBay listings** and instantly flag deals yielding a target ROI/profit margin (e.g., 20%+ net profit margin).
- **Determine accurate market value** by parsing recent sold listings and stripping statistical price outliers.
- **Snipe discounted items** in real-time with automated profit calculators factoring in shipping and platform fees.
- **Consult an AI Assistant** trained on PC flipping strategies for instant market insights and compatibility guidance.

---

## 🛠️ Complete Feature Breakdown (Everything Completed)

This project has been fully developed, tested, and shipped with an extensive suite of features:

### 1. 🔍 Automated Deal Hunting & Live Sniper Feed
- **Real-Time Live Feed**: Streamlined live listing feed updated continuously with margin percentages, listing age, seller metrics, and direct eBay action links.
- **Instant Profit & Margin Calculator**: Calculates `Net Profit = Fair Market Value - (Buy Price + Shipping + Estimated Fees)` and flags listings meeting the target margin threshold.
- **Custom Margin Sliders**: Dynamic client-side filtering allowing the PC builder to toggle minimum margin thresholds (e.g. 0% to 50%+ profit margin).
- **Item Condition Filtering**: Categorized by item condition (`Working/Used`, `For Parts/Not Working` for component repairs, and `Brand New`).

### 2. 📊 Market Analysis & Price Estimation Engine
- **Outlier Cleaning (`data_cleaner.py`)**: Uses IQR (Interquartile Range) algorithms to scrub junk listings, bundled lots, and mispriced accessories from historical sold statistics.
- **Max Buy Price Formula**: Computes the exact maximum purchase price allowed for any PC component to maintain target profit margins.
- **Historical Market Analytics**: Tracks sample sizes, average sold prices, price spreads, and min/max historical values over customizable time windows.

### 3. 📦 Hardware Tracker & Database Management
- **Part Tracking System**: Complete CRUD interface to manage tracked PC hardware models with active/inactive toggling.
- **Auto-Refresh Scheduler**: Built-in `APScheduler` background service that periodically refreshes active parts every 6 hours and runs an immediate startup sweep for stale parts.
- **Multi-Source Fetcher**: Hybrid architecture combining eBay Browse API, eBay Finding API, and Playwright fallback scraping (`ebay_scraper.py`).

### 4. 🤖 AI-Powered Hardware & Reselling Assistant
- **Integrated AI Chat Widget (`ChatWidget.tsx` / `chat_service.py`)**: Embedded AI advisor available on the dashboard.
- **PC Builder Strategy**: Pre-prompted with domain knowledge on PC component specs, chipset compatibility, resale liquidity, and flipping margins.

### 5. 📈 Interactive Analytics & Price History Charts
- **Visual Trend Graphs (`PriceHistoryChart.tsx`, `MovingAverageChart.tsx`)**: Recharts integration showing historical price trajectories and moving averages over time.
- **Historical Search Auditing**: Keeps a log of past searches and query suggestions (`suggestions_service.py`) for quick re-scanning.

### 6. ⏱️ Rate Limiting & API Quota Monitoring
- **Real-Time Quota Dashboard (`QuotaBanner.tsx`, `QuotaDonut.tsx`)**: Visual indicators tracking daily/monthly eBay API call limits and rate limits (`SlowAPI`).
- **Graceful Quota Handling**: Structured 429 error mapping that alerts the user with countdown timers when quotas reset without breaking the UI.

### 7. 🎨 Premium UI/UX & 3D Interactive Design
- **Modern Dark UI System**: Engineered with Next.js App Router, Tailwind CSS, Lucide Icons, and glassmorphic card elements.
- **Interactive 3D Hero (`ParticleTorus.tsx`)**: Smooth WebGL particle torus rendered with Three.js / React Three Fiber for a state-of-the-art aesthetic.

### 8. 🐳 Full Dockerized Infrastructure & Database Migration
- **Containerized Stack**: Complete `docker-compose.yml` configuration orchestrating backend, frontend, and PostgreSQL database.
- **Alembic Database Migrations**: Automated schema revisioning system (`alembic.ini`).
- **Production Ready**: Prepared with Railway deployment configuration (`railway.toml`).

---

## 🏗️ Architecture & Technology Stack

```
                     ┌──────────────────────────────────────────┐
                     │          Next.js Frontend (App Router)   │
                     │  - React, TypeScript, Tailwind, SWR      │
                     │  - Recharts, Three.js 3D Canvas          │
                     └────────────────────┬─────────────────────┘
                                          │ REST API / CORS
                                          ▼
                     ┌──────────────────────────────────────────┐
                     │            FastAPI Backend               │
                     │  - Python 3.11, SQLAlchemy Async         │
                     │  - APScheduler, SlowAPI Rate Limiter     │
                     └──────────┬────────────────────┬──────────┘
                                │                    │
              ┌─────────────────┴─┐                ┌─┴────────────────┐
              ▼                   ▼                ▼                  ▼
┌───────────────────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│     PostgreSQL Database    │ │  eBay Browse  │ │  eBay Finding │ │   Playwright  │
│  (Parts, Listings, Scans) │ │      API      │ │      API      │ │    Scraper    │
└───────────────────────────┘ └───────────────┘ └───────────────┘ └───────────────┘
```

### Stack Summary
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, SWR, Recharts, Three.js / @react-three/fiber, Lucide Icons.
- **Backend**: FastAPI, Python 3.11+, Asyncpg, SQLAlchemy 2.0, APScheduler, Playwright, SlowAPI, Sentry.
- **Database**: PostgreSQL with Alembic Migrations.
- **DevOps**: Docker, Docker Compose, Railway.

---

## 🚀 Quick Start Guide

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed & running.
- [Node.js 18+](https://nodejs.org/) (if running frontend outside Docker).
- Python 3.11+ (if running backend outside Docker).
- eBay Developer Client ID & Secret.

---

### Running via Docker Compose (Recommended)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/georgiman06/ebay-sniper.git
   cd ebay-sniper
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in `backend/`:
   ```env
   # eBay Credentials
   ebay_client_id=YOUR_EBAY_CLIENT_ID
   ebay_client_secret=YOUR_EBAY_CLIENT_SECRET

   # Database
   database_url=postgresql+asyncpg://user:password@db:5432/ebay_deal_finder

   # CORS & Security
   cors_origins=http://localhost:3000
   api_key=YOUR_API_KEY
   ```

3. **Start Containers**:
   ```bash
   docker compose up --build -d
   ```

4. **Access Applications**:
   - **Frontend App**: [http://localhost:3000](http://localhost:3000)
   - **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Database Migrations (Alembic)

Whenever model schemas change:
```bash
# Generate migration
docker exec -it ebay-deal-finder-backend-1 alembic revision --autogenerate -m "migration_description"

# Apply migration
docker exec -it ebay-deal-finder-backend-1 alembic upgrade head
```

---

## 💻 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Endpoints (search, parts, discovery, listings, chat, refresh, health)
│   │   ├── models/          # SQLAlchemy async models (TrackedPart, ActiveListing, SoldListing, etc.)
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic (eBay APIs, scrapers, data cleaning, AI chat, quotas)
│   │   ├── config.py        # Environment settings
│   │   ├── database.py      # Async DB engine & session setup
│   │   ├── main.py          # FastAPI application & startup refresh tasks
│   │   └── scheduler.py     # Background APScheduler setup
│   ├── alembic/             # Database migration scripts
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router pages (Discover, Parts, History, Dashboard)
│   │   ├── components/      # UI components (SniperFeed, DealCard, PartTable, ChatWidget, 3D Canvas)
│   │   ├── hooks/           # Custom SWR hooks (useParts, useSniper, useRefresh)
│   │   └── lib/             # API client, utility functions, type definitions
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml       # Container orchestration
└── README.md
```

---

## 🏆 Key Takeaways & Results

- **Time Saved**: Replaced 2+ hours of manual daily eBay searches with automated 6-hour background scan sweeps.
- **Profitability**: Allows the client to instantly lock in 20%+ target margin deals on PC hardware components.
- **Data-Driven**: Eliminates bad buying decisions by filtering out junk/accessory sold listings through statistical outlier removal.
