import { levels } from './levels.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const resultModal = document.getElementById("resultModal");
const resultTitle = document.getElementById("resultTitle");
const resultScore = document.getElementById("resultScore");
const nextLevelBtn = document.getElementById("nextLevelBtn");
const backMenuBtn = document.getElementById("backMenuBtn");
const lanesX = [-0.35, 0, 0.35];
const playerImg = new Image();
playerImg.src = "player.png";
const grassPatternImg = new Image();
grassPatternImg.src = "background.png";
grassPatternImg.onload = () => {
    state.grassPattern = ctx.createPattern(grassPatternImg, 'repeat');
};

// O valor das variáveis são definadas na função reset()
const state = {
    running: false,
    finished: false,
    gameOver: false,
    grassPattern: null,
    mathOperations: [],
    velocity: 0,
    score: 0,
    scroll: 0,
    lane: 1,
    tiltAngle: 0,
    currentLevel: 0,
    screenShake: 0
};

const ui = {
    velocity: document.getElementById('velocityBox'),
    start: document.getElementById('btnStart'),
    modal: document.getElementById('levelModal'),
    levelButtons: document.getElementById('levelButtons'),
    levelIndicator: document.getElementById('levelIndicator')
};

function resize() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
}

resize();
window.addEventListener('resize', resize);

/**
 * Carrega o progresso do jogo
 * @returns
 */
function loadProgress() {
    const saved = localStorage.getItem("gameProgress");

    if (saved) {
        return JSON.parse(saved);
    }

    return {
        unlocked: [true, ...Array(levels.length-1).fill(false)]
    };
}

/**
 * Salva o progresso do jogo
 * @param {*} progress
 */
function saveProgress(progress) {
    localStorage.setItem("gameProgress", JSON.stringify(progress));
}

let progress = loadProgress();

/**
 * Abre o menu
 */
function openMenu() {
    resultModal.classList.add('hidden');

    setTimeout(() => {
        populateLevelButtons();

        ui.modal.classList.remove('hidden');
        ui.modal.style.zIndex = '1300';
        resultModal.style.zIndex = '1200';
        state.running = false;
    }, 40);
}

/**
 * Cria os botões
 */
function populateLevelButtons() {
    ui.levelButtons.innerHTML = "";

    levels.forEach((_,i)=>{
        const btn = document.createElement('button');
        btn.textContent = `Fase ${i+1}`;
        btn.className = "btn-level";

        if (!progress.unlocked[i]) {
            btn.disabled = true;
            btn.classList.add("locked");
        }

        btn.addEventListener('click', () => {
            if (!progress.unlocked[i]) {
                return;
            }

            state.currentLevel = i;
            reset();
            state.running = true;
            ui.modal.classList.add('hidden');
            resultModal.classList.add('hidden');
        });

        ui.levelButtons.appendChild(btn);
    });
}

/**
 * Vai para o próximo level
 * @returns
 */
function goToNextLevel() {
    let next = state.currentLevel + 1;

    if (next < levels.length && progress.unlocked[next]) {
        state.currentLevel = next;
    } else {
        let found = -1;

        for (let i = state.currentLevel + 1; i < levels.length; i++) {
            if (progress.unlocked[i]) {
                found = i;
                break;
            }
        }

        if (found >= 0) {
            state.currentLevel = found;
        } else {
            openMenu();
            return;
        }
    }

    reset();
    state.running = true;
    state.finished = false;
    state.gameOver = false;

    populateLevelButtons();
    saveProgress(progress);
}

/**
 * Atualiza o indicador do level
 */
function updateLevelIndicator() {
    ui.levelIndicator.textContent = `Fase ${state.currentLevel + 1}`;
}

ui.modal.addEventListener('click', (e) => {
    if (e.target === ui.modal) {
        ui.modal.classList.add('hidden');
    }
});

ui.start.addEventListener("click", () => {
    openMenu();
});

/**
 * Converte a lane (0, 1, 2) na posição X do canvas
 * @param {*} currentLine
 * @returns
 */
function currentLaneToPixels(currentLine) {
    const midPoint = canvas.width / 2;
    const widht = Math.min(canvas.width * 0.6, 700 * devicePixelRatio);

    return midPoint + lanesX[currentLine] * widht;
}

/**
 * Aplica o efeito de tremor de tela
 * @param {*} intensity
 */
function applyScreenShake(intensity) {
    state.screenShake = intensity;
}

/**
 * Atualiza o efeito de tremor de tela
 */
function updateScreenShake() {
    if (state.screenShake > 0) {
        state.screenShake = Math.max(0, state.screenShake - 0.5);
    }
}

/**
 * Atualiza o ângulo de inclinação do carro
 */
function updateTilt() {
    state.tiltAngle += state.tiltAngle > 0 ? -0.02 : +0.02;
}

/**
 * Desenha o jogador
 */
