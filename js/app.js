/**
 * EVENTO FACOM - GESTÃO DO TORNEIO (APP.JS)
 * Orquestração das telas de Participantes, Chaveamentos (Futebol/Dominó) e JSON.
 */

const App = {
  activeTab: 'participantes',
  participantFilter: 'all',
  searchQuery: '',

  // Inicialização
  init() {
    this.bindEvents();
    this.refreshAll();
  },

  // Vinculação de eventos do DOM
  bindEvents() {
    // Navegação por abas
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // Filtros de participantes
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.participantFilter = btn.getAttribute('data-filter');
        this.renderParticipants();
      });
    });

    // Busca de participantes
    const searchInput = document.getElementById('input-search-participants');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderParticipants();
      });
    }

    // Ações de Chaveamento - Futebol
    const btnFutSorteio = document.getElementById('btn-gerar-fut-sorteio');
    if (btnFutSorteio) {
      btnFutSorteio.addEventListener('click', () => this.generateBracket('futebol', true));
    }
    const btnFutOrdem = document.getElementById('btn-gerar-fut-ordem');
    if (btnFutOrdem) {
      btnFutOrdem.addEventListener('click', () => this.generateBracket('futebol', false));
    }
    const btnFutReset = document.getElementById('btn-reset-fut');
    if (btnFutReset) {
      btnFutReset.addEventListener('click', () => this.resetBracket('futebol'));
    }

    // Ações de Chaveamento - Dominó
    const btnDomSorteio = document.getElementById('btn-gerar-dom-sorteio');
    if (btnDomSorteio) {
      btnDomSorteio.addEventListener('click', () => this.generateBracket('domino', true));
    }
    const btnDomOrdem = document.getElementById('btn-gerar-dom-ordem');
    if (btnDomOrdem) {
      btnDomOrdem.addEventListener('click', () => this.generateBracket('domino', false));
    }
    const btnDomReset = document.getElementById('btn-reset-dom');
    if (btnDomReset) {
      btnDomReset.addEventListener('click', () => this.resetBracket('domino'));
    }

    // Sincronização com GitHub (Consumir)
    const inputGithubUrl = document.getElementById('input-github-url');
    const btnSyncGithub = document.getElementById('btn-sync-github');
    if (inputGithubUrl) {
      inputGithubUrl.value = StorageManager.getGitHubUrl() || 'https://raw.githubusercontent.com/julianojnc/Evento/main/dados.json';
    }
    if (btnSyncGithub && inputGithubUrl) {
      btnSyncGithub.addEventListener('click', async () => {
        const url = inputGithubUrl.value.trim();
        btnSyncGithub.disabled = true;
        btnSyncGithub.textContent = 'Carregando...';
        
        // Tentar via API primeiro (para evitar cache do GitHub Raw)
        let res = null;
        try {
          const apiRes = await fetch('/api/cadastrar');
          if (apiRes.ok) {
            const apiJson = await apiRes.json();
            res = StorageManager.importFromJSON(JSON.stringify(apiJson));
          }
        } catch (e) {}

        // Fallback para URL Raw se a API local/token não retornar
        if (!res || !res.success) {
          res = await StorageManager.fetchFromGitHubOrLocal(url);
        }

        btnSyncGithub.disabled = false;
        btnSyncGithub.textContent = 'Consumir do GitHub';

        if (res.success) {
          this.refreshAll();
          this.showToast(`dados.json sincronizado com sucesso do GitHub! (${res.countFut} times, ${res.countDom} duplas)`, 'success');
        } else {
          this.showToast(`Falha ao sincronizar: ${res.error}`, 'error');
        }
      });
    }

    // Gravar dados completos no GitHub
    const btnPushGithub = document.getElementById('btn-push-github');
    if (btnPushGithub) {
      btnPushGithub.addEventListener('click', async () => {
        if (!confirm('Deseja salvar e comitar o estado atual dos chaveamentos e equipes diretamente no GitHub?')) return;
        btnPushGithub.disabled = true;
        btnPushGithub.textContent = 'Gravando no GitHub...';
        try {
          const fullData = StorageManager.loadData();
          const res = await fetch('/api/cadastrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullData })
          });
          const json = await res.json();
          if (res.ok && json.success) {
            this.showToast('Chaveamento e dados comitados no GitHub com sucesso!', 'success');
          } else {
            this.showToast(`Erro ao gravar no GitHub: ${json.message || 'Verifique o GITHUB_TOKEN na Vercel'}`, 'error');
          }
        } catch (err) {
          this.showToast(`Erro de rede: ${err.message}`, 'error');
        } finally {
          btnPushGithub.disabled = false;
          btnPushGithub.textContent = 'Gravar Chaveamento no GitHub';
        }
      });
    }

    // Ações de Backup & JSON
    const btnExportJson = document.getElementById('btn-export-json');
    if (btnExportJson) {
      btnExportJson.addEventListener('click', () => {
        StorageManager.exportToJSONFile();
        this.showToast('dados.json baixado com sucesso!', 'success');
      });
    }
    const btnQuickExport = document.getElementById('btn-quick-export');
    if (btnQuickExport) {
      btnQuickExport.addEventListener('click', () => {
        StorageManager.exportToJSONFile();
        this.showToast('dados.json baixado com sucesso!', 'success');
      });
    }

    // Importação de arquivo JSON
    const fileInput = document.getElementById('input-import-file');
    const btnTriggerImport = document.getElementById('btn-trigger-import');
    if (fileInput && btnTriggerImport) {
      btnTriggerImport.addEventListener('click', () => {
        fileInput.value = '';
        fileInput.click();
      });

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const result = StorageManager.importFromJSON(event.target.result);
          if (result.success) {
            this.refreshAll();
            this.showToast(`Dados importados! (${result.countFut} times, ${result.countDom} duplas)`, 'success');
          } else {
            this.showToast(`Erro ao importar: ${result.error}`, 'error');
          }
        };
        reader.readAsText(file);
      });
    }

    // Carregar dados de teste
    const handleSampleLoad = () => {
      if (confirm('Deseja carregar 8 equipes de futebol e 8 duplas de dominó para demonstração?')) {
        StorageManager.loadSampleData();
        this.refreshAll();
        this.showToast('8 equipes e 8 duplas de teste carregadas com sucesso!', 'success');
      }
    };
    const btnSeedSample = document.getElementById('btn-seed-sample');
    if (btnSeedSample) btnSeedSample.addEventListener('click', handleSampleLoad);
    const btnQuickSample = document.getElementById('btn-quick-sample');
    if (btnQuickSample) btnQuickSample.addEventListener('click', handleSampleLoad);

    // Copiar JSON
    const btnCopyJson = document.getElementById('btn-copy-json');
    if (btnCopyJson) {
      btnCopyJson.addEventListener('click', () => {
        const jsonStr = StorageManager.getJSONString();
        navigator.clipboard.writeText(jsonStr).then(() => {
          this.showToast('JSON copiado para a área de transferência!', 'info');
        }).catch(() => {
          this.showToast('Não foi possível copiar automaticamente.', 'error');
        });
      });
    }

    // Zerar todos os dados
    const btnClearAll = document.getElementById('btn-clear-all');
    if (btnClearAll) {
      btnClearAll.addEventListener('click', () => {
        if (confirm('ATENÇÃO: Deseja realmente excluir todas as equipes, duplas e chaveamentos? Esta ação não pode ser desfeita.')) {
          StorageManager.clearAll();
          this.refreshAll();
          this.showToast('Todos os dados foram resetados.', 'info');
        }
      });
    }

    // Fechar Modal
    const modalCloseBtn = document.getElementById('modal-close-btn');
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', () => this.closeModal());
    }
    const editModal = document.getElementById('edit-modal');
    if (editModal) {
      editModal.addEventListener('click', (e) => {
        if (e.target.id === 'edit-modal') this.closeModal();
      });
    }
  },

  // Alternar abas da aplicação
  switchTab(tabId) {
    this.activeTab = tabId;

    // Atualiza botões
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    // Atualiza painéis
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `pane-${tabId}`);
    });

    // Ações ao abrir abas
    if (tabId === 'participantes') {
      this.renderParticipants();
    } else if (tabId === 'chaveamento-fut') {
      this.renderBracketView('futebol');
    } else if (tabId === 'chaveamento-dom') {
      this.renderBracketView('domino');
    } else if (tabId === 'dados') {
      this.updateJSONViewer();
    }
  },

  // Atualizar contadores e visualizações gerais
  refreshAll() {
    const data = StorageManager.loadData();
    const futCount = data.futebol.equipes.length;
    const domCount = data.domino.duplas.length;
    const totalCount = futCount + domCount;

    // Badges no Header
    const bTotal = document.getElementById('badge-total-participantes');
    if (bTotal) bTotal.textContent = totalCount;
    const bFut = document.getElementById('badge-fut-count');
    if (bFut) bFut.textContent = futCount;
    const bDom = document.getElementById('badge-dom-count');
    if (bDom) bDom.textContent = domCount;

    // Quick Stats Bar
    const sFut = document.getElementById('stat-futebol-count');
    if (sFut) sFut.textContent = `${futCount} ${futCount === 1 ? 'Equipe' : 'Equipes'}`;
    const sDom = document.getElementById('stat-domino-count');
    if (sDom) sDom.textContent = `${domCount} ${domCount === 1 ? 'Dupla' : 'Duplas'}`;

    // Filtros de participantes
    const fAll = document.getElementById('count-filter-all');
    if (fAll) fAll.textContent = totalCount;
    const fFut = document.getElementById('count-filter-fut');
    if (fFut) fFut.textContent = futCount;
    const fDom = document.getElementById('count-filter-dom');
    if (fDom) fDom.textContent = domCount;

    this.updateJSONViewer();

    if (this.activeTab === 'participantes') {
      this.renderParticipants();
    } else if (this.activeTab === 'chaveamento-fut') {
      this.renderBracketView('futebol');
    } else if (this.activeTab === 'chaveamento-dom') {
      this.renderBracketView('domino');
    }
  },

  // Renderizar a listagem de Participantes (Equipes e Duplas)
  renderParticipants() {
    const grid = document.getElementById('participants-grid');
    if (!grid) return;

    const data = StorageManager.loadData();
    let items = [];

    if (this.participantFilter === 'all' || this.participantFilter === 'futebol') {
      items.push(...data.futebol.equipes.map(e => ({ ...e, tipo: 'futebol' })));
    }
    if (this.participantFilter === 'all' || this.participantFilter === 'domino') {
      items.push(...data.domino.duplas.map(d => ({ ...d, tipo: 'domino' })));
    }

    // Filtrar por busca textual
    if (this.searchQuery) {
      items = items.filter(item => {
        const query = this.searchQuery;
        if (item.tipo === 'futebol') {
          return (
            item.nome.toLowerCase().includes(query) ||
            item.capitao.toLowerCase().includes(query) ||
            (item.jogadores && item.jogadores.some(j => j.toLowerCase().includes(query)))
          );
        } else {
          return (
            item.nomeDupla.toLowerCase().includes(query) ||
            item.jogador1.toLowerCase().includes(query) ||
            item.jogador2.toLowerCase().includes(query)
          );
        }
      });
    }

    if (items.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">📋</div>
          <h3>Nenhum participante encontrado</h3>
          <p>Cadastre novas equipes de futebol ou duplas de dominó para o Evento Facom.</p>
          <a href="index.html" class="btn btn-primary">Fazer Inscrição</a>
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map(item => {
      const isFut = item.tipo === 'futebol';
      const avatarClass = isFut ? 'fut' : 'dom';
      const badgeClass = isFut ? 'badge-fut' : 'badge-dom';
      const typeLabel = isFut ? 'Futebol' : 'Dominó';
      const title = isFut ? item.nome : item.nomeDupla;
      const initial = title ? title.charAt(0).toUpperCase() : '?';

      let detailsHtml = '';
      if (isFut) {
        const players = item.jogadores || [];
        const chips = players.slice(0, 6).map(p => `<span class="player-chip">${this.escapeHtml(p)}</span>`).join('');
        const extra = players.length > 6 ? `<span class="player-chip">+${players.length - 6}</span>` : '';

        detailsHtml = `
          <div class="meta-row">
            <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span><strong>Capitão:</strong> ${this.escapeHtml(item.capitao)}</span>
          </div>
          <div class="players-chips">${chips}${extra}</div>
        `;
      } else {
        detailsHtml = `
          <div class="meta-row">
            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span><strong>Dupla:</strong> ${this.escapeHtml(item.jogador1)} & ${this.escapeHtml(item.jogador2)}</span>
          </div>
        `;
      }

      return `
        <div class="team-card">
          <div>
            <div class="team-card-header">
              <div class="team-title-wrap">
                <div class="team-avatar ${avatarClass}">${initial}</div>
                <div>
                  <h3 class="team-name">${this.escapeHtml(title)}</h3>
                </div>
              </div>
              <span class="badge-tag ${badgeClass}">${typeLabel}</span>
            </div>

            <div class="team-meta">
              ${detailsHtml}
            </div>
          </div>

          <div class="team-card-actions">
            <span class="card-date">Cadastrado em ${new Date(item.dataCadastro).toLocaleDateString('pt-BR')}</span>
            <div class="action-btns">
              <button class="btn btn-outline btn-sm" onclick="App.openEditModal('${item.tipo}', '${item.id}')" title="Editar">
                Editar
              </button>
              <button class="btn btn-danger-outline btn-sm" onclick="App.handleDelete('${item.tipo}', '${item.id}', '${this.escapeHtml(title)}')" title="Excluir">
                Excluir
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  // Modal de Edição (Sem campos removidos)
  openEditModal(tipo, id) {
    const data = StorageManager.loadData();
    const isFut = tipo === 'futebol';
    const item = isFut
      ? data.futebol.equipes.find(e => e.id === id)
      : data.domino.duplas.find(d => d.id === id);

    if (!item) return;

    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body-content');
    modalTitle.textContent = isFut ? `Editar Equipe: ${item.nome}` : `Editar Dupla: ${item.nomeDupla}`;

    if (isFut) {
      modalBody.innerHTML = `
        <form id="form-edit-modal">
          <div class="form-grid">
            <div class="form-group col-full">
              <label class="form-label">Nome da Equipe</label>
              <input type="text" id="edit-fut-nome" class="form-control" value="${this.escapeHtml(item.nome)}" required>
            </div>
            <div class="form-group col-full">
              <label class="form-label">Capitão / Responsável</label>
              <input type="text" id="edit-fut-capitao" class="form-control" value="${this.escapeHtml(item.capitao)}" required>
            </div>
            <div class="form-group col-full">
              <label class="form-label">Lista de Atletas (1 por linha)</label>
              <textarea id="edit-fut-jogadores" class="form-control">${(item.jogadores || []).join('\n')}</textarea>
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar Alterações</button>
          </div>
        </form>
      `;
    } else {
      modalBody.innerHTML = `
        <form id="form-edit-modal">
          <div class="form-grid">
            <div class="form-group col-full">
              <label class="form-label">Nome da Dupla</label>
              <input type="text" id="edit-dom-nome" class="form-control" value="${this.escapeHtml(item.nomeDupla)}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Jogador 1</label>
              <input type="text" id="edit-dom-jog1" class="form-control" value="${this.escapeHtml(item.jogador1)}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Jogador 2</label>
              <input type="text" id="edit-dom-jog2" class="form-control" value="${this.escapeHtml(item.jogador2)}" required>
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary">Salvar Alterações</button>
          </div>
        </form>
      `;
    }

    document.getElementById('form-edit-modal').addEventListener('submit', (e) => {
      e.preventDefault();
      if (isFut) {
        const nome = document.getElementById('edit-fut-nome').value.trim();
        const capitao = document.getElementById('edit-fut-capitao').value.trim();
        const jogadores = document.getElementById('edit-fut-jogadores').value
          .split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0);

        StorageManager.updateEntry('futebol', id, { nome, capitao, jogadores });
      } else {
        const nomeDupla = document.getElementById('edit-dom-nome').value.trim();
        const jogador1 = document.getElementById('edit-dom-jog1').value.trim();
        const jogador2 = document.getElementById('edit-dom-jog2').value.trim();

        StorageManager.updateEntry('domino', id, { nomeDupla, jogador1, jogador2 });
      }

      this.closeModal();
      this.refreshAll();
      this.showToast('Alterações salvas com sucesso!', 'success');
    });

    document.getElementById('edit-modal').classList.add('active');
  },

  closeModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) modal.classList.remove('active');
  },

  // Exclusão de participante
  handleDelete(tipo, id, nome) {
    if (confirm(`Tem certeza que deseja excluir "${nome}"?`)) {
      StorageManager.deleteEntry(tipo, id);
      this.refreshAll();
      this.showToast(`"${nome}" foi removido com sucesso.`, 'info');
    }
  },

  // Gerar chaveamento
  generateBracket(tipo, randomize = true) {
    const data = StorageManager.loadData();
    const participants = tipo === 'futebol' ? data.futebol.equipes : data.domino.duplas;

    if (!participants || participants.length < 2) {
      this.showToast(`É necessário ter no mínimo 2 participantes em ${tipo === 'futebol' ? 'Futebol' : 'Dominó'}.`, 'error');
      return;
    }

    try {
      const bracket = BracketEngine.createBracket(participants, randomize);
      StorageManager.saveBracket(tipo, bracket);
      this.renderBracketView(tipo);
      this.updateJSONViewer();
      this.showToast(`Chaveamento de ${tipo === 'futebol' ? 'Futebol' : 'Dominó'} gerado com sucesso!`, 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  // Limpar chaveamento
  resetBracket(tipo) {
    if (confirm(`Deseja limpar o chaveamento de ${tipo === 'futebol' ? 'Futebol' : 'Dominó'}? As equipes cadastradas serão mantidas.`)) {
      StorageManager.clearBracket(tipo);
      this.renderBracketView(tipo);
      this.updateJSONViewer();
      this.showToast('Chaveamento limpo.', 'info');
    }
  },

  // Renderizar a visualização visual do chaveamento (árvore mata-mata)
  renderBracketView(tipo) {
    const containerId = tipo === 'futebol' ? 'bracket-container-fut' : 'bracket-container-dom';
    const container = document.getElementById(containerId);
    if (!container) return;

    const data = StorageManager.loadData();
    const bracket = tipo === 'futebol' ? data.futebol.chaveamento : data.domino.chaveamento;
    const participants = tipo === 'futebol' ? data.futebol.equipes : data.domino.duplas;

    if (!bracket || !bracket.rounds || bracket.rounds.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🏆</div>
          <h3>Chaveamento não gerado</h3>
          <p>Você tem <strong>${participants.length}</strong> ${tipo === 'futebol' ? 'equipes' : 'duplas'} cadastradas. Clique no botão abaixo para gerar o chaveamento do Evento Facom.</p>
          <button class="btn btn-primary" onclick="App.generateBracket('${tipo}', true)">
            Sortear Chaves Agora
          </button>
        </div>
      `;
      return;
    }

    // Colunas de fases e pódio
    let roundsHtml = bracket.rounds.map((round) => {
      const matchesHtml = round.matches.map((match) => {
        const team1IsWinner = match.team1.isWinner;
        const team2IsWinner = match.team2.isWinner;
        const isFinished = match.status === 'finished';

        const team1Class = [
          'match-team-row',
          team1IsWinner ? 'winner' : '',
          isFinished && !team1IsWinner ? 'loser' : '',
          !match.team1.id ? 'empty-slot' : ''
        ].filter(Boolean).join(' ');

        const team2Class = [
          'match-team-row',
          team2IsWinner ? 'winner' : '',
          isFinished && !team2IsWinner ? 'loser' : '',
          !match.team2.id ? 'empty-slot' : ''
        ].filter(Boolean).join(' ');

        const canPickT1 = match.team1.id && !match.team1.isBye;
        const canPickT2 = match.team2.id && !match.team2.isBye;

        return `
          <div class="match-card" id="match-card-${match.id}">
            <div class="match-header">
              <span>Jogo ${match.matchIndex + 1}</span>
              <span class="match-status-badge ${isFinished ? 'finished' : ''}">${isFinished ? 'Finalizado' : 'Aguardando'}</span>
            </div>

            <div class="match-teams">
              <!-- Equipe 1 -->
              <div class="${team1Class}" ${canPickT1 ? `onclick="App.handleSetWinner('${tipo}', ${round.roundIndex}, ${match.matchIndex}, 'team1')"` : ''} title="${canPickT1 ? 'Clique para avançar este vencedor' : ''}">
                <div class="team-info-left">
                  <span class="team-seed-badge">1</span>
                  <span class="team-name-text">${this.escapeHtml(match.team1.name || 'A definir')}</span>
                </div>
                <input type="text" class="team-score-input" value="${match.team1.score || ''}" placeholder="0" 
                  onclick="event.stopPropagation();"
                  onchange="App.handleScoreChange('${tipo}', ${round.roundIndex}, ${match.matchIndex}, 'team1', this.value)">
              </div>

              <!-- Equipe 2 -->
              <div class="${team2Class}" ${canPickT2 ? `onclick="App.handleSetWinner('${tipo}', ${round.roundIndex}, ${match.matchIndex}, 'team2')"` : ''} title="${canPickT2 ? 'Clique para avançar este vencedor' : ''}">
                <div class="team-info-left">
                  <span class="team-seed-badge">2</span>
                  <span class="team-name-text">${this.escapeHtml(match.team2.name || 'A definir')}</span>
                </div>
                <input type="text" class="team-score-input" value="${match.team2.score || ''}" placeholder="0" 
                  onclick="event.stopPropagation();"
                  onchange="App.handleScoreChange('${tipo}', ${round.roundIndex}, ${match.matchIndex}, 'team2', this.value)">
              </div>
            </div>

            <div class="match-footer">
              <span>Clique na equipe para vencer</span>
              ${isFinished && match.winnerName ? `<span style="color: var(--fut-tag-text); font-weight: 700;">✓ ${this.escapeHtml(match.winnerName)}</span>` : ''}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="bracket-round-column">
          <div class="round-header">
            <h3>${round.name}</h3>
            <span>${round.matches.length} ${round.matches.length === 1 ? 'confronto' : 'confrontos'}</span>
          </div>
          <div class="matches-column">
            ${matchesHtml}
          </div>
        </div>
      `;
    }).join('');

    // Pódio do Campeão
    const champion = bracket.champion;
    const podiumHtml = `
      <div class="bracket-round-column" style="justify-content: center; align-items: center;">
        <div class="champion-podium">
          <div class="trophy-icon">🏆</div>
          <h3>Campeão Geral</h3>
          ${champion && champion.name ? `
            <div class="champion-name">${this.escapeHtml(champion.name)}</div>
            <p>1º Lugar no Torneio de ${tipo === 'futebol' ? 'Futebol' : 'Dominó'} • Evento Facom</p>
          ` : `
            <div class="champion-name" style="color: var(--text-faint); font-size: 0.95rem; font-style: italic; font-weight: 500;">Aguardando final...</div>
            <p>O vencedor da Grande Final será coroado aqui.</p>
          `}
        </div>
      </div>
    `;

    container.innerHTML = `
      <div class="bracket-tree">
        ${roundsHtml}
        ${podiumHtml}
      </div>
    `;
  },

  // Selecionar vencedor da partida
  handleSetWinner(tipo, roundIndex, matchIndex, teamSlot) {
    const data = StorageManager.loadData();
    const bracket = tipo === 'futebol' ? data.futebol.chaveamento : data.domino.chaveamento;
    if (!bracket) return;

    const previousChampion = bracket.champion ? bracket.champion.id : null;
    const updatedBracket = BracketEngine.setWinner(bracket, roundIndex, matchIndex, teamSlot);
    if (!updatedBracket) return;

    StorageManager.saveBracket(tipo, updatedBracket);
    this.renderBracketView(tipo);
    this.updateJSONViewer();

    const winnerName = updatedBracket.rounds[roundIndex].matches[matchIndex].winnerName;

    if (updatedBracket.champion && updatedBracket.champion.id !== previousChampion) {
      this.launchConfetti();
      this.showToast(`🎉 CAMPEÃO DO EVENTO FACOM: ${updatedBracket.champion.name}!`, 'success');
    } else {
      this.showToast(`"${winnerName}" avançou de fase!`, 'info');
    }
  },

  // Atualizar placar de uma partida
  handleScoreChange(tipo, roundIndex, matchIndex, teamSlot, val) {
    const data = StorageManager.loadData();
    const bracket = tipo === 'futebol' ? data.futebol.chaveamento : data.domino.chaveamento;
    if (!bracket) return;

    BracketEngine.updateScore(bracket, roundIndex, matchIndex, teamSlot, val);
    StorageManager.saveBracket(tipo, bracket);
    this.updateJSONViewer();
  },

  // Atualizar o bloco com o JSON em tempo real
  updateJSONViewer() {
    const viewer = document.getElementById('json-viewer-content');
    if (viewer) {
      viewer.textContent = StorageManager.getJSONString();
    }
  },

  // Toast Notification
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `<span>${icon}</span> <span>${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  },

  // Confetes em Canvas
  launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = [];
    const colors = ['#0f172a', '#2563eb', '#10b981', '#f59e0b', '#64748b'];

    for (let i = 0; i < 150; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        velY: Math.random() * 3.5 + 2,
        velX: (Math.random() - 0.5) * 3,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 6
      });
    }

    let animationId;
    let frames = 0;

    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();

        p.y += p.velY;
        p.x += p.velX;
        p.rotation += p.rotSpeed;
      });

      frames++;
      if (frames < 180) {
        animationId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        cancelAnimationFrame(animationId);
      }
    }

    render();
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
