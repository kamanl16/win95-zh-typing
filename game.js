// game.js

// 1. Vocabulary Library (Most common traditional Chinese characters)
const COMMON_CHARS_STRING = "的一是在不了有和人這中大為上個國我以要他時來用們生到作地於出就分對成會可主發年動同工也能下過子說產種面而方後多定行學法所民得經十三之進著等部度家電力裡如水化高自二理起小物現實加量都兩體制機當使點從業本去把性好應開它合還因由其些然前外天政四日那社義事平形相全表間樣與關各重新線內數正心反你明看原又麼利比或但質氣第向道命此正交件建及基認備統參與必手統求見期斷處受百政統長文並管部知區展法資果指軍則保建此計先更設決領無度明制入向海由被接其組任設信華確件及則或果並由位各受展但平與管內期理更軍無進先將理長此明心指文相由相但統向期部進相管管但但平明";
const VOCABULARY = Array.from(new Set(COMMON_CHARS_STRING.split(""))); // Unique chars

// 2. DOM Elements
const canvas = document.getElementById("game-canvas");
const scoreDisplay = document.getElementById("score-display");
const livesDisplay = document.getElementById("lives-display");
const imeInput = document.getElementById("ime-input");
const startBtn = document.getElementById("start-btn");
const gameOverScreen = document.getElementById("game-over-screen");
const finalScoreDisplay = document.getElementById("final-score");
const restartBtn = document.getElementById("restart-btn");
const lastTypedDisplay = document.getElementById("last-typed-display");

// 3. Game State
let score = 0;
let lives = 5;
let isPlaying = false;
let activeCharacters = []; // Array to track falling DOM nodes and their coordinates
let stackedBlocks = []; // Array of arrays to track stacked blocks by column
let numColumns = 0;
const COLUMN_WIDTH = 36;
const BLOCK_HEIGHT = 36;
let lastSpawnTime = 0;
let animationFrameId = null;
let fallSpeed = 1; // Pixels per frame
let spawnInterval = 1500; // ms

// 4. Audio Engine (Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playMotherboardBeep() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'square'; // Raw square wave for retro beep
    oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // 440 Hz (A4)

    // Quick attack and release for a harsh electronic beep
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.15);
}

// 5. Input Handling Pipeline
let isComposing = false;

imeInput.addEventListener("compositionstart", () => {
    isComposing = true;
});

imeInput.addEventListener("compositionend", (e) => {
    isComposing = false;
    processInput(imeInput.value || e.data);
});

imeInput.addEventListener("input", (e) => {
    if (!isPlaying) {
        imeInput.value = "";
        return;
    }

    // If the browser is in the middle of composing a character (IME), ignore input events.
    if (e.isComposing || isComposing) {
        return;
    }

    processInput(e.target.value);
});

function processInput(text) {
    if (!text) return;
    const inputValue = text.trim();

    if (inputValue.length > 0) {
        const charToMatch = inputValue[inputValue.length - 1]; // Get the latest committed character
        if (lastTypedDisplay) lastTypedDisplay.textContent = charToMatch;
        let matched = false;

        // Check against active falling characters (lowest first would be better, but we can just check all)
        for (let i = 0; i < activeCharacters.length; i++) {
            if (activeCharacters[i].char === charToMatch) {
                // Match found!
                destroyCharacter(i);
                score += 10;
                updateDisplays();
                matched = true;
                break; // Only destroy one per keystroke
            }
        }

        // Check stacked characters (only uppermost block of each column)
        if (!matched) {
            for (let c = 0; c < numColumns; c++) {
                const column = stackedBlocks[c];
                if (column && column.length > 0) {
                    const topBlockIndex = column.length - 1;
                    const topBlock = column[topBlockIndex];
                    if (topBlock.char === charToMatch) {
                        playDestroyAnimation(topBlock.element);
                        column.pop();
                        score += 10;
                        updateDisplays();
                        matched = true;
                        break;
                    }
                }
            }
        }
    }

    // Clear the buffer instantly to wait for next input
    imeInput.value = "";
}

// Force focus on input when clicking anywhere in the app window
document.getElementById("app-window").addEventListener("click", () => {
    if (isPlaying) {
        imeInput.focus();
    }
});