function drawPlayer() {
    const px = currentLaneToPixels(state.lane);
    const py = canvas.height - 120;
    const screenShake = state.screenShake - state.screenShake / 2;

    ctx.save();
    ctx.translate(
        px + Math.random() * screenShake,
        py + Math.random() * screenShake
    );

    ctx.rotate(state.tiltAngle);
    ctx.drawImage(playerImg, -35, -70, 70, 140);
    ctx.restore();

    updateTilt();
}

/**
 * Desenha a estrada
 */
function drawRoad() {
    ctx.save();
    const scrollOffset = state.scroll % grassPatternImg.height;
    ctx.translate(0, scrollOffset);
    ctx.fillStyle = state.grassPattern;
    ctx.fillRect(0, -scrollOffset, canvas.width, canvas.height);
    ctx.restore();

    const pattern = ctx.createPattern(grassPatternImg, 'repeat');

    ctx.save();
    ctx.translate(0, scrollOffset);

    ctx.fillStyle = pattern;
    ctx.fillRect(0, -scrollOffset, canvas.width, canvas.height);
    ctx.restore();

    const roadWidth = Math.min(canvas.width * 0.6, 700 * devicePixelRatio);
    const roadX = (canvas.width - roadWidth) / 2;

    ctx.fillStyle = "#424242";
    ctx.fillRect(roadX, 0, roadWidth, canvas.height);

    const railWidth = 12;
    const postWidth = 14;
    const postHeight = 45;
    const postGap = 80;
    const postScrollTotal = postHeight + postGap;
    const postOffset = state.scroll % postScrollTotal;

    ctx.fillStyle = "#A0A0A0";
    ctx.fillRect(
        roadX - railWidth / 2,
        0,
        railWidth,
        canvas.height
    );

    ctx.fillRect(
        roadX + roadWidth - railWidth / 2,
        0,
        railWidth,
        canvas.height
    );

    ctx.fillStyle = "#757575";
    for (let y = -postScrollTotal; y < canvas.height + postScrollTotal; y += postScrollTotal) {
        const currentY = y + postOffset;

        ctx.fillRect(
            roadX - postWidth / 2,
            currentY,
            postWidth,
            postHeight
        );

        ctx.fillRect(
            roadX + roadWidth - postWidth / 2,
            currentY,
            postWidth,
            postHeight
        );
    }

    const laneWidth = roadWidth / 3;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 6;
    ctx.setLineDash([]);

    const segmentLength = 60;
    const gap = 40;
    const total = segmentLength + gap;
    const offset = state.scroll % total;

    for (let i = 1; i < 3; i++) {
        const x = roadX + i * laneWidth;
        for (let y = -total; y < canvas.height + total; y += total) {
            ctx.beginPath();
            ctx.moveTo(x, y + offset);
            ctx.lineTo(x, y + offset + segmentLength);
            ctx.stroke();
        }
    }
}

/**
 * Desenha a operação matemática
 * @param {*} mathObject
 * @returns
 */
function drawMathOperation(mathObject) {
    if (mathObject.alpha <= 0) {
        return;
    }

    const x = currentLaneToPixels(mathObject.lane);
    const y = mathObject.y + state.scroll;

    if (mathObject.type === "finish") {
        ctx.fillStyle = "#FFD700";
        ctx.fillRect(0, y, canvas.width, 10);
        ctx.fillStyle = "#fff";
        ctx.font = "24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🏁 CHEGADA 🏁", canvas.width/2, y - 15);
        ctx.fillText(`Pontuação mínima: ${mathObject.value} pts`, canvas.width/2, y + 25);

        return;
    }

    ctx.save();

    ctx.globalAlpha = mathObject.alpha;
    ctx.translate(x, y);
    ctx.scale(mathObject.scale, mathObject.scale);

    ctx.fillStyle = (mathObject.type === "add" || mathObject.type === "mul") ? "#0f0" : "#f00";
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    let txt = "";

    if (mathObject.type === "add") {
        txt = `+${mathObject.value}`;
    }

    if (mathObject.type === "sub") {
        txt = `-${mathObject.value}`;
    }

    if (mathObject.type === "mul") {
        txt = `x${mathObject.value}`;
    }

    if (mathObject.type === "div") {
        txt = `/${mathObject.value}`;
    }

    ctx.fillText(txt, 0, 5);
    ctx.restore();
}

/**
 * Aplica a operação matemática em que o jogador colidiu
 * @param {*} mathObject
 * @returns
 */
function applyMathOperation(mathObject) {
    if (mathObject.hit) {
        return;
    }

    mathObject.hit = true;

    state.mathOperations.forEach(otherMathOperation => {
        if (otherMathOperation.y === mathObject.y) {
            otherMathOperation.disappearing = true;
        }
    });

    if (mathObject.type === "finish") {
        state.running = false;
        const minScore = mathObject.value;

        if (state.score >= minScore) {
            state.finished = true;
        } else {
            state.gameOver = true;
        }

        return;
    }

    if (mathObject.type === "add") {
        state.score += mathObject.value;
        state.velocity += mathObject.value;
    }

    if (mathObject.type === "mul") {
        state.score *= mathObject.value;
        state.velocity = Math.round(state.velocity * mathObject.value);
    }

    if (mathObject.type === "sub") {
        state.score -= mathObject.value;
        state.velocity = Math.max(0, state.velocity - mathObject.value);
        applyScreenShake(10);
    }

    if (mathObject.type === "div") {
        state.score = Math.floor(state.score / mathObject.value);
        state.velocity = Math.max(0, Math.round(state.velocity / mathObject.value));
        applyScreenShake(10);
    }

    state.velocity = Math.min(Math.max(state.velocity, 0), 100);

    if (state.score <= 0) {
        state.gameOver = true;
        state.running = false;
    }
}

