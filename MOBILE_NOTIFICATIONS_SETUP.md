# Configuração de Notificações Push para Dispositivos Móveis

Este guia explica como habilitar notificações push em dispositivos móveis nativos (iOS e Android).

## 📱 Visão Geral

O sistema de notificações agora suporta:
- ✅ Notificações web (navegadores desktop)
- ✅ Notificações push nativas (iOS e Android)
- ✅ Notificações locais (lembretes agendados)
- ✅ Detecção automática de plataforma

## 🚀 Como Testar em Dispositivo Móvel

### Passo 1: Exportar para GitHub
1. Clique no botão "Export to GitHub" no Lovable
2. Faça `git pull` do seu repositório

### Passo 2: Instalar Dependências
```bash
npm install
```

### Passo 3: Adicionar Plataformas Nativas

**Para Android:**
```bash
npx cap add android
npx cap update android
```

**Para iOS (requer Mac com Xcode):**
```bash
npx cap add ios
npx cap update ios
```

### Passo 4: Build do Projeto
```bash
npm run build
```

### Passo 5: Sincronizar com Plataformas Nativas
```bash
npx cap sync
```

### Passo 6: Executar no Dispositivo

**Android:**
```bash
npx cap run android
```

**iOS:**
```bash
npx cap open ios
```
Depois, execute pelo Xcode em um dispositivo físico ou simulador.

## 🔔 Configurações Específicas por Plataforma

### Android

1. **Firebase Cloud Messaging (FCM)**
   - Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
   - Adicione o app Android ao projeto
   - Baixe o arquivo `google-services.json`
   - Coloque em `android/app/google-services.json`

2. **Permissões (AndroidManifest.xml)**
   ```xml
   <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
   ```

3. **Ícone de Notificação**
   - Adicione ícones em `android/app/src/main/res/drawable/`
   - Use o Android Asset Studio para gerar ícones

### iOS

1. **Configurar Capabilities no Xcode**
   - Abra o projeto: `npx cap open ios`
   - Vá em **Signing & Capabilities**
   - Adicione **Push Notifications**
   - Adicione **Background Modes** → marque **Remote notifications**

2. **Apple Push Notification Service (APNs)**
   - Configure certificados APNs no [Apple Developer Portal](https://developer.apple.com/)
   - Gere um certificado de push notification
   - Configure no Firebase Console (se estiver usando FCM)

3. **Info.plist**
   - Permissões já configuradas automaticamente pelo Capacitor

## 🧪 Testando Notificações

### No Navegador (Desktop)
- As notificações funcionam automaticamente usando a API Web
- Clique em "Ativar Notificações" quando solicitado

### Em Dispositivo Móvel
1. Abra o app no dispositivo
2. Vá para o perfil
3. Ative as "Notificações Push" no card de lembretes
4. O sistema solicitará permissão automaticamente
5. Configure a antecedência desejada para os lembretes

## 🔧 Troubleshooting

### Notificações não aparecem no Android
- Verifique se o arquivo `google-services.json` está configurado
- Confirme que as permissões estão no AndroidManifest.xml
- Teste em um dispositivo físico (emuladores podem ter limitações)

### Notificações não aparecem no iOS
- Certifique-se de estar testando em um dispositivo físico (simuladores iOS não suportam push)
- Verifique se as capabilities estão habilitadas no Xcode
- Confirme que os certificados APNs estão configurados

### Token de push não é gerado
- Execute `npx cap sync` após qualquer mudança no código
- Verifique os logs do console para mensagens de erro
- Reinstale o app no dispositivo

## 📚 Recursos Adicionais

- [Documentação Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Documentação Capacitor Local Notifications](https://capacitorjs.com/docs/apis/local-notifications)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notifications](https://developer.apple.com/documentation/usernotifications)

## ⚡ Recursos Implementados

### Detecção Automática de Plataforma
O sistema detecta automaticamente se está rodando em:
- Web (navegador desktop/mobile)
- iOS nativo
- Android nativo

### Notificações Locais
- Agendar lembretes para agendamentos
- Personalizar tempo de antecedência (15min, 30min, 1h, 2h, 1 dia)
- Sons e ícones customizados

### Push Notifications
- Receber notificações mesmo com app fechado
- Notificações interativas
- Badge counters
- Sons personalizados

## 🎯 Próximos Passos

Para integrar totalmente o sistema de notificações push:

1. Configure um backend para enviar notificações
2. Implemente Firebase Functions ou use um serviço como OneSignal
3. Armazene tokens de dispositivos no banco de dados
4. Crie triggers para enviar notificações baseadas em eventos

## 💡 Dicas

- **Sempre teste em dispositivos reais**, especialmente iOS
- **Mantenha o capacitor.config.ts atualizado** com suas URLs de produção
- **Use `npx cap sync`** após cada alteração que envolva código nativo
- **Monitore os logs** com `npx cap run android -l` ou pelo Xcode
