# 🔧 Configuração de Domínios Autorizados no Firebase

## ⚠️ IMPORTANTE: Resolver o erro "push service error"

O erro `Registration failed - push service error` acontece porque os domínios da sua aplicação não estão autorizados no Firebase Console.

## 📋 Passo a Passo para Autorizar Domínios

### 1️⃣ Acessar o Firebase Console

Vá para: https://console.firebase.google.com/project/barbearia-confallony/authentication/settings

### 2️⃣ Adicionar Domínios Autorizados

Na seção **"Authorized domains"**, clique em **"Add domain"** e adicione os seguintes domínios:

#### Domínios que você DEVE adicionar:

```
localhost
6cf9ffb5-7715-4d78-88ce-db940c527656.lovableproject.com
barbearia-confallony.vercel.app
```

**IMPORTANTE:** Se você tiver outros domínios customizados, adicione-os também!

### 3️⃣ Verificar VAPID Key

1. Acesse: https://console.firebase.google.com/project/barbearia-confallony/settings/cloudmessaging
2. Na seção **"Web Push certificates"**, copie a **"Key pair"** 
3. Verifique se a VAPID key no arquivo `src/hooks/useFCMToken.ts` está correta

Sua VAPID key atual é:
```
BBqVtJQjExRq0ReZQAfYzMwPAv2Nkucmp8gZ1qoZlzAYlsUXMJ7Ut5JGhsiCREjfC7HmahgBqhADdKTBQ6iTZHs
```

### 4️⃣ Desativar App Check (se necessário)

Se o App Check estiver ativado, ele pode estar bloqueando as requisições:

1. Acesse: https://console.firebase.google.com/project/barbearia-confallony/appcheck
2. Verifique se o App Check está ativado
3. Se estiver, desative temporariamente para testar

### 5️⃣ Verificar API Key Restrictions

No Google Cloud Console, verifique se a API key não está com restrições muito severas:

1. Acesse: https://console.cloud.google.com/apis/credentials?project=barbearia-confallony
2. Clique na API key `Browser key (auto created by Firebase)`
3. Em **"Application restrictions"**, selecione **"HTTP referrers (web sites)"**
4. Adicione os mesmos domínios que você adicionou no Firebase:
   - `localhost:*`
   - `*.lovableproject.com/*`
   - `*.vercel.app/*`
   - `barbearia-confallony.vercel.app/*`

## 🧪 Testando após as mudanças

1. Após adicionar os domínios, aguarde 1-2 minutos
2. Recarregue a página da aplicação
3. Tente ativar as notificações novamente
4. Verifique os logs no console para ver se o erro foi resolvido

## 📝 Logs úteis para debug

Você deve ver no console:

```
🌐 [FCM SW] Service Worker carregado no domínio: barbearia-confallony.vercel.app
🔧 [FCM SW] Inicializando Firebase com config: {...}
✅ [FCM SW] Firebase inicializado com sucesso
📝 Registrando novo Service Worker...
✅ Service Worker registrado
🔄 Tentativa 1/3 de obter token FCM...
✅ Token FCM obtido na tentativa 1: dXXXXXXXXXXXXXXXXX...
```

## ❓ Ainda com problemas?

Se após seguir esses passos o erro persistir:

1. Verifique se o domínio está EXATAMENTE igual (sem http://, https://, ou barras extras)
2. Limpe o cache do navegador
3. Tente em uma aba anônima
4. Verifique se o Firebase Messaging API está ativada: https://console.cloud.google.com/apis/library/fcm.googleapis.com?project=barbearia-confallony

## 🔗 Links úteis

- Firebase Console: https://console.firebase.google.com/project/barbearia-confallony
- Cloud Messaging Settings: https://console.firebase.google.com/project/barbearia-confallony/settings/cloudmessaging
- Authorized Domains: https://console.firebase.google.com/project/barbearia-confallony/authentication/settings
- API Credentials: https://console.cloud.google.com/apis/credentials?project=barbearia-confallony
