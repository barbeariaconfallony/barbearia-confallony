# 🔔 Sistema de Push Notifications Automáticas - Guia Completo

## 📋 Visão Geral

Este sistema permite enviar **notificações push automáticas** para usuários mesmo quando o app está fechado ou o navegador não está aberto. As notificações são disparadas automaticamente pelo backend baseadas em eventos como agendamentos próximos.

## 🎯 Funcionalidades

- ✅ **Notificações Automáticas em Background**: Funcionam mesmo com app fechado
- ✅ **Multi-plataforma**: Web, iOS e Android
- ✅ **Lembretes Inteligentes**: 1 dia, 2h, 1h, 30min e 15min antes dos agendamentos
- ✅ **Sistema de Tokens FCM**: Gerenciamento automático de dispositivos
- ✅ **Edge Functions**: Processamento serverless para envio de notificações
- ✅ **Cron Job**: Verificação periódica de agendamentos

## 🏗️ Arquitetura

```
┌─────────────────┐
│   Dispositivo   │
│   do Usuário    │
│  (iOS/Android)  │
└────────┬────────┘
         │ 1. Registra Token FCM
         ▼
┌─────────────────┐
│   Firestore     │
│ device_tokens   │◄──── 2. Token salvo
└────────┬────────┘
         │
         │ 3. Cron Job verifica (a cada 5min)
         ▼
┌─────────────────────────────┐
│  Edge Function:             │
│  schedule-appointment-      │
│  reminders                  │
└────────┬────────────────────┘
         │ 4. Busca agendamentos
         │    próximos
         ▼
┌─────────────────┐
│   Firestore     │
│  agendamentos   │
└────────┬────────┘
         │ 5. Envia notificação
         ▼
┌─────────────────────────────┐
│  Edge Function:             │
│  send-push-notification     │
└────────┬────────────────────┘
         │ 6. Envia via FCM
         ▼
┌─────────────────┐
│  Firebase       │
│  Cloud          │
│  Messaging      │
└────────┬────────┘
         │ 7. Notificação entregue
         ▼
┌─────────────────┐
│   Dispositivo   │
│   do Usuário    │
└─────────────────┘
```

## 🔧 Configuração Passo a Passo

### 1️⃣ Configurar Firebase Cloud Messaging (FCM)

#### A. Criar Projeto no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Crie um novo projeto ou use o existente
3. Vá em **Project Settings** (ícone de engrenagem)
4. Na aba **General**, anote o **Project ID**
5. Na aba **Cloud Messaging**, copie a **Server Key**

#### B. Adicionar App Android (se necessário)

1. Clique em "Add app" → Android
2. Preencha:
   - **Package name**: `app.lovable.096625545a7d4d65adbb8f5d23946b31`
   - **App nickname**: Confallony Barbearia
3. Baixe o arquivo `google-services.json`
4. Coloque em `android/app/google-services.json`

#### C. Adicionar App iOS (se necessário)

1. Clique em "Add app" → iOS
2. Preencha:
   - **Bundle ID**: `app.lovable.096625545a7d4d65adbb8f5d23946b31`
   - **App nickname**: Confallony Barbearia
3. Baixe o arquivo `GoogleService-Info.plist`
4. Adicione ao projeto iOS via Xcode

### 2️⃣ Configurar Secrets no Supabase

Execute estes comandos ou adicione via Supabase Dashboard:

```bash
# FCM Server Key (obrigatório)
npx supabase secrets set FCM_SERVER_KEY="sua-fcm-server-key-aqui"

# Firebase Project ID (obrigatório)
npx supabase secrets set FIREBASE_PROJECT_ID="seu-project-id"

# Firebase API Key (obrigatório - da aba Web API Key)
npx supabase secrets set FIREBASE_API_KEY="sua-firebase-api-key"

# Supabase URL (já deve existir)
npx supabase secrets set SUPABASE_URL="https://seu-projeto.supabase.co"

# Supabase Service Role Key (já deve existir)
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"
```

### 3️⃣ Fazer Deploy das Edge Functions

```bash
# Deploy da função de envio de notificações
npx supabase functions deploy send-push-notification

# Deploy da função de agendamento de lembretes
npx supabase functions deploy schedule-appointment-reminders
```

### 4️⃣ Configurar Cron Job no Supabase

Execute este SQL no Supabase SQL Editor:

```sql
-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar cron job para verificar lembretes a cada 5 minutos
SELECT cron.schedule(
  'check-appointment-reminders',
  '*/5 * * * *', -- A cada 5 minutos
  $$
  SELECT
    net.http_post(
        url:='https://seu-projeto.supabase.co/functions/v1/schedule-appointment-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUA_ANON_KEY"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Verificar se o cron foi criado
SELECT * FROM cron.job;

-- Para remover o cron (se necessário)
-- SELECT cron.unschedule('check-appointment-reminders');
```

### 5️⃣ Criar Coleção no Firestore

No Firebase Console → Firestore Database, crie a coleção:

