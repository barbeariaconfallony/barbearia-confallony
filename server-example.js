const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Payment } = require('mercadopago');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: ['http://localhost:5173', 'https://seu-dominio.com'], // Adicione seus domínios
  credentials: true
}));
app.use(express.json());

// Configuração do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});
const payment = new Payment(client);

// Rota de teste
app.get('/', (req, res) => {
  res.json({ 
    message: 'Backend Mercado Pago funcionando!', 
    timestamp: new Date().toISOString() 
  });
});

// Criar pagamento Pix
app.post('/api/payments/pix/create', async (req, res) => {
  try {
    console.log('Recebendo requisição de pagamento:', req.body);
    
    const { transaction_amount, description, payer } = req.body;
    
    // Validações básicas
    if (!transaction_amount || !description || !payer) {
      return res.status(400).json({ 
        error: 'Dados obrigatórios não fornecidos' 
      });
    }

    const paymentData = {
      transaction_amount: Number(transaction_amount),
      description,
      payment_method_id: 'pix',
      payer: {
        email: payer.email,
        first_name: payer.first_name,
        last_name: payer.last_name,
        identification: {
          type: payer.identification.type,
          number: payer.identification.number
        }
      }
    };

    console.log('Criando pagamento com dados:', paymentData);
    
    const result = await payment.create({
      body: paymentData
    });
    
    console.log('Pagamento criado com sucesso:', result.id);
    res.json(result);
    
  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    
    // Log detalhado do erro
    if (error.response) {
      console.error('Erro da API do Mercado Pago:', error.response.data);
    }
    
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// Verificar status do pagamento
app.get('/api/payments/status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    console.log('Verificando status do pagamento:', paymentId);
    
    const result = await payment.get({
      id: paymentId
    });
    
    console.log('Status do pagamento:', result.status);
    res.json(result);
    
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({ 
      error: 'Erro ao verificar status do pagamento',
      details: error.message 
    });
  }
});

// Webhook do Mercado Pago (opcional)
app.post('/api/webhooks/mercadopago', async (req, res) => {
  try {
    const { type, data } = req.body;
    console.log('Webhook recebido:', { type, data });
    
    if (type === 'payment') {
      const paymentInfo = await payment.get({ id: data.id });
      console.log('Pagamento atualizado via webhook:', paymentInfo);
      
      // Aqui você pode processar a atualização do pagamento
      // Ex: atualizar banco de dados, enviar email, etc.
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).send('Error');
  }
});

// Middleware de erro global
app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  res.status(500).json({ 
    error: 'Erro interno do servidor' 
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 Acesse: http://localhost:${PORT}`);
  console.log(`🔑 Access Token configurado: ${process.env.MERCADOPAGO_ACCESS_TOKEN ? 'SIM' : 'NÃO'}`);
});

module.exports = app;