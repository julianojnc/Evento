# 🏆 Evento Facom - Torneios de Futebol & Dominó

Sistema web minimalista para o **Evento Facom**, projetado para operar com alimentação e consumo centralizados no arquivo [`dados.json`](file:///c:/Users/juliano.nascimento.FACOM0/OneDrive%20-%20Facom%20F%20de%20Almeida%20Construções%20LTDA/Documentos/Fut-Domino/dados.json), pronto para hospedagem em repositório GitHub.

---

## 🔒 Arquitetura de Páginas com Acesso Separado

O sistema divide rigorosamente o público em **duas páginas independentes**:

### 1. 📝 Página de Inscrição Pública: [`index.html`](file:///c:/Users/juliano.nascimento.FACOM0/OneDrive%20-%20Facom%20F%20de%20Almeida%20Construções%20LTDA/Documentos/Fut-Domino/index.html) (ou `cadastro.html`)
- **Acesso Restrito:** Quem acessa esta página **NÃO tem links, botões ou acesso** para as outras telas (chaveamentos, participantes ou painel de dados).
- **Campos Limpos e Diretos:**
  - **⚽ Futebol:** Nome da Equipe, Capitão / Responsável e Lista de Atletas. *(Sem telefone e sem cor de uniforme).*
  - **🁣 Dominó:** Nome da Dupla, Jogador 1 e Jogador 2. *(Sem telefone e sem setor).*
- **Confirmação:** Ao enviar, exibe uma tela de confirmação de inscrição, permitindo nova inscrição e botão para baixar o `dados.json` atualizado.

### 2. 🏆 Painel de Gestão e Chaveamento: [`torneio.html`](file:///c:/Users/juliano.nascimento.FACOM0/OneDrive%20-%20Facom%20F%20de%20Almeida%20Construções%20LTDA/Documentos/Fut-Domino/torneio.html)
- **Área dos Organizadores:**
  - **👥 Participantes:** Lista com busca em tempo real, edição e exclusão de equipes e duplas.
  - **⚽ Chave Futebol:** Chaveamento eliminatório interativo (Mata-Mata) com avanço automático por clique no vencedor e pódio de campeão.
  - **🁣 Chave Dominó:** Chaveamento mata-mata para as duplas de dominó.
  - **💾 Repositório & dados.json:** Gerenciamento, download do `dados.json` para commit no GitHub e sincronização via URL Raw.

---

## 🌐 Centralização em `dados.json` e Integração com GitHub

Todos os dados da aplicação estão estruturados em um único arquivo: [`dados.json`](file:///c:/Users/juliano.nascimento.FACOM0/OneDrive%20-%20Facom%20F%20de%20Almeida%20Construções%20LTDA/Documentos/Fut-Domino/dados.json).

```json
{
  "evento": "Evento Facom",
  "versao": "1.0",
  "ultimaAtualizacao": "2026-11-17T15:30:00.000Z",
  "futebol": {
    "equipes": [
      {
        "id": "fut-1",
        "nome": "Engenharia FC",
        "capitao": "Carlos Eduardo",
        "jogadores": ["Carlos Eduardo", "Marcos Santos", "Lucas Lima"]
      }
    ],
    "chaveamento": null
  },
  "domino": {
    "duplas": [
      {
        "id": "dom-1",
        "nomeDupla": "Bucho de Sena",
        "jogador1": "Seu Zé",
        "jogador2": "Tonho"
      }
    ],
    "chaveamento": null
  }
}
```

### Como funciona no GitHub:
1. **No Repositório:** Coloque o arquivo `dados.json` na raiz do seu repositório GitHub.
2. **Consumo Automático:**
   - Na aba **Dados & JSON** de [`torneio.html`](file:///c:/Users/juliano.nascimento.FACOM0/OneDrive%20-%20Facom%20F%20de%20Almeida%20Construções%20LTDA/Documentos/Fut-Domino/torneio.html), você pode colar a URL Raw do seu arquivo no GitHub (ex: `https://raw.githubusercontent.com/SEU_USUARIO/SEU_REPO/main/dados.json`) e clicar em **"Consumir do GitHub"**.
   - A aplicação salva e sincroniza as equipes e os chaveamentos instantaneamente.
3. **Alimentação:** Sempre que novos cadastros forem feitos ou as partidas forem avançadas, clique em **"Baixar dados.json (Para o GitHub)"** para atualizar o arquivo no seu repositório.

---

## 📁 Estrutura de Arquivos

```
Fut-Domino/
│
├── dados.json          # Arquivo central consumido e alimentado pela aplicação
├── index.html          # Página pública de cadastro (100% isolada, sem links para gestão)
├── cadastro.html       # Alias direto para a página de cadastro
├── torneio.html        # Painel do torneio (Participantes, Chaves e Sincronização)
├── README.md           # Documentação completa
│
├── css/
│   └── styles.css      # Design minimalista, responsivo e temas limpos
│
└── js/
    ├── storage.js      # Consumo/alimentação de dados.json e suporte ao GitHub
    ├── bracket.js      # Motor matemático de chaveamento, mata-mata e BYEs
    ├── cadastro.js     # Lógica exclusiva e isolada da página de cadastro
    └── app.js          # Lógica do painel de torneio, busca, modal e confetes
```
