import pygame
import json
import os
import random
import sys
import math

# Initialize Pygame
pygame.init()
pygame.mixer.init()

# Constants
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
DARK_GRAY = (40, 40, 40)
LIGHT_GRAY = (100, 100, 100)
ORANGE = (255, 165, 0)

class GameConfig:
    """Loads and manages game configuration"""
    def __init__(self):
        try:
            with open('config.json', 'r') as f:
                self.data = json.load(f)
        except FileNotFoundError:
            print("Error: config.json not found!")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"Error: Invalid JSON in config.json: {e}")
            sys.exit(1)
        
        self.screen_width = self.data['screen_width']
        self.screen_height = self.data['screen_height']
        self.player_start_x = self.data['player_start_x']
        self.player_start_y = self.data['player_start_y']
        self.current_level = self.data['default_level']
        
    def get_level_config(self, level_num=None):
        """Get configuration for a specific level"""
        if level_num is None:
            level_num = self.current_level
        
        for level in self.data['levels']:
            if level['level'] == level_num:
                return level
        return self.data['levels'][0]  # Return first level as default

class HighScore:
    """Manages high score storage with player names"""
    def __init__(self):
        self.filename = 'highscore.json'
        self.leaderboard = []  # List of {'name': str, 'score': int}
        self.high_score = 0
        self.load()
    
    def load(self):
        """Load high scores from file"""
        if os.path.exists(self.filename):
            try:
                with open(self.filename, 'r') as f:
                    data = json.load(f)
                    # Support both old and new format
                    if 'leaderboard' in data:
                        self.leaderboard = data['leaderboard']
                        self.leaderboard.sort(key=lambda x: x['score'], reverse=True)
                        self.high_score = self.leaderboard[0]['score'] if self.leaderboard else 0
                    elif 'high_score' in data:
                        # Old format - migrate it
                        self.high_score = data.get('high_score', 0)
                        if self.high_score > 0:
                            self.leaderboard = [{'name': 'Player', 'score': self.high_score}]
                    else:
                        self.leaderboard = []
                        self.high_score = 0
            except (json.JSONDecodeError, KeyError):
                self.leaderboard = []
                self.high_score = 0
        else:
            self.leaderboard = []
            self.high_score = 0
    
    def save(self):
        """Save high scores to file"""
        with open(self.filename, 'w') as f:
            json.dump({
                'high_score': self.high_score,
                'leaderboard': self.leaderboard[:10]  # Keep top 10
            }, f, indent=2)
    
    def add_score(self, name, score):
        """Add a new score entry"""
        if not name or not name.strip():
            name = "Anonymous"
        
        self.leaderboard.append({'name': name.strip(), 'score': score})
        self.leaderboard.sort(key=lambda x: x['score'], reverse=True)
        self.leaderboard = self.leaderboard[:10]  # Keep top 10
        
        if score > self.high_score:
            self.high_score = score
        
        self.save()
        return score > self.high_score
    
    def get_top_scores(self, count=5):
        """Get top N scores"""
        return self.leaderboard[:count]

