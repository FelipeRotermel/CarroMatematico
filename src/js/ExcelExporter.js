/**
 * ExcelExporter.js - Generates and Downloads Pedagogical .xlsx Workbooks
 */

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
    // If dateStr doesn't contain time (hours), append default time or keep formatted
    if (!dateStr.includes(':')) {
        const now = new Date();
        return `${dateStr} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return dateStr;
}

export class ExcelExporter {
    static exportScoreboard(scoreboardData, customFileName = null) {
        if (!window.XLSX) {
            console.error('SheetJS (XLSX) library is not loaded');
            alert('A biblioteca de exportação Excel não foi carregada.');
            return false;
        }

        const XLSX = window.XLSX;
        const wb = XLSX.utils.book_new();

        // Labels mapping (clean text without emojis)
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
        // 1. Aba: "Placar Geral"
        // ==========================================
        const generalRows = [];

        (scoreboardData || []).forEach((row, idx) => {
            const history = row.history || [];
            let totalGood = 0;
            let totalBad = 0;
            let levelsCompletedCount = 0;

            history.forEach(lvl => {
                if (lvl.success) levelsCompletedCount++;
                totalGood += (lvl.goodHits || []).length;
                totalBad += (lvl.badHits || []).length;
            });

            const diffText = diffLabels[row.difficulty] || stripEmojis(row.diffName) || 'Medio (1.0x)';
            const statusText = reasonLabels[row.reason] || stripEmojis(row.reason) || 'Concluido';

            generalRows.push({
                'Posicao': `${idx + 1}`,
                'Nome do Aluno': stripEmojis(row.name) || 'Anonimo',
                'Dificuldade': diffText,
                'Pontuacao Total (pts)': row.score || 0,
                'Status Final': statusText,
                'Data e Horario': formatDateTime(row.date),
                'Fases Jogadas': history.length,
                'Fases Concluidas': levelsCompletedCount,
                'Total Acertos (Nitro)': totalGood,
                'Total Erros (Cones)': totalBad
            });
        });

        const wsGeneral = XLSX.utils.json_to_sheet(
            generalRows.length > 0 ? generalRows : [{ 'Aviso': 'Nenhum dado registrado no placar' }]
        );

        // Define column widths for Sheet 1
        wsGeneral['!cols'] = [
            { wch: 10 }, // Posicao
            { wch: 24 }, // Nome do Aluno
            { wch: 20 }, // Dificuldade
            { wch: 22 }, // Pontuacao Total
            { wch: 20 }, // Status Final
            { wch: 20 }, // Data e Horario
            { wch: 16 }, // Fases Jogadas
            { wch: 18 }, // Fases Concluidas
            { wch: 24 }, // Total Acertos (Nitro)
            { wch: 22 }  // Total Erros (Cones)
        ];

        XLSX.utils.book_append_sheet(wb, wsGeneral, 'Placar Geral');

        // ==========================================
        // 2. Aba: "Detalhamento Pedagógico"
        // ==========================================
        const detailedRows = [];

        (scoreboardData || []).forEach((row) => {
            const history = row.history || [];
            const diffText = diffLabels[row.difficulty] || stripEmojis(row.diffName) || 'Medio';
            const studentName = stripEmojis(row.name) || 'Anonimo';
            const studentDate = formatDateTime(row.date);

            history.forEach((lvl) => {
                const goodList = (lvl.goodHits || []).map(h => `${h.type === 'mul' ? 'x' : '+'}${h.value}`).join(', ') || 'Nenhum';
                const badList = (lvl.badHits || []).map(h => `${h.type === 'div' ? '/' : '-'}${h.value}`).join(', ') || '0 erros';

                detailedRows.push({
                    'Nome do Aluno': studentName,
                    'Dificuldade': diffText,
                    'Fase': `Fase ${lvl.levelIndex + 1}`,
                    'Resultado': lvl.success ? 'Concluida' : 'Falhou',
                    'Pontuacao da Fase': lvl.score || 0,
                    'Multiplicador': lvl.multiplier ? `${lvl.multiplier}x` : '1.0x',
                    'Qtd. Acertos': (lvl.goodHits || []).length,
                    'Operacoes de Acerto': goodList,
                    'Total Erros (Cones)': (lvl.badHits || []).length,
                    'Operacoes de Erro': badList,
                    'Data e Horario': studentDate
                });
            });
        });

        const wsDetails = XLSX.utils.json_to_sheet(
            detailedRows.length > 0 ? detailedRows : [{ 'Aviso': 'Nenhum detalhe de fases registrado' }]
        );

        // Define column widths for Sheet 2
        wsDetails['!cols'] = [
            { wch: 24 }, // Nome do Aluno
            { wch: 18 }, // Dificuldade
            { wch: 12 }, // Fase
            { wch: 16 }, // Resultado
            { wch: 18 }, // Pontuacao da Fase
            { wch: 14 }, // Multiplicador
            { wch: 14 }, // Qtd. Acertos
            { wch: 30 }, // Operacoes de Acerto
            { wch: 20 }, // Total Erros (Cones)
            { wch: 30 }, // Operacoes de Erro
            { wch: 20 }  // Data e Horario
        ];

        XLSX.utils.book_append_sheet(wb, wsDetails, 'Detalhamento por Fase');

        // File download
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const fileName = customFileName || `placar_carro_matematico_${dateStr}.xlsx`;

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
