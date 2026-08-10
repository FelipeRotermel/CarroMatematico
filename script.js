import * as Phaser from 'https://esm.run/phaser@3.80.1';
import { levels } from './levels.js';

const resultModal = document.getElementById("resultModal");
const resultTitle = document.getElementById("resultTitle");
const resultScore = document.getElementById("resultScore");
const nextLevelBtn = document.getElementById("nextLevelBtn");
const backMenuBtn = document.getElementById("backMenuBtn");

// ===== Configuração da câmera pseudo-3D e Pistas =====
const LANE_SPACING = 0.3;       // fator de afastamento das pistas laterais (era 0.35)
const DIVIDER_SPACING = 0.175;   // fator de posicionamento visual das linhas divisórias (restaurado)
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
    nitro: 1000,       // tanque de nitro (0–100)
    boosting: false,   // true enquanto Shift está pressionado e há nitro
    volume: 0.5        // volume da música de fundo (0–1)
};

const ui = {
    start: document.getElementById('btnStart'),
    modal: document.getElementById('levelModal'),
    levelButtons: document.getElementById('levelButtons'),
    levelIndicator: document.getElementById('levelIndicator'),
    
    scoreBar: document.getElementById('scoreBar'),
    scoreLabel: document.getElementById('scoreLabel'),
    nitroBar: document.getElementById('nitroBar'),
    nitroLabel: document.getElementById('nitroLabel'),
    speedBar: document.getElementById('speedBar'),
    speedLabel: document.getElementById('speedLabel')
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
    return width / 2 + (laneFloat - 1) * LANE_SPACING * roadW;
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
        let textureKey = 'cone';
        if (mathObject.type === "add" || mathObject.type === "mul") {
            textureKey = 'nitrous';
        } else if (mathObject.type === "none") {
            textureKey = 'none';
        }

        const icon = scene.add.image(0, 0, textureKey);
        icon.setDisplaySize(170, 170);

        let txt = "";
        if (mathObject.type === "add") txt = `+${mathObject.value}`;
        if (mathObject.type === "sub") txt = `-${mathObject.value}`;
        if (mathObject.type === "mul") txt = `x${mathObject.value}`;
        if (mathObject.type === "div") txt = `/${mathObject.value}`;

        const text = scene.add.text(0, 80, txt, {
            fontSize: '50px', color: '#ffffff', fontFamily: 'sans-serif', fontStyle: 'bold',
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
    if (!scene) return;
    const { width, height } = scene.scale;
    const playerX = laneFloatToPixels(state.lanePos, width);
    const playerY = height - 180;
    const playerHalfWidth = 110; // largura de colisão do corpo do carro (excluindo retrovisores largos)

    for (const mathObject of state.mathOperations) {
        const relZ = -mathObject.y - state.scroll;

        if (mathObject.type === 'finish') {
            // janela ampla para a chegada
            if (!mathObject.hit && relZ > -40 && relZ < 110) {
                applyMathOperation(mathObject);
            }
        } else {
            // Verifica colisão usando coordenadas de tela (X e Y)
            if (!mathObject.hit && !mathObject.disappearing && relZ < 600) {
                const proj = project(relZ, width, height);
                const itemX = laneFloatToPixels(mathObject.lane, width, proj.roadW);
                const itemY = proj.screenY;
                const itemHalfWidth = (130 * proj.scale) / 2;

                const horizontalOverlap = Math.abs(playerX - itemX) < (playerHalfWidth + itemHalfWidth);
                const verticalOverlap = (itemY >= playerY + 60) && (itemY <= playerY + 140);

                if (horizontalOverlap && verticalOverlap) {
                    applyMathOperation(mathObject);
                }
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
        const ratio = i / ROAD_SEGMENTS;
        const scale = 1 - ratio;
        const curRelZ = (1 / scale - 1) / PERSPECTIVE_K;
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
            for (const df of [-DIVIDER_SPACING, DIVIDER_SPACING]) {
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
    state.velocity = 80;
    state.nitro = 1000;
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
    const finishGate = levelGates.find(g => g.type === 'finish');
    state.targetScore = finishGate ? finishGate.value : 100;

    state.mathOperations = levelGates.map(g => {
        // Desloca -400 unidades e aplica 50% de aumento de distância (* 1.5)
        const newY = (g.y - 400) * 1.5;
        return {
            ...g,
            y: newY,
            hit: false,
            disappearing: false,
            alpha: 1,
            scale: 1,
            sprite: null
        };
    });

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
        this.load.image('player_forward', 'src/img/car/foward/foward1.png');
        this.load.image('player_left', 'src/img/car/left/left1.png');
        this.load.image('player_right', 'src/img/car/right/right1.png');
        this.load.image('player_lane_left', 'src/img/car/left.png');
        this.load.image('player_lane_right', 'src/img/car/right.png');
        this.load.image('sky', 'src/img/scenario/sky.png');
        this.load.image('nitrous', 'src/img/objects/nitrous.png');
        this.load.image('cone', 'src/img/objects/cone.png');
        this.load.image('none', 'src/img/objects/none.png');
        this.load.audio('music', 'src/aud/ost1.mp3');
        for (let i = 1; i <= 10; i++) {
            this.load.image(`foward${i}`, `src/img/car/foward/foward${i}.png`);
            this.load.image(`left${i}`, `src/img/car/left/left${i}.png`);
            this.load.image(`right${i}`, `src/img/car/right/right${i}.png`);
        }
    }

    create() {
        scene = this;
        const { width, height } = this.scale;
        const horizonY = height * HORIZON_RATIO;

        // céu acima do horizonte (imagem fixa esticada para preencher a área)
        this.sky = this.add.image(0, 0, 'sky').setOrigin(0, 0);
        this.sky.setDisplaySize(width, horizonY);

        // Inicia música de fundo
        this.music = this.sound.add('music', {
            loop: true,
            volume: state.volume
        });
        this.music.play();

        // estrada (graphics redesenhado a cada frame, em perspectiva)
        this.roadGfx = this.add.graphics();
        this.roadGfx.setDepth(10);

        // jogador (agora como Sprite para suportar animações)
        this.player = this.add.sprite(0, 0, 'player_forward');
        this.player.setDisplaySize(450, 300);
        this.player.setDepth(1500); // garante que o carro fica por cima dos objetos da pista

        // Criar animações de 10 frames
        this.anims.create({
            key: 'anim_forward',
            frames: Array.from({ length: 10 }, (_, i) => ({ key: `foward${i + 1}` })),
            frameRate: 15,
            repeat: -1
        });

        this.anims.create({
            key: 'anim_left',
            frames: Array.from({ length: 10 }, (_, i) => ({ key: `left${i + 1}` })),
            frameRate: 15,
            repeat: -1
        });

        this.anims.create({
            key: 'anim_right',
            frames: Array.from({ length: 10 }, (_, i) => ({ key: `right${i + 1}` })),
            frameRate: 15,
            repeat: -1
        });

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
            
            // Só pode ativar se tiver pelo menos 10%, mas pode continuar usando até 0%
            let boost = false;
            if (state.boosting) {
                boost = this.keys.shift.isDown && state.nitro > 0;
            } else {
                boost = this.keys.shift.isDown && state.nitro >= 10;
            }
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

        // 1. Aplica efeito de vibração (jiggle) no chassi do carro baseado na velocidade
        let jiggle = 0;
        if (state.running) {
            const speedFactor = state.velocity / 250; // normaliza pela velocidade normal máxima
            jiggle = Math.sin(time * 0.08) * 1.5 * speedFactor;
        }
        this.player.setPosition(px, py + jiggle);

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

        // Gerencia a animação do carro de acordo com a direção ou faixa atual
        const TURN_THRESHOLD = 0.05;
        const diff = state.lane - state.lanePos;
        let animKey = 'anim_forward';

        if (diff > TURN_THRESHOLD) {
            // Movendo para a direita: chassi aponta para a direita (frames 'left')
            animKey = 'anim_left';
        } else if (diff < -TURN_THRESHOLD) {
            // Movendo para a esquerda: chassi aponta para a esquerda (frames 'right')
            animKey = 'anim_right';
        } else {
            // Carro estabilizado na faixa: aplica o sprite da faixa correspondente
            if (state.lane === 0) {
                animKey = 'anim_left';
            } else if (state.lane === 2) {
                animKey = 'anim_right';
            }
        }

        if (state.running) {
            if (!this.player.anims.isPlaying || this.player.anims.currentAnim.key !== animKey) {
                this.player.play(animKey);
            }
            // Ajusta a velocidade de reprodução baseado na velocidade do carro
            this.player.anims.timeScale = Math.max(0.3, state.velocity / 180);
        } else {
            this.player.anims.stop();
            // Mostra o frame inicial correspondente quando parado
            const mapFrame = {
                'anim_forward': 'foward1',
                'anim_left': 'left1',
                'anim_right': 'right1'
            };
            this.player.setTexture(mapFrame[animKey]);
        }

        // HUD
        const vel = Math.round(state.velocity);
        const nitro = Math.round(state.nitro);
        const score = Math.round(state.score);
        const target = state.targetScore || 100;

        // 1. Velocímetro (0 a 350 km/h)
        const speedPercent = Math.min(100, Math.max(0, (vel / 350) * 100));
        if (ui.speedBar) ui.speedBar.style.width = `${speedPercent}%`;
        if (ui.speedLabel) ui.speedLabel.innerHTML = `🚗 VEL: ${vel} km/h`;

        // 2. Indicador de Nitro (0% a 100%)
        if (ui.nitroBar) ui.nitroBar.style.width = `${nitro}%`;
        const thresholdWarn = (nitro < 10) ? ' (BLOQUEADO)' : '';
        if (ui.nitroLabel) ui.nitroLabel.textContent = `⚡ NITRO: ${nitro}%${thresholdWarn}`;

        // 3. Pontuação (Score / TargetScore)
        const scorePercent = Math.min(100, Math.max(0, (score / target) * 100));
        if (ui.scoreBar) ui.scoreBar.style.width = `${scorePercent}%`;
        if (ui.scoreLabel) ui.scoreLabel.textContent = `🏆 PONTOS: ${score} / ${target}`;

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

// Controle de Volume Customizado
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');

const savedVolume = localStorage.getItem("gameVolume");
state.volume = savedVolume !== null ? parseFloat(savedVolume) : 0.5;

if (volumeSlider) {
    volumeSlider.value = state.volume;
    volumeValue.textContent = `${Math.round(state.volume * 100)}%`;
    
    volumeSlider.addEventListener('input', (e) => {
        const vol = parseFloat(e.target.value);
        state.volume = vol;
        volumeValue.textContent = `${Math.round(vol * 100)}%`;
        
        if (scene && scene.music) {
            scene.music.setVolume(vol);
        }
        localStorage.setItem("gameVolume", vol);
    });
}

populateLevelButtons();
openMenu();
