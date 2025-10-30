# Configuração de Pagamento por Cartão - Mercado Pago

## ✅ Estrutura Implementada

### 1. Edge Functions Configuradas

#### `get-mp-public-key`
- **Objetivo**: Retorna a chave pública do Mercado Pago para o frontend
- **Autenticação**: Não requer JWT (público)
- **Endpoint**: `https://zhojnzbnjtpdeshkdwcb.supabase.co/functions/v1/get-mp-public-key`

#### `create-mercadopago-payment`
- **Objetivo**: Processa pagamentos com cartão usando token gerado no frontend
- **Autenticação**: Não requer JWT (validação via Firebase UID)
- **Rate Limit**: 10 requisições por minuto por usuário
- **Idempotência**: Usa `X-Idempotency-Key` para evitar duplicatas
- **Endpoint**: `https://zhojnzbnjtpdeshkdwcb.supabase.co/functions/v1/create-mercadopago-payment`

#### `mercadopago-webhook`
- **Objetivo**: Recebe notificações do Mercado Pago sobre status de pagamentos
- **Autenticação**: Não requer JWT (webhook público)
- **Endpoint**: `https://zhojnzbnjtpdeshkdwcb.supabase.co/functions/v1/mercadopago-webhook`

### 2. Variáveis de Ambiente Necessárias

Já configuradas como secrets no Supabase:
- `MERCADOPAGO_ACCESS_TOKEN` - Token de acesso de produção
- `MERCADOPAGO_PUBLIC_KEY` - Chave pública de produção

### 3. Fluxo de Pagamento

#### Frontend (BookingMobile.tsx)
1. Usuário seleciona serviço, data, horário e profissional
2. Escolhe forma de pagamento: Cartão de Crédito ou Débito
3. Opcionalmente marca para pagar apenas 1/3 do valor
4. Clica em "Confirmar Agendamento"

#### CardPaymentForm Component
1. Carrega SDK do Mercado Pago via CDN
2. Obtém chave pública da edge function `get-mp-public-key`
3. Coleta dados do cartão (número, titular, validade, CVV, CPF)
4. Para crédito: permite escolher parcelas (1x a 12x)
5. Gera `card_token` localmente usando SDK (dados sensíveis nunca vão ao servidor)
6. Envia para edge function apenas:
   - `token` (card_token)
   - `transaction_amount`
   - `installments`
   - `payment_method_id`
   - `firebase_uid`
   - Dados do pagador (email, nome, CPF)

#### Edge Function (create-mercadopago-payment)
1. Valida entrada e rate limit
2. Verifica valor mínimo (R$ 1,00 para cartão)
3. Salva na fila de pagamentos (`payment_queue`)
4. Cria pagamento na API do Mercado Pago com:
   - Header `X-Idempotency-Key` para evitar duplicatas
   - Endpoint `/v1/payments`
   - Access Token de produção
5. Atualiza status na fila
6. Retorna resposta com status do pagamento

#### Webhook (mercadopago-webhook)
1. Recebe notificação do Mercado Pago
2. Busca dados atualizados do pagamento
3. Pode ser usado para:
   - Atualizar status no banco
   - Enviar email de confirmação
   - Notificar cliente

### 4. Status de Pagamento

| Status MP | Ação no Sistema |
|-----------|----------------|
| `approved` | Confirmar agendamento, marcar como pago |
| `pending` | Manter como "aguardando_confirmacao" |
| `rejected` | Exibir erro, permitir nova tentativa |
| `cancelled` | Cancelar agendamento |

### 5. Segurança Implementada

✅ **Tokenização no Cliente**: Dados do cartão nunca chegam ao servidor
✅ **Rate Limiting**: 10 tentativas/minuto por usuário
✅ **Idempotência**: Previne cobranças duplicadas
✅ **Validação de Entrada**: Tipos e valores validados
✅ **Logs Seguros**: Dados sensíveis ocultados nos logs
✅ **CORS Configurado**: Headers de segurança adequados

### 6. Configuração do Webhook no Mercado Pago

1. Acesse: [Painel Mercado Pago - Webhooks](https://www.mercadopago.com.br/developers/panel/webhooks)
2. Adicione URL: `https://zhojnzbnjtpdeshkdwcb.supabase.co/functions/v1/mercadopago-webhook`
3. Selecione eventos: `payment`
4. Salve a configuração

### 7. Parcelamento (Crédito)

- **Débito**: Sempre 1x (à vista)
- **Crédito**: Até 12x sem juros
- Frontend exibe:
  - Valor total
  - Valor por parcela
  - Quantidade de parcelas

### 8. Teste em Produção

Para testar com valores reais pequenos:

```bash
# 1. Verificar logs da edge function
supabase functions logs create-mercadopago-payment --project-ref zhojnzbnjtpdeshkdwcb

# 2. Fazer teste com R$ 1,00 ou R$ 2,00

# 3. Verificar no painel do Mercado Pago se o pagamento aparece
```

### 9. Tabela payment_queue

Estrutura para rastreamento de pagamentos:

```sql
CREATE TABLE payment_queue (
  id UUID PRIMARY KEY,
  firebase_uid TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  payment_data JSONB,
  idempotency_key TEXT UNIQUE,
  status TEXT, -- processing, completed, failed, cancelled
  mercadopago_payment_id TEXT,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

### 10. Endpoints Finais

| Função | URL | JWT |
|--------|-----|-----|
| Public Key | `https://zhojnzbnjtpdeshkdwcb.supabase.co/functions/v1/get-mp-public-key` | Não |
| Create Payment | `https://zhojnzbnjtpdeshkdwcb.supabase.co/functions/v1/create-mercadopago-payment` | Não |
| Webhook | `https://zhojnzbnjtpdeshkdwcb.supabase.co/functions/v1/mercadopago-webhook` | Não |

### 11. Próximos Passos

- [x] Edge functions criadas e configuradas
- [x] CardPaymentForm implementado
- [x] Integração na página booking-mobile
- [x] Suporte a parcelamento (até 12x)
- [x] Suporte a débito
- [ ] Configurar webhook no painel Mercado Pago
- [ ] Testar com valores reais pequenos
- [ ] Implementar atualização de status via webhook
- [ ] Adicionar logs de auditoria

### 12. Troubleshooting

**Erro: "Failed to fetch public key"**
- Verificar se secret `MERCADOPAGO_PUBLIC_KEY` está configurado
- Verificar logs: `supabase functions logs get-mp-public-key`

**Erro: "Credenciais não configuradas"**
- Verificar se secret `MERCADOPAGO_ACCESS_TOKEN` está configurado

**Erro: "Valor abaixo do mínimo"**
- Cartão: mínimo R$ 1,00
- PIX: mínimo R$ 0,01

**Pagamento não aprovado**
- Verificar dados do cartão
- Verificar se é cartão de teste ou real
- Ver logs da edge function para detalhes do erro

### 13. Monitoramento

Acompanhe pagamentos em:
- Painel Mercado Pago: https://www.mercadopago.com.br/activities
- Logs Supabase: `supabase functions logs create-mercadopago-payment`
- Tabela `payment_queue` no banco de dados
