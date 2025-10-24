// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Audio context and sounds
let audioContext;
let sounds = {};
let soundEnabled = true;

// Initialize audio
function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        createSounds();
    } catch (e) {
        console.log('Web Audio API not supported');
    }
}

// Create sound effects using Web Audio API
function createSounds() {
    // Jump sound
    sounds.jump = createTone(800, 0.1, 'sine');
    
    // Collision sound
    sounds.collision = createTone(200, 0.3, 'sawtooth');
    
    // Background music (simple melody)
    sounds.background = createBackgroundMusic();
}

// Create a tone
function createTone(frequency, duration, waveType = 'sine') {
    return function() {
        if (!audioContext) return;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        oscillator.type = waveType;
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    };
}

// Create background music
function createBackgroundMusic() {
    return function() {
        if (!audioContext) return;
        
        // Simple Mario-style melody
        const melody = [
            { freq: 523, time: 0 },    // C5
            { freq: 659, time: 0.2 },  // E5
            { freq: 784, time: 0.4 },  // G5
            { freq: 659, time: 0.6 },  // E5
            { freq: 523, time: 0.8 },  // C5
            { freq: 392, time: 1.0 },  // G4
            { freq: 440, time: 1.2 },  // A4
            { freq: 523, time: 1.4 }   // C5
        ];
        
        melody.forEach(note => {
            setTimeout(() => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(note.freq, audioContext.currentTime);
                oscillator.type = 'square';
                
                gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.2);
            }, note.time * 1000);
        });
    };
}

// Play sound effect
function playSound(soundName) {
    if (sounds[soundName] && audioContext && soundEnabled) {
        try {
            sounds[soundName]();
        } catch (e) {
            console.log('Sound playback error:', e);
        }
    }
}

// Toggle sound on/off
function toggleSound() {
    soundEnabled = !soundEnabled;
    const button = document.getElementById('soundToggle');
    button.textContent = soundEnabled ? '🔊 Sound On' : '🔇 Sound Off';
}

// Game state
let gameRunning = false;
let gameSpeed = 2;
let score = 0;
let distance = 0;
let gameTime = 0;

// Mario object
const mario = {
    x: 100,
    y: 300,
    width: 32,
    height: 32,
    velocityY: 0,
    isJumping: false,
    groundY: 300,
    color: '#FF0000'
};

// Physics constants
const GRAVITY = 0.8;
const JUMP_FORCE = -22.5;
const GROUND_HEIGHT = 100;

// Obstacles array
let obstacles = [];
let obstacleSpawnTimer = 0;
const OBSTACLE_SPAWN_RATE = 120; // frames

// Leaderboard
let leaderboard = JSON.parse(localStorage.getItem('marioLeaderboard')) || [];

// Initialize game
function initGame() {
    gameRunning = true;
    score = 0;
    distance = 0;
    gameTime = 0;
    obstacles = [];
    obstacleSpawnTimer = 0;
    mario.y = mario.groundY;
    mario.velocityY = 0;
    mario.isJumping = false;
    gameSpeed = 2;
    
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('newHighScore').style.display = 'none';
    
    // Play background music
    playSound('background');
    
    updateUI();
    gameLoop();
}

// Game loop
function gameLoop() {
    if (!gameRunning) return;
    
    update();
    render();
    
    requestAnimationFrame(gameLoop);
}

// Update game state
function update() {
    if (!gameRunning) return;
    
    gameTime++;
    
    // Update Mario physics
    updateMario();
    
    // Spawn obstacles
    obstacleSpawnTimer++;
    if (obstacleSpawnTimer >= OBSTACLE_SPAWN_RATE) {
        spawnObstacle();
        obstacleSpawnTimer = 0;
    }
    
    // Update obstacles
    updateObstacles();
    
    // Check collisions
    checkCollisions();
    
    // Update score and distance
    distance += gameSpeed * 0.1;
    score = Math.floor(distance);
    
    // Increase game speed over time
    if (gameTime % 300 === 0) {
        gameSpeed += 0.2;
    }
    
    updateUI();
}

