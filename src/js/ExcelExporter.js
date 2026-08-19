/**
 * ExcelExporter.js - Generates Pedagogical .xlsx Workbooks with 4 Diagnostic Sheets
 * Sheet 1: Placar Geral (simplified)
 * Sheet 2: Diagnostico por Aluno (per-student diagnostic card)
 * Sheet 3: Decisoes por Operacao (per-checkpoint decisions with contextual quality)
 * Sheet 4: Gabarito das Fases (level reference matrix)
 */

import { levels } from '../../levels.js';
import { SessionManager } from './SessionManager.js';

function stripEmojis(str) {
    if (!str) return '';
    return String(str)
        .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]/gu, '')
        .trim();
}

function formatDateTime(dateStr) {
    if (!dateStr) {
        const now = new Date();
        return `${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (!dateStr.includes(':')) {
        const now = new Date();
        return `${dateStr} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return dateStr;
}

function formatOpBadge(op) {
    if (!op) return 'Vazio';
    let sym = '+';
    if (op.type === 'sub') sym = '-';
    else if (op.type === 'mul') sym = 'x';
    else if (op.type === 'div') sym = '/';
    return `${sym}${op.value}`;
}

function formatLaneOption(op) {
    if (!op) return 'Vazio';
    const sym = formatOpBadge(op);
    const isPositive = op.type === 'add' || op.type === 'mul';
    const tag = isPositive ? 'Nitro' : 'Cone';
    return `${sym} (${tag})`;
}

function qualityLabel(quality) {
    if (quality === 'best') return 'Acerto';
    if (quality === 'partial') return 'Parcial';
    return 'Erro';
}

export class ExcelExporter {
    static exportScoreboard(scoreboardData, customFileName = null) {
        if (!window.XLSX) {
            console.error('SheetJS (XLSX) library is not loaded');
            alert('A biblioteca de exportacao Excel nao foi carregada.');
            return false;
        }

        const XLSX = window.XLSX;
        const wb = XLSX.utils.book_new();

        const diffLabels = {
            easy: 'Facil (0.8x)',
            medium: 'Medio (1.0x)',
            hard: 'Dificil (1.2x)'
        };
        const reasonLabels = {
            victory: 'Vitoria',
            gameover: 'Game Over',
            logout: 'Saida do Usuario'
        };

        // ==========================================
        // 1. Aba: "Placar Geral" (simplificada)
        // ==========================================
        const generalRows = [];

        (scoreboardData || []).forEach((row, idx) => {
            const history = row.history || [];
            const metrics = row.metrics || SessionManager.calculatePedagogicalMetrics(history);
            let levelsCompletedCount = 0;
            history.forEach(lvl => { if (lvl.success) levelsCompletedCount++; });

            const diffText = diffLabels[row.difficulty] || stripEmojis(row.diffName) || 'Medio (1.0x)';
            const statusText = reasonLabels[row.reason] || stripEmojis(row.reason) || 'Concluido';

            generalRows.push({
                'Posicao': idx + 1,
                'Aluno': stripEmojis(row.name) || 'Anonimo',
                'Dificuldade': diffText,
                'Pontuacao': row.score || 0,
                'Status': statusText,
                'Acertos': metrics.totalGood || 0,
                'Parciais': metrics.totalPartial || 0,
                'Erros': metrics.totalBad || 0,
                'Precisao Geral': `${metrics.overallAccuracy}%`,
                'Fases Concluidas': `${levelsCompletedCount}/${history.length}`,
                'Data e Horario': formatDateTime(row.date)
            });
        });

        const wsGeneral = XLSX.utils.json_to_sheet(
            generalRows.length > 0 ? generalRows : [{ 'Aviso': 'Nenhum dado registrado no placar' }]
        );
        wsGeneral['!cols'] = [
            { wch: 8 },  // Posicao
            { wch: 22 }, // Aluno
            { wch: 16 }, // Dificuldade
            { wch: 12 }, // Pontuacao
            { wch: 16 }, // Status
            { wch: 10 }, // Acertos
            { wch: 10 }, // Parciais
            { wch: 10 }, // Erros
            { wch: 16 }, // Precisao Geral
            { wch: 18 }, // Fases Concluidas
            { wch: 18 }  // Data e Horario
        ];
        XLSX.utils.book_append_sheet(wb, wsGeneral, 'Placar Geral');

        // ==========================================
        // 2. Aba: "Diagnostico por Aluno"
        // ==========================================
        const diagData = [];

        (scoreboardData || []).forEach((row) => {
            const history = row.history || [];
            const metrics = row.metrics || SessionManager.calculatePedagogicalMetrics(history);
            const diffText = diffLabels[row.difficulty] || stripEmojis(row.diffName) || 'Medio';
            const studentName = stripEmojis(row.name) || 'Anonimo';
            const statusText = reasonLabels[row.reason] || stripEmojis(row.reason) || 'Concluido';

            // Linha de cabecalho do aluno
            diagData.push({
                'Campo': '--- ALUNO ---',
                'Valor': studentName,
                'Detalhe': `Dificuldade: ${diffText} | Status: ${statusText} | Data: ${formatDateTime(row.date)}`
            });

            // Pontuacao
            diagData.push({
                'Campo': 'Pontuacao Total',
                'Valor': `${row.score || 0} pts`,
                'Detalhe': ''
            });

            // Precisao geral
            diagData.push({
                'Campo': 'Precisao Geral',
                'Valor': `${metrics.overallAccuracy}%`,
                'Detalhe': `${metrics.totalGood} acertos / ${metrics.totalPartial || 0} parciais / ${metrics.totalBad} erros`
            });

            // Por operacao
            diagData.push({
                'Campo': 'Adicao (+)',
                'Valor': metrics.rateAdd !== null ? `${metrics.rateAdd}%` : 'N/A',
                'Detalhe': metrics.rateAdd !== null ? `Escolheu + em ${metrics.bestAdd}/${metrics.oppAdd} oportunidades` : 'Nao apareceu na sessao'
            });
            diagData.push({
                'Campo': 'Subtracao (-)',
                'Valor': metrics.rateSub !== null ? `${metrics.rateSub}%` : 'N/A',
                'Detalhe': metrics.rateSub !== null ? `Desviou/minimizou em ${metrics.avoidedSub}/${metrics.oppSub} oportunidades` : 'Nao apareceu na sessao'
            });
            diagData.push({
                'Campo': 'Multiplicacao (x)',
                'Valor': metrics.rateMul !== null ? `${metrics.rateMul}%` : 'N/A',
                'Detalhe': metrics.rateMul !== null ? `Escolheu x em ${metrics.bestMul}/${metrics.oppMul} oportunidades` : 'Nao apareceu na sessao'
            });
            diagData.push({
                'Campo': 'Divisao (/)',
                'Valor': metrics.rateDiv !== null ? `${metrics.rateDiv}%` : 'N/A',
                'Detalhe': metrics.rateDiv !== null ? `Desviou/minimizou em ${metrics.avoidedDiv}/${metrics.oppDiv} oportunidades` : 'Nao apareceu na sessao'
            });

            // Diagnostico
            diagData.push({
                'Campo': 'Diagnostico Pedagogico',
                'Valor': metrics.diagnosis,
                'Detalhe': metrics.weakPoints.length > 0 ? `Pontos fracos: ${metrics.weakPoints.join(', ')}` : 'Nenhum ponto fraco identificado'
            });

            // Fases detalhadas
            history.forEach(lvl => {
                const goods = (lvl.goodHits || []).length;
                const bads = (lvl.badHits || []).length;
                diagData.push({
                    'Campo': `  Fase ${lvl.levelIndex + 1}`,
                    'Valor': lvl.success ? 'Concluida' : 'Falhou',
                    'Detalhe': `${lvl.score} pts | Acertos: ${goods} | Erros: ${bads}`
                });
            });

            // Linha em branco separando alunos
            diagData.push({ 'Campo': '', 'Valor': '', 'Detalhe': '' });
        });

        const wsDiag = XLSX.utils.json_to_sheet(
            diagData.length > 0 ? diagData : [{ 'Aviso': 'Nenhum dado de diagnostico' }]
        );
        wsDiag['!cols'] = [
            { wch: 24 }, // Campo
            { wch: 20 }, // Valor
            { wch: 55 }  // Detalhe
        ];
        XLSX.utils.book_append_sheet(wb, wsDiag, 'Diagnostico por Aluno');

        // ==========================================
        // 3. Aba: "Decisoes por Operacao"
        // ==========================================
        const detailedRows = [];

        (scoreboardData || []).forEach((row) => {
            const history = row.history || [];
            const diffText = diffLabels[row.difficulty] || stripEmojis(row.diffName) || 'Medio';
            const studentName = stripEmojis(row.name) || 'Anonimo';
            const studentDate = formatDateTime(row.date);

            history.forEach((lvl) => {
                const goodHits = lvl.goodHits || [];
                const badHits = lvl.badHits || [];
                const allHits = [...goodHits, ...badHits];
                allHits.sort((a, b) => (b.y || 0) - (a.y || 0));

                if (allHits.length === 0) {
                    detailedRows.push({
                        'Aluno': studentName,
                        'Fase': `Fase ${lvl.levelIndex + 1}`,
                        'Resultado': lvl.success ? 'Concluida' : 'Falhou',
                        'Operacao': '-',
                        'Faixa': '-',
                        'Operacao': '-',
                        'Qualidade': '-',
                        'Opcoes na Pista': 'Nenhuma interacao',
                        'Score Antes': '-',
                        'Score Depois': lvl.score || 0
                    });
                } else {
                    allHits.forEach((hit, hitIdx) => {
                        let optionsText = 'Nao registrado';
                        if (hit.options && hit.options.length > 0) {
                            optionsText = hit.options
                                .map(opt => `[${opt.laneName}: ${formatLaneOption(opt)}]`)
                                .join(' | ');
                        }

                        const quality = hit.decisionQuality || (hit.isGood ? 'best' : 'worst');

                        detailedRows.push({
                            'Aluno': studentName,
                            'Fase': `Fase ${lvl.levelIndex + 1}`,
                            'Resultado': lvl.success ? 'Concluida' : 'Falhou',
                            'Operacao': `Operacao ${hitIdx + 1}`,
                            'Faixa': hit.laneName || `Faixa ${(hit.lane || 0) + 1}`,
                            'Operacao': formatOpBadge(hit),
                            'Qualidade': qualityLabel(quality),
                            'Opcoes na Pista': optionsText,
                            'Score Antes': hit.scoreBefore !== undefined ? hit.scoreBefore : '-',
                            'Score Depois': hit.scoreAfter !== undefined ? hit.scoreAfter : '-'
                        });
                    });
                }
            });
        });

        const wsDetails = XLSX.utils.json_to_sheet(
            detailedRows.length > 0 ? detailedRows : [{ 'Aviso': 'Nenhum detalhe de fases registrado' }]
        );
        wsDetails['!cols'] = [
            { wch: 22 }, // Aluno
            { wch: 10 }, // Fase
            { wch: 14 }, // Resultado
            { wch: 12 }, // Operacao
            { wch: 14 }, // Faixa
            { wch: 12 }, // Operacao
            { wch: 12 }, // Qualidade
            { wch: 55 }, // Opcoes na Pista
            { wch: 14 }, // Score Antes
            { wch: 14 }  // Score Depois
        ];
        XLSX.utils.book_append_sheet(wb, wsDetails, 'Decisoes por Operacao');

        // ==========================================
        // 4. Aba: "Gabarito das Fases"
        // ==========================================
        const levelConcepts = [
            'Adicao (Soma)',
            'Adicao e Subtracao',
            'Multiplicacao (Fatores e Dobro)',
            'Multiplicacao e Divisao',
            'Quatro Operacoes (Desafio 1)',
            'Quatro Operacoes (Desafio 2)',
            'Quatro Operacoes (Desafio 3)',
            'Quatro Operacoes (Desafio Final)'
        ];

        const matrixRows = [];

        (levels || []).forEach((lvl, lvlIdx) => {
            const finishGate = lvl.find(g => g.type === 'finish');
            const targetScore = finishGate ? finishGate.value : 100;
            const concept = levelConcepts[lvlIdx] || `Operacoes Mistas (Fase ${lvlIdx + 1})`;

            const yGroups = {};
            lvl.forEach(g => {
                if (g.type === 'finish') return;
                if (!yGroups[g.y]) yGroups[g.y] = {};
                yGroups[g.y][g.lane] = g;
            });

            const sortedYs = Object.keys(yGroups).map(Number).sort((a, b) => b - a);

            sortedYs.forEach((yCoord, cpIdx) => {
                const lane0 = yGroups[yCoord][0];
                const lane1 = yGroups[yCoord][1];
                const lane2 = yGroups[yCoord][2];

                matrixRows.push({
                    'Fase': `Fase ${lvlIdx + 1}`,
                    'Meta (pts)': targetScore,
                    'Operacao': `Operacao ${cpIdx + 1}`,
                    'Esquerda': formatLaneOption(lane0),
                    'Centro': formatLaneOption(lane1),
                    'Direita': formatLaneOption(lane2),
                    'Foco Pedagogico': concept
                });
            });
        });

        const wsMatrix = XLSX.utils.json_to_sheet(
            matrixRows.length > 0 ? matrixRows : [{ 'Aviso': 'Nenhuma configuracao de fases encontrada' }]
        );
        wsMatrix['!cols'] = [
            { wch: 10 }, // Fase
            { wch: 12 }, // Meta
            { wch: 12 }, // Operacao
            { wch: 20 }, // Esquerda
            { wch: 20 }, // Centro
            { wch: 20 }, // Direita
            { wch: 36 }  // Foco Pedagogico
        ];
        XLSX.utils.book_append_sheet(wb, wsMatrix, 'Gabarito das Fases');

        // Download
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const fileName = customFileName || `auditoria_pedagogica_carro_matematico_${dateStr}.xlsx`;

        XLSX.writeFile(wb, fileName);
        return true;
    }

    static exportSinglePlayer(playerEntry) {
        if (!playerEntry) return false;
        const cleanName = stripEmojis(playerEntry.name || 'aluno').toLowerCase().replace(/[^a-z0-9]/g, '_') || 'aluno';
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const customFileName = `relatorio_aluno_${cleanName}_${dateStr}.xlsx`;
        return this.exportScoreboard([playerEntry], customFileName);
    }
}
