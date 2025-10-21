// ======= ELEMENTS =======
const game = document.getElementById("game");
const world = document.getElementById("world");
const player = document.getElementById("player");
const playerSprite = document.getElementById("playerSprite");
const guards = document.querySelectorAll(".guard");
const scoreBoard = document.getElementById("scoreBoard");
const overlay = document.getElementById("overlay");
const overlayMessage = document.getElementById("overlayMessage");
const leaderboardEl = document.getElementById("leaderboard");

const API_URL = "https://68d6429fc2a1754b426a1035.mockapi.io/score";

// ======= GAME VARIABLES =======
const step = 6; 
const lineSpacing = 150;
const totalLines = 5;
let playerX = 180;
let playerY;
let score = 0;
let lastLineCrossed;
let gameRunning = false;
let goingUp = true;
let checkpointReached = false;
let guardAnimation;
let inputLocked = false;
let modalWasRunning = false;

// Track key states
const keys = {};

// ======= INITIALIZE GAME =======
function initGame() {
  playerX = 225;
  playerY = 790;
  lastLineCrossed = totalLines + 1;
  score = 0;
  goingUp = true;
  checkpointReached = false;
  scoreBoard.textContent = "Score: 0";
  updatePlayerPosition();
}

// ======= START GAME =======
function startGame() {
  if (gameRunning) return;
  gameRunning = true;
  initGame();
  game.classList.add("zoomed");
  moveGuards();
}

// ======= OPENING SCREEN START =======
function startOpening() {
  document.getElementById("openingScreen").style.display = "none";
  startGame();
}

// ======= PLAYER INPUT =======
document.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
});

document.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

// ======= PLAYER CONTINUOUS MOVEMENT =======
function movePlayer() {
  if (gameRunning && !inputLocked) {
    if ((keys["arrowup"] || keys["w"]) && playerY > 0) {
      playerY -= step;
      playerSprite.className = "Character_spritesheet pixelart face-up";
    }
    if ((keys["arrowdown"] || keys["s"]) && playerY < world.offsetHeight - player.offsetHeight) {
      playerY += step;
      playerSprite.className = "Character_spritesheet pixelart face-down";
    }
    if ((keys["arrowleft"] || keys["a"]) && playerX > 0) {
      playerX -= step;
      playerSprite.className = "Character_spritesheet pixelart face-left";
    }
    if ((keys["arrowright"] || keys["d"]) && playerX < game.offsetWidth - player.offsetWidth) {
      playerX += step;
      playerSprite.className = "Character_spritesheet pixelart face-right";
    }

    updatePlayerPosition();
    checkCollision();
    checkWin();
  }
  requestAnimationFrame(movePlayer);
}
requestAnimationFrame(movePlayer);

// ======= UPDATE PLAYER =======
function updatePlayerPosition() {
  player.style.left = playerX + "px";
  player.style.top = playerY + "px";
  updateCamera();
  updateScore();
}

// ======= CAMERA FOLLOW =======
function updateCamera() {
  let offset = playerY - game.offsetHeight / 2 + player.offsetHeight / 2;
  offset = Math.max(0, Math.min(offset, world.offsetHeight - game.offsetHeight));
  world.style.transform = `translateY(-${offset}px)`;
}

// ======= SCORE SYSTEM =======
function updateScore() {
  const playerRect = player.getBoundingClientRect();
  const checkpoint = document.querySelector(".zone.checkpoint");
  const checkpointRect = checkpoint.getBoundingClientRect();

  // Detect actual overlap between player and checkpoint zone
  const touchingCheckpoint =
    playerRect.left < checkpointRect.right &&
    playerRect.right > checkpointRect.left &&
    playerRect.top < checkpointRect.bottom &&
    playerRect.bottom > checkpointRect.top;

  if (goingUp) {
    // ✅ If player touches checkpoint, stop upward scoring immediately
    if (touchingCheckpoint) {
      checkpointReached = true;
      goingUp = false;
      lastLineCrossed = 0;
      return;
    }

    // Count lines only before reaching checkpoint
    for (let i = totalLines; i >= 1; i--) {
      let lineTop = i * lineSpacing;
      if (playerY + player.offsetHeight < lineTop && lastLineCrossed > i) {
        score++;
        scoreBoard.textContent = "Score: " + score;
        lastLineCrossed = i;
      }
    }
  } 
  else if (checkpointReached) {
    // Downward scoring (after touching checkpoint)
    for (let i = 1; i <= totalLines; i++) {
      let lineTop = i * lineSpacing;
      if (playerY > lineTop && lastLineCrossed < i) {
        score++;
        scoreBoard.textContent = "Score: " + score;
        lastLineCrossed = i;
      }
    }
  }
}