// Update Mario
function updateMario() {
    // Apply gravity
    mario.velocityY += GRAVITY;
    mario.y += mario.velocityY;
    
    // Ground collision
    if (mario.y >= mario.groundY) {
        mario.y = mario.groundY;
        mario.velocityY = 0;
        mario.isJumping = false;
    }
}

// Jump function
function jump() {
    if (!mario.isJumping && gameRunning) {
        mario.velocityY = JUMP_FORCE;
        mario.isJumping = true;
        playSound('jump');
    }
}

// Spawn obstacle
function spawnObstacle() {
    const obstacleTypes = ['pipe', 'goomba'];
    const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    
    let obstacle = {
        x: canvas.width,
        y: mario.groundY,
        width: 40,
        height: 60,
        type: type,
        color: type === 'pipe' ? '#228B22' : '#8B4513'
    };
    
    if (type === 'goomba') {
        obstacle.height = 30;
        obstacle.y = mario.groundY + 30;
    }
    
    obstacles.push(obstacle);
}

// Update obstacles
function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= gameSpeed;
        
        // Remove obstacles that are off screen
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
        }
    }
}

// Check collisions
function checkCollisions() {
    for (let obstacle of obstacles) {
        if (mario.x < obstacle.x + obstacle.width &&
            mario.x + mario.width > obstacle.x &&
            mario.y < obstacle.y + obstacle.height &&
            mario.y + mario.height > obstacle.y) {
            gameOver();
            return;
        }
    }
}

// Game over
function gameOver() {
    gameRunning = false;
    
    // Play collision sound
    playSound('collision');
    
    console.log('Game Over - Score:', score, 'Leaderboard length:', leaderboard.length);
    
    // Check if it's a new high score
    let isNewHighScore = false;
    if (leaderboard.length < 5) {
        isNewHighScore = true; // Always a high score if less than 5 entries
    } else if (leaderboard.length > 0) {
        isNewHighScore = score > leaderboard[leaderboard.length - 1].score;
    }
    
    console.log('Is new high score:', isNewHighScore);
    
    document.getElementById('finalScore').textContent = score;
    document.getElementById('finalDistance').textContent = Math.floor(distance);
    
    if (isNewHighScore) {
        document.getElementById('newHighScore').style.display = 'block';
        document.getElementById('playerName').focus();
    }
    
    document.getElementById('gameOver').style.display = 'block';
}

// Add score to leaderboard
function addToLeaderboard() {
    const playerName = document.getElementById('playerName').value.trim() || 'Anonymous';
    
    console.log('Adding score:', { name: playerName, score: score, distance: Math.floor(distance) });
    
    leaderboard.push({
        name: playerName,
        score: score,
        distance: Math.floor(distance),
        date: new Date().toLocaleDateString()
    });
    
    // Sort by score (highest first) and keep only top 5
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 5);
    
    console.log('Updated leaderboard:', leaderboard);
    
    // Save to localStorage
    localStorage.setItem('marioLeaderboard', JSON.stringify(leaderboard));
    
    updateLeaderboard();
    document.getElementById('newHighScore').style.display = 'none';
    document.getElementById('playerName').value = '';
}

// Update leaderboard display
function updateLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    
    if (leaderboard.length === 0) {
        list.innerHTML = '<li>No scores yet</li>';
        return;
    }
    
    leaderboard.forEach((entry, index) => {
        const li = document.createElement('li');
        li.innerHTML = `${entry.name}: ${entry.score} (${entry.distance}m)`;
        list.appendChild(li);
    });
}

// Render game
function render() {
    // Clear canvas
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, mario.groundY + mario.height, canvas.width, GROUND_HEIGHT);
    
    // Draw Mario
    drawMario();
    
    // Draw obstacles
    drawObstacles();
    
    // Draw clouds
    drawClouds();
}

