#!/usr/bin/env python3
"""Run the FastAPI server with uvicorn."""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "wearable_pipeline.api.app:app",
        host="0.0.0.0",
        port=int(__import__('os').environ.get('API_PORT', '3001')),
        reload=True,
        reload_dirs=["src"],
    )
