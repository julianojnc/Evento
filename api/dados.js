/**
 * VERCEL SERVERLESS REST API - EVENTO FACOM
 * Endpoint: /api/dados
 * Consome e alimenta o arquivo dados.json no repositório GitHub (julianojnc/Evento)
 */

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER = process.env.REPO_OWNER || 'julianojnc';
  const REPO_NAME = process.env.REPO_NAME || 'Evento';
  const FILE_PATH = 'dados.json';
  const BRANCH = process.env.REPO_BRANCH || 'main';

  const githubApiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`;
  const headers = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'Evento-Facom-API'
  };
  if (GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  }

  // Helper para buscar o arquivo atual do GitHub
  async function fetchCurrentFile() {
    // 1. Tenta pela API oficial do GitHub
    if (GITHUB_TOKEN) {
      const resp = await fetch(githubApiUrl, { headers, cache: 'no-store' });
      if (resp.ok) {
        const fileData = await resp.json();
        const contentStr = Buffer.from(fileData.content, 'base64').toString('utf8');
        return {
          sha: fileData.sha,
          data: JSON.parse(contentStr)
        };
      }
    }

    // 2. Fallback pelo Raw caso não haja token para leitura
    const rawUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${FILE_PATH}?t=${Date.now()}`;
    const rawResp = await fetch(rawUrl, { cache: 'no-store' });
    if (!rawResp.ok) {
      throw new Error(`Não foi possível carregar dados.json (${rawResp.status})`);
    }
    const rawData = await rawResp.json();
    return {
      sha: null,
      data: rawData
    };
  }

  // Helper para comitar o arquivo no GitHub
  async function commitFile(updatedJson, commitMessage, existingSha = null) {
    if (!GITHUB_TOKEN) {
      throw new Error('A variável GITHUB_TOKEN não está configurada na Vercel para gravar no repositório.');
    }

    // Se o SHA não foi passado, busca o SHA mais recente
    let sha = existingSha;
    if (!sha) {
      const current = await fetchCurrentFile();
      sha = current.sha;
    }

    updatedJson.ultimaAtualizacao = new Date().toISOString();
    const updatedBase64 = Buffer.from(JSON.stringify(updatedJson, null, 2), 'utf8').toString('base64');

    const putRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: commitMessage,
        content: updatedBase64,
        sha,
        branch: BRANCH
      })
    });

    if (!putRes.ok) {
      // Se deu conflito de SHA (409), tenta buscar o novo SHA e re-comitar uma vez
      if (putRes.status === 409) {
        const retry = await fetchCurrentFile();
        const retryPut = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            message: commitMessage,
            content: updatedBase64,
            sha: retry.sha,
            branch: BRANCH
          })
        });
        if (!retryPut.ok) {
          const detail = await retryPut.text();
          throw new Error(`Falha no commit após retry (${retryPut.status}): ${detail}`);
        }
        return await retryPut.json();
      }

      const detail = await putRes.text();
      throw new Error(`Falha ao gravar no GitHub (${putRes.status}): ${detail}`);
    }

    return await putRes.json();
  }

  // ==========================================
  // GET: Consumir dados.json da API
  // ==========================================
  if (req.method === 'GET') {
    try {
      const { data, sha } = await fetchCurrentFile();
      return res.status(200).json({
        success: true,
        sha,
        data
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: 'GET_ERROR',
        message: err.message
      });
    }
  }

  // ==========================================
  // POST: Adicionar nova Equipe ou Dupla
  // ==========================================
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { tipo, item } = body;

      if (!tipo || !item) {
        return res.status(400).json({ success: false, error: 'Campos tipo e item são obrigatórios.' });
      }

      const { data: currentJson, sha } = await fetchCurrentFile();
      const id = `${tipo}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const novoItem = {
        id,
        ...item,
        dataCadastro: new Date().toISOString()
      };

      let commitMsg = '';
      if (tipo === 'futebol') {
        if (!currentJson.futebol) currentJson.futebol = { equipes: [], chaveamento: null };
        currentJson.futebol.equipes.push(novoItem);
        commitMsg = `API: Cadastra equipe Futebol "${item.nome}"`;
      } else if (tipo === 'domino') {
        if (!currentJson.domino) currentJson.domino = { duplas: [], chaveamento: null };
        currentJson.domino.duplas.push(novoItem);
        commitMsg = `API: Cadastra dupla Dominó "${item.nomeDupla}"`;
      } else {
        return res.status(400).json({ success: false, error: 'Tipo inválido (deve ser futebol ou domino).' });
      }

      await commitFile(currentJson, commitMsg, sha);

      return res.status(201).json({
        success: true,
        message: 'Inscrição gravada no dados.json com sucesso!',
        item: novoItem,
        data: currentJson
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: 'POST_ERROR',
        message: err.message
      });
    }
  }

  // ==========================================
  // PUT: Atualizar estado (Chaveamento, Edição ou Substituição)
  // ==========================================
  if (req.method === 'PUT') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { action, tipo, id, updatedFields, bracket, fullData } = body;
      const { data: currentJson, sha } = await fetchCurrentFile();

      let targetData = currentJson;
      let commitMsg = 'API: Atualiza dados.json';

      if (action === 'update_bracket' && tipo && bracket !== undefined) {
        if (tipo === 'futebol') {
          if (!targetData.futebol) targetData.futebol = { equipes: [], chaveamento: null };
          targetData.futebol.chaveamento = bracket;
          commitMsg = `API: Atualiza chaveamento de Futebol`;
        } else if (tipo === 'domino') {
          if (!targetData.domino) targetData.domino = { duplas: [], chaveamento: null };
          targetData.domino.chaveamento = bracket;
          commitMsg = `API: Atualiza chaveamento de Dominó`;
        }
      } else if (action === 'edit_entry' && tipo && id && updatedFields) {
        const list = tipo === 'futebol' ? targetData.futebol?.equipes : targetData.domino?.duplas;
        if (list) {
          const idx = list.findIndex(e => e.id === id);
          if (idx !== -1) {
            list[idx] = { ...list[idx], ...updatedFields, dataAtualizacao: new Date().toISOString() };
            commitMsg = `API: Edita participante ${id}`;
          }
        }
      } else if (fullData) {
        targetData = fullData;
        commitMsg = `API: Sincronização geral de dados e chaveamento`;
      } else {
        return res.status(400).json({ success: false, error: 'Payload de atualização inválido.' });
      }

      await commitFile(targetData, commitMsg, sha);

      return res.status(200).json({
        success: true,
        message: 'dados.json atualizado no GitHub com sucesso!',
        data: targetData
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: 'PUT_ERROR',
        message: err.message
      });
    }
  }

  // ==========================================
  // DELETE: Remover Equipe ou Dupla
  // ==========================================
  if (req.method === 'DELETE') {
    try {
      const tipo = req.query.tipo || (req.body && req.body.tipo);
      const id = req.query.id || (req.body && req.body.id);

      if (!tipo || !id) {
        return res.status(400).json({ success: false, error: 'Parâmetros tipo e id são obrigatórios.' });
      }

      const { data: currentJson, sha } = await fetchCurrentFile();

      if (tipo === 'futebol' && currentJson.futebol) {
        currentJson.futebol.equipes = currentJson.futebol.equipes.filter(e => e.id !== id);
      } else if (tipo === 'domino' && currentJson.domino) {
        currentJson.domino.duplas = currentJson.domino.duplas.filter(d => d.id !== id);
      }

      await commitFile(currentJson, `API: Remove ${tipo} ID ${id}`, sha);

      return res.status(200).json({
        success: true,
        message: 'Participante removido do dados.json!',
        data: currentJson
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: 'DELETE_ERROR',
        message: err.message
      });
    }
  }

  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}
