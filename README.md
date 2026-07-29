# Construction AI Assistant — Frontend

Ye React (Vite) chat interface hai jo aapke FastAPI backend
(`construction-ai-backend`) se baat karta hai.

## Setup (Pehli Baar)

1. Node.js installed honi chahiye (v18+). Check karo:
   ```
   node --version
   ```
   Agar nahi hai to https://nodejs.org se LTS version install kar lo.

2. Is folder ke andar aake dependencies install karo:
   ```
   cd construction-ai-frontend
   npm install
   ```
   (Ye 1-2 minute lega, ek hi baar karna hai)

## Chalane Ke Liye

**Pehle backend chalu hona chahiye** (dusre terminal me):
```
uvicorn app.main:app --reload
```
Backend `http://127.0.0.1:8000` pe chal raha hona chahiye.

**Fir frontend chalu karo** (is folder me):
```
npm run dev
```

Terminal me ek URL dikhega, usually:
```
http://localhost:5173
```

Ye link browser me kholo — login page dikhega.

## History

Top-right "History" button pichle sawal-jawab dikhata hai (backend ke
`/chat/history` endpoint se). Kisi bhi purane entry pe click karke wahi
sawal dobara poocha ja sakta hai.

## Login

Wahi credentials use karo jo backend me register kiye the, jaise:
- Username: `admin1`
- Password: `pass123`

## Backend URL Badalna Ho To

Agar backend kisi aur port/host pe chal raha hai (jaise deploy karne ke
baad Render pe), to `src/api.js` file me `API_BASE` line update kar do:

```js
export const API_BASE = 'http://127.0.0.1:8000';
```

## Build (Production Ke Liye)

```
npm run build
```

Isse `dist/` folder banega jise kisi bhi static hosting (GitHub Pages,
Netlify, Render static site) pe upload kar sakte ho.
