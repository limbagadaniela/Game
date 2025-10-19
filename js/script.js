const game = document.getElementById("game");
const world = document.getElementById("world");
const player = document.getElementById("player");
const playerSprite = document.getElementById("playerSprite");
const guards = document.querySelectorAll(".guard");
const scoreBoard = document.getElementById("scoreBoard");
const overlay = document.getElementById("overlay");
const overlayMessage = document.getElementById("overlayMessage");
const leaderboardEl = document.getElementById("leaderboard");

const step = 20;
const lineSpacing = 150;
const totalLines = 5;
const guardDirections = [2, -2, 2, -2, 2];
const API_URL = "https://68d6429fc2a1754b426a1035.mockapi.io/score";

let playerX = 180;
let playerY;
let score = 0;
let lastLineCrossed;
let gameRunning = false;
let goingUp = true;
let checkpointReached = false;
let guardAnimation;

// -------- INIT --------
function initGame() {
  playerX = 180;
  playerY = 790;
  lastLineCrossed = totalLines + 1;
  score = 0;
  goingUp = true;
  checkpointReached = false;
  scoreBoard.textContent = "Score: 0";
  updatePlayerPosition();
}

// -------- START GAME --------
function startGame() {
  if (gameRunning) return;
  gameRunning = true;
  initGame();
  game.classList.add("zoomed");
  moveGuards();
}

// -------- OPENING START --------
function startOpening() {
  document.getElementById("openingScreen").style.display = "none";
  startGame();
}

// -------- PLAYER MOVEMENT --------
let inputLocked = false; // used to lock input when modal open
// -------- PLAYER MOVEMENT (Supports Arrow Keys + WASD) --------
document.addEventListener("keydown", (e) => {
  if (!gameRunning || inputLocked) return;
  let key = e.key.toLowerCase();

  if ((key === "arrowup" || key === "w") && playerY > 0) {
    playerY -= step;
    playerSprite.className = "Character_spritesheet pixelart face-up";
  }
  if ((key === "arrowdown" || key === "s") && playerY < world.offsetHeight - player.offsetHeight) {
    playerY += step;
    playerSprite.className = "Character_spritesheet pixelart face-down";
  }
  if ((key === "arrowleft" || key === "a") && playerX > 0) {
    playerX -= step;
    playerSprite.className = "Character_spritesheet pixelart face-left";
  }
  if ((key === "arrowright" || key === "d") && playerX < game.offsetWidth - player.offsetWidth) {
    playerX += step;
    playerSprite.className = "Character_spritesheet pixelart face-right";
  }

  updatePlayerPosition();
  checkCollision();
  checkWin();
});


// -------- UPDATE PLAYER --------
function updatePlayerPosition() {
  player.style.left = playerX + "px";
  player.style.top = playerY + "px";
  updateCamera();
  updateScore();
}

// -------- CAMERA --------
function updateCamera() {
  let offset = playerY - game.offsetHeight / 2 + player.offsetHeight / 2;
  if (offset < 0) offset = 0;
  if (offset > world.offsetHeight - game.offsetHeight)
    offset = world.offsetHeight - game.offsetHeight;
  world.style.transform = `translateY(-${offset}px)`;
}

// -------- SCORE --------
function updateScore() {
  if (goingUp) {
    for (let i = totalLines; i >= 1; i--) {
      let lineTop = i * lineSpacing;
      if (playerY <= lineTop && lastLineCrossed > i) {
        score++;
        scoreBoard.textContent = "Score: " + score;
        lastLineCrossed = i;
      }
    }
    if (playerY <= 50) {
      checkpointReached = true;
      goingUp = false;
      lastLineCrossed = 0;
    }
  } else {
    if (checkpointReached) {
      for (let i = 1; i <= totalLines; i++) {
        let lineTop = i * lineSpacing;
        if (playerY >= lineTop && lastLineCrossed < i) {
          score++;
          scoreBoard.textContent = "Score: " + score;
          lastLineCrossed = i;
        }
      }
    }
  }
}

