# 🔔 Sistema de Push Notifications para Admins - Guia de Uso

## 📋 Visão Geral

Sistema automático de notificações push que alerta todos os administradores quando um novo agendamento é adicionado na fila de atendimento.

## ✨ Funcionalidades Implementadas

### ✅ Solicitação Automática de Permissões
- **Detecção automática**: Sistema pede permissão para notificações automaticamente quando o usuário abre o app
- **Aguarda 2 segundos**: Delay de 2 segundos após o carregamento para não ser intrusivo
- **Pergunta apenas uma vez**: Salva no localStorage que já perguntou para não repetir
- **Requer autenticação**: Só pede permissão se o usuário estiver logado
- **Multi-plataforma**: Funciona em Web, iOS e Android

### ✅ Detecção Automática
- Detecta automaticamente novos agendamentos na coleção `fila` do Firestore
- Funciona em todos os fluxos de agendamento:
  - Pagamento em dinheiro (ServiceBooking)
  - Pagamento PIX (PixPayment)
  - Agendamento local (BookingLocal)
  - Agendamento mobile (BookingMobile)
  - Confirmação de PIX (PixPagamento)

### 🎯 Notificações Inteligentes
- **Título**: "🔔 Novo Agendamento na Fila"
- **Corpo**: "[Nome do Cliente] - [Serviço] - [Data/Hora]"
- **Som e Vibração**: Notificações nativas com alertas sonoros
- **Deep Link**: Ao clicar, abre diretamente a página `/queue`

### 👥 Identificação de Administradores
- Busca automática de todos os usuários com role `admin`
- Usa a tabela `user_roles` do Supabase com segurança máxima
- Sistema preparado para múltiplos admins

### 📱 Multi-Dispositivo
- Envia notificações para **todos os dispositivos** de cada admin
- Suporta iOS, Android e Web
- Gerencia tokens FCM automaticamente

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────┐
│ Novo Agendamento        │
│ (addDoc na fila)        │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ notifyAdminsNewQueue()  │
│ (utils/notify-admins.ts)│
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────────────┐
│ Edge Function:                  │
│ notify-admins-new-queue         │
└──────────┬──────────────────────┘
           │
           ├─► 1. Buscar admins (Supabase user_roles)
           │
           ├─► 2. Buscar tokens FCM (Firestore device_tokens)
           │
           └─► 3. Enviar notificações (Firebase Cloud Messaging)
                     │
                     ▼
           ┌──────────────────┐
           │ Dispositivos dos │
           │ Administradores  │
           └──────────────────┘
