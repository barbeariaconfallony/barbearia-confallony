# 🔔 Guia de Teste - Push Notifications FCM

## ✅ Funcionalidades Implementadas

As notificações agora funcionam tanto como **toast** (dentro do app) quanto como **push notifications FCM** (navegador web e Android):

### 📱 Tipos de Notificações:

1. **Login** - "Bem-vindo(a), {nome}! 🎉"
2. **Logout** - "Até breve, {nome}! 👋"
3. **Inatividade** - "Esperamos você em breve! 💈" (após 1 minuto)
4. **Lembretes da Fila** - A cada 30 minutos com tempo restante
5. **Posição na Fila** - Quando há agendamento pendente

## 🌐 Como Testar no Navegador (Web)

### 1. Permitir Notificações

1. Acesse o site
2. Faça login
3. Clique em **"Ativar Notificações"** (se disponível)
4. Aceite as permissões do navegador

### 2. Testar Notificações

**Login:**
```
1. Faça logout
2. Faça login novamente
3. Deve aparecer toast + notificação do navegador
```

**Inatividade:**
```
1. Minimize ou troque de aba
2. Aguarde 1 minuto
3. Receberá notificação de inatividade
```

**Fila:**
```
1. Entre na fila de agendamentos
2. Receberá notificação imediata
3. Receberá lembretes a cada 30 minutos
```

### 3. Verificar no Console

Abra o DevTools (F12) e procure por:
```
📤 Enviando push notification FCM: ...
✅ Push notification FCM enviado com sucesso
📩 [FCM Background] Notificação recebida
```

## 📱 Como Testar no Android

### Pré-requisitos

1. **Android Studio** instalado
2. **Git** configurado
3. **Node.js** e npm instalados

### Configuração do Projeto

```bash
# 1. Exportar projeto para GitHub
# (Use o botão "Export to Github" no Lovable)

# 2. Clonar repositório
git clone <seu-repositorio>
cd <seu-projeto>

# 3. Instalar dependências
npm install

# 4. Build do projeto
npm run build

# 5. Adicionar plataforma Android
npx cap add android

# 6. Sincronizar
npx cap sync android

# 7. Abrir no Android Studio
npx cap open android
```

### Configurar Firebase no Android

1. **Baixar google-services.json**:
   - Acesse [Firebase Console](https://console.firebase.google.com)
   - Vá em Project Settings
   - Adicione app Android (se ainda não tiver)
   - Baixe o arquivo `google-services.json`

2. **Copiar para o projeto**:
   ```bash
   cp google-services.json android/app/google-services.json
   ```

3. **Verificar gradle** (`android/app/build.gradle`):
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   
   dependencies {
       implementation 'com.google.firebase:firebase-messaging:23.2.1'
   }
   ```

### Testar no Emulador ou Dispositivo

```bash
# Executar no dispositivo conectado
npx cap run android

# Ou abrir no Android Studio e clicar em Run
npx cap open android
```

### Verificar Logs no Android

```bash
# Logs gerais
adb logcat | grep -i firebase

# Logs específicos do FCM
adb logcat | grep -i "FCM"
```

## 🔍 Verificar se está Funcionando

### ✅ Checklist de Testes

- [ ] **Navegador Web**:
  - [ ] Permissão de notificações solicitada
  - [ ] Toast aparece ao fazer login
  - [ ] Push notification aparece ao fazer login
  - [ ] Notificação de inatividade após 1 minuto

- [ ] **Android**:
  - [ ] App instala sem erros
  - [ ] Permissão de notificações solicitada
  - [ ] Notificações aparecem na barra de status
  - [ ] Som e vibração funcionam
  - [ ] Clicar na notificação abre o app

### 📊 Monitorar Edge Function

1. Acesse **Cloud > Edge Functions** no Lovable
2. Clique em `send-push-notification`
3. Veja os logs em tempo real:
   ```
   📤 Enviando notificação para X usuário(s)
   ✅ Y token(s) encontrado(s)
   📨 Enviando para Y dispositivo(s)
   ✅ Enviado com sucesso: Y
   ```

## ⚙️ Configurações Importantes

### Secrets Necessários (Edge Function)

Certifique-se de que os seguintes secrets estão configurados:

```bash
FCM_SERVER_KEY=...
FIREBASE_PROJECT_ID=barbearia-confallony
FIREBASE_API_KEY=...
```

### Permissões Necessárias

**Web:** Permissão automática via navegador

**Android (`AndroidManifest.xml`):**
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
```

## 🚨 Troubleshooting

### Notificações não aparecem no navegador

1. Verificar permissão: `chrome://settings/content/notifications`
2. Verificar console: Procurar por erros FCM
3. Limpar cache e service worker
4. Recarregar página com Ctrl+Shift+R

### Notificações não aparecem no Android

1. Verificar se `google-services.json` está correto
2. Verificar logs: `adb logcat | grep FCM`
3. Verificar permissões do app nas configurações
4. Reinstalar o app: `npx cap run android`

### Edge function falhando

1. Verificar secrets: Cloud > Settings > Secrets
2. Verificar logs: Cloud > Edge Functions > send-push-notification
3. Testar manualmente:
   ```bash
   curl -X POST https://[projeto].supabase.co/functions/v1/send-push-notification \
     -H "Content-Type: application/json" \
     -d '{"userId":"test-user","title":"Teste","body":"Corpo da mensagem"}'
   ```

## 📝 Notas Importantes

- **Web**: Notificações funcionam mesmo com o navegador minimizado
- **Android**: Notificações aparecem na barra de status do sistema
- **Inatividade**: Timer é de 1 minuto (pode ajustar em `useInactivityNotification.ts`)
- **Fila**: Lembretes são enviados a cada 30 minutos (pode ajustar em `useQueueReminders.ts`)
- **FCM Token**: É salvo automaticamente ao fazer login e permitir notificações

## 🎯 Próximos Passos

1. ✅ Testar no navegador web
2. ✅ Testar no Android
3. 🔄 Ajustar tempo dos lembretes (se necessário)
4. 🔄 Personalizar sons e ícones
5. 🔄 Adicionar mais tipos de notificações