// Draw Mario
function drawMario() {
    // Draw Mario's body (red shirt)
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(mario.x + 8, mario.y + 20, mario.width - 16, 12);
    
    // Draw Mario's hat (red with white M)
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(mario.x + 4, mario.y - 8, mario.width - 8, 8);
    
    // Draw white M on hat
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(mario.x + 12, mario.y - 6, 8, 4);
    ctx.fillRect(mario.x + 14, mario.y - 8, 4, 2);
    ctx.fillRect(mario.x + 16, mario.y - 4, 2, 2);
    
    // Draw Mario's blue overalls
    ctx.fillStyle = '#0000FF';
    ctx.fillRect(mario.x + 6, mario.y + 24, mario.width - 12, 8);
    
    // Draw overall straps
    ctx.fillStyle = '#0000FF';
    ctx.fillRect(mario.x + 8, mario.y + 20, 4, 8);
    ctx.fillRect(mario.x + 20, mario.y + 20, 4, 8);
    
    // Draw Mario's face (skin tone)
    ctx.fillStyle = '#FFDBAC';
    ctx.fillRect(mario.x + 8, mario.y + 4, mario.width - 16, 16);
    
    // Draw Mario's large nose
    ctx.fillStyle = '#FFDBAC';
    ctx.fillRect(mario.x + 14, mario.y + 8, 4, 4);
    
    // Draw eyes (small black dots)
    ctx.fillStyle = '#000000';
    ctx.fillRect(mario.x + 12, mario.y + 6, 2, 2);
    ctx.fillRect(mario.x + 18, mario.y + 6, 2, 2);
    
    // Draw mustache (brown, wider)
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(mario.x + 12, mario.y + 12, 8, 2);
    
    // Draw brown shoes
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(mario.x + 6, mario.y + 32, 8, 4);
    ctx.fillRect(mario.x + 18, mario.y + 32, 8, 4);
    
    // Draw white gloves
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(mario.x + 2, mario.y + 20, 4, 4);
    ctx.fillRect(mario.x + 26, mario.y + 20, 4, 4);
}

// Draw obstacles
function drawObstacles() {
    obstacles.forEach(obstacle => {
        ctx.fillStyle = obstacle.color;
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        if (obstacle.type === 'pipe') {
            // Draw pipe details
            ctx.fillStyle = '#006400';
            ctx.fillRect(obstacle.x + 5, obstacle.y, obstacle.width - 10, obstacle.height);
            
            // Draw pipe top
            ctx.fillStyle = '#32CD32';
            ctx.fillRect(obstacle.x, obstacle.y - 10, obstacle.width, 10);
        } else if (obstacle.type === 'goomba') {
            // Draw goomba details
            ctx.fillStyle = '#654321';
            ctx.fillRect(obstacle.x + 5, obstacle.y, obstacle.width - 10, obstacle.height);
            
            // Draw eyes
            ctx.fillStyle = '#000000';
            ctx.fillRect(obstacle.x + 10, obstacle.y + 5, 3, 3);
            ctx.fillRect(obstacle.x + 22, obstacle.y + 5, 3, 3);
            
            // Draw angry eyebrows
            ctx.fillStyle = '#8B0000';
            ctx.fillRect(obstacle.x + 8, obstacle.y + 2, 8, 2);
            ctx.fillRect(obstacle.x + 20, obstacle.y + 2, 8, 2);
        }
    });
}

// Draw clouds
function drawClouds() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    
    // Draw some simple clouds
    for (let i = 0; i < 3; i++) {
        const x = (i * 300 + (gameTime * 0.5)) % (canvas.width + 100) - 50;
        const y = 50 + i * 30;
        
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.arc(x + 25, y, 25, 0, Math.PI * 2);
        ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Update UI
function updateUI() {
    document.getElementById('score').textContent = score;
    document.getElementById('distance').textContent = Math.floor(distance);
}

// Restart game
function restartGame() {
    initGame();
}

// Reset leaderboard
function resetLeaderboard() {
    if (confirm('Are you sure you want to reset all scores?')) {
        leaderboard = [];
        localStorage.removeItem('marioLeaderboard');
        updateLeaderboard();
    }
}

// Event listeners
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        jump();
    }
});

canvas.addEventListener('click', jump);

document.getElementById('playerName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addToLeaderboard();
    }
});

// Initialize everything
initAudio();
updateLeaderboard();
initGame();