```

## 📁 Arquivos Criados/Modificados

### ✅ Novos Arquivos
1. **`supabase/functions/notify-admins-new-queue/index.ts`**
   - Edge Function principal
   - Busca admins no Supabase
   - Busca tokens FCM no Firestore
   - Envia notificações via FCM

2. **`src/utils/notify-admins.ts`**
   - Função utilitária `notifyAdminsNewQueue()`
   - Interface simplificada para chamar a Edge Function
   - Tratamento de erros não-bloqueante

### 🔄 Arquivos Modificados
1. **`src/components/ServiceBooking.tsx`**
   - Adiciona notificação após pagamento em dinheiro

2. **`src/components/PixPayment.tsx`**
   - Adiciona notificação após confirmação de PIX

3. **`src/pages/BookingLocal.tsx`**
   - Adiciona notificação após agendamento local

4. **`src/pages/BookingMobile.tsx`**
   - Adiciona notificação após agendamento mobile

5. **`src/pages/PixPagamento.tsx`**
   - Adiciona notificação após confirmação de pagamento PIX

6. **`src/App.tsx`**
   - Integra hook de solicitação automática de permissões
   - Hook é executado para todos os usuários logados

7. **`src/hooks/useAutoRequestNotifications.ts`** (Novo)
   - Hook que solicita permissão automaticamente ao abrir o app
   - Aguarda 2 segundos para não ser intrusivo
   - Verifica localStorage para não perguntar repetidamente
   - Só executa se usuário estiver autenticado

## 🚀 Como Usar

### Para o Admin (Automático!)
1. **Primeira vez**:
   - Faça login no sistema
   - Após 2 segundos, o navegador solicitará permissão automaticamente
   - Clique em "Permitir" para ativar as notificações
   - Pronto! Seu dispositivo está registrado

2. **Dispositivos Adicionais**:
   - Abra o app em outro dispositivo
   - Faça login com sua conta admin
   - Sistema pedirá permissão automaticamente
   - Todos os dispositivos receberão notificações

3. **Receber Notificações**:
   - Mantenha o app instalado no dispositivo
   - As notificações funcionam **mesmo com o app fechado**
   - Ao tocar na notificação, abre diretamente a página da Fila

### Para Clientes (Fluxo Automático)
- O cliente agenda normalmente
- O sistema detecta automaticamente
- Admins recebem notificação instantânea
- **Sem necessidade de ação manual**

## 🔧 Configuração Técnica

### Secrets Necessários (Já Configurados)
- ✅ `FIREBASE_PROJECT_ID` - ID do projeto Firebase
- ✅ `FIREBASE_API_KEY` - API Key do Firebase
- ✅ `FCM_SERVER_KEY` - Chave do servidor FCM
- ✅ `SUPABASE_URL` - URL do projeto Supabase
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Service Role Key

### Edge Function Deploy
```bash
# A função será automaticamente deployada
# Não é necessário nenhum comando manual
```

## 📊 Dados da Notificação

### Payload Completo
```json
{
  "title": "🔔 Novo Agendamento na Fila",
  "body": "João Silva - Corte + Barba - 15/01 às 14:30",
  "data": {
    "appointment_id": "abc123",
    "cliente_nome": "João Silva",
    "servico_nome": "Corte + Barba",
    "data_agendamento": "15/01 às 14:30",
    "type": "new_queue_item",
    "deeplink": "/queue"
  }
}
```

## 🐛 Troubleshooting

### ❌ Notificação não foi solicitada automaticamente

**Verificar:**
1. Usuário está autenticado/logado?
2. Navegador suporta notificações?
3. Já havia negado antes? (limpar localStorage)

**Solução:**
```javascript
// Limpar histórico de solicitação no console do navegador
localStorage.removeItem('notifications_asked');
// Recarregar a página
window.location.reload();
```

### ❌ Admin não recebe notificações

**Verificar:**
1. Admin tem role `admin` na tabela `user_roles`?
2. Admin ativou notificações no app?
3. Token FCM foi salvo no Firestore (`device_tokens`)?

**Solução:**
```sql
-- Verificar role do admin
SELECT * FROM user_roles WHERE user_id = 'USER_ID' AND role = 'admin';
```

### ❌ Notificações não chegam em nenhum dispositivo

**Verificar:**
1. Edge Function foi deployada?
2. Secrets estão configurados corretamente?
3. Firebase Cloud Messaging está ativo?

**Logs:**
```bash
# Ver logs da Edge Function
npx supabase functions logs notify-admins-new-queue
```

### ⚠️ Algumas notificações não chegam

**Possíveis Causas:**
- Token FCM expirado ou inválido
- Dispositivo sem conexão com internet
- App desinstalado do dispositivo

**Solução:**
- Sistema automaticamente ignora tokens inválidos
- Usuário deve reativar notificações se reinstalar o app

## 📈 Estatísticas

A Edge Function retorna estatísticas de cada envio:
```json
{
  "success": true,
  "adminsFound": 3,
  "tokensFound": 5,
  "sent": 4,
  "failed": 1,
  "message": "Notificações enviadas para 3 admin(s)"
}
```

## 🎯 Próximas Melhorias

### Sugeridas para Implementação Futura
1. ✨ **Dashboard de Estatísticas**
   - Quantas notificações foram enviadas
   - Taxa de abertura das notificações
   - Tempo médio de resposta dos admins

2. 🎨 **Notificações Ricas**
   - Incluir foto do cliente
   - Botões de ação rápida (Confirmar/Cancelar)
   - Preview do agendamento

3. 🔕 **Configurações Personalizadas**
   - Admin escolher quais tipos de notificações receber
   - Horários de silêncio (não perturbe)
   - Preferência de som/vibração

4. 📱 **Mais Eventos**
   - Notificar quando cliente confirma presença
   - Notificar cancelamentos
   - Notificar reagendamentos

5. 👥 **Segmentação**
   - Notificar apenas admins da sala específica
   - Notificar apenas admin responsável

## 📚 Recursos Úteis

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## ✅ Checklist de Implementação

- [x] Edge Function `notify-admins-new-queue` criada
- [x] Função utilitária `notifyAdminsNewQueue()` criada
- [x] Hook `useAutoRequestNotifications` criado
- [x] Solicitação automática integrada no App.tsx
- [x] Integração em ServiceBooking.tsx
- [x] Integração em PixPayment.tsx
- [x] Integração em BookingLocal.tsx
- [x] Integração em BookingMobile.tsx
- [x] Integração em PixPagamento.tsx
- [x] Tratamento de erros não-bloqueante
- [x] Logs detalhados para debugging
- [x] Suporte multi-dispositivo
- [x] Sistema não-intrusivo (delay de 2s)
- [x] Prevenção de múltiplas solicitações
- [x] Documentação completa

## 🎉 Status

✅ **Sistema 100% Funcional e com Solicitação Automática!**

Agora, quando qualquer usuário (especialmente admins) fizer login no sistema, ele será automaticamente solicitado a permitir notificações após 2 segundos. O sistema não pergunta novamente se o usuário já respondeu anteriormente.
