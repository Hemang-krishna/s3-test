# S3 Media Upload Test App

A minimal full-stack test app with:

- **Node.js + Express backend**
- **MySQL metadata storage**
- **S3 pre-signed uploads**
- **React + Vite frontend**

This README explains:

- what was changed
- what you must configure manually
- what you need to install
- how to run the project with the fewest possible warnings/errors
- how to troubleshoot common problems

---

## 1. What changed

### Backend

The backend was reorganized into a structured layout:

```text
backend/
  package.json
  src/
    loadEnv.js
    db.js
    s3.js
    routes/media.js
    server.js
```

Implemented backend features:

- Express server with `/` health route
- `GET /upload-url` for pre-signed S3 uploads
- `POST /save` to store media metadata in MySQL
- `GET /media` to list media records
- MySQL connection pool using `mysql2/promise`
- DB retry logic and friendly degraded-mode behavior
- optional MySQL SSL support
- dynamic S3 public URL generation
- request logging
- global JSON error handler
- safer port handling
- shared `.env` loader

### Frontend

The frontend was refactored into a simple SPA under `s3-test-frontend/` with:

- Home page
- Upload page
- upload progress bars
- success/error toast messaging
- responsive media cards
- video, audio, and image preview
- Vite dev proxy for `/api`

---

## 2. What you need to install

Make sure you have these installed on your machine:

- **Node.js 18+** recommended
- **npm 9+** recommended
- access to a **MySQL database**
- access to an **AWS S3 bucket**

Install dependencies:

### Root/backend dependencies

From the project root:

```bash
npm install
```

### Frontend dependencies

From the frontend folder:

```bash
cd s3-test-frontend
npm install
cd ..
```

### Optional backend-local install

If you want to work entirely from inside `backend/`, you can also run:

```bash
cd backend
npm install
cd ..
```

---

## 3. Manual setup required

You **must** create and fill your environment file.

### Step A: create `.env`

From the project root:

```bash
cp .env.example .env
```

Then edit `.env` with real values.

### Required backend values

```env
PORT=7000
FRONTEND_URL=http://localhost:5173

DB_HOST=your-db-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
DB_CONNECTION_LIMIT=10
DB_CONNECT_TIMEOUT=10000
DB_SSL=false
DB_SSL_CA_PATH=
DB_SSL_CA_BASE64=
DB_RETRY_ATTEMPTS=3
DB_RETRY_DELAY_MS=1500

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
AWS_S3_PREFIX=uploads
AWS_PRESIGNED_URL_EXPIRES=900
```

### Important notes

- `PORT` must be a valid port between `0` and `65535`
- `FRONTEND_URL` should usually be `http://localhost:5173`
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` must be correct or DB access will fail
- `AWS_*` values must be valid or S3 upload URL generation will fail
- if your MySQL server requires SSL, set `DB_SSL=true`

---

## 4. MySQL table you must create manually

Run this SQL in your MySQL database:

```sql
CREATE TABLE s3_media_test (
  id INT AUTO_INCREMENT PRIMARY KEY,
  media_key VARCHAR(1024),
  media_type VARCHAR(50),
  title VARCHAR(255),
  description TEXT,
  thumbnail_key VARCHAR(1024),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 5. AWS S3 bucket setup you must verify manually

Make sure your bucket and IAM permissions allow:

- generating signed PUT upload URLs
- uploading objects to the target bucket
- reading uploaded files back via public URL or your bucket access strategy

At minimum, the credentials used by this app should be able to:

- `s3:PutObject`
- `s3:GetObject`

If your bucket is private, signed upload will work, but public preview URLs may not work unless your bucket/object policy allows access or you replace the returned URL strategy.

---

## 6. How to run the project

### Terminal 1: start backend

You can run from the project root:

```bash
npm start
```

Or from inside the backend folder:

```bash
cd backend
npm start
```

### Terminal 2: start frontend

```bash
cd s3-test-frontend
npm run dev
```

### Open the app

Open:

```text
http://localhost:5173
```

---

## 7. How to run with zero errors or warnings

To avoid startup errors/warnings:

1. install dependencies in root and frontend
2. create a valid `.env`
3. make sure `PORT` is valid
4. make sure MySQL is reachable from your machine
5. make sure the table `s3_media_test` exists
6. make sure AWS credentials and bucket are correct
7. start backend first, then frontend

If all configuration values are correct, the backend should start cleanly and the homepage health request should work normally.

---

## 8. Recommended local run checklist

Use this checklist in order:

### Backend checklist

- [ ] `npm install` completed in project root
- [ ] `.env` file exists in root or `backend/`
- [ ] MySQL database is reachable
- [ ] MySQL table exists
- [ ] AWS credentials are valid
- [ ] S3 bucket name and region are correct

### Frontend checklist

- [ ] `cd s3-test-frontend && npm install`
- [ ] Vite frontend starts on port `5173`
- [ ] backend runs on port `7000`
- [ ] `/api` proxy reaches backend successfully

---

## 9. Useful commands

### Check backend syntax

```bash
node --check backend/src/server.js
node --check backend/src/db.js
node --check backend/src/s3.js
node --check backend/src/routes/media.js
```

### Check DB connectivity

From root:

```bash
npm run test:db
```

From backend:

```bash
cd backend
npm run test:db
```

### Build frontend

```bash
cd s3-test-frontend
npm run build
```

---

## 10. Expected behavior

### When everything is configured correctly

- backend starts cleanly
- frontend loads on `http://localhost:5173`
- Upload page can request a signed URL
- file uploads to S3
- metadata saves to MySQL
- Home page lists uploaded media

### When DB config is wrong

- backend should **not crash**
- health route may show degraded status
- `/save` and `/media` may return friendly DB errors

### When AWS config is wrong

- backend should return a friendly error from `/upload-url`
- frontend upload should fail with an error toast

---

## 11. Troubleshooting

### Problem: backend starts but shows DB connection failures

Cause:

- wrong DB credentials
- DB host unreachable
- DB firewall blocks your IP
- SSL settings incorrect

What to check:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SSL`
- `DB_SSL_CA_PATH` / `DB_SSL_CA_BASE64`

### Problem: backend starts on fallback port instead of your chosen port

Cause:

- invalid `PORT` value

Fix:

- use a valid value like `7000`

### Problem: upload URL generation fails

Cause:

- missing or invalid AWS env values
- wrong bucket region
- IAM permissions missing

Check:

- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET`

### Problem: media uploads to S3 but does not appear in Home page

Cause:

- `/save` failed
- DB insert failed
- table missing

Check:

- backend logs
- DB table exists
- MySQL user has insert/select permissions

### Problem: frontend cannot reach backend

Cause:

- backend not running
- wrong frontend/backend ports

Check:

- backend on `7000`
- frontend on `5173`
- Vite proxy config

---

## 12. Suggested first run sequence

Use exactly this order:

```bash
# 1) install backend/root deps
npm install

# 2) install frontend deps
cd s3-test-frontend
npm install
cd ..

# 3) create env file
cp .env.example .env

# 4) edit .env with real DB + AWS values

# 5) create mysql table
# run the CREATE TABLE statement from this README

# 6) start backend
npm start

# 7) in another terminal start frontend
cd s3-test-frontend
npm run dev
```

---

## 13. Final note

If you want this project to run **without warnings**, the most important part is having:

- valid `.env` values
- reachable MySQL
- valid S3 credentials
- correct bucket access

If any of those are missing, the backend will stay alive by design, but it will warn you about the missing/unreachable dependency.
