# Railway Backend Deployment Debug Log

## Date: 2026-04-02

## Problem
Backend API deployed to Railway returned 502 consistently, even though the Docker image built successfully and ran fine locally.

---

## Root Causes (3 issues, fixed sequentially)

### Issue 1: Railpack auto-detected Node.js instead of Python

**Symptom:** Railway used `RAILPACK` builder and detected `node` as the provider, serving the app with Caddy as a SPA — completely wrong for a Python FastAPI backend.

**Why:** The project root contains `dashboard/package.json`. Railway's auto-detection saw it and assumed the project was a Node.js app, ignoring the `Dockerfile`.

**Fix:** Added `railway.json` to force Dockerfile builder:
```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  }
}
```

Also added `.railwayignore` to exclude `dashboard/`, `.venv/`, etc. from upload.

---

### Issue 2: Dockerfile copied `src/` after `pip install`

**Symptom:** `pip install .` failed because `pyproject.toml` references `src/wearable_pipeline` as the package, but `src/` wasn't copied yet.

**Original Dockerfile:**
```dockerfile
COPY pyproject.toml ./
RUN pip install --no-cache-dir .    # fails: src/ not present
COPY src/ src/
```

**Fix:** Reordered to copy `src/` before install:
```dockerfile
COPY pyproject.toml ./
COPY src/ src/
RUN pip install --no-cache-dir .
```

---

### Issue 3: Hardcoded port didn't match Railway's `$PORT`

**Symptom:** App started on port 8000 but Railway's reverse proxy expected the port specified by the `$PORT` environment variable.

**Original Dockerfile:**
```dockerfile
CMD ["uvicorn", "wearable_pipeline.api.app:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Fix:** Use shell form to expand `$PORT`:
```dockerfile
ENV PORT=8000
CMD uvicorn wearable_pipeline.api.app:app --host 0.0.0.0 --port $PORT
```

Also explicitly set `PORT=8000` in Railway service variables.

---

## Additional Change: SSL for Railway Postgres

Railway's internal Postgres requires SSL. Added SSL context in `db/connection.py`:
```python
if os.environ.get("RAILWAY_ENVIRONMENT"):
    ssl_ctx = ssl.create_default_context()
    ssl_ctx.check_hostname = False
    ssl_ctx.verify_mode = ssl.CERT_NONE
```

Note: This turned out to not be the blocking issue (internal connections worked without SSL too), but was kept for robustness.

---

## Key Takeaway

The primary blocker was **Issue 1** (wrong builder) + **Issue 3** (port mismatch). The app was actually running (logs showed "Application startup complete") but Railway's reverse proxy couldn't reach it because it was listening on the wrong port. Always check:

1. `railway.json` → force `DOCKERFILE` builder if the repo has mixed languages
2. `CMD` → use `$PORT` env var, not a hardcoded port
3. `.railwayignore` → exclude irrelevant directories to speed up uploads and avoid confusing auto-detection
