/**
 * EVENTO FACOM - GERENCIADOR DE DADOS E ARMAZENAMENTO (STORAGE)
 * Gerencia a gravação e consumo do dados.json para integração com GitHub.
 */

const STORAGE_KEY = 'EVENTO_FACOM_DADOS_JSON_V1';
const GITHUB_URL_KEY = 'EVENTO_FACOM_GITHUB_URL';

const StorageManager = {
  // Estrutura padrão inicial
  getDefaultState() {
    return {
      evento: 'Evento Facom',
      versao: '1.0',
      ultimaAtualizacao: new Date().toISOString(),
      futebol: {
        equipes: [],
        chaveamento: null
      },
      domino: {
        duplas: [],
        chaveamento: null
      }
    };
  },

  // Carrega os dados locais
  loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return this.getDefaultState();
      }
      const parsed = JSON.parse(raw);
      if (!parsed.futebol) parsed.futebol = { equipes: [], chaveamento: null };
      if (!parsed.domino) parsed.domino = { duplas: [], chaveamento: null };
      return parsed;
    } catch (e) {
      console.error('Erro ao ler dados locais:', e);
      return this.getDefaultState();
    }
  },

  // Salva os dados localmente
  saveData(data) {
    try {
      data.ultimaAtualizacao = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data, null, 2));
      return true;
    } catch (e) {
      console.error('Erro ao salvar localmente:', e);
      return false;
    }
  },

  // Adicionar uma equipe (Futebol) ou Dupla (Dominó)
  addEntry(tipo, item) {
    const data = this.loadData();
    const id = `${tipo}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const novoItem = {
      id,
      ...item,
      dataCadastro: new Date().toISOString()
    };

    if (tipo === 'futebol') {
      data.futebol.equipes.push(novoItem);
    } else if (tipo === 'domino') {
      data.domino.duplas.push(novoItem);
    }

    this.saveData(data);
    return novoItem;
  },

  // Atualizar registro existente
  updateEntry(tipo, id, updatedFields) {
    const data = this.loadData();
    const list = tipo === 'futebol' ? data.futebol.equipes : data.domino.duplas;
    const index = list.findIndex(item => item.id === id);

    if (index !== -1) {
      list[index] = { ...list[index], ...updatedFields, dataAtualizacao: new Date().toISOString() };
      this.saveData(data);
      return list[index];
    }
    return null;
  },

  // Deletar equipe ou dupla
  deleteEntry(tipo, id) {
    const data = this.loadData();
    if (tipo === 'futebol') {
      data.futebol.equipes = data.futebol.equipes.filter(item => item.id !== id);
    } else if (tipo === 'domino') {
      data.domino.duplas = data.domino.duplas.filter(item => item.id !== id);
    }
    this.saveData(data);
  },

  // Salvar estado do chaveamento
  saveBracket(tipo, bracketData) {
    const data = this.loadData();
    if (tipo === 'futebol') {
      data.futebol.chaveamento = bracketData;
    } else if (tipo === 'domino') {
      data.domino.chaveamento = bracketData;
    }
    this.saveData(data);
  },

  // Limpar chaveamento
  clearBracket(tipo) {
    const data = this.loadData();
    if (tipo === 'futebol') {
      data.futebol.chaveamento = null;
    } else if (tipo === 'domino') {
      data.domino.chaveamento = null;
    }
    this.saveData(data);
  },

  // Baixar arquivo dados.json pronto para ser colocado no GitHub
  exportToJSONFile() {
    const data = this.loadData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `dados.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Obter texto JSON formatado para visualização
  getJSONString() {
    const data = this.loadData();
    return JSON.stringify(data, null, 2);
  },

  // Importar de arquivo ou string JSON
  importFromJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.futebol && !parsed.domino) {
        throw new Error('Formato inválido: O arquivo deve conter campos "futebol" ou "domino".');
      }

      const normalized = {
        evento: parsed.evento || 'Evento Facom',
        versao: parsed.versao || '1.0',
        ultimaAtualizacao: new Date().toISOString(),
        futebol: {
          equipes: Array.isArray(parsed.futebol?.equipes) ? parsed.futebol.equipes : [],
          chaveamento: parsed.futebol?.chaveamento || null
        },
        domino: {
          duplas: Array.isArray(parsed.domino?.duplas) ? parsed.domino.duplas : [],
          chaveamento: parsed.domino?.chaveamento || null
        }
      };

      this.saveData(normalized);
      return { success: true, countFut: normalized.futebol.equipes.length, countDom: normalized.domino.duplas.length };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Sincronizar via URL do GitHub Raw ou dados.json local
  async fetchFromGitHubOrLocal(customUrl = null) {
    const url = customUrl || this.getGitHubUrl() || 'dados.json';
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status} ao buscar ${url}`);
      }
      const json = await response.json();
      const res = this.importFromJSON(JSON.stringify(json));
      if (res.success && customUrl) {
        this.setGitHubUrl(customUrl);
      }
      return res;
    } catch (err) {
      console.warn('Não foi possível consumir do GitHub/arquivo remoto:', err.message);
      return { success: false, error: err.message };
    }
  },

  // Armazenar URL configurada do GitHub
  getGitHubUrl() {
    return localStorage.getItem(GITHUB_URL_KEY) || '';
  },

  setGitHubUrl(url) {
    if (url) {
      localStorage.setItem(GITHUB_URL_KEY, url.trim());
    } else {
      localStorage.removeItem(GITHUB_URL_KEY);
    }
  },

  // Carregar dados de teste
  loadSampleData() {
    const sample = {
      evento: 'Evento Facom',
      versao: '1.0',
      ultimaAtualizacao: new Date().toISOString(),
      futebol: {
        equipes: [
          {
            id: 'fut-1',
            nome: 'Engenharia FC',
            capitao: 'Carlos Eduardo',
            jogadores: ['Carlos Eduardo', 'Marcos Santos', 'Lucas Lima', 'Gabriel Souza', 'Rafael Dias', 'Bruno Henrique'],
            dataCadastro: new Date().toISOString()
          },
          {
            id: 'fut-2',
            nome: 'Operações & Obras',
            capitao: 'Marcelo Vieira',
            jogadores: ['Marcelo Vieira', 'Thiago Silva', 'Rodrigo Caio', 'Danilo Neves', 'Alexandre Pato'],
            dataCadastro: new Date().toISOString()
          },
          {
            id: 'fut-3',
            nome: 'Galácticos Facom',
            capitao: 'Fernando Rocha',
            jogadores: ['Fernando Rocha', 'Gustavo Scarpa', 'Renan Lodi', 'Matheus Cunha', 'Artur Victor'],
            dataCadastro: new Date().toISOString()
          },
          {
            id: 'fut-4',
            nome: 'Planejamento City',
            capitao: 'Diego Alves',
            jogadores: ['Diego Alves', 'Júlio César', 'Everton Ribeiro', 'Pedro Rocha', 'Gerson Santos'],
            dataCadastro: new Date().toISOString()
          },
          {
            id: 'fut-5',
            nome: 'Logística United',
            capitao: 'Robson Lima',
            jogadores: ['Robson Lima', 'Igor Rabello', 'Douglas Santos', 'Otávio Monteiro', 'Luan Peres'],
            dataCadastro: new Date().toISOString()
          },
          {
            id: 'fut-6',
            nome: 'Financeiro EC',
            capitao: 'Wesley Snipes',
            jogadores: ['Wesley Snipes', 'Bebeto Silva', 'Romário Souza', 'Vampeta Oliveira', 'Edilson Capetinha'],
            dataCadastro: new Date().toISOString()
          },
          {
            id: 'fut-7',
            nome: 'Diretoria FC',
            capitao: 'Henrique Fogaça',
            jogadores: ['Henrique Fogaça', 'Érick Jacquin', 'Claude Troisgros', 'Rodrigo Hilbert', 'Felipe Bronze'],
            dataCadastro: new Date().toISOString()
          },
          {
            id: 'fut-8',
            nome: 'Amigos do Churrasco',
            capitao: 'Zezinho Gás',
            jogadores: ['Zezinho Gás', 'Tião Carreiro', 'Pardinho Silva', 'Chitãozinho', 'Xororó'],
            dataCadastro: new Date().toISOString()
          }
        ],
        chaveamento: null
      },
      domino: {
        duplas: [
          {
            id: 'dom-1',
            nomeDupla: 'Bucho de Sena',
            jogador1: 'Seu Zé',
            jogador2: 'Tonho',
            dataCadastro: new Date().toISOString()
          },
          {
            id: 'dom-2',
            nomeDupla: 'Caras de Pau',
            jogador1: 'Moacir',
            jogador2: 'Valdir',
            dataCadastro: new Date().toISOString()
          },
          {
            id: 'dom-3',
            nomeDupla: 'Mestres da Carroça',
            jogador1: 'Geraldo',
            jogador2: 'Beto',
            dataCadastro: new Date().toISOString()
          },
          {
            id: 'dom-4',
            nomeDupla: 'Bateu Levou',
            jogador1: 'Cláudio',
            jogador2: 'Djalma',
            dataCadastro: new Date().toISOString()
          },
          {
            id: 'dom-5',
            nomeDupla: 'Ases da Pedra',
            jogador1: 'Juvenal',
            jogador2: 'Arnaldo',
            dataCadastro: new Date().toISOString()
          },
          {
            id: 'dom-6',
            nomeDupla: 'Toca do Tatu',
            jogador1: 'Tião',
            jogador2: 'Chicão',
            dataCadastro: new Date().toISOString()
          },
          {
            id: 'dom-7',
            nomeDupla: 'Sem Choro',
            jogador1: 'Marcos',
            jogador2: 'Ailton',
            dataCadastro: new Date().toISOString()
          },
          {
            id: 'dom-8',
            nomeDupla: 'Reis do Dominó',
            jogador1: 'Nelson',
            jogador2: 'Sebastião',
            dataCadastro: new Date().toISOString()
          }
        ],
        chaveamento: null
      }
    };

    this.saveData(sample);
    return sample;
  },

  // Resetar tudo
  clearAll() {
    localStorage.removeItem(STORAGE_KEY);
    return this.getDefaultState();
  }
};

// Se não houver dados locais, tenta carregar do dados.json inicial
if (!localStorage.getItem(STORAGE_KEY)) {
  StorageManager.fetchFromGitHubOrLocal().catch(() => {});
}
