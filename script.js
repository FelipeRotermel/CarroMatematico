import * as Phaser from './node_modules/phaser/dist/phaser.esm.js';
import { levels } from './levels.js';

const resultModal = document.getElementById("resultModal");
const resultTitle = document.getElementById("resultTitle");
const resultScore = document.getElementById("resultScore");
const nextLevelBtn = document.getElementById("nextLevelBtn");
const backMenuBtn = document.getElementById("backMenuBtn");
const lanesX = [-0.35, 0, 0.35];

// ===== Configuração da câmera pseudo-3D =====
const HORIZON_RATIO = 0.55;     // posição do horizonte (fração da altura) — maior = mais céu
const PERSPECTIVE_K = 0.0035;   // intensidade do encolhimento com a profundidade
const STRIPE_LENGTH = 220;      // comprimento de cada faixa zebrada (em unidades Z)
const DRAW_DIST = 3000;         // distância máxima de renderização da pista
const ROAD_SEGMENTS = 80;       // qtd de tiras renderizadas (mais = mais suave)

// O valor das variáveis são definadas na função reset()
const state = {
    running: false,
    finished: false,
    gameOver: false,
    mathOperations: [],
    velocity: 0,
    score: 0,
    scroll: 0,
    lane: 1,
    lanePos: 1,
    tiltAngle: 0,
    currentLevel: 0,
    nitro: 100,       // tanque de nitro (0–100)
    boosting: false   // true enquanto Shift está pressionado e há nitro
};

const ui = {
    velocity: document.getElementById('velocityBox'),
    start: document.getElementById('btnStart'),
    modal: document.getElementById('levelModal'),
    levelButtons: document.getElementById('levelButtons'),
    levelIndicator: document.getElementById('levelIndicator')
};

let scene = null;

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
 * Largura útil da pista em pixels (no plano próximo)
 */
function getRoadWidth(width) {
    return Math.min(width * 0.95, 1500);
}

/**
 * Converte uma lane fracionária (ex: 1.4) na posição X (transição suave)
 * @param {number} laneFloat
 * @param {number} width  largura da tela
 * @param {number} roadW  largura da pista naquela profundidade (default = pista no plano próximo)
 */
function laneFloatToPixels(laneFloat, width, roadW) {
    if (roadW === undefined) roadW = getRoadWidth(width);
    return width / 2 + (laneFloat - 1) * 0.35 * roadW;
}

/**
 * Projeção pseudo-3D: dado um Z relativo (à frente do jogador), retorna
 * a posição vertical na tela, a escala (1 = perto, 0 = horizonte) e a
 * largura da pista naquele ponto.
 */
function project(relZ, width, height) {
    const horizonY = height * HORIZON_RATIO;
    const z = Math.max(0, relZ);
    const scale = 1 / (1 + z * PERSPECTIVE_K);
    const screenY = horizonY + (height - horizonY) * scale;
    const roadW = getRoadWidth(width) * scale;
    return { screenY, scale, roadW, horizonY };
}

/**
 * Aplica o efeito de tremor de tela usando a câmera do Phaser
 */
function applyScreenShake(intensity) {
    if (scene) {
        scene.cameras.main.shake(200, intensity * 0.001);
    }
}

/**
 * Atualiza posição lateral interpolada e ângulo de inclinação do carro
 */
function updateLaneAndTilt(factor) {
    const k = Math.min(1, 0.18 * factor);
    state.lanePos += (state.lane - state.lanePos) * k;
    state.tiltAngle = (state.lane - state.lanePos) * 0.7;
}

/**
 * Cria os GameObjects do Phaser para uma operação matemática
 */