// ======= GUARDS MOVEMENT =======
function moveGuards() {
  if (!gameRunning) return;
  const baseSpeed = 1.5;
  const speed = baseSpeed + score * 0.4;

  guards.forEach((guard) => {
    let gX = parseInt(guard.style.left);
    const gY = parseInt(guard.style.top);
    const sprite = guard.querySelector(".Character_spritesheet");

    if (gX < playerX) {
      gX += speed;
      sprite.className = "Character_spritesheet pixelart face-right";
    } else if (gX > playerX) {
      gX -= speed;
      sprite.className = "Character_spritesheet pixelart face-left";
    }

    gX = Math.max(0, Math.min(gX, game.offsetWidth - guard.offsetWidth));
    guard.style.left = gX + "px";
  });

  checkCollision();
  guardAnimation = requestAnimationFrame(moveGuards);
}

// ======= COLLISION DETECTION =======
function checkCollision() {
  const pW = player.offsetWidth;
  const pH = player.offsetHeight;

  guards.forEach((guard) => {
    const gX = parseInt(guard.style.left);
    const gY = parseInt(guard.style.top);
    const gW = guard.offsetWidth;
    const gH = guard.offsetHeight;
    const shrinkX = 20, shrinkY = 15;

    if (
      !(
        playerX + pW - shrinkX < gX + shrinkX ||
        playerX + shrinkX > gX + gW - shrinkX ||
        playerY + pH - shrinkY < gY + shrinkY ||
        playerY + shrinkY > gY + gH - shrinkY
      )
    ) {
      endGame("❌ You got tagged! Game Over.");
    }
  });
}

// ======= WIN CONDITION =======
function checkWin() {
  if (!goingUp && checkpointReached && playerY >= 790) {
    endGame("🎉 You Win!");
  }
}

// ======= END GAME =======
function endGame(message) {
  gameRunning = false;
  cancelAnimationFrame(guardAnimation);
  overlayMessage.textContent = `${message} Final Score: ${score}`;
  overlay.classList.remove("hidden");
}

// ======= SUBMIT SCORE =======
async function submitScore() {
  const playerName = document.getElementById("playerName").value.trim();
  if (!playerName) return alert("Enter your name!");

  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: playerName, score }),
    });
    fetchLeaderboard();
    document.getElementById("playerName").value = "";
    overlay.classList.add("hidden");
    restartGame();
  } catch (error) {
    console.error("Error submitting score:", error);
    alert("Could not submit score. Please try again.");
  }
}

// ======= LEADERBOARD =======
async function fetchLeaderboard() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    const sorted = data.sort((a, b) => b.score - a.score).slice(0, 5);

    leaderboardEl.innerHTML = "";
    sorted.forEach((entry) => {
      const li = document.createElement("li");
      li.textContent = `${entry.name}: ${entry.score}`;
      leaderboardEl.appendChild(li);
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    leaderboardEl.innerHTML = "<li>Unable to load leaderboard.</li>";
  }
}

// ======= RESTART GAME =======
function restartGame() {
  overlay.classList.add("hidden");
  initGame();
  startGame();
}

// ======= LEADERBOARD MODAL =======
const leaderboardBtn = document.getElementById("leaderboardBtn");
const leaderboardModal = document.getElementById("leaderboardModal");
const closeModal = document.getElementById("closeModal");

leaderboardBtn.addEventListener("click", () => {
  modalWasRunning = gameRunning;
  if (gameRunning) {
    gameRunning = false;
    cancelAnimationFrame(guardAnimation);
  }
  inputLocked = true;

  fetchLeaderboard();
  leaderboardModal.classList.remove("hidden");
});

closeModal.addEventListener("click", closeLeaderboard);
leaderboardModal.addEventListener("click", (e) => {
  if (e.target === leaderboardModal) closeLeaderboard();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !leaderboardModal.classList.contains("hidden")) {
    closeLeaderboard();
  }
});

function closeLeaderboard() {
  leaderboardModal.classList.add("hidden");
  inputLocked = false;
  if (modalWasRunning) {
    gameRunning = true;
    moveGuards();
  }
}

// ======= REFRESH LEADERBOARD EVERY 5s =======
setInterval(() => {
  if (!leaderboardModal.classList.contains("hidden")) {
    fetchLeaderboard();
  }
}, 5000);

// ======= INITIAL LEADERBOARD LOAD =======
fetchLeaderboard();
