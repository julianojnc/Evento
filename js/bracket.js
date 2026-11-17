/**
 * FUT-DOMINÓ ARENA - MOTOR DE CHAVEAMENTO (BRACKET ENGINE)
 * Gera e gerencia torneios eliminatórios (Mata-Mata), com suporte a BYEs,
 * avanço de fases, pontuação e definição do campeão.
 */

const BracketEngine = {
  // Retorna a próxima potência de 2
  getNextPowerOfTwo(n) {
    let power = 2;
    while (power < n) {
      power *= 2;
    }
    return power;
  },

  // Nome amigável para as fases do mata-mata
  getRoundName(roundsTotal, roundIndex) {
    const roundsRemaining = roundsTotal - roundIndex;
    if (roundsRemaining === 1) return 'Grande Final';
    if (roundsRemaining === 2) return 'Semifinais';
    if (roundsRemaining === 3) return 'Quartas de Final';
    if (roundsRemaining === 4) return 'Oitavas de Final';
    if (roundsRemaining === 5) return '16-avos de Final';
    return `Rodada ${roundIndex + 1}`;
  },

  // Embaralhar array (Fisher-Yates) para sorteio
  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  /**
   * Gera a estrutura completa de chaveamento para uma lista de participantes
   * @param {Array} participants - Lista de equipes ou duplas
   * @param {boolean} randomize - Se verdadeiro, sorteia os confrontos
   */
  createBracket(participants, randomize = true) {
    if (!participants || participants.length < 2) {
      throw new Error('É necessário ter pelo menos 2 participantes para gerar o chaveamento.');
    }

    const teamList = randomize ? this.shuffle(participants) : [...participants];
    const totalTeams = teamList.length;
    const bracketSize = this.getNextPowerOfTwo(totalTeams);
    const totalRounds = Math.log2(bracketSize);
    const matchesCountR1 = bracketSize / 2;
    const numByes = bracketSize - totalTeams;

    // Distribuição balanceada de confrontos e BYEs na Rodada 1
    // Como totalTeams > bracketSize / 2, numByes < matchesCountR1
    // Cada BYE é pareado com um time real (nenhum confronto BYE x BYE)
    const round1Matches = [];
    let teamCursor = 0;

    for (let m = 0; m < matchesCountR1; m++) {
      let slot1, slot2;

      if (m < numByes) {
        // Confronto com BYE (o time real avança automaticamente)
        const team = teamList[teamCursor++];
        slot1 = {
          id: team.id,
          name: team.nome || team.nomeDupla || `Equipe ${teamCursor}`,
          isBye: false
        };
        slot2 = {
          id: null,
          name: 'BYE (Avança direto)',
          isBye: true
        };
      } else {
        // Confronto normal entre dois times reais
        const t1 = teamList[teamCursor++];
        const t2 = teamList[teamCursor++];
        slot1 = {
          id: t1.id,
          name: t1.nome || t1.nomeDupla || `Equipe ${teamCursor - 1}`,
          isBye: false
        };
        slot2 = {
          id: t2.id,
          name: t2.nome || t2.nomeDupla || `Equipe ${teamCursor}`,
          isBye: false
        };
      }

      const match = {
        id: `r0-m${m}`,
        roundIndex: 0,
        matchIndex: m,
        team1: {
          id: slot1.id,
          name: slot1.name,
          score: '',
          isWinner: false,
          isBye: slot1.isBye
        },
        team2: {
          id: slot2.id,
          name: slot2.name,
          score: '',
          isWinner: false,
          isBye: slot2.isBye
        },
        winnerId: null,
        winnerName: null,
        status: 'pending'
      };

      // Se o slot 2 for BYE, slot 1 avança imediatamente
      if (slot2.isBye && !slot1.isBye) {
        match.team1.isWinner = true;
        match.winnerId = slot1.id;
        match.winnerName = slot1.name;
        match.status = 'finished';
      }

      round1Matches.push(match);
    }

    const rounds = [];
    rounds.push({
      roundIndex: 0,
      name: this.getRoundName(totalRounds, 0),
      matches: round1Matches
    });

    // Rodadas seguintes (vazias, aguardando vencedores)
    for (let r = 1; r < totalRounds; r++) {
      const matchesCount = Math.pow(2, totalRounds - r - 1);
      const roundMatches = [];

      for (let m = 0; m < matchesCount; m++) {
        roundMatches.push({
          id: `r${r}-m${m}`,
          roundIndex: r,
          matchIndex: m,
          team1: { id: null, name: 'Aguardando...', score: '', isWinner: false, isBye: false },
          team2: { id: null, name: 'Aguardando...', score: '', isWinner: false, isBye: false },
          winnerId: null,
          winnerName: null,
          status: 'pending'
        });
      }

      rounds.push({
        roundIndex: r,
        name: this.getRoundName(totalRounds, r),
        matches: roundMatches
      });
    }

    const bracket = {
      id: `bracket-${Date.now()}`,
      dataCriacao: new Date().toISOString(),
      bracketSize,
      totalRounds,
      champion: null,
      rounds
    };

    // Propagar os que já venceram por BYE na Rodada 1
    for (const match of round1Matches) {
      if (match.status === 'finished' && match.winnerId) {
        this.propagateWinner(bracket, 0, match.matchIndex, match.winnerId, match.winnerName);
      }
    }

    return bracket;
  },

  /**
   * Propaga o vencedor de uma partida para a próxima rodada
   */
  propagateWinner(bracket, roundIndex, matchIndex, winnerId, winnerName) {
    const nextRoundIndex = roundIndex + 1;
    if (nextRoundIndex >= bracket.totalRounds) {
      // Venceu a grande final!
      bracket.champion = {
        id: winnerId,
        name: winnerName
      };
      return;
    }

    const nextMatchIndex = Math.floor(matchIndex / 2);
    const slot = matchIndex % 2 === 0 ? 'team1' : 'team2';
    const nextMatch = bracket.rounds[nextRoundIndex].matches[nextMatchIndex];

    // Se o time anterior no slot for diferente, limpar cascata posterior
    if (nextMatch[slot].id !== winnerId) {
      this.clearDownstreamWinner(bracket, nextRoundIndex, nextMatchIndex);
    }

    nextMatch[slot].id = winnerId;
    nextMatch[slot].name = winnerName;
    nextMatch[slot].score = '';
    nextMatch[slot].isWinner = false;
  },

  /**
   * Limpa a cascata caso um resultado anterior seja alterado/corrigido
   */
  clearDownstreamWinner(bracket, roundIndex, matchIndex) {
    if (roundIndex >= bracket.totalRounds) {
      bracket.champion = null;
      return;
    }

    const currentMatch = bracket.rounds[roundIndex].matches[matchIndex];
    if (currentMatch.status === 'finished') {
      currentMatch.status = 'pending';
      currentMatch.winnerId = null;
      currentMatch.winnerName = null;
      currentMatch.team1.isWinner = false;
      currentMatch.team2.isWinner = false;

      const nextRoundIndex = roundIndex + 1;
      if (nextRoundIndex < bracket.totalRounds) {
        const nextMatchIndex = Math.floor(matchIndex / 2);
        const slot = matchIndex % 2 === 0 ? 'team1' : 'team2';
        const nextMatch = bracket.rounds[nextRoundIndex].matches[nextMatchIndex];
        nextMatch[slot] = { id: null, name: 'Aguardando...', score: '', isWinner: false, isBye: false };
        this.clearDownstreamWinner(bracket, nextRoundIndex, nextMatchIndex);
      } else {
        bracket.champion = null;
      }
    }
  },

  /**
   * Define o vencedor de uma partida específica
   */
  setWinner(bracket, roundIndex, matchIndex, winningTeamSlot) {
    const round = bracket.rounds[roundIndex];
    if (!round) return null;

    const match = round.matches[matchIndex];
    if (!match) return null;

    const winningTeam = match[winningTeamSlot];
    if (!winningTeam || !winningTeam.id || winningTeam.isBye) {
      return null; // Não pode definir vencedor se o slot estiver vazio ou for BYE
    }

    const otherSlot = winningTeamSlot === 'team1' ? 'team2' : 'team1';

    match[winningTeamSlot].isWinner = true;
    match[otherSlot].isWinner = false;
    match.winnerId = winningTeam.id;
    match.winnerName = winningTeam.name;
    match.status = 'finished';

    // Propaga para a próxima fase
    this.propagateWinner(bracket, roundIndex, matchIndex, winningTeam.id, winningTeam.name);

    return bracket;
  },

  /**
   * Atualiza os placares digitados
   */
  updateScore(bracket, roundIndex, matchIndex, teamSlot, scoreValue) {
    const round = bracket.rounds[roundIndex];
    if (!round) return;
    const match = round.matches[matchIndex];
    if (!match) return;

    match[teamSlot].score = scoreValue;
  }
};
