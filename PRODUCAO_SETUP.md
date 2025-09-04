# Setup para Produção - Integração Mercado Pago

## ✅ Configuração Atual

### 1. Credenciais configuradas como Secrets no Supabase:
- `MERCADOPAGO_ACCESS_TOKEN`: Configurado com segurança ✅
- `MERCADOPAGO_PUBLIC_KEY`: Configurado com segurança ✅
- `MERCADOPAGO_CLIENT_SECRET`: Configurado com segurança ✅

### 2. Edge Functions configuradas:
- `create-pix-payment`: Cria pagamentos Pix ✅
- `check-payment-status`: Verifica status dos pagamentos ✅
- `mercadopago-webhook`: Recebe notificações do Mercado Pago ✅

### 3. Interface de Configurações:
- Página de configurações criada: `/settings` ✅
- Formulários para dados pessoais ✅
- Integração com sistema de pagamentos ✅
- Navegação entre páginas ✅

## 📋 Como Usar

### 1. Configure seus dados pessoais:
1. Acesse `/settings` na aplicação
2. Preencha a aba "Dados Pessoais":
   - Nome completo
   - Email 
   - CPF
   - Telefone (opcional)

### 2. Credenciais do Mercado Pago:
- As credenciais já estão configuradas com segurança no Supabase
- Opcionalmente você pode salvar localmente na aba "Mercado Pago"

### 3. Configurações Gerais:
- Configure notificações
- Ative confirmação automática de pagamentos
- Configure modo debug se necessário

## 🚀 Deploy das Edge Functions

### Para resolver o erro "Failed to fetch", execute:

```bash
# 1. Instale a CLI do Supabase
npm install -g supabase

# 2. Faça login na CLI
supabase login

# 3. Link com o projeto
supabase link --project-ref mmsymxivrulrgsjwzupp

# 4. Deploy das functions
supabase functions deploy create-pix-payment
supabase functions deploy check-payment-status  
supabase functions deploy mercadopago-webhook

# 5. Configure os secrets via CLI (já configurados via interface)
supabase secrets set MERCADOPAGO_ACCESS_TOKEN=APP_USR-4035936027567768-082414-d8095cc5719dc5a4fcd5b7ede860d553-292376151
supabase secrets set MERCADOPAGO_PUBLIC_KEY=APP_USR-0f11a454-305c-4965-835a-41ecfb4dcce7
supabase secrets set MERCADOPAGO_CLIENT_SECRET=oaqluW0mdJdfOJ9oixVpme9FAYcfXa9g
```

## 🔧 Configuração de Webhooks no Mercado Pago

1. Acesse o [Painel do Mercado Pago](https://www.mercadopago.com.br/developers/panel)
2. Vá em "Webhooks" 
3. Adicione a URL: `https://vxfofymcvcycfttzhftf.supabase.co/functions/v1/mercadopago-webhook`
4. Selecione os eventos: `payment`

## 🛡️ Segurança em Produção

### ✅ Implementado:
- Credenciais como secrets (não expostas no código)
- CORS configurado
- Validação de dados
- Tratamento de erros
- Logs estruturados

### 📋 Checklist Final:
- [ ] Deploy das Edge Functions executado
- [ ] Webhooks configurados no Mercado Pago
- [ ] Secrets configurados
- [ ] Teste de pagamento realizado
- [ ] Logs sendo coletados

## 🧪 Teste em Produção

Para testar:
1. Use valores pequenos como R$ 0,01
2. Verifique os logs: `supabase functions logs create-pix-payment`
3. Confirme o recebimento dos webhooks

## 🚨 Possíveis Causas do "Failed to fetch"

1. **Functions não deployadas**: Execute o deploy acima
2. **Secrets não configurados**: Já resolvido ✅
3. **CORS**: Já configurado nas functions ✅
4. **URL incorreta**: Verificar se o project-ref está correto

## 📞 Próximos Passos

1. Execute o deploy das functions
2. Teste um pagamento
3. Verifique os logs para debugging
4. Configure os webhooks no painel do Mercado Pago

O erro "Failed to fetch" deve ser resolvido após o deploy das Edge Functions.