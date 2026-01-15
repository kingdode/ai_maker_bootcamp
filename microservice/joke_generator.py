#!/usr/bin/env python3
"""
Joke Generator FastAPI Application - Returns a random joke from a collection of 10 jokes.
"""

import random
from fastapi import FastAPI, Header, HTTPException, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional

# Initialize FastAPI app
app = FastAPI(
    title="Joke Generator API",
    description="A simple API that returns random jokes",
    version="1.0.0"
)

# Mount static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Authentication Configuration
AUTH_KEY = "12345"


async def verify_auth_header(request: Request):
    """Verify the authentication key from X-Auth-Key header."""
    auth_key = request.headers.get("X-Auth-Key") or request.headers.get("x-auth-key")
    if auth_key is None:
        raise HTTPException(
            status_code=401,
            detail="Missing authentication key. Please provide X-Auth-Key header."
        )
    if auth_key != AUTH_KEY:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication key."
        )
    return auth_key

# List of 10 jokes with setup and punchline
JOKES = [
    {"setup": "Why don't scientists trust atoms?", "punchline": "Because they make up everything!"},
    {"setup": "Why did the scarecrow win an award?", "punchline": "He was outstanding in his field!"},
    {"setup": "Why don't eggs tell jokes?", "punchline": "They'd crack each other up!"},
    {"setup": "What do you call a fake noodle?", "punchline": "An impasta!"},
    {"setup": "Why did the math book look so sad?", "punchline": "Because it had too many problems!"},
    {"setup": "What do you call a bear with no teeth?", "punchline": "A gummy bear!"},
    {"setup": "Why don't programmers like nature?", "punchline": "It has too many bugs!"},
    {"setup": "What's the best thing about Switzerland?", "punchline": "I don't know, but the flag is a big plus!"},
    {"setup": "Why did the coffee file a police report?", "punchline": "It got mugged!"},
    {"setup": "What do you call a sleeping bull?", "punchline": "A bulldozer!"}
]


class JokeResponse(BaseModel):
    """Response model for joke endpoint."""
    setup: str
    punchline: str


def get_random_joke():
    """Returns a random joke from the jokes list."""
    return random.choice(JOKES)


@app.get("/", response_class=HTMLResponse, tags=["Root"])
async def root():
    """Root endpoint serving the frontend HTML."""
    try:
        with open("static/index.html", "r") as f:
            return f.read()
    except FileNotFoundError:
        return """
        <html>
            <body>
                <h1>Joke Generator API</h1>
                <p>Frontend not found. Please ensure static/index.html exists.</p>
                <p><a href="/docs">API Documentation</a></p>
            </body>
        </html>
        """


@app.get("/api", tags=["Root"])
async def api_info():
    """API information endpoint."""
    return {
        "message": "Welcome to the Joke Generator API!",
        "endpoints": {
            "/joke": "GET - Returns a random joke (requires X-Auth-Key header)",
            "/docs": "Interactive API documentation",
            "/health": "Health check endpoint"
        },
        "authentication": {
            "type": "API Key",
            "header": "X-Auth-Key",
            "note": "The /joke endpoint requires authentication"
        }
    }


@app.get("/joke", response_model=JokeResponse, tags=["Jokes"])
async def get_joke(auth_key: str = Depends(verify_auth_header)):
    """Returns a random joke with setup and punchline. Requires X-Auth-Key header."""
    joke = get_random_joke()
    return JokeResponse(setup=joke["setup"], punchline=joke["punchline"])


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "total_jokes": len(JOKES)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

