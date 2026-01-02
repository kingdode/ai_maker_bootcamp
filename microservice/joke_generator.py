#!/usr/bin/env python3
"""
Joke Generator FastAPI Application - Returns a random joke from a collection of 10 jokes.
"""

import random
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Initialize FastAPI app
app = FastAPI(
    title="Joke Generator API",
    description="A simple API that returns random jokes",
    version="1.0.0"
)

# Mount static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# List of 10 jokes
JOKES = [
    "Why don't scientists trust atoms? Because they make up everything!",
    "Why did the scarecrow win an award? He was outstanding in his field!",
    "Why don't eggs tell jokes? They'd crack each other up!",
    "What do you call a fake noodle? An impasta!",
    "Why did the math book look so sad? Because it had too many problems!",
    "What do you call a bear with no teeth? A gummy bear!",
    "Why don't programmers like nature? It has too many bugs!",
    "What's the best thing about Switzerland? I don't know, but the flag is a big plus!",
    "Why did the coffee file a police report? It got mugged!",
    "What do you call a sleeping bull? A bulldozer!"
]


class JokeResponse(BaseModel):
    """Response model for joke endpoint."""
    joke: str


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
            "/joke": "GET - Returns a random joke",
            "/docs": "Interactive API documentation",
            "/health": "Health check endpoint"
        }
    }


@app.get("/joke", response_model=JokeResponse, tags=["Jokes"])
async def get_joke():
    """Returns a random joke."""
    joke = get_random_joke()
    return JokeResponse(joke=joke)


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "total_jokes": len(JOKES)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