function createGateSprite(mathObject) {
    const container = scene.add.container(0, 0);

    if (mathObject.type === "finish") {
        // posição relativa ao container (que será movido em updateMathOperations)
        const line = scene.add.rectangle(0, 0, 200, 10, 0xFFD700);
        const topText = scene.add.text(0, -25, "🏁 CHEGADA 🏁", {
            fontSize: '24px', color: '#ffffff', fontFamily: 'sans-serif',
            stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5);
        const bottomText = scene.add.text(0, 25, `Pontuação mínima: ${mathObject.value} pts`, {
            fontSize: '20px', color: '#ffffff', fontFamily: 'sans-serif',
            stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5);
        container.add([line, topText, bottomText]);
        container.finishLine = line;
        container.finishTop = topText;
        container.finishBottom = bottomText;
    } else {
        const isPositive = mathObject.type === "add" || mathObject.type === "mul";
        const textureKey = isPositive ? 'nitrous' : 'cone';

        const icon = scene.add.image(0, 0, textureKey);
        icon.setDisplaySize(130, 130);

        let txt = "";
        if (mathObject.type === "add") txt = `+${mathObject.value}`;
        if (mathObject.type === "sub") txt = `-${mathObject.value}`;
        if (mathObject.type === "mul") txt = `x${mathObject.value}`;
        if (mathObject.type === "div") txt = `/${mathObject.value}`;

        const text = scene.add.text(0, 80, txt, {
            fontSize: '32px', color: '#ffffff', fontFamily: 'sans-serif', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 5
        }).setOrigin(0.5);

        container.add([icon, text]);
    }

    mathObject.sprite = container;
}

/**
 * Atualiza posição/escala de cada operação matemática usando projeção 3D.
 * O Z relativo do gate é dado por `-g.y - state.scroll` (gates com y=-1400
 * ficam 1400 unidades à frente da câmera no início).
 */
function updateMathOperations() {
    const { width, height } = scene.scale;

    state.mathOperations.forEach(g => {
        if (g.disappearing && g.alpha > 0) {
            g.alpha -= 0.05;
            g.scale -= 0.05;
            if (g.alpha < 0) g.alpha = 0;
            if (g.scale < 0) g.scale = 0;
        }

        if (!g.sprite) return;

        const relZ = -g.y - state.scroll;

        // fora do alcance: esconde
        if (relZ > DRAW_DIST || relZ < -120) {
            g.sprite.setVisible(false);
            return;
        }
        g.sprite.setVisible(true);

        const proj = project(relZ, width, height);
        const finalScale = proj.scale * g.scale;

        if (g.type === "finish") {
            g.sprite.setPosition(width / 2, proj.screenY);
            // ajusta a barra dourada para acompanhar a largura projetada da pista
            if (g.sprite.finishLine) {
                g.sprite.finishLine.setSize(proj.roadW * 1.4, Math.max(2, 10 * proj.scale));
                g.sprite.finishTop.setScale(proj.scale);
                g.sprite.finishTop.setY(-25 * proj.scale - g.sprite.finishLine.height);
                g.sprite.finishBottom.setScale(proj.scale);
                g.sprite.finishBottom.setY(25 * proj.scale + g.sprite.finishLine.height);
            }
            g.sprite.setAlpha(g.alpha);
            g.sprite.setDepth(1000 - relZ);
        } else {
            const x = laneFloatToPixels(g.lane, width, proj.roadW);
            g.sprite.setPosition(x, proj.screenY);
            g.sprite.setScale(finalScale);
            g.sprite.setAlpha(g.alpha);
            g.sprite.setDepth(1000 - relZ);
        }
    });
}

/**
 * Aplica a operação matemática em que o jogador colidiu
 */
function applyMathOperation(mathObject) {
    if (mathObject.hit) {
        return;
    }

    mathObject.hit = true;

    state.mathOperations.forEach(other => {
        if (other.y === mathObject.y) {
            other.disappearing = true;
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
        state.velocity = Math.max(80, state.velocity - mathObject.value);
        applyScreenShake(10);
    }

    if (mathObject.type === "div") {
        state.score = Math.floor(state.score / mathObject.value);
        state.velocity = Math.max(80, Math.round(state.velocity / mathObject.value));
        applyScreenShake(10);
    }

    state.velocity = Math.min(Math.max(state.velocity, 80), 250);

    if (state.score <= 0) {
        state.gameOver = true;
        state.running = false;
    }
}

/**
 * Verifica a colisão do player com cada operação usando Z relativo.
 * O jogador está em relZ = 0 (plano da câmera). A janela de colisão é
 * deslocada para a frente (relZ positivo) para que o objeto seja
 * "tocado" um pouco antes de chegar visualmente sobre o carro.
 */
function collide() {
    const px = state.lane;

    for (const mathObject of state.mathOperations) {
        const relZ = -mathObject.y - state.scroll;

        if (mathObject.type === 'finish') {
            // janela ampla para a chegada
            if (!mathObject.hit && relZ > -40 && relZ < 110) {
                applyMathOperation(mathObject);
            }
        } else {
            // janela mais à frente: o objeto é ativado antes de chegar visualmente ao carro
            if (!mathObject.hit && !mathObject.disappearing && mathObject.lane === px && relZ > -20 && relZ < 120) {
                applyMathOperation(mathObject);
            }
        }
    }
}

/**
 * Desenha um quadrilátero (trapézio) preenchido entre duas linhas horizontais
 */
function fillTrapezoid(g, color, leftTop, rightTop, yTop, leftBot, rightBot, yBot) {
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(leftTop, yTop);
    g.lineTo(rightTop, yTop);
    g.lineTo(rightBot, yBot);
    g.lineTo(leftBot, yBot);
    g.closePath();
    g.fillPath();
}

/**
 * Desenha a estrada em pseudo-3D (perspectiva) iterando do horizonte
 * para frente, criando trapézios coloridos com efeito de zebra.
 */
function drawRoad() {
    if (!scene) return;
    const { width, height } = scene.scale;
    const g = scene.roadGfx;
    g.clear();

    const cx = width / 2;
    const cameraZ = state.scroll;

    // dimensões dos elementos (em "unidades de pista" — fração da largura total)
    const RUMBLE_FRAC = 0.04;       // largura da faixa vermelho/branco lateral
    const LANE_DIVIDER_FRAC = 0.005; // largura da faixa tracejada central

    // segmentos: do mais distante para o mais próximo (ordem de pintura)
    // o primeiro `prev` é fixado no horizonte com largura zero, para que a
    // primeira fatia preencha todo o espaço até a linha do horizonte (sem gap)
    const horizonY = height * HORIZON_RATIO;
    let prev = { screenY: horizonY, scale: 0, roadW: 0, horizonY };

    for (let i = ROAD_SEGMENTS - 1; i >= 0; i--) {
        const curRelZ = (i / ROAD_SEGMENTS) * DRAW_DIST;
        const cur = project(curRelZ, width, height);

        const yT = prev.screenY;
        const yB = cur.screenY;
        const halfPrev = prev.roadW / 2;
        const halfCur = cur.roadW / 2;

        // alterna a cor da pista com base no Z mundial → faixa zebrada
        const worldZ = cameraZ + curRelZ;
        const stripeIdx = Math.floor(worldZ / STRIPE_LENGTH);
        const isDark = (stripeIdx & 1) === 0;
        const roadColor = isDark ? 0x3a3a3a : 0x484848;
        const rumbleColor = isDark ? 0xeeeeee : 0xc62828;
        const grassColor = isDark ? 0x1f6b2a : 0x268a35;

        // grama: faixa horizontal de largura total (a estrada cobrirá o meio)
        g.fillStyle(grassColor, 1);
        g.fillRect(0, yT, width, yB - yT + 1);

        // faixa rumble (vermelho/branco) — esquerda
        fillTrapezoid(
            g, rumbleColor,
            cx - halfPrev - prev.roadW * RUMBLE_FRAC, cx - halfPrev, yT,
            cx - halfCur - cur.roadW * RUMBLE_FRAC, cx - halfCur, yB
        );
        // faixa rumble — direita
        fillTrapezoid(
            g, rumbleColor,
            cx + halfPrev, cx + halfPrev + prev.roadW * RUMBLE_FRAC, yT,
            cx + halfCur, cx + halfCur + cur.roadW * RUMBLE_FRAC, yB
        );

        // asfalto
        fillTrapezoid(
            g, roadColor,
            cx - halfPrev, cx + halfPrev, yT,
            cx - halfCur, cx + halfCur, yB
        );

        // faixas divisórias tracejadas (apenas em tiras escuras, criando o tracejado)
        if (isDark) {
            for (const df of [-0.175, 0.175]) {
                const halfWP = LANE_DIVIDER_FRAC * prev.roadW;
                const halfWC = LANE_DIVIDER_FRAC * cur.roadW;
                const xpC = cx + df * prev.roadW;
                const xcC = cx + df * cur.roadW;
                fillTrapezoid(
                    g, 0xffffff,
                    xpC - halfWP, xpC + halfWP, yT,
                    xcC - halfWC, xcC + halfWC, yB
                );
            }
        }

        prev = cur;
    }

}

/**
 * Reinicia o jogo no nível atual
 */
function reset() {
    state.scroll = 0;
    state.lane = 1;
    state.lanePos = 1;
    state.velocity = 100;
    state.nitro = 100;
    state.boosting = false;
    state.finished = false;
    state.gameOver = false;
    state.running = true;
    state.score = 100;
    state.tiltAngle = 0;

    // destrói sprites antigas
    state.mathOperations.forEach(g => {
        if (g.sprite) g.sprite.destroy();
    });

    const levelGates = levels[state.currentLevel % levels.length];

    state.mathOperations = levelGates.map(g => ({
        ...g,
        hit: false,
        disappearing: false,
        alpha: 1,
        scale: 1,
        sprite: null
    }));

    if (scene) {
        state.mathOperations.forEach(createGateSprite);
    }

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

function moveLeft() {
    if (state.lane > 0) {
        state.lane--;
    }
}

function moveRight() {
    if (state.lane < 2) {
        state.lane++;
    }
}

/**
 * Cena principal do Phaser
 */
class MainScene extends Phaser.Scene {
    constructor() {
        super('main');
    }

    preload() {
        this.load.image('player_forward', 'forward.png');
        this.load.image('player_left', 'turnLeft.png');
        this.load.image('player_right', 'turnRight.png');
        this.load.image('sky', 'sky.png');
        this.load.image('nitrous', 'nitrous.png');
        this.load.image('cone', 'cone.png');
    }

    create() {
        scene = this;
        const { width, height } = this.scale;
        const horizonY = height * HORIZON_RATIO;

        // céu acima do horizonte (imagem fixa esticada para preencher a área)
        this.sky = this.add.image(0, 0, 'sky').setOrigin(0, 0);
        this.sky.setDisplaySize(width, horizonY);

        // estrada (graphics redesenhado a cada frame, em perspectiva)
        this.roadGfx = this.add.graphics();
        this.roadGfx.setDepth(10);

        // jogador
        this.player = this.add.image(0, 0, 'player_forward');
        this.player.setDisplaySize(450, 300);
        this.player.setDepth(500); // entre as gates próximas e distantes

        // entradas (troca de pista — instantânea)
        this.input.keyboard.on('keydown-LEFT', moveLeft);
        this.input.keyboard.on('keydown-A', moveLeft);
        this.input.keyboard.on('keydown-RIGHT', moveRight);
        this.input.keyboard.on('keydown-D', moveRight);

        // entradas contínuas (acelerar/frear/nitro)
        this.keys = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.UP,
            w: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.DOWN,
            s: Phaser.Input.Keyboard.KeyCodes.S,
            shift: Phaser.Input.Keyboard.KeyCodes.SHIFT
        });

        // recria sprites das fases ao iniciar a cena
        if (state.mathOperations.length > 0) {
            state.mathOperations.forEach(createGateSprite);
        }

        // ajusta os elementos de fundo quando a janela é redimensionada
        this.scale.on('resize', (gameSize) => {
            const hY = gameSize.height * HORIZON_RATIO;
            this.sky.setDisplaySize(gameSize.width, hY);
        });
    }

    update(time, delta) {
        const { width, height } = this.scale;
        const factor = delta / 16.6667;

        if (state.running) {
            // acelerar / frear / nitro
            const accel = this.keys.up.isDown || this.keys.w.isDown;
            const brake = this.keys.down.isDown || this.keys.s.isDown;
            const boost = this.keys.shift.isDown && state.nitro > 0;
            state.boosting = boost;

            if (boost) {
                // nitro: empurra a velocidade além do limite normal (até 350)
                state.velocity = Math.min(350, state.velocity + 2.2 * factor);
                state.nitro = Math.max(0, state.nitro - 0.7 * factor);
            } else if (accel) {
                state.velocity = Math.min(250, state.velocity + 0.6 * factor);
            }

            if (brake) {
                state.velocity = Math.max(80, state.velocity - 1.2 * factor);
            }

            // regenera nitro quando não está usando
            if (!boost) {
                state.nitro = Math.min(100, state.nitro + 0.25 * factor);
            }

            // velocidade decai naturalmente para o limite normal quando o nitro acaba
            if (state.velocity > 250 && !boost) {
                state.velocity = Math.max(250, state.velocity - 1.5 * factor);
            }

            const roadSpeed = Math.min(Math.sqrt(state.velocity) * 0.15, 12);
            state.scroll += roadSpeed * factor;
            collide();
        }

        drawRoad();
        updateMathOperations();
        updateLaneAndTilt(factor);

        // jogador (no plano próximo — usa largura cheia da pista)
        const px = laneFloatToPixels(state.lanePos, width);
        const py = height - 180; // subi 60px para cima
        this.player.setPosition(px, py);

        // sombra do jogador: círculo achatado usando fillCircle com scaling
        // desenhamos após o carro para garantir ordem correta
        const shadowY = py + 50;
        const shadowRadius = 90;
        this.roadGfx.fillStyle(0x000000, 0.5);
        // simula elipse achatada usando círculo com scaleY menor
        this.roadGfx.save();
        this.roadGfx.translateCanvas(px, shadowY);
        this.roadGfx.scaleCanvas(1, 0.4); // achata na vertical
        this.roadGfx.fillCircle(0, 0, shadowRadius);
        this.roadGfx.restore();

        // troca o sprite do carro de acordo com a direção da curva
        const TURN_THRESHOLD = 0.05;
        const diff = state.lane - state.lanePos;
        let key = 'player_forward';
        if (diff > TURN_THRESHOLD) key = 'player_right';
        else if (diff < -TURN_THRESHOLD) key = 'player_left';
        if (this.player.texture.key !== key) {
            this.player.setTexture(key);
        }

        // HUD
        const vel = Math.round(state.velocity);
        const nitro = Math.round(state.nitro);
        const boostIcon = state.boosting ? '🔥 ' : '';
        const accelIcon = (!state.boosting && this.keys && (this.keys.up.isDown || this.keys.w.isDown)) ? '💨 ' : '';
        ui.velocity.textContent = `${boostIcon}${accelIcon}🚗 ${vel} km/h | ⚡ ${nitro}% | 🏆 ${state.score} pts`;

        if (!state.running && !resultModal.classList.contains("hidden")) {
            // modal de resultado aberto — não faz nada
        } else if (state.finished) {
            state.running = false;
            state.finished = false;
            showResultModal(true);
        } else if (state.gameOver) {
            state.running = false;
            state.gameOver = false;
            showResultModal(false);
        }
    }
}

const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#0e1224',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',
        height: '100%'
    },
    scene: [MainScene]
});

populateLevelButtons();
openMenu();
