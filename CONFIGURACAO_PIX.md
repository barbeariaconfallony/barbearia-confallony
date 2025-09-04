# Configuração PIX - Mercado Pago + Supabase

Este guia explica como configurar pagamentos PIX reais usando Mercado Pago integrado com Supabase.

## Pré-requisitos

1. **Conta no Mercado Pago**: [mercadopago.com.br](https://mercadopago.com.br)
2. **Conta no Supabase**: [supabase.com](https://supabase.com)

## Passo 1: Conectar Supabase ao Projeto Lovable

1. Clique no botão verde **"Supabase"** no topo da interface Lovable
2. Faça login na sua conta Supabase
3. Crie um novo projeto ou conecte um existente
4. Autorize a conexão entre Lovable e Supabase

## Passo 2: Obter Credenciais do Mercado Pago

### Ambiente de Teste (Sandbox)
1. Acesse o [Mercado Pago Developers](https://www.mercadopago.com.br/developers)
2. Vá em "Suas integrações" > "Teste"
3. Copie o **Access Token de Teste**

### Ambiente de Produção
1. Acesse o [Mercado Pago Developers](https://www.mercadopago.com.br/developers)
2. Vá em "Suas integrações" > "Produção"
3. Copie o **Access Token de Produção**

## Passo 3: Configurar Secrets no Supabase

1. No painel Lovable, após conectar o Supabase, vá em "Project Settings"
2. Adicione um novo secret:
   - **Nome**: `MERCADOPAGO_ACCESS_TOKEN`
   - **Valor**: Cole o Access Token obtido no Passo 2

## Passo 4: Atualizar Configurações do Frontend

Edite o arquivo `/src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

// Substitua pelas suas credenciais reais do Supabase
export const supabaseUrl = 'https://SEU-PROJETO.supabase.co'
export const supabaseAnonKey = 'sua-chave-anonima-aqui'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'https://your-project.supabase.co' && 
         supabaseAnonKey !== 'your-anon-key'
}
```

### Como encontrar suas credenciais:

1. **URL do Projeto**: No dashboard do Supabase, vá em Settings > API
2. **Anon Key**: Na mesma página, copie a "anon public" key

## Passo 5: Testar a Integração

1. Acesse a página de agendamento
2. Escolha PIX como forma de pagamento
3. Preencha os dados e gere o código PIX
4. Use o [Mercado Pago Test Cards](https://www.mercadopago.com.br/developers/pt/docs/test-integration/test-payments) para simular pagamentos

## Estrutura das Edge Functions

O projeto já inclui 3 edge functions prontas:

1. **`create-pix-payment`**: Cria pagamentos PIX via Mercado Pago
2. **`check-payment-status`**: Verifica status do pagamento
3. **`mercadopago-webhook`**: Recebe notificações do Mercado Pago

## URLs de Webhook (Opcional)

Se desejar receber notificações automáticas, configure no Mercado Pago:

```
https://SEU-PROJETO.supabase.co/functions/v1/mercadopago-webhook
```

## Solução de Problemas

### Erro: "Configuração necessária"
- Verifique se atualizou o arquivo `/src/lib/supabase.ts`
- Confirme que o Supabase está conectado ao projeto

### Erro: "Credenciais do Mercado Pago não configuradas"
- Verifique se adicionou o secret `MERCADOPAGO_ACCESS_TOKEN`
- Confirme que o token está correto e ativo

### Pagamentos não são processados
- Verifique se está usando o Access Token correto (teste/produção)
- Confirme que a conta Mercado Pago está ativa
- Verifique os logs das edge functions no Supabase

## Logs e Monitoramento

Para monitorar pagamentos:

1. Acesse o dashboard do Supabase
2. Vá em "Edge Functions" > "Logs"
3. Monitore as execuções das funções `create-pix-payment` e `check-payment-status`

## Segurança

- ✅ O Access Token fica seguro nos secrets do Supabase
- ✅ Edge functions executam no servidor, não no frontend
- ✅ Dados sensíveis não são expostos no código cliente
- ✅ Comunicação criptografada HTTPS

## Suporte

Para dúvidas sobre:
- **Mercado Pago**: [Documentação oficial](https://www.mercadopago.com.br/developers)
- **Supabase**: [Documentação oficial](https://supabase.com/docs)
- **Lovable**: Use o chat da plataforma