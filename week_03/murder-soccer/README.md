# Murder Soccer - Apocalyptic Flappy Bird Game

A Flappy Bird-style game with an apocalyptic soccer theme. Navigate through walls, avoid enemies, and try to achieve the highest score!

## Setup

1. Activate your virtual environment:
   ```bash
   source venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Game

```bash
python game.py
```

## Controls

- **SPACE** or **Left Mouse Click**: Flap/Jump
- Click **START** button on the start screen to begin

## Game Features

- **Start Screen**: Click the START button to begin playing
- **Player**: Control a soccer player that flaps when you press SPACE or click
- **Walls**: Navigate through gaps in apocalyptic-themed walls
- **Enemies**: Avoid flying enemies that move toward you
- **High Score**: Your high score is automatically saved
- **Levels**: Multiple difficulty levels defined in `config.json`

## Configuration

Game difficulty and settings can be modified in `config.json`:
- Wall speed and spacing
- Enemy speed and spawn rate
- Gravity and flap strength
- Multiple levels with increasing difficulty

## Files

- `game.py` - Main game file with all game logic
- `config.json` - Level configurations and game settings
- `highscore.json` - Stores your high score (auto-generated)
- `requirements.txt` - Python dependencies

## Assets

All game assets are located in the `assets/` directory:
- `assets/images/` - Player, enemy, and map images
- `assets/sounds/` - Sound effects and background music

Enjoy the game!

