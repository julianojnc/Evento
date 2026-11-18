# 🏆 Evento Facom - API REST & Gestão de Torneios

Sistema web onde o arquivo [`dados.json`](https://github.com/julianojnc/Evento/blob/main/dados.json) funciona como uma **API REST completa** (banco de dados no GitHub) consumida e alimentada pelas telas de cadastro e chaveamento.

---

## 🚀 Arquitetura de API REST (`/api/dados`)

A aplicação agora possui um endpoint de backend na Vercel (`api/dados.js`) que transforma o arquivo `dados.json` do GitHub em uma API REST:

| Método | Endpoint | Ação | O que faz no GitHub |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/dados` | **Consumir** | Retorna o `dados.json` atualizado em tempo real do repositório. |
| **POST** | `/api/dados` | **Cadastrar** | Adiciona equipe ou dupla e realiza o **commit automático** no `dados.json`. |
| **PUT** | `/api/dados` | **Atualizar** | Salva avanços de chaveamento, placares ou edições e comita no `dados.json`. |
| **DELETE** | `/api/dados` | **Remover** | Exclui uma equipe ou dupla e comita a remoção no `dados.json`. |

---

## 📱 Telas do Sistema

### 1. Inscrição Oficial (Pública & Isolada)
- **URLs:** [`/index.html`](https://facom-evento.vercel.app/) ou [`/cadastro.html`](https://facom-evento.vercel.app/cadastro.html)
- **Acesso Restrito:** O participante **não tem acesso** às outras telas.
- **Funcionamento:** Ao preencher e confirmar, envia um `POST /api/dados`, gravando e comitando a inscrição no `dados.json` do GitHub.

### 2. Painel de Chaveamento & Gestão (Organizadores)
- **URLs:** [`/torneio`](https://facom-evento.vercel.app/torneio) ou [`/torneio.html`](https://facom-evento.vercel.app/torneio.html)
- **Consumo Automático:** Ao abrir, consome via `GET /api/dados` trazendo os inscritos mais recentes do GitHub.
- **Interatividade & Persistência:** Ao clicar para avançar um time no chaveamento ou registrar placar, o avanço é comitado via `PUT /api/dados`.
- **Botão "Atualizar da API":** Recarrega instantaneamente se novos cadastros entrarem.

---

## 🔑 Configuração da Variável de Ambiente (Vercel)

Para que a API consiga fazer commits no seu repositório:
1. No painel da Vercel: **Settings ➔ Environment Variables**.
2. Adicione:
   - **Key:** `GITHUB_TOKEN`
   - **Value:** Seu Personal Access Token do GitHub (com permissão `repo`).
