/**
 * EVENTO FACOM - CLIENTE DA API & STORAGE (STORAGE.JS)
 * Consome e alimenta os dados diretamente pela API REST /api/dados (conectada ao dados.json do GitHub)
 */

const STORAGE_KEY = 'EVENTO_FACOM_DADOS_JSON_V1';
const API_BASE_URL = '/api/dados';

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

  // =========================================================================
  // CONSUMO VIA API REST (GET)
  // =========================================================================
  async fetchApi() {
    try {
      const res = await fetch(`${API_BASE_URL}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        throw new Error(`Erro na API: ${res.status}`);
      }

      const json = await res.json();
      const payload = json.data || json;

      if (payload && (payload.futebol || payload.domino)) {
        this.saveData(payload);
        return { success: true, data: payload, fromApi: true };
      }
      throw new Error('Formato retornado pela API inválido.');
    } catch (err) {
      console.warn('API não disponível no momento, usando cache local:', err.message);
      const local = this.loadData();
      return { success: false, data: local, error: err.message, fromApi: false };
    }
  },

  // =========================================================================
  // ALIMENTAÇÃO VIA API REST (POST, PUT, DELETE)
  // =========================================================================

  // Adicionar participante (POST /api/dados)
  async addEntryApi(tipo, item) {
    // 1. Atualiza cache local imediatamente para UX rápida
    const localItem = this.addEntry(tipo, item);

    // 2. Envia para a API para comitar no dados.json do GitHub
    try {
      const res = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, item })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        if (json.data) this.saveData(json.data);
        return { success: true, item: json.item || localItem, comitado: true };
      } else {
        return { success: false, item: localItem, error: json.message || 'Erro na API' };
      }
    } catch (err) {
      console.warn('Falha de rede ao conectar à API:', err.message);
      return { success: false, item: localItem, error: err.message };
    }
  },

  // Salvar Chaveamento (PUT /api/dados)
  async saveBracketApi(tipo, bracketData) {
    this.saveBracket(tipo, bracketData);

    try {
      const res = await fetch(API_BASE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_bracket',
          tipo,
          bracket: bracketData
        })
      });

      const json = await res.json();
      return { success: res.ok && json.success, data: json.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Atualizar Participante Editado (PUT /api/dados)
  async updateEntryApi(tipo, id, updatedFields) {
    this.updateEntry(tipo, id, updatedFields);

    try {
      const res = await fetch(API_BASE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit_entry',
          tipo,
          id,
          updatedFields
        })
      });

      const json = await res.json();
      return { success: res.ok && json.success, data: json.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Deletar Participante (DELETE /api/dados)
  async deleteEntryApi(tipo, id) {
    this.deleteEntry(tipo, id);

    try {
      const res = await fetch(`${API_BASE_URL}?tipo=${tipo}&id=${id}`, {
        method: 'DELETE'
      });

      const json = await res.json();
      return { success: res.ok && json.success, data: json.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Sincronizar todos os dados atuais na API (PUT com fullData)
  async syncAllToApi(fullData) {
    const dataToSend = fullData || this.loadData();
    try {
      const res = await fetch(API_BASE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullData: dataToSend })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        if (json.data) this.saveData(json.data);
        return { success: true, message: json.message };
      }
      return { success: false, error: json.message || 'Erro na API' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // =========================================================================
  // MÉTODOS DE SUPORTE LOCAL (CACHE & COMPATIBILIDADE)
  // =========================================================================
  loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.getDefaultState();
      const parsed = JSON.parse(raw);
      if (!parsed.futebol) parsed.futebol = { equipes: [], chaveamento: null };
      if (!parsed.domino) parsed.domino = { duplas: [], chaveamento: null };
      return parsed;
    } catch (e) {
      return this.getDefaultState();
    }
  },

  saveData(data) {
    try {
      data.ultimaAtualizacao = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data, null, 2));
      return true;
    } catch (e) {
      return false;
    }
  },

  addEntry(tipo, item) {
    const data = this.loadData();
    const id = `${tipo}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const novoItem = { id, ...item, dataCadastro: new Date().toISOString() };
    if (tipo === 'futebol') data.futebol.equipes.push(novoItem);
    else if (tipo === 'domino') data.domino.duplas.push(novoItem);
    this.saveData(data);
    return novoItem;
  },

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

  deleteEntry(tipo, id) {
    const data = this.loadData();
    if (tipo === 'futebol') data.futebol.equipes = data.futebol.equipes.filter(e => e.id !== id);
    else if (tipo === 'domino') data.domino.duplas = data.domino.duplas.filter(d => d.id !== id);
    this.saveData(data);
  },

  saveBracket(tipo, bracketData) {
    const data = this.loadData();
    if (tipo === 'futebol') data.futebol.chaveamento = bracketData;
    else if (tipo === 'domino') data.domino.chaveamento = bracketData;
    this.saveData(data);
  },

  clearBracket(tipo) {
    const data = this.loadData();
    if (tipo === 'futebol') data.futebol.chaveamento = null;
    else if (tipo === 'domino') data.domino.chaveamento = null;
    this.saveData(data);
  },

  exportToJSONFile() {
    const data = this.loadData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dados.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  getJSONString() {
    return JSON.stringify(this.loadData(), null, 2);
  },

  importFromJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.futebol && !parsed.domino) throw new Error('Formato inválido.');
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

  clearAll() {
    localStorage.removeItem(STORAGE_KEY);
    return this.getDefaultState();
  }
};
