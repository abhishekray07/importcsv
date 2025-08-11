---
sidebar_position: 1
---

# Installation

This guide will help you install and set up ImportCSV in your project.

## Prerequisites

Before you begin, make sure you have the following:

- Node.js 18+ (for frontend and admin)
- Python 3.11+ (for backend)
- Docker & Docker Compose (for deployment)

## Quick Installation with Docker

The easiest way to get started is using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/abhishekray07/importcsv.git
cd importcsv

# Start all services
docker-compose up -d
```

This will start:
- PostgreSQL database
- Redis for queue management
- Backend API server
- Frontend development server
- Admin dashboard

Visit http://localhost:3000 for the admin dashboard.

## Installing the Frontend SDK

To integrate ImportCSV into your React application, install the SDK:

```bash
# Using npm
npm install csv-import-react

# Using yarn
yarn add csv-import-react
```

## Manual Setup

For development, you can set up each component individually:

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
uvicorn app.main:app --reload
```

### Admin Dashboard Setup

```bash
cd admin
npm install
npm run dev
```
