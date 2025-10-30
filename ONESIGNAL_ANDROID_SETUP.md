# Configuração do OneSignal para Android

## 📱 O Problema

O SDK web do OneSignal não funciona em apps móveis nativos. Para notificações push funcionarem no Android, você precisa usar o plugin nativo do OneSignal para Capacitor.

## ✅ O que já foi feito

1. ✅ Instalado o pacote `onesignal-cordova-plugin`
2. ✅ Criado hook `useOneSignalNative` que detecta automaticamente se está na web ou mobile
3. ✅ Atualizado `NotificationPermissionButton` para usar o hook nativo
4. ✅ Configurado `capacitor.config.ts` com o App ID do OneSignal

## 🔧 Configuração necessária no Android

### Passo 1: Exportar para GitHub

1. No Lovable, clique em **"Export to GitHub"**
2. Clone o repositório no seu computador

### Passo 2: Instalar dependências

```bash
cd seu-repositorio
npm install
```

### Passo 3: Adicionar plataforma Android

```bash

```

### Passo 4: Configurar Firebase Cloud Messaging (necessário para OneSignal)

1. Vá para o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto "Barbearia Confallony"
3. Vá em **Project Settings** → **Cloud Messaging**
4. Copie o **Server Key**

### Passo 5: Configurar OneSignal com Firebase

1. Vá para [OneSignal Dashboard](https://app.onesignal.com)
2. Selecione seu app "Barbearia Confallony"
3. Vá em **Settings** → **Platforms** → **Google Android (FCM)**
4. Cole o **Firebase Server Key** que você copiou
5. Clique em **Save**

### Passo 6: Atualizar google-services.json

1. No Firebase Console, baixe o arquivo `google-services.json`
2. Coloque o arquivo em: `android/app/google-services.json`

### Passo 7: Build e sync

```bash
npm run build
npx cap sync android
```

### Passo 8: Abrir no Android Studio

```bash
npx cap open android
```

## 📱 Testando as Notificações

### No Android Studio

1. Conecte um dispositivo Android físico ou inicie um emulador
2. Clique em **Run** (botão verde de play)
3. Aguarde o app instalar e abrir
4. Faça login no app
5. Vá para **Perfil** → **Configurações**
6. Clique em **"Ativar Notificações"**
7. Aceite a permissão quando solicitado

### Testando notificação de teste

Depois de ativar as notificações, você pode testar:

1. No app, vá em **Configurações**
2. Clique em **"Testar Notificação"**
3. Você deve receber uma notificação push no dispositivo

### Testando broadcast (admin)

1. Faça login como admin
2. Vá para a página de Admin
3. Use o botão de "Enviar Broadcast"
4. Todos os usuários com notificações ativadas devem receber

## 🔍 Verificando se funcionou

### Logs para verificar

No Android Studio, abra **Logcat** e filtre por `OneSignal`. Você deve ver:

```
🔔 Inicializando OneSignal nativo...
✅ OneSignal nativo inicializado com sucesso
📱 OneSignal Device State: { userId: "xxx-xxx-xxx", hasNotificationPermission: true }
```

### No Dashboard do OneSignal

1. Vá para [OneSignal Dashboard](https://app.onesignal.com)
2. Selecione seu app
3. Vá em **Audience** → **All Users**
4. Você deve ver seus dispositivos Android listados

## ⚠️ Problemas Comuns

### "Plugin OneSignal não encontrado"

**Solução:** Execute `npx cap sync android` novamente

### "Notificações não aparecem"

**Solução:** 
1. Verifique se o Firebase Server Key está correto no OneSignal
2. Verifique se o `google-services.json` está no lugar correto
3. Tente desinstalar e reinstalar o app

### "OneSignal não está pronto ainda"

**Solução:**
1. O hook nativo pode levar alguns segundos para inicializar
2. Aguarde o botão mudar de "Inicializando..." para "Ativar Notificações"
3. Se persistir, verifique os logs no Logcat

### Notificações funcionam no emulador?

**Importante:** Notificações push NÃO funcionam em emuladores Android que não têm Google Play Services. Use um **dispositivo físico** ou um emulador com Google Play para testar.

## 📚 Recursos

- [OneSignal Android SDK Setup](https://documentation.onesignal.com/docs/cordova-sdk-setup)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)

## 🚀 Próximos Passos

Depois de configurado, as notificações funcionarão:

1. ✅ **Lembretes de Agendamento** - Notificações automáticas antes dos horários
2. ✅ **Broadcast Notifications** - Envio em massa para todos os clientes
3. ✅ **Notificações de Status** - Quando agendamentos são confirmados/cancelados
4. ✅ **Promoções** - Envio de ofertas especiais

---

**Nota:** Na web (navegador), o OneSignal continuará funcionando normalmente usando o SDK web. O hook `useOneSignalNative` detecta automaticamente o ambiente e usa a implementação correta.