class Player:
    """Player class representing the bird/soccer player"""
    def __init__(self, x, y, config):
        self.config = config
        self.level_config = config.get_level_config()
        
        # Load and scale player image
        try:
            self.original_image = pygame.image.load('assets/images/player.png')
        except pygame.error as e:
            print(f"Error loading player image: {e}")
            sys.exit(1)
        self.width = 60
        self.height = 60
        self.image = pygame.transform.scale(self.original_image, (self.width, self.height))
        
        self.x = x
        self.y = y
        self.velocity_y = 0
        self.angle = 0
        self.game_started = False  # Player doesn't fall until game starts
        
        self.rect = pygame.Rect(self.x, self.y, self.width, self.height)
    
    def update(self, config):
        """Update player position and physics"""
        self.level_config = config.get_level_config()
        
        # Apply gravity only if game has started
        if self.game_started:
            self.velocity_y += self.level_config['gravity']
        else:
            self.velocity_y = 0
        
        self.y += self.velocity_y
        
        # Keep player on screen
        if self.y < 0:
            self.y = 0
            self.velocity_y = 0
        if self.y + self.height > config.screen_height:
            self.y = config.screen_height - self.height
            self.velocity_y = 0
        
        # Update angle based on velocity
        self.angle = min(max(self.velocity_y * 3, -30), 30)
        
        self.rect = pygame.Rect(self.x, self.y, self.width, self.height)
    
    def flap(self, config):
        """Make the player flap/jump"""
        self.level_config = config.get_level_config()
        self.velocity_y = self.level_config['flap_strength']
        self.game_started = True
    
    def draw(self, screen):
        """Draw the player"""
        rotated_image = pygame.transform.rotate(self.image, -self.angle)
        rect = rotated_image.get_rect(center=(self.x + self.width//2, self.y + self.height//2))
        screen.blit(rotated_image, rect)

class Wall:
    """Wall/Obstacle class - apocalyptic soccer themed"""
    def __init__(self, x, config):
        self.config = config
        self.level_config = config.get_level_config()
        
        # Wall dimensions
        self.width = 80
        self.gap_size = max(self.level_config['wall_gap_size'], 70)  # Ensure gap is at least 70px (larger than player)
        
        # Random gap position - ensure gap is always accessible
        min_gap_y = 50
        max_gap_y = config.screen_height - self.gap_size - 50
        gap_y = random.randint(min_gap_y, max_gap_y) if max_gap_y > min_gap_y else config.screen_height // 2
        
        # Top wall
        self.top_rect = pygame.Rect(x, 0, self.width, gap_y)
        # Bottom wall
        self.bottom_rect = pygame.Rect(x, gap_y + self.gap_size, self.width, 
                                       config.screen_height - (gap_y + self.gap_size))
        
        self.x = x
        self.passed = False
    
    def update(self, config):
        """Update wall position"""
        self.level_config = config.get_level_config()
        speed = self.level_config['wall_speed']
        self.x -= speed
        
        self.top_rect.x = self.x
        self.bottom_rect.x = self.x
    
    def draw(self, screen):
        """Draw realistic brick walls with mortar lines"""
        # Brick colors - weathered and apocalyptic
        brick_colors = [
            (80, 60, 50),   # Dark brown
            (90, 70, 60),   # Medium brown
            (70, 50, 40),   # Darker brown
            (100, 75, 65),  # Lighter brown
        ]
        mortar_color = (50, 50, 50)  # Dark gray mortar
        brick_height = 20
        brick_width = 25
        
        # Draw top wall bricks
        self._draw_brick_wall(screen, self.top_rect, brick_colors, mortar_color, brick_width, brick_height)
        
        # Draw bottom wall bricks
        self._draw_brick_wall(screen, self.bottom_rect, brick_colors, mortar_color, brick_width, brick_height)
        
        # Add goal post details at the edges (metal bars)
        pygame.draw.rect(screen, (120, 120, 120), 
                        (self.top_rect.x, self.top_rect.y, 6, self.top_rect.height))
        pygame.draw.rect(screen, (100, 100, 100),
                        (self.top_rect.x, self.top_rect.y, 6, self.top_rect.height), 1)
        pygame.draw.rect(screen, (120, 120, 120),
                        (self.top_rect.x + self.width - 6, self.top_rect.y, 6, self.top_rect.height))
        pygame.draw.rect(screen, (100, 100, 100),
                        (self.top_rect.x + self.width - 6, self.top_rect.y, 6, self.top_rect.height), 1)
        pygame.draw.rect(screen, (120, 120, 120),
                        (self.bottom_rect.x, self.bottom_rect.y, 6, self.bottom_rect.height))
        pygame.draw.rect(screen, (100, 100, 100),
                        (self.bottom_rect.x, self.bottom_rect.y, 6, self.bottom_rect.height), 1)
        pygame.draw.rect(screen, (120, 120, 120),
                        (self.bottom_rect.x + self.width - 6, self.bottom_rect.y, 6, self.bottom_rect.height))
        pygame.draw.rect(screen, (100, 100, 100),
                        (self.bottom_rect.x + self.width - 6, self.bottom_rect.y, 6, self.bottom_rect.height), 1)
    
    def _draw_brick_wall(self, screen, rect, brick_colors, mortar_color, brick_width, brick_height):
        """Helper method to draw a realistic brick wall"""
        # Draw mortar background
        pygame.draw.rect(screen, mortar_color, rect)
        
        # Draw individual bricks in a staggered pattern
        y = rect.y
        row_offset = 0
        while y < rect.y + rect.height:
            x = rect.x + row_offset
            while x < rect.x + rect.width:
                # Random brick color for variation
                brick_color = random.choice(brick_colors)
                
                # Brick rectangle
                brick_rect = pygame.Rect(x, y, brick_width, brick_height)
                # Clamp to wall bounds
                if brick_rect.right > rect.right:
                    brick_rect.width = rect.right - brick_rect.left
                if brick_rect.bottom > rect.bottom:
                    brick_rect.height = rect.bottom - brick_rect.top
                
                # Draw brick with slight 3D effect
                pygame.draw.rect(screen, brick_color, brick_rect)
                
                # Add highlight for depth
                highlight_color = tuple(min(255, c + 20) for c in brick_color)
                pygame.draw.line(screen, highlight_color, 
                               (brick_rect.x, brick_rect.y), 
                               (brick_rect.right, brick_rect.y), 1)
                pygame.draw.line(screen, highlight_color,
                               (brick_rect.x, brick_rect.y),
                               (brick_rect.x, brick_rect.bottom), 1)
                
                # Add shadow for depth
                shadow_color = tuple(max(0, c - 20) for c in brick_color)
                pygame.draw.line(screen, shadow_color,
                               (brick_rect.right, brick_rect.y),
                               (brick_rect.right, brick_rect.bottom), 1)
                pygame.draw.line(screen, shadow_color,
                               (brick_rect.x, brick_rect.bottom),
                               (brick_rect.right, brick_rect.bottom), 1)
                
                # Add some texture/damage randomly
                if random.random() < 0.1:  # 10% chance for damage
                    damage_color = tuple(max(0, c - 30) for c in brick_color)
                    pygame.draw.circle(screen, damage_color,
                                     (brick_rect.x + brick_rect.width//2,
                                      brick_rect.y + brick_rect.height//2),
                                     random.randint(2, 4))
                
                x += brick_width + 2  # 2px mortar gap
            
            # Stagger next row
            row_offset = -brick_width // 2 if row_offset == 0 else 0
            y += brick_height + 2  # 2px mortar gap
    
    def check_collision(self, player_rect):
        """Check if player collides with wall"""
        return self.top_rect.colliderect(player_rect) or self.bottom_rect.colliderect(player_rect)
    
    def is_off_screen(self):
        """Check if wall is off screen"""
        return self.x + self.width < 0

class Enemy:
    """Enemy class - flies toward the player"""
    def __init__(self, x, y, config):
        self.config = config
        self.level_config = config.get_level_config()
        
        # Load and scale enemy image
        try:
            self.original_image = pygame.image.load('assets/images/enemy.png')
        except pygame.error as e:
            print(f"Error loading enemy image: {e}")
            sys.exit(1)
        self.width = 50
        self.height = 50
        self.image = pygame.transform.scale(self.original_image, (self.width, self.height))
        
        self.x = x
        self.y = y
        self.speed = self.level_config['enemy_speed']
        
        # Add some vertical movement pattern
        self.vertical_speed = random.choice([-1, 1]) * 0.5
        self.vertical_range = 50
        
        self.rect = pygame.Rect(self.x, self.y, self.width, self.height)
        self.start_y = y
    
    def update(self, player_x, player_y, config):
        """Update enemy position - moves toward player"""
        self.level_config = config.get_level_config()
        self.speed = self.level_config['enemy_speed']
        
        # Move toward player horizontally
        if self.x > player_x:
            self.x -= self.speed
        
        # Add vertical oscillation
        self.y += self.vertical_speed
        if abs(self.y - self.start_y) > self.vertical_range:
            self.vertical_speed *= -1
        
        # Keep enemy on screen vertically
        if self.y < 0:
            self.y = 0
            self.vertical_speed *= -1
        if self.y + self.height > config.screen_height:
            self.y = config.screen_height - self.height
            self.vertical_speed *= -1
        
        self.rect = pygame.Rect(self.x, self.y, self.width, self.height)
    
    def draw(self, screen):
        """Draw the enemy"""
        screen.blit(self.image, (self.x, self.y))
    
    def check_collision(self, player_rect):
        """Check if enemy collides with player"""
        return self.rect.colliderect(player_rect)
    
    def is_off_screen(self):
        """Check if enemy is off screen"""
        return self.x + self.width < 0

class Collectible:
    """Collectible class - realistic soccer ball with blood"""
    def __init__(self, x, y, config):
        self.config = config
        
        # Create realistic soccer ball collectible
        self.width = 35
        self.height = 35
        self.radius = self.width // 2
        self.center_x = self.width // 2
        self.center_y = self.height // 2
        
        # Create surface with alpha for transparency
        self.image = pygame.Surface((self.width, self.height), pygame.SRCALPHA)
        self._draw_realistic_soccer_ball()
        
        self.x = x
        self.y = y
        self.speed = config.get_level_config()['wall_speed']
        self.value = 5  # Points value
        self.collected = False
        
        # Add floating animation
        self.float_offset = 0
        self.float_speed = 0.1
        
        self.rect = pygame.Rect(self.x, self.y, self.width, self.height)
    
    def _draw_realistic_soccer_ball(self):
        """Draw a realistic soccer ball with blood splatters"""
        center = (self.center_x, self.center_y)
        radius = self.radius
        
        # Base white circle
        pygame.draw.circle(self.image, WHITE, center, radius)
        pygame.draw.circle(self.image, BLACK, center, radius, 2)
        
        # Draw classic soccer ball pattern (pentagons and hexagons)
        # Central pentagon
        pentagon_points = []
        for i in range(5):
            angle = (i * 2 * math.pi / 5) - math.pi / 2
            px = center[0] + int(radius * 0.4 * math.cos(angle))
            py = center[1] + int(radius * 0.4 * math.sin(angle))
            pentagon_points.append((px, py))
        pygame.draw.polygon(self.image, BLACK, pentagon_points, 2)
        
        # Draw hexagons around the pentagon (simplified pattern)
        for i in range(5):
            angle = (i * 2 * math.pi / 5) - math.pi / 2
            hex_center_x = center[0] + int(radius * 0.7 * math.cos(angle))
            hex_center_y = center[1] + int(radius * 0.7 * math.sin(angle))
            
            # Draw hexagon outline
            hex_points = []
            for j in range(6):
                hex_angle = (j * 2 * math.pi / 6) + angle
                hx = hex_center_x + int(radius * 0.25 * math.cos(hex_angle))
                hy = hex_center_y + int(radius * 0.25 * math.sin(hex_angle))
                hex_points.append((hx, hy))
            pygame.draw.polygon(self.image, BLACK, hex_points, 2)
        
        # Add blood splatters (dark red)
        blood_color = (150, 0, 0)  # Dark red
        blood_dark = (100, 0, 0)    # Darker red for depth
        
        # Random blood splatters
        num_splatters = random.randint(3, 6)
        for _ in range(num_splatters):
            # Random position on ball
            angle = random.uniform(0, 2 * math.pi)
            distance = random.uniform(0, radius * 0.8)
            splat_x = int(center[0] + distance * math.cos(angle))
            splat_y = int(center[1] + distance * math.sin(angle))
            
            # Draw blood splatter (irregular shape)
            splat_size = random.randint(3, 6)
            pygame.draw.circle(self.image, blood_color, (splat_x, splat_y), splat_size)
            pygame.draw.circle(self.image, blood_dark, (splat_x, splat_y), splat_size - 1)
            
            # Add some smaller droplets around main splatter
            for _ in range(random.randint(2, 4)):
                drop_angle = random.uniform(0, 2 * math.pi)
                drop_dist = random.uniform(splat_size, splat_size + 4)
                drop_x = int(splat_x + drop_dist * math.cos(drop_angle))
                drop_y = int(splat_y + drop_dist * math.sin(drop_angle))
                if (drop_x - center[0])**2 + (drop_y - center[1])**2 <= radius**2:
                    pygame.draw.circle(self.image, blood_color, (drop_x, drop_y), random.randint(1, 2))
        
        # Add some blood streaks/drips
        for _ in range(random.randint(1, 3)):
            start_angle = random.uniform(0, 2 * math.pi)
            start_dist = random.uniform(radius * 0.5, radius * 0.9)
            start_x = int(center[0] + start_dist * math.cos(start_angle))
            start_y = int(center[1] + start_dist * math.sin(start_angle))
            
            # Draw streak downward
            end_x = start_x + random.randint(-3, 3)
            end_y = start_y + random.randint(2, 5)
            
            # Ensure streak stays within ball bounds
            if (end_x - center[0])**2 + (end_y - center[1])**2 <= radius**2:
                pygame.draw.line(self.image, blood_dark, (start_x, start_y), (end_x, end_y), 2)
    
    def update(self, config):
        """Update collectible position"""
        self.speed = config.get_level_config()['wall_speed']
        self.x -= self.speed
        
        # Floating animation
        self.float_offset += self.float_speed
        if self.float_offset > 10:
            self.float_speed = -0.1
        elif self.float_offset < -10:
            self.float_speed = 0.1
        
        self.rect = pygame.Rect(self.x, self.y + self.float_offset, self.width, self.height)
    
    def draw(self, screen):
        """Draw the collectible"""
        screen.blit(self.image, (self.x, self.y + self.float_offset))
    
    def check_collision(self, player_rect):
        """Check if player collects this item"""
        return self.rect.colliderect(player_rect) and not self.collected
    
    def is_off_screen(self):
        """Check if collectible is off screen"""
        return self.x + self.width < 0

class Game:
    """Main game class"""
    def __init__(self):
        self.config = GameConfig()
        self.high_score = HighScore()
        
        self.screen = pygame.display.set_mode((self.config.screen_width, self.config.screen_height))
        pygame.display.set_caption("Murder Soccer - Apocalyptic Flappy Bird")
        
        # Load background image and remove white borders
        try:
            original_bg = pygame.image.load('assets/images/map.png')
        except pygame.error as e:
            print(f"Error loading map image: {e}")
            sys.exit(1)
        self.bg_image = self._crop_white_borders(original_bg)
        self.bg_image = pygame.transform.scale(self.bg_image, 
                                              (self.config.screen_width, self.config.screen_height))
        
        # Load sounds
        try:
            self.flap_sound = pygame.mixer.Sound('assets/sounds/flap.wav')
            self.enemy_sound = pygame.mixer.Sound('assets/sounds/enemy.wav')
            self.gameover_sound = pygame.mixer.Sound('assets/sounds/gameover.wav')
            self.bg_music = pygame.mixer.Sound('assets/sounds/bg.wav')
        except pygame.error as e:
            print(f"Warning: Error loading sound files: {e}")
            # Create dummy sounds if loading fails
            self.flap_sound = None
            self.enemy_sound = None
            self.gameover_sound = None
            self.bg_music = None
        
        # Set sound volumes
        if self.flap_sound:
            self.flap_sound.set_volume(0.3)
        if self.enemy_sound:
            self.enemy_sound.set_volume(0.2)
        if self.gameover_sound:
            self.gameover_sound.set_volume(0.4)
        if self.bg_music:
            self.bg_music.set_volume(0.2)
        
        # Game state
        self.state = "signin"  # signin, start, playing, gameover
        self.score = 0
        self.player_name = ""
        self.input_active = True
        self.clock = pygame.time.Clock()
        
        # Initialize game objects
        self.player = None
        self.walls = []
        self.enemies = []
        self.collectibles = []
        self.last_wall_time = 0
        self.last_enemy_time = 0
        self.last_collectible_time = 0
        self.collectibles_collected = 0
        
        # Fonts
        self.font_large = pygame.font.Font(None, 72)
        self.font_medium = pygame.font.Font(None, 48)
        self.font_small = pygame.font.Font(None, 36)
    
    def _crop_white_borders(self, image):
        """Remove white borders from top and bottom of image"""
        # Convert to surface with alpha if needed
        if image.get_flags() & pygame.SRCALPHA:
            surface = image
        else:
            surface = image.convert_alpha()
        
        width, height = surface.get_size()
        
        # Sample pixels instead of checking every pixel for better performance
        sample_step = max(1, width // 20)  # Sample every 20th pixel or at least 1
        
        # Find top border (first non-white row)
        top = 0
        for y in range(height):
            is_white_row = True
            for x in range(0, width, sample_step):
                pixel = surface.get_at((x, y))
                # Check if pixel is white (or very close to white)
                if pixel[0] < 250 or pixel[1] < 250 or pixel[2] < 250:
                    is_white_row = False
                    break
            if not is_white_row:
                top = y
                break
        
        # Find bottom border (last non-white row)
        bottom = height
        for y in range(height - 1, -1, -1):
            is_white_row = True
            for x in range(0, width, sample_step):
                pixel = surface.get_at((x, y))
                # Check if pixel is white (or very close to white)
                if pixel[0] < 250 or pixel[1] < 250 or pixel[2] < 250:
                    is_white_row = False
                    break
            if not is_white_row:
                bottom = y + 1
                break
        
        # Crop the image
        if top < bottom and top > 0 or bottom < height:
            cropped = surface.subsurface((0, top, width, bottom - top))
            return cropped.copy()
        else:
            return surface
    
    def reset_game(self):
        """Reset game to initial state"""
        self.state = "playing"
        self.score = 0
        self.collectibles_collected = 0
        
        # Reset player
        self.player = Player(self.config.player_start_x, self.config.player_start_y, self.config)
        self.player.game_started = False
        
        # Clear obstacles
        self.walls = []
        self.enemies = []
        self.collectibles = []
        self.last_wall_time = pygame.time.get_ticks()
        self.last_enemy_time = pygame.time.get_ticks()
        self.last_collectible_time = pygame.time.get_ticks()
        
        # Start background music
        if self.bg_music:
            self.bg_music.play(-1)  # Loop forever
    
    def spawn_wall(self):
        """Spawn a new wall"""
        level_config = self.config.get_level_config()
        spacing = level_config['wall_spacing']
        
        if len(self.walls) == 0:
            # First wall starts further away
            x = self.config.screen_width + 200
        else:
            # Subsequent walls spaced properly - find the rightmost wall
            if self.walls:
                last_wall_x = max([wall.x for wall in self.walls])
                x = last_wall_x + spacing
            else:
                x = self.config.screen_width + 200
        
        self.walls.append(Wall(x, self.config))
    
    def spawn_enemy(self):
        """Spawn a new enemy"""
        level_config = self.config.get_level_config()
        spawn_rate = level_config['enemy_spawn_rate']
        
        # Spawn from right side, random y position
        x = self.config.screen_width + 50
        y = random.randint(50, self.config.screen_height - 50)
        
        self.enemies.append(Enemy(x, y, self.config))
    
    def spawn_collectible(self):
        """Spawn a new collectible"""
        # Spawn from right side, random y position (in safe areas)
        x = self.config.screen_width + 50
        y = random.randint(100, self.config.screen_height - 100)
        
        self.collectibles.append(Collectible(x, y, self.config))
    
    def handle_events(self):
        """Handle pygame events"""
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False
            
            if event.type == pygame.KEYDOWN:
                # Handle sign-in screen text input
                if self.state == "signin":
                    if event.key == pygame.K_RETURN or event.key == pygame.K_KP_ENTER:
                        # Submit name and go to start screen (default to "Player" if empty)
                        if not self.player_name.strip():
                            self.player_name = "Player"
                        self.state = "start"
                    elif event.key == pygame.K_BACKSPACE:
                        self.player_name = self.player_name[:-1]
                    else:
                        # Add character (limit to 15 chars)
                        if len(self.player_name) < 15 and event.unicode and event.unicode.isprintable():
                            self.player_name += event.unicode
                
                elif event.key == pygame.K_SPACE:
                    if self.state == "start":
                        self.reset_game()
                    elif self.state == "playing":
                        self.player.flap(self.config)
                        if self.flap_sound:
                            self.flap_sound.play()
                    elif self.state == "gameover":
                        if self.bg_music:
                            self.bg_music.stop()
                        self.state = "start"
            
            if event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1:  # Left mouse button
                    if self.state == "start":
                        # Check if click is on start button (matches draw_start_screen button position)
                        button_rect = pygame.Rect(self.config.screen_width//2 - 100, 
                                                 self.config.screen_height - 150, 
                                                 200, 60)
                        if button_rect.collidepoint(event.pos):
                            self.reset_game()
                    elif self.state == "playing":
                        self.player.flap(self.config)
                        if self.flap_sound:
                            self.flap_sound.play()
                    elif self.state == "gameover":
                        if self.bg_music:
                            self.bg_music.stop()
                        self.state = "start"
        
        return True
    
    def update(self):
        """Update game logic"""
        if self.state != "playing":
            return
        
        current_time = pygame.time.get_ticks()
        level_config = self.config.get_level_config()
        
        # Update player
        self.player.update(self.config)
        
        # Spawn walls based on distance
        # Check if we need a new wall (when rightmost wall is close enough)
        if len(self.walls) == 0:
            self.spawn_wall()
        else:
            rightmost_wall_x = max([wall.x for wall in self.walls])
            # Spawn new wall when rightmost wall is past a certain point
            if rightmost_wall_x < self.config.screen_width - level_config['wall_spacing']:
                self.spawn_wall()
        
        # Spawn enemies
        if (current_time - self.last_enemy_time) > level_config['enemy_spawn_rate']:
            self.spawn_enemy()
            self.last_enemy_time = current_time
        
        # Spawn collectibles (every 2-4 seconds)
        if (current_time - self.last_collectible_time) > random.randint(2000, 4000):
            self.spawn_collectible()
            self.last_collectible_time = current_time
        
        # Update walls
        for wall in self.walls[:]:
            wall.update(self.config)
            
            # Check collision
            if wall.check_collision(self.player.rect):
                self.game_over()
                return
            
            # Check if passed
            if not wall.passed and wall.x + wall.width < self.player.x:
                wall.passed = True
                self.score += 1
            
            # Remove off-screen walls
            if wall.is_off_screen():
                self.walls.remove(wall)
        
        # Update enemies
        for enemy in self.enemies[:]:
            enemy.update(self.player.x, self.player.y, self.config)
            
            # Check collision
            if enemy.check_collision(self.player.rect):
                if self.enemy_sound:
                    self.enemy_sound.play()
                self.game_over()
                return
            
            # Remove off-screen enemies
            if enemy.is_off_screen():
                self.enemies.remove(enemy)
        
        # Update collectibles
        for collectible in self.collectibles[:]:
            collectible.update(self.config)
            
            # Check collision
            if collectible.check_collision(self.player.rect):
                collectible.collected = True
                self.score += collectible.value
                self.collectibles_collected += 1
                if self.flap_sound:  # Reuse flap sound for collection
                    self.flap_sound.play()
                self.collectibles.remove(collectible)
                continue
            
            # Remove off-screen collectibles
            if collectible.is_off_screen():
                self.collectibles.remove(collectible)
        
        # Check boundaries
        if self.player.y + self.player.height >= self.config.screen_height or self.player.y <= 0:
            self.game_over()
    
    def game_over(self):
        """Handle game over"""
        self.state = "gameover"
        if self.bg_music:
            self.bg_music.stop()
        if self.gameover_sound:
            self.gameover_sound.play()
        
        # Save score with player name
        is_new_high = self.high_score.add_score(self.player_name, self.score)
        if is_new_high:
            print(f"New high score: {self.score} by {self.player_name}!")
    
    def draw_signin_screen(self):
        """Draw the sign-in screen"""
        self.screen.blit(self.bg_image, (0, 0))
        
        # Title
        title_text = self.font_large.render("ENTER YOUR NAME", True, RED)
        title_rect = title_text.get_rect(center=(self.config.screen_width//2, self.config.screen_height//2 - 150))
        self.screen.blit(title_text, title_rect)
        
        # Player name input box
        input_box = pygame.Rect(self.config.screen_width//2 - 150, self.config.screen_height//2 - 50, 300, 50)
        pygame.draw.rect(self.screen, WHITE, input_box)
        pygame.draw.rect(self.screen, BLACK, input_box, 3)
        
        # Display player name with cursor
        display_name = self.player_name
        if self.input_active:
            # Blinking cursor
            if int(pygame.time.get_ticks() / 500) % 2:
                display_name += "_"
        
        name_text = self.font_medium.render(display_name if display_name else "Enter name...", True, BLACK)
        name_rect = name_text.get_rect(center=input_box.center)
        self.screen.blit(name_text, name_rect)
        
        # Instructions
        inst_text = self.font_small.render("Press ENTER to continue", True, WHITE)
        inst_rect = inst_text.get_rect(center=(self.config.screen_width//2, self.config.screen_height//2 + 50))
        self.screen.blit(inst_text, inst_rect)
        
        # Show current player name
        if self.player_name:
            player_text = self.font_small.render(f"Playing as: {self.player_name}", True, GREEN)
            player_rect = player_text.get_rect(center=(self.config.screen_width//2, self.config.screen_height//2 + 100))
            self.screen.blit(player_text, player_rect)
    
    def draw_start_screen(self):
        """Draw the start screen"""
        self.screen.blit(self.bg_image, (0, 0))
        
        # Title
        title_text = self.font_large.render("MURDER SOCCER", True, RED)
        title_rect = title_text.get_rect(center=(self.config.screen_width//2, 80))
        self.screen.blit(title_text, title_rect)
        
        # Subtitle
        subtitle_text = self.font_medium.render("Apocalyptic Flappy Bird", True, WHITE)
        subtitle_rect = subtitle_text.get_rect(center=(self.config.screen_width//2, 130))
        self.screen.blit(subtitle_text, subtitle_rect)
        
        # Player name display
        if self.player_name:
            player_text = self.font_small.render(f"Player: {self.player_name}", True, GREEN)
            player_rect = player_text.get_rect(center=(self.config.screen_width//2, 170))
            self.screen.blit(player_text, player_rect)
        
        # Leaderboard
        leaderboard = self.high_score.get_top_scores(5)
        if leaderboard:
            leaderboard_title = self.font_medium.render("LEADERBOARD", True, ORANGE)
            leaderboard_title_rect = leaderboard_title.get_rect(center=(self.config.screen_width//2, 220))
            self.screen.blit(leaderboard_title, leaderboard_title_rect)
            
            y_offset = 260
            for i, entry in enumerate(leaderboard):
                rank_text = f"{i+1}. {entry['name'][:12]:12s} - {entry['score']}"
                entry_text = self.font_small.render(rank_text, True, WHITE)
                entry_rect = entry_text.get_rect(center=(self.config.screen_width//2, y_offset))
                self.screen.blit(entry_text, entry_rect)
                y_offset += 30
        
        # Start button
        button_rect = pygame.Rect(self.config.screen_width//2 - 100, self.config.screen_height - 150, 200, 60)
        pygame.draw.rect(self.screen, GREEN, button_rect)
        pygame.draw.rect(self.screen, WHITE, button_rect, 3)
        
        start_text = self.font_medium.render("START", True, BLACK)
        start_rect = start_text.get_rect(center=button_rect.center)
        self.screen.blit(start_text, start_rect)
        
        # Instructions
        inst_text = self.font_small.render("Press SPACE or Click to Flap", True, WHITE)
        inst_rect = inst_text.get_rect(center=(self.config.screen_width//2, self.config.screen_height - 70))
        self.screen.blit(inst_text, inst_rect)
    
    def draw_gameover_screen(self):
        """Draw the game over screen"""
        self.screen.blit(self.bg_image, (0, 0))
        
        # Game Over text
        gameover_text = self.font_large.render("GAME OVER", True, RED)
        gameover_rect = gameover_text.get_rect(center=(self.config.screen_width//2, 80))
        self.screen.blit(gameover_text, gameover_rect)
        
        # Score
        score_text = self.font_medium.render(f"Score: {self.score}", True, WHITE)
        score_rect = score_text.get_rect(center=(self.config.screen_width//2, 140))
        self.screen.blit(score_text, score_rect)
        
        # Collectibles collected
        collect_text = self.font_small.render(f"Collectibles: {self.collectibles_collected}", True, GREEN)
        collect_rect = collect_text.get_rect(center=(self.config.screen_width//2, 180))
        self.screen.blit(collect_text, collect_rect)
        
        # Leaderboard
        leaderboard = self.high_score.get_top_scores(5)
        if leaderboard:
            leaderboard_title = self.font_medium.render("LEADERBOARD", True, ORANGE)
            leaderboard_title_rect = leaderboard_title.get_rect(center=(self.config.screen_width//2, 240))
            self.screen.blit(leaderboard_title, leaderboard_title_rect)
            
            y_offset = 280
            for i, entry in enumerate(leaderboard):
                rank_text = f"{i+1}. {entry['name'][:12]:12s} - {entry['score']}"
                # Highlight current player's score if in top 5
                color = GREEN if entry['name'] == self.player_name and entry['score'] == self.score else WHITE
                entry_text = self.font_small.render(rank_text, True, color)
                entry_rect = entry_text.get_rect(center=(self.config.screen_width//2, y_offset))
                self.screen.blit(entry_text, entry_rect)
                y_offset += 30
        
        # Restart instruction
        restart_text = self.font_small.render("Press SPACE to return to menu", True, WHITE)
        restart_rect = restart_text.get_rect(center=(self.config.screen_width//2, self.config.screen_height - 50))
        self.screen.blit(restart_text, restart_rect)
    
    def draw(self):
        """Draw everything"""
        if self.state == "signin":
            self.draw_signin_screen()
        elif self.state == "start":
            self.draw_start_screen()
        elif self.state == "gameover":
            self.draw_gameover_screen()
        elif self.state == "playing":
            # Draw background
            self.screen.blit(self.bg_image, (0, 0))
            
            # Draw walls
            for wall in self.walls:
                wall.draw(self.screen)
            
            # Draw collectibles
            for collectible in self.collectibles:
                collectible.draw(self.screen)
            
            # Draw enemies
            for enemy in self.enemies:
                enemy.draw(self.screen)
            
            # Draw player
            self.player.draw(self.screen)
            
            # Draw score
            score_text = self.font_medium.render(f"Score: {self.score}", True, WHITE)
            self.screen.blit(score_text, (20, 20))
            
            # Draw collectibles count
            collect_text = self.font_small.render(f"Collectibles: {self.collectibles_collected}", True, GREEN)
            self.screen.blit(collect_text, (20, 60))
            
            # Draw high score
            hs_text = self.font_small.render(f"High Score: {self.high_score.high_score}", True, ORANGE)
            self.screen.blit(hs_text, (20, 90))
        
        pygame.display.flip()
    
    def run(self):
        """Main game loop"""
        running = True
        
        while running:
            running = self.handle_events()
            self.update()
            self.draw()
            self.clock.tick(60)  # 60 FPS
        
        pygame.quit()

if __name__ == "__main__":
    game = Game()
    game.run()