// -------- GUARD MOVEMENT --------
function moveGuards() {
  if (!gameRunning) return;

  // Base speed + difficulty scaling with score
  const baseSpeed = 1.5;
  const speed = baseSpeed + score * 0.4; // Each score slightly increases guard speed

  guards.forEach((guard) => {
    let gX = parseInt(guard.style.left);
    const gY = parseInt(guard.style.top);
    const sprite = guard.querySelector(".Character_spritesheet");

    // Move horizontally toward player
    if (gX < playerX) {
      gX += speed;
      sprite.className = "Character_spritesheet pixelart face-right";
    } else if (gX > playerX) {
      gX -= speed;
      sprite.className = "Character_spritesheet pixelart face-left";
    }

    // Keep guards within game bounds
    if (gX < 0) gX = 0;
    if (gX > game.offsetWidth - guard.offsetWidth)
      gX = game.offsetWidth - guard.offsetWidth;

    guard.style.left = gX + "px";
  });

  checkCollision();
  guardAnimation = requestAnimationFrame(moveGuards);
}


// -------- COLLISION --------
function checkCollision() {
  const pW = player.offsetWidth;
  const pH = player.offsetHeight;
  guards.forEach((guard) => {
    const gX = parseInt(guard.style.left);
    const gY = parseInt(guard.style.top);
    const gW = guard.offsetWidth;
    const gH = guard.offsetHeight;
    const shrinkX = 20,
      shrinkY = 15;
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

// -------- WIN CONDITION --------
function checkWin() {
  if (!goingUp && checkpointReached && playerY >= 790) {
    endGame("🎉 You Win!");
  }
}

// -------- END GAME --------
function endGame(message) {
  gameRunning = false;
  cancelAnimationFrame(guardAnimation);
  overlayMessage.textContent = message + ` Final Score: ${score}`;
  overlay.classList.remove("hidden");
}

// -------- SUBMIT SCORE --------
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
    overlay.classList.add("hidden"); // ✅ close form after submit
    restartGame(); // ✅ auto restart after submit
  } catch (error) {
    console.error("Error submitting score:", error);
    alert("Could not submit score. Please try again.");
  }
}

document.querySelector(".start-btn").addEventListener("mouseover", () => {
  console.log("Hovered Start Button");
});

document.querySelector(".start-btn").addEventListener("mouseout", () => {
  console.log("Mouse Left Start Button");
});

document.getElementById("playerName").addEventListener("focus", () => {
  console.log("Player Name Input Focused");
});

document.getElementById("playerName").addEventListener("blur", () => {
  console.log("Player Name Input Unfocused");
});

// -------- FETCH LEADERBOARD --------
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

// -------- RESTART --------
function restartGame() {
  overlay.classList.add("hidden");
  initGame();
  startGame();
}

// -------- AUTO REFRESH LEADERBOARD WHEN MODAL OPEN --------
let modalWasRunning = false;
const leaderboardBtn = document.getElementById("leaderboardBtn");
const leaderboardModal = document.getElementById("leaderboardModal");
const closeModal = document.getElementById("closeModal");

leaderboardBtn.addEventListener("click", () => {
  // pause game if running and lock input
  modalWasRunning = gameRunning;
  if (gameRunning) {
    gameRunning = false;
    cancelAnimationFrame(guardAnimation);
  }
  inputLocked = true;

  fetchLeaderboard();
  leaderboardModal.classList.remove("hidden");
});

// close handlers
closeModal.addEventListener("click", () => {
  leaderboardModal.classList.add("hidden");
  inputLocked = false;
  if (modalWasRunning) {
    gameRunning = true;
    moveGuards();
  }
});
leaderboardModal.addEventListener("click", (e) => {
  if (e.target === leaderboardModal) {
    leaderboardModal.classList.add("hidden");
    inputLocked = false;
    if (modalWasRunning) {
      gameRunning = true;
      moveGuards();
    }
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !leaderboardModal.classList.contains("hidden")) {
    leaderboardModal.classList.add("hidden");
    inputLocked = false;
    if (modalWasRunning) {
      gameRunning = true;
      moveGuards();
    }
  }
});

// refresh leaderboard every 5s only while modal is open
setInterval(() => {
  if (!leaderboardModal.classList.contains("hidden")) {
    fetchLeaderboard();
  }
}, 5000);

// initial leaderboard fetch (does not open modal)
fetchLeaderboard();

