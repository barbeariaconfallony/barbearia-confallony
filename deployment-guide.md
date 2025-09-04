# 🚀 Como Fazer Deploy do Backend

## Opção 1: Railway (Recomendado)

1. Acesse [railway.app](https://railway.app)
2. Conecte sua conta GitHub
3. Clique em "Deploy from GitHub repo"
4. Selecione seu repositório do backend
5. Configure as variáveis de ambiente:
   - `MERCADOPAGO_ACCESS_TOKEN`
   - `PORT` (Railway define automaticamente)
6. Deploy automático!

## Opção 2: Vercel (Para Next.js)

Se preferir Next.js ao invés de Express:

```bash
npx create-next-app@latest mercadopago-backend
cd mercadopago-backend
npm install mercadopago
```

## Opção 3: Render.com

1. Acesse [render.com](https://render.com)
2. Conecte GitHub
3. Selecione repositório
4. Configure:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Variáveis de ambiente

## Configurar no Frontend

Após deploy, atualize `src/config/api.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://seu-app.railway.app' // URL do seu deploy
    : 'http://localhost:3001',
  // ...
};
```