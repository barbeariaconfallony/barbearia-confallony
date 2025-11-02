# 📱 Configuração Completa de Notificações FCM (Firebase Cloud Messaging)

## ✅ Status da Configuração

### ✅ Arquivos Configurados

1. **`src/lib/firebase.ts`** ✅
   - Firebase Messaging inicializado corretamente
   - Exporta instância `messaging` para uso em toda aplicação
   - Verifica se está em ambiente web antes de inicializar

2. **`public/firebase-messaging-sw.js`** ✅
   - Service Worker configurado para receber notificações em background
   - Exibe notificações mesmo com app fechado/minimizado
   - Suporta cliques em notificações com redirecionamento
   - Configurado para Android e Web

3. **`src/hooks/useFCMToken.ts`** ✅
   - Gerencia obtenção e armazenamento de tokens FCM
   - Salva tokens no Firestore na collection `device_tokens`
   - Registra Service Worker automaticamente
   - Trata mensagens em foreground (app aberto)

4. **`src/hooks/useCustomNotifications.ts`** ✅
   - Centraliza todas as notificações do sistema
   - Envia notificações locais + push FCM simultâneas
   - Notificações implementadas:
     - Login: "Bem-vindo(a), {nome}! 🎉"
     - Logout: "Até breve, {nome}! 👋"
     - Inatividade: "Esperamos você em breve! 💈"
     - Fila: Lembretes com tempo restante

5. **`src/utils/fcm-notification.ts`** ✅
   - Funções utilitárias para enviar push via edge function
   - Suporta envio individual e em lote

6. **`supabase/functions/send-push-notification/index.ts`** ✅
   - Edge function para enviar notificações FCM
   - Busca tokens do Firestore
   - Envia via API do Firebase (fcm.googleapis.com)
   - Suporta múltiplos usuários simultaneamente

7. **`src/components/NotificationPermissionButton.tsx`** ✅
   - Botão para usuário ativar notificações manualmente
   - Usado no Header e ProfileMobile

8. **`src/components/FCMInitializer.tsx`** ✅
   - Componente para inicializar notificações automaticamente no login
   - Verifica se permissão já foi concedida antes
   - Não solicita permissão intrusivamente

## 🔧 Integração no Sistema

### Onde as notificações são chamadas:

1. **Login** - `src/contexts/AuthContext.tsx`
   ```typescript
   await notifyLoginSuccess(userName);
   ```

2. **Logout** - `src/contexts/AuthContext.tsx`
   ```typescript
   await notifyLogoutSuccess(userName);
   ```

3. **Inatividade** - `src/hooks/useInactivityNotification.ts`
   - Detecta quando usuário sai da página (1 minuto)
   - Envia notificação automaticamente

4. **Lembretes da Fila** - `src/hooks/useQueueReminders.ts`
   - Envia lembretes periódicos (30 minutos)
   - Verifica posição na fila

## 🚀 Como Testar

### 1. Teste no Navegador Web (Desktop)

1. Abra o app no navegador
2. Faça login
3. Clique no botão "Ativar Notificações" no Header
4. Permita notificações quando solicitado
5. Teste as notificações:
   - Faça logout e login novamente
   - Deixe a aba inativa por 1 minuto
   - Entre na fila de agendamentos

### 2. Teste no Firebase Console

1. Acesse: https://console.firebase.google.com/project/barbearia-confallony/messaging
2. Clique em "Nova campanha" > "Mensagem de notificação"
3. Preencha título e corpo da mensagem
4. Em "Destino", selecione "Tópico" ou "Token"
5. Se usar Token, cole o token FCM do console do navegador
6. Envie a notificação de teste

### 3. Teste no Android (via Capacitor)

**Pré-requisitos:**
- Android Studio instalado
- Projeto Capacitor configurado
- google-services.json no diretório `android/app/`

**Comandos:**
```bash
npm run build
npx cap sync android
npx cap run android
```

**Configuração Android:**
1. Baixe `google-services.json` do Firebase Console
2. Coloque em `android/app/google-services.json`
3. Reconstrua o projeto Android

### 4. Como verificar se está funcionando

**Console do Navegador:**
```javascript
// Verificar se Service Worker está registrado
navigator.serviceWorker.getRegistrations().then(regs => console.log(regs))

// Verificar permissão de notificações
console.log('Permissão:', Notification.permission)

// Verificar tokens salvos (no DevTools > Application > IndexedDB)
// Ou via Firestore > device_tokens
```

**Firestore:**
- Abra Firestore no Firebase Console
- Verifique se há documentos na collection `device_tokens`
- Cada documento deve ter: `userId`, `token`, `platform`, `createdAt`

## 🔑 Variáveis de Ambiente Necessárias

### Supabase Edge Function

Adicione estes secrets no Supabase:

```bash
supabase secrets set FCM_SERVER_KEY=<sua-chave-servidor-fcm>
supabase secrets set FIREBASE_PROJECT_ID=barbearia-confallony
supabase secrets set FIREBASE_API_KEY=AIzaSyBIVVXaxM-yPYRELT_ZWgRuT0Kcd5dbp6c
```

**Como obter FCM_SERVER_KEY:**
1. Acesse Firebase Console
2. Configurações do Projeto > Cloud Messaging
3. Copie a "Chave do servidor (legacy)"

## 📋 Checklist de Verificação

- [x] Firebase Messaging configurado em `src/lib/firebase.ts`
- [x] Service Worker registrado em `public/firebase-messaging-sw.js`
- [x] Hook `useFCMToken` implementado
- [x] Hook `useCustomNotifications` implementado
- [x] Edge function `send-push-notification` implementada
- [x] Componente `NotificationPermissionButton` criado
- [x] Componente `FCMInitializer` criado
- [x] Notificações de Login/Logout integradas no `AuthContext`
- [x] Notificações de inatividade implementadas
- [x] Lembretes de fila implementados
- [ ] **FCM_SERVER_KEY configurado no Supabase** ⚠️
- [ ] Testado no navegador web
- [ ] Testado no Android
- [ ] Testado notificação em background
- [ ] Testado notificação em foreground

## ⚠️ Próximos Passos

1. **Configurar FCM_SERVER_KEY no Supabase:**
   ```bash
   supabase secrets set FCM_SERVER_KEY=<sua-chave>
   ```

2. **Adicionar FCMInitializer no App.tsx:**
   ```typescript
   import { FCMInitializer } from '@/components/FCMInitializer';
   
   <AuthProvider>
     <FCMInitializer />
     {/* resto do app */}
   </AuthProvider>
   ```

3. **Testar em ambiente de produção**

4. **Monitorar logs da edge function:**
   ```bash
   supabase functions logs send-push-notification
   ```

## 🐛 Troubleshooting

### Notificações não aparecem

1. Verifique permissão:
   ```javascript
   console.log(Notification.permission)
   ```

2. Verifique se Service Worker está ativo:
   ```javascript
   navigator.serviceWorker.getRegistrations()
   ```

3. Verifique se token foi salvo no Firestore:
   - Firebase Console > Firestore > device_tokens

4. Verifique logs da edge function:
   ```bash
   supabase functions logs send-push-notification
   ```

### Token não está sendo gerado

- Certifique-se de estar usando HTTPS ou localhost
- Verifique se VAPID_KEY está correto
- Limpe cache e service workers:
  ```javascript
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => reg.unregister())
  })
  ```

### Notificações funcionam no navegador mas não no Android

- Verifique se `google-services.json` está no lugar correto
- Reconstrua o projeto: `npx cap sync android`
- Verifique logs do Android Studio

## 📚 Documentação Adicional

- [Firebase Cloud Messaging - Web](https://firebase.google.com/docs/cloud-messaging/js/client)
- [Service Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web Push Protocol](https://developers.google.com/web/fundamentals/push-notifications)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