// 6. Game Logic
function spawnCharacter(timestamp) {
    if (timestamp - lastSpawnTime > spawnInterval) {
        const char = VOCABULARY[Math.floor(Math.random() * VOCABULARY.length)];

        const div = document.createElement("div");
        div.className = "falling-char";
        div.textContent = char;

        // Align horizontal position to columns
        const colIndex = Math.floor(Math.random() * numColumns);
        const leftPos = colIndex * COLUMN_WIDTH;

        div.style.left = `${leftPos}px`;
        div.style.top = `0px`; // Start at top
        div.style.width = `${COLUMN_WIDTH}px`;
        div.style.textAlign = 'center';

        canvas.appendChild(div);

        activeCharacters.push({
            char: char,
            element: div,
            y: 0,
            colIndex: colIndex
        });

        lastSpawnTime = timestamp;
    }
}

function playDestroyAnimation(element) {
    // Draw a red line crossing it out
    const redLine = document.createElement('div');
    redLine.style.position = 'absolute';
    redLine.style.top = '50%';
    redLine.style.left = '4px';
    redLine.style.width = 'calc(100% - 8px)';
    redLine.style.height = '2px';
    redLine.style.backgroundColor = '#ff0000';
    redLine.style.zIndex = '5';
    element.appendChild(redLine);
    
    // Float upwards and vanish gradually
    element.style.transition = "top 1s linear, opacity 1s linear";
    
    setTimeout(() => {
        const currentTop = parseInt(element.style.top, 10) || 0;
        element.style.top = `${currentTop - 40}px`;
        element.style.opacity = "0";
    }, 10);
    
    // Remove after the animation finishes
    setTimeout(() => {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }, 1000);
}

function destroyCharacter(index) {
    const charObj = activeCharacters[index];
    if (charObj && charObj.element) {
        playDestroyAnimation(charObj.element);
    }
    activeCharacters.splice(index, 1);
}

function updateDisplays() {
    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
}

function triggerGameOver() {
    isPlaying = false;
    cancelAnimationFrame(animationFrameId);
    gameOverScreen.classList.remove("hidden");
    finalScoreDisplay.textContent = score;
    imeInput.blur();
}

function gameLoop(timestamp) {
    if (!isPlaying) return;

    spawnCharacter(timestamp);

    const canvasRect = canvas.getBoundingClientRect();

    // Iterate backwards to allow safe removal from array
    for (let i = activeCharacters.length - 1; i >= 0; i--) {
        let charObj = activeCharacters[i];

        // Increase Y coordinate
        charObj.y += fallSpeed;
        charObj.element.style.top = `${charObj.y}px`;

        // Stacking collision detection
        const stackHeight = stackedBlocks[charObj.colIndex] ? stackedBlocks[charObj.colIndex].length : 0;
        const targetY = canvasRect.height - ((stackHeight + 1) * BLOCK_HEIGHT);

        if (charObj.y >= targetY) {
            charObj.y = targetY;
            charObj.element.style.top = `${targetY}px`;

            stackedBlocks[charObj.colIndex].push(charObj);
            activeCharacters.splice(i, 1);

            playMotherboardBeep();

            // If stack reaches the top
            if (targetY <= 0) {
                lives -= 1;
                updateDisplays();
                if (lives <= 0) {
                    triggerGameOver();
                    return; // Stop current loop frame
                }
            }
        }
    }

    // Difficulty scaling: slowly increase fall speed based on score
    fallSpeed = 1 + (score / 200);
    spawnInterval = Math.max(500, 1500 - (score * 2)); // Faster spawns, capping at 500ms

    animationFrameId = requestAnimationFrame(gameLoop);
}

// 7. Lifecycle Controls
function startGame() {
    // Reset state
    score = 0;
    lives = 5;
    fallSpeed = 1;
    spawnInterval = 1500;
    updateDisplays();
    if (lastTypedDisplay) lastTypedDisplay.textContent = "";

    // Clear existing characters
    activeCharacters.forEach(obj => {
        if (obj.element.parentNode) {
            obj.element.parentNode.removeChild(obj.element);
        }
    });
    activeCharacters = [];

    if (stackedBlocks) {
        stackedBlocks.forEach(col => {
            col.forEach(obj => {
                if (obj.element.parentNode) {
                    obj.element.parentNode.removeChild(obj.element);
                }
            });
        });
    }

    const canvasRect = canvas.getBoundingClientRect();
    numColumns = Math.max(1, Math.floor(canvasRect.width / COLUMN_WIDTH));
    stackedBlocks = Array(numColumns).fill().map(() => []);

    gameOverScreen.classList.add("hidden");
    isPlaying = true;
    lastSpawnTime = performance.now();

    imeInput.value = "";
    imeInput.focus();

    // Needs user interaction to start AudioContext on some browsers
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    animationFrameId = requestAnimationFrame(gameLoop);
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

// Initial setup
imeInput.value = "";
updateDisplays();