/**
 * Atualiza o tamanho das operações matemáticas
 */
function updateMathOperations() {
    state.mathOperations.forEach(g => {

        if (g.disappearing && g.alpha > 0) {
            g.alpha -= g.alpha > 0 ? 0.05 : 0;
            g.scale -= g.scale > 0 ? 0.05 : 0;
        }
    });
}

/**
 * Verifica a colisão do player com o mathObject
 */
function collide() {
    const px = state.lane;
    const py = canvas.height - 100;

    for (const mathObject of state.mathOperations) {
        const dist = Math.abs((mathObject.y + state.scroll) - py);

        if (mathObject.type === 'finish') {
            const finishThreshold = 60;

            if (!mathObject.hit && dist < finishThreshold) {
                applyMathOperation(mathObject);
            }
        } else {
            const gateThreshold = 40;

            if (!mathObject.hit && !mathObject.disappearing && mathObject.lane === px && dist < gateThreshold) {
                applyMathOperation(mathObject);
            }
        }
    }
}

/**
 * Reinicia tudo
 */
function reset() {
    state.scroll = 0;
    state.lane = 1;
    state.velocity = 100;
    state.finished = false;
    state.gameOver = false;
    state.running = true;
    state.score = 100;
    const levelGates = levels[state.currentLevel % levels.length];

    state.mathOperations = levelGates.map(g => ({
        ...g,
        hit: false,
        disappearing: false,
        alpha: 1,
        scale: 1
    }));

    resultModal.classList.add("hidden");
    ui.modal.classList.add("hidden");
    updateLevelIndicator();
}

/**
 * Mostra a modal com o resultado final do level
 * @param {*} success
 */
function showResultModal(success) {
    resultTitle.textContent = success ? "🎉 Fase Concluída!" : "❌ Você falhou!";
    resultScore.textContent = `Pontuação final: ${state.score} pts`;

    // Desbloqueia próxima fase se houver
    if (success && state.currentLevel + 1 < levels.length && !progress.unlocked[state.currentLevel + 1]) {
        progress.unlocked[state.currentLevel + 1] = true;

        saveProgress(progress);
        populateLevelButtons();
    }

    state.running = false;
    nextLevelBtn.style.display = success ? "inline-block" : "none";
    resultModal.style.zIndex = '1200';
    ui.modal.style.zIndex = '1100';

    backMenuBtn.onclick = () => {
        resultModal.classList.add('hidden');

        setTimeout(() => {
            populateLevelButtons();
            ui.modal.classList.remove('hidden');
            ui.modal.style.zIndex = '1300';
        }, 40);
    };

    nextLevelBtn.onclick = () => {
        resultModal.classList.add('hidden');
        setTimeout(() => goToNextLevel(), 40);
    };

    resultModal.classList.remove('hidden');
}

/**
 * Carrega TUDO a cada momento (muito ruim)
 */
function frame() {
    ctx.save();
    if (state.screenShake > 0) {
        let screenShake = state.screenShake - state.screenShake / 2;

        ctx.translate(
            Math.random() * screenShake,
            Math.random() * screenShake
        );
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state.running) {
        const roadSpeed = Math.min(Math.sqrt(state.velocity) * 0.15, 10);
        state.scroll += roadSpeed;

        collide();
    }

    updateMathOperations();
    updateScreenShake();
    drawRoad();
    drawPlayer();

    for (const mathObject of state.mathOperations) {
        drawMathOperation(mathObject);
    }

    ui.velocity.textContent = `🚗 ${state.velocity} km/h | 🏆 ${state.score} pts`;

    if (!state.running && !resultModal.classList.contains("hidden")) {
        // modal de resultado aberto — não faz nada

    } else if (state.finished) {
        state.running = false;
        showResultModal(true);

    } else if (state.gameOver) {
        state.running = false;
        showResultModal(false);
    }

    ctx.restore();
    requestAnimationFrame(frame);
}

function moveLeft() {
    if (state.lane > 0) {
        state.lane--;
        state.tiltAngle = -0.3;
    }
}

function moveRight() {
    if (state.lane < 2) {
        state.lane++;
        state.tiltAngle = 0.3;
    }
}

// Controles
window.addEventListener('keydown', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA')
        moveLeft();

    if (e.code === 'ArrowRight' || e.code === 'KeyD')
        moveRight();
});

populateLevelButtons();
openMenu();
frame();
