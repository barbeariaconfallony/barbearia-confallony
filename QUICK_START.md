# 🚀 Start Rápido - Backend Mercado Pago

## 1. Setup do Backend (5 minutos)

```bash
# Criar pasta do backend
mkdir mercadopago-backend && cd mercadopago-backend

# Inicializar projeto
npm init -y

# Instalar dependências
npm install express cors dotenv mercadopago
npm install -D nodemon

# Copiar o arquivo server-example.js para server.js
# (do arquivo que geramos anteriormente)

# Criar .env com suas credenciais
echo "MERCADOPAGO_ACCESS_TOKEN=TEST-seu-token-aqui" > .env
echo "PORT=3001" >> .env
```

## 2. Executar Backend

```bash
# Desenvolvimento
npx nodemon server.js

# Ou produção  
npm start
```

## 3. Testar Frontend

1. **Teste a conexão:** Use o botão "Testar Conexão" na página
2. **Faça um agendamento:** Preencha o formulário
3. **Gere o Pix:** Clique em "Pagar com Pix"

## 4. URLs Importantes

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3001
- **Credenciais:** https://www.mercadopago.com.br/developers

## ⚠️ Importante

- Use **credenciais de TESTE** durante desenvolvimento
- CPF de teste: `19119119100`
- O QR Code em teste é fictício
- Para produção, complete verificação da conta MP

## 🔧 Problemas Comuns

**Backend não conecta:**
```bash
# Verificar se está rodando
curl http://localhost:3001

# Ver logs detalhados
DEBUG=* npm start
```

**Erro 401:**
- Verifique o ACCESS_TOKEN no .env
- Use credencial de TEST (começa com TEST-)

**Erro CORS:**
- Confirme que o CORS está configurado para localhost:5173