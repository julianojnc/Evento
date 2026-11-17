/**
 * EVENTO FACOM - SCRIPT DA PÁGINA DE CADASTRO (CADASTRO.JS)
 * Envia os cadastros diretamente para a API Serverless da Vercel para gravar no GitHub.
 */

const CadastroApp = {
  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Alternador de Modalidade (Futebol / Dominó)
    const btnSelectFut = document.getElementById('btn-select-fut');
    const btnSelectDom = document.getElementById('btn-select-dom');
    const formFut = document.getElementById('form-container-futebol');
    const formDom = document.getElementById('form-container-domino');

    if (btnSelectFut && btnSelectDom) {
      btnSelectFut.addEventListener('click', () => {
        btnSelectFut.classList.add('active');
        btnSelectDom.classList.remove('active');
        formFut.style.display = 'block';
        formDom.style.display = 'none';
      });

      btnSelectDom.addEventListener('click', () => {
        btnSelectDom.classList.add('active');
        btnSelectFut.classList.remove('active');
        formDom.style.display = 'block';
        formFut.style.display = 'none';
      });
    }

    // Contador dinâmico de atletas no Futebol
    const txtJogadores = document.getElementById('fut-jogadores');
    const lblCount = document.getElementById('fut-player-count');
    if (txtJogadores && lblCount) {
      txtJogadores.addEventListener('input', () => {
        const lines = txtJogadores.value.split('\n').filter(l => l.trim().length > 0);
        lblCount.textContent = `(${lines.length} ${lines.length === 1 ? 'atleta' : 'atletas'})`;
      });
    }

    // Submissão Futebol
    const formFutebol = document.getElementById('form-futebol');
    if (formFutebol) {
      formFutebol.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFootballSubmit();
      });
    }

    // Submissão Dominó
    const formDomino = document.getElementById('form-domino');
    if (formDomino) {
      formDomino.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleDominoSubmit();
      });
    }

    // Botão de Nova Inscrição
    const btnNovaInscricao = document.getElementById('btn-nova-inscricao');
    if (btnNovaInscricao) {
      btnNovaInscricao.addEventListener('click', () => {
        document.getElementById('cadastro-success-card').style.display = 'none';
        document.getElementById('cadastro-form-wrapper').style.display = 'block';
      });
    }

    // Botão de Download do dados.json
    const btnDownloadJson = document.getElementById('btn-download-dados-json');
    if (btnDownloadJson) {
      btnDownloadJson.addEventListener('click', () => {
        StorageManager.exportToJSONFile();
        this.showToast('dados.json baixado com sucesso!', 'success');
      });
    }
  },

  async handleFootballSubmit() {
    const nome = document.getElementById('fut-nome').value.trim();
    const capitao = document.getElementById('fut-capitao').value.trim();
    const jogadoresRaw = document.getElementById('fut-jogadores').value;
    const submitBtn = document.querySelector('#form-futebol button[type="submit"]');

    if (!nome || !capitao) {
      this.showToast('Por favor, preencha o Nome da Equipe e o Capitão.', 'error');
      return;
    }

    const jogadores = jogadoresRaw
      .split('\n')
      .map(j => j.trim())
      .filter(j => j.length > 0);

    const item = {
      nome,
      capitao,
      jogadores: jogadores.length > 0 ? jogadores : [capitao]
    };

    // Estado de carregamento
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Enviando para o repositório...';

    try {
      const apiSuccess = await this.sendToGitHubApi('futebol', item);

      // Salva localmente também para manter sincronizado
      StorageManager.addEntry('futebol', item);

      document.getElementById('form-futebol').reset();
      document.getElementById('fut-player-count').textContent = '(0 atletas)';

      this.showSuccessCard('Futebol', nome, [
        `<strong>Capitão:</strong> ${this.escapeHtml(capitao)}`,
        `<strong>Total de Atletas:</strong> ${jogadores.length > 0 ? jogadores.length : 1} inscritos`,
        apiSuccess ? `<span style="color: #10b981; font-weight: 600;">✓ Gravado com sucesso no dados.json do GitHub</span>` : `<span style="color: #f59e0b;">Salvo localmente (configure o token na Vercel para commit automático)</span>`
      ]);
    } catch (err) {
      this.showToast(`Erro ao gravar: ${err.message}`, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Confirmar Inscrição de Futebol';
    }
  },

  async handleDominoSubmit() {
    const nomeDupla = document.getElementById('dom-nome').value.trim();
    const jogador1 = document.getElementById('dom-jog1').value.trim();
    const jogador2 = document.getElementById('dom-jog2').value.trim();
    const submitBtn = document.querySelector('#form-domino button[type="submit"]');

    if (!nomeDupla || !jogador1 || !jogador2) {
      this.showToast('Preencha o Nome da Dupla e ambos os jogadores.', 'error');
      return;
    }

    const item = {
      nomeDupla,
      jogador1,
      jogador2
    };

    // Estado de carregamento
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Enviando para o repositório...';

    try {
      const apiSuccess = await this.sendToGitHubApi('domino', item);

      // Salva localmente também
      StorageManager.addEntry('domino', item);

      document.getElementById('form-domino').reset();

      this.showSuccessCard('Dominó', nomeDupla, [
        `<strong>Jogador 1:</strong> ${this.escapeHtml(jogador1)}`,
        `<strong>Jogador 2:</strong> ${this.escapeHtml(jogador2)}`,
        apiSuccess ? `<span style="color: #10b981; font-weight: 600;">✓ Gravado com sucesso no dados.json do GitHub</span>` : `<span style="color: #f59e0b;">Salvo localmente (configure o token na Vercel para commit automático)</span>`
      ]);
    } catch (err) {
      this.showToast(`Erro ao gravar: ${err.message}`, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Confirmar Inscrição de Dominó';
    }
  },

  // Chamada à API Serverless da Vercel para gravar no repositório GitHub
  async sendToGitHubApi(tipo, item) {
    try {
      const res = await fetch('/api/cadastrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, item })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.warn('API Vercel avisou:', errorData);
        if (errorData.error === 'GITHUB_TOKEN_MISSING') {
          this.showToast('Inscrição salva! (Falta configurar GITHUB_TOKEN na Vercel)', 'info');
        }
        return false;
      }

      const json = await res.json();
      return json.success === true;
    } catch (err) {
      console.warn('API não acessível (provavelmente rodando fora da Vercel):', err);
      return false;
    }
  },

  showSuccessCard(modalidade, nome, detalhes) {
    document.getElementById('cadastro-form-wrapper').style.display = 'none';
    const card = document.getElementById('cadastro-success-card');
    document.getElementById('success-title').textContent = `Inscrição Confirmada (${modalidade})!`;
    document.getElementById('success-message').textContent = `"${nome}" foi cadastrada para o Evento Facom.`;

    const detailsBox = document.getElementById('success-details');
    detailsBox.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 0.35rem; color: var(--text-primary); font-size: 0.95rem;">${this.escapeHtml(nome)}</div>
      ${detalhes.map(d => `<div style="margin-bottom: 0.2rem; color: var(--text-secondary);">${d}</div>`).join('')}
    `;

    card.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.showToast('Inscrição confirmada com sucesso!', 'success');
  },

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
    }, 3500);
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
  CadastroApp.init();
});