**Coleção: `device_tokens`**

Estrutura do documento:
```json
{
  "userId": "string",
  "token": "string",
  "platform": "android" | "ios" | "web",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 6️⃣ Configurar Android

**android/app/build.gradle:**
```gradle
dependencies {
    implementation 'com.google.firebase:firebase-messaging:23.0.0'
}

apply plugin: 'com.google.gms.google-services'
```

**android/build.gradle:**
```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.3.15'
    }
}
```

**android/app/src/main/AndroidManifest.xml:**
```xml
<manifest ...>
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
    <uses-permission android:name="android.permission.INTERNET"/>
    
    <application ...>
        <!-- Service para notificações em background -->
        <service
            android:name="com.google.firebase.messaging.FirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>
    </application>
</manifest>
```

### 7️⃣ Configurar iOS

1. Abra o projeto no Xcode:
```bash
npx cap open ios
```

2. **Signing & Capabilities** → Adicione:
   - ✅ **Push Notifications**
   - ✅ **Background Modes** → marque "Remote notifications"

3. Configure APNs no Apple Developer Portal:
   - Crie um **Apple Push Notification service SSL Certificate**
   - Baixe e instale no Xcode
   - Faça upload do certificado no Firebase Console

4. Adicione `GoogleService-Info.plist` ao projeto via Xcode

## 🧪 Testando o Sistema

### Teste 1: Registro de Token

1. Abra o app no dispositivo
2. Vá para ProfileMobile
3. Ative notificações
4. Verifique no Firestore se o token foi salvo em `device_tokens`

### Teste 2: Envio Manual de Notificação

Use o Postman ou curl:

```bash
curl -X POST https://seu-projeto.supabase.co/functions/v1/send-push-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUA_ANON_KEY" \
  -d '{
    "userId": "ID_DO_USUARIO",
    "title": "Teste de Notificação",
    "body": "Esta é uma notificação de teste"
  }'
```

### Teste 3: Lembretes Automáticos

1. Crie um agendamento para daqui a 20 minutos
2. Aguarde o cron job executar (máximo 5 minutos)
3. Você deve receber notificação 15 minutos antes do horário

### Teste 4: Cron Job Manual

```bash
curl -X POST https://seu-projeto.supabase.co/functions/v1/schedule-appointment-reminders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SUA_SERVICE_ROLE_KEY"
```

## 📱 Uso no App

O sistema já está integrado! Quando o usuário:

1. **Abre o app pela primeira vez**:
   - Hook `useNotifications` é inicializado
   - Token FCM é gerado automaticamente
   - Token é salvo no Firestore

2. **Cria um agendamento**:
   - Cron job verifica a cada 5 minutos
   - Notificações são enviadas automaticamente nos horários configurados

3. **Recebe notificação**:
   - Funciona mesmo com app fechado
   - Som e vibração nativos
   - Ao clicar, abre o app

## 🔍 Monitoramento e Logs

### Ver logs das Edge Functions:

```bash
# Logs da função de notificações
npx supabase functions logs send-push-notification

# Logs da função de lembretes
npx supabase functions logs schedule-appointment-reminders
```

### Ver status do Cron Job:

```sql
-- Ver todas as execuções do cron
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-appointment-reminders')
ORDER BY start_time DESC 
LIMIT 10;
```

## 🐛 Troubleshooting

### ❌ Token não é gerado

**Solução:**
```bash
# Android
npx cap sync android
npx cap run android

# iOS  
npx cap sync ios
npx cap open ios
```

### ❌ Notificações não chegam

1. Verifique se o token foi salvo no Firestore
2. Teste envio manual via curl
3. Verifique logs das Edge Functions
4. Confirme que FCM_SERVER_KEY está correto

### ❌ Cron Job não executa

```sql
-- Verificar se o cron está ativo
SELECT * FROM cron.job WHERE jobname = 'check-appointment-reminders';

-- Verificar últimas execuções
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 5;
```

### ❌ Erro de permissões

- **Android**: Verifique `POST_NOTIFICATIONS` no manifest
- **iOS**: Confirme capabilities no Xcode
- **Web**: Usuário precisa aceitar permissão no navegador

## 🚀 Próximos Passos

1. ✅ Sistema básico funcionando
2. 🔄 Adicionar mais tipos de notificações:
   - Agendamento confirmado
   - Agendamento cancelado
   - Promoções e ofertas
   - Mensagens do barbeiro
3. 📊 Dashboard de estatísticas de notificações
4. 🎨 Notificações ricas com imagens
5. 👥 Segmentação de usuários

## 📚 Recursos

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [pg_cron Extension](https://supabase.com/docs/guides/database/extensions/pg_cron)

## 💡 Dicas

- **Sempre teste em dispositivos reais** para push notifications
- **Configure o cron para 5min** inicialmente, ajuste depois
- **Monitore os logs** regularmente para detectar problemas
- **Teste com diferentes antecedências** para encontrar o melhor timing
