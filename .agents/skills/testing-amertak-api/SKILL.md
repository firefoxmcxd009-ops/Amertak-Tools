---
name: testing-amertak-api
description: Test the Amertak Tools backend API end-to-end. Use when verifying API changes, security middleware, or new endpoints.
---

# Testing Amertak Tools API

## Prerequisites
- Node.js >= 18
- yt-dlp installed (`pip3 install yt-dlp`)
- Backend dependencies installed (`cd backend && npm install`)

## Devin Secrets Needed
- `MONGOURL` — MongoDB connection string (needed for auth-gated endpoint testing)
- `OPENAI_API_KEY` — OpenAI API key (needed for transcribe endpoint testing)
- `JWT_SECRET` — any string works for local testing

## Quick Start
```bash
cd backend
npm install
JWT_SECRET=test-secret PORT=3001 YTDLP_PATH=$(which yt-dlp) node server.js
```

## Testing Without MongoDB
The following endpoints work without a database connection:
- `GET /health` — returns `{ status: "ok" }`
- `GET /api/tools/downloader` — returns supported platforms list
- `GET /api/tools/transcribe/formats` — returns supported file formats
- Any undefined route — returns `{ success: false, error: "API endpoint not found" }`

Auth-gated endpoints (POST downloader, POST transcribe, POST share/upload) return structured 401 JSON without MongoDB — useful for verifying auth middleware works.

## Testing With MongoDB
Set `MONGOURL` env var to a MongoDB Atlas connection string. Then you can:
1. Register a user via `POST /api/auth/register`
2. Use the cookie from registration to test authenticated endpoints
3. Test Cloud Share upload/download/info flow
4. Test image-to-url upload

## Key Assertions to Verify
1. **Security headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Cross-Origin-Resource-Policy: cross-origin`
2. **Rate limiting**: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` headers present
3. **CORS**: Unknown origins get no `Access-Control-Allow-Origin` header; configured origins do
4. **Error format**: All errors return `{ success: false, error: "message" }` — no raw stack traces
5. **413 handling**: Payloads over 50MB return `{ success: false, error: "Request payload too large." }`

## Testing Notes
- The frontend (in `public/`) is static HTML/CSS/JS served by Vercel, not the Express backend
- Frontend JavaScript hardcodes `API_BASE` to either `localhost:3001` or the deployed Render URL
- The root `vercel.json` might cause Vercel deployment failures due to a `comment` field — this is a known pre-existing issue
- Storage provider defaults to `local` (files saved to `backend/uploads/`)
- Cloud Share API routes are at `/api/share/*`, not `/api/tools/share/*`
