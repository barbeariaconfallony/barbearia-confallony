# Configuração de Domínios Permitidos no OneSignal

## Problema

O OneSignal Web SDK está configurado para funcionar apenas em domínios específicos. Quando você testa no preview ou em outros domínios, pode receber o erro:

```
Error: Can only be used on: https://barbeariaconfallony.vercel.app
```

E o botão de notificações ficará mostrando "Configure o domínio no OneSignal".

## Solução

### Para Produção (barbeariaconfallony.vercel.app)

As notificações funcionam normalmente no domínio de produção configurado.

### Para Desenvolvimento e Testes

Você tem duas opções:

#### Opção 1: Adicionar o domínio de preview no OneSignal (Recomendado para testes web)

1. **Acesse o Dashboard do OneSignal**
   - Entre em [https://onesignal.com](https://onesignal.com)
   - Faça login na sua conta
   - Selecione seu app: **Barbearia Confallony**

2. **Navegue até Settings**
   - No menu lateral esquerdo, clique em **Settings**
   - Clique na aba **Platforms**
   - Selecione **Web Push** (Chrome/Firefox)

3. **Configure Site URL**
   - Localize o campo **Site URL**
   - Adicione o domínio de produção (principal):
     ```
     https://barbeariaconfallony.vercel.app
     ```
   - Opcionalmente, adicione domínios de desenvolvimento/teste:
     ```
     https://f5928127-4848-4db5-8941-b3d06b10eb9f.lovableproject.com
     http://localhost:5173
     ```

4. **Salve as Alterações**
   - Clique em **Save** no final da página
   - Aguarde alguns segundos para as configurações propagarem
   - Limpe o cache do navegador (Ctrl + Shift + Delete)
   - Recarregue a página completamente (Ctrl + F5)

#### Opção 2: Testar no app Android nativo (Recomendado para testar notificações mobile)

Para testar notificações no Android, você **não precisa** configurar domínios, pois o app nativo usa o plugin OneSignal Cordova, não o SDK web:

1. **Transfira o projeto para seu GitHub**
   - Use o botão "Export to Github" no Lovable
   - Clone o projeto: `git clone <seu-repositorio>`

2. **Instale as dependências e compile**
   ```bash
   cd <pasta-do-projeto>
   npm install
   npm run build
   ```

3. **Sincronize o Capacitor**
   ```bash
   npx cap sync android
   ```

4. **Abra no Android Studio e execute**
   ```bash
   npx cap open android
   ```
   - No Android Studio, clique em "Run" ou pressione Shift+F10
   - O app abrirá no emulador ou dispositivo físico
   - As notificações funcionarão automaticamente (não precisa configurar domínios)

## Verificação

### Para Web (após configurar domínios)

1. Limpe o cache do navegador (Ctrl + Shift + Delete)
2. Recarregue a página completamente (Ctrl + F5)
3. Verifique o console do navegador - não deve mais aparecer o erro de domínio
4. O botão deve mudar de "Configure o domínio no OneSignal" para "Ativar Notificações"
5. Clique em "Ativar Notificações" e conceda permissão

### Para Android Nativo

1. Abra o app no Android Studio
2. Execute o app (Shift+F10)
3. Vá em Configurações
4. Clique em "Ativar Notificações"
5. Conceda permissão quando solicitado
6. Teste enviando uma notificação pelo dashboard do OneSignal

## Notas Importantes

- ⚠️ **Web vs Native**: O SDK web requer configuração de domínios. O app nativo Android/iOS **não requer**.
- ⚠️ **Sempre adicione o domínio de produção** (`barbeariaconfallony.vercel.app`)
- ⚠️ **Não remova domínios existentes**, apenas adicione novos
- ⚠️ **Use HTTPS** para domínios públicos (HTTP só funciona para localhost)
- ⚠️ As alterações podem levar alguns minutos para propagar
- ✅ **Para testar notificações mobile, use o app Android nativo** - é mais rápido e não requer configuração de domínios
