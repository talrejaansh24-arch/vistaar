# VistaarWater Fullstack Platform

A modern B2B Custom Water Bottle Design & Ordering Platform built with React (Vite) for the frontend and FastAPI for the backend.

## Local Development

### Requirements
- Node.js
- Python 3.9+

### Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

### Setup Backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Run Everything Together
```bash
npm install
npm run dev
```
