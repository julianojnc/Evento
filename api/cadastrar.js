/**
 * VERCEL SERVERLESS FUNCTION - EVENTO FACOM
 * Grava e lê o arquivo dados.json diretamente no repositório do GitHub (julianojnc/Evento)
 */

export default async function handler(req, res) {
  // Configuração de CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER = process.env.REPO_OWNER || 'julianojnc';
  const REPO_NAME = process.env.REPO_NAME || 'Evento';
  const FILE_PATH = 'dados.json';
  const BRANCH = process.env.REPO_BRANCH || 'main';

  // Se o token do GitHub não estiver configurado na Vercel
  if (!GITHUB_TOKEN) {
    if (req.method === 'GET') {
      // Tentar buscar do Raw público se não tiver token
      try {
        const rawRes = await fetch(`https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${FILE_PATH}?t=${Date.now()}`);
        if (rawRes.ok) {
          const rawData = await rawRes.json();
          return res.status(200).json(rawData);
        }
      } catch (e) {}
    }
    return res.status(500).json({
      error: 'GITHUB_TOKEN_MISSING',
      message: 'A variável de ambiente GITHUB_TOKEN não está configurada na Vercel.'
    });
  }

  const githubApiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`;
  const headers = {
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'Evento-Facom-App'
  };

  // ==========================================
  // MÉTODO GET: Retorna os dados atuais do GitHub
  // ==========================================
  if (req.method === 'GET') {
    try {
      const getRes = await fetch(githubApiUrl, { headers, cache: 'no-store' });
      if (!getRes.ok) {
        throw new Error(`Erro ${getRes.status} ao consultar dados.json no GitHub`);
      }
      const fileData = await getRes.json();
      const contentStr = Buffer.from(fileData.content, 'base64').toString('utf8');
      const json = JSON.parse(contentStr);

      return res.status(200).json(json);
    } catch (err) {
      return res.status(500).json({ error: 'GET_ERROR', message: err.message });
    }
  }

  // ==========================================
  // MÉTODO POST: Adiciona novo cadastro ou sincroniza dados
  // ==========================================
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const { tipo, item, fullData } = body;

      // 1. Obter o arquivo atual e seu SHA no GitHub
      const getRes = await fetch(githubApiUrl, { headers, cache: 'no-store' });
      if (!getRes.ok) {
        throw new Error(`Não foi possível localizar dados.json no repositório (${getRes.status})`);
      }
      const fileData = await getRes.json();
      const currentSha = fileData.sha;
      const contentStr = Buffer.from(fileData.content, 'base64').toString('utf8');
      let currentJson = JSON.parse(contentStr);

      // 2. Atualizar o conteúdo
      let commitMessage = '';

      if (fullData) {
        // Atualização completa (ex: atualização de chaveamento pelo painel)
        currentJson = fullData;
        currentJson.ultimaAtualizacao = new Date().toISOString();
        commitMessage = 'Atualizar dados e chaveamento do Evento Facom [via painel]';
      } else if (tipo && item) {
        // Novo cadastro via formulário
        const id = `${tipo}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        const novoItem = {
          id,
          ...item,
          dataCadastro: new Date().toISOString()
        };

        if (tipo === 'futebol') {
          if (!currentJson.futebol) currentJson.futebol = { equipes: [], chaveamento: null };
          currentJson.futebol.equipes.push(novoItem);
          commitMessage = `Inscrição Futebol: ${item.nome} [via site]`;
        } else if (tipo === 'domino') {
          if (!currentJson.domino) currentJson.domino = { duplas: [], chaveamento: null };
          currentJson.domino.duplas.push(novoItem);
          commitMessage = `Inscrição Dominó: ${item.nomeDupla} [via site]`;
        }

        currentJson.ultimaAtualizacao = new Date().toISOString();
      } else {
        return res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'Payload inválido.' });
      }

      // 3. Fazer o commit de volta no GitHub (PUT)
      const updatedBase64 = Buffer.from(JSON.stringify(currentJson, null, 2), 'utf8').toString('base64');
      const putRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: commitMessage,
          content: updatedBase64,
          sha: currentSha,
          branch: BRANCH
        })
      });

      if (!putRes.ok) {
        const errorDetail = await putRes.text();
        throw new Error(`Falha ao gravar no GitHub (${putRes.status}): ${errorDetail}`);
      }

      const commitResult = await putRes.json();

      return res.status(200).json({
        success: true,
        message: 'Salvo e comitado com sucesso no GitHub!',
        commit: commitResult.commit?.sha,
        data: currentJson
      });

    } catch (err) {
      console.error('Erro na gravação:', err);
      return res.status(500).json({ error: 'COMMIT_ERROR', message: err.message });
    }
  }

  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}
