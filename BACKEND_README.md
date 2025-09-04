# Backend para Integração Mercado Pago

## Configuração necessária

Você precisa criar um backend separado (Next.js/Node.js) com as seguintes rotas:

### 1. Instale as dependências:

```bash
npm install express cors dotenv mercadopago
# ou
npm install @types/express @types/cors # para TypeScript
```

### 2. Configure as variáveis de ambiente (.env):

```env
MERCADOPAGO_ACCESS_TOKEN=seu_access_token_aqui
MERCADOPAGO_PUBLIC_KEY=seu_public_key_aqui
MERCADOPAGO_WEBHOOK_SECRET=seu_webhook_secret_aqui
PORT=3001
```

### 3. Rotas necessárias:

#### POST /api/payments/pix/create
Cria um novo pagamento Pix usando a API do Mercado Pago.

**Exemplo de implementação (Express.js):**

```javascript
const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Payment } = require('mercadopago');

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});
const payment = new Payment(client);

// Criar pagamento Pix
app.post('/api/payments/pix/create', async (req, res) => {
  try {
    const result = await payment.create({
      body: {
        transaction_amount: req.body.transaction_amount,
        description: req.body.description,
        payment_method_id: 'pix',
        payer: req.body.payer,
      }
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar status do pagamento
app.get('/api/payments/status/:paymentId', async (req, res) => {
  try {
    const result = await payment.get({
      id: req.params.paymentId
    });
    
    res.json(result);
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log('Servidor rodando na porta', process.env.PORT || 3001);
});
```

### 4. Webhook para notificações (Opcional mas recomendado):

```javascript
// Webhook para receber notificações do Mercado Pago
app.post('/api/webhooks/mercadopago', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    if (type === 'payment') {
      // Processar notificação de pagamento
      const paymentInfo = await payment.get({ id: data.id });
      
      // Aqui você pode atualizar seu banco de dados
      // ou notificar o frontend via WebSocket/SSE
      
      console.log('Pagamento atualizado:', paymentInfo);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).send('Error');
  }
});
```

### 5. Configuração no painel do Mercado Pago:

1. Acesse https://www.mercadopago.com.br/developers
2. Vá em "Suas integrações"
3. Configure a URL do webhook: `https://seu-backend.com/api/webhooks/mercadopago`
4. Selecione o evento "Payments"

### 6. Altere a configuração no frontend:

No arquivo `src/config/api.ts`, altere a `BASE_URL` para a URL do seu backend:

```typescript
export const API_CONFIG = {
  BASE_URL: 'https://seu-backend.vercel.app', // URL do seu backend
  // ...
};
```

### 7. Deploy sugerido:

- **Vercel**: Para Next.js - deploy automático via GitHub
- **Railway**: Para Node.js/Express - suporte nativo a variáveis de ambiente
- **Heroku**: Opção tradicional com boa documentação

### Credenciais do Mercado Pago:

1. Acesse https://www.mercadopago.com.br/developers
2. Vá em "Suas integrações" > "Credenciais"
3. Use as credenciais de **Produção** para pagamentos reais
4. Use as credenciais de **Teste** para desenvolvimento

**Importante:** Nunca exponha suas credenciais de produção no frontend!