# DeskHelp Backend

Backend Node.js + Express + MongoDB para o sistema DeskHelp.

## Funcionalidades previstas
- Rotas REST para usuários, chamados e departamentos
- Autenticação JWT
- Hash de senha com bcryptjs
- Pronto para integração com frontend React

## Como rodar

1. Instale as dependências:
   ```powershell
   npm install
   ```
2. Configure o arquivo `.env` (já criado com valores padrão para desenvolvimento).
3. Inicie o servidor:
   ```powershell
   node index.js
   ```

O servidor rodará por padrão em http://localhost:5000

## Estrutura inicial
- `index.js`: ponto de entrada do servidor
- `.env`: variáveis de ambiente
- `package.json`: dependências e scripts

Implemente os modelos e rotas conforme a necessidade do DeskHelp.
