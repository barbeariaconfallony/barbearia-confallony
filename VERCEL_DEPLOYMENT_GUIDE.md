# 🚀 Guia Completo de Deploy no Vercel

## 📋 Pré-requisitos

1. **Conta no GitHub**: Seu projeto precisa estar em um repositório GitHub
2. **Conta no Vercel**: Crie uma conta gratuita em [vercel.com](https://vercel.com)
3. **Conta no Supabase**: Para o backend e banco de dados

## 🔧 Configurações do Projeto

### 1. Verificar Configurações de Build

O projeto já está configurado com:
- ✅ `vite.config.ts` otimizado
- ✅ `vercel.json` configurado 
- ✅ Scripts de build no `package.json`

### 2. Variáveis de Ambiente

No seu projeto local, você tem o arquivo `.env`:
```env
VITE_SUPABASE_PROJECT_ID="kjsionbgfvhjwefdqoat"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_URL="https://kjsionbgfvhjwefdqoat.supabase.co"
```

## 🚀 Passo a Passo do Deploy

### Etapa 1: Preparar o Repositório GitHub

1. **Commit e Push do código:**
   ```bash
   git add .
   git commit -m "Configuração para deploy no Vercel"
   git push origin main
   ```

### Etapa 2: Conectar ao Vercel

1. **Acesse [vercel.com](https://vercel.com)** e faça login
2. **Clique em "Add New Project"**
3. **Conecte sua conta GitHub** se ainda não conectou
4. **Selecione seu repositório** da lista
5. **Configure o projeto:**
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (raiz do projeto)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Etapa 3: Configurar Variáveis de Ambiente

1. **Na tela de configuração do projeto no Vercel:**
   - Expanda a seção "Environment Variables"
   - Adicione as seguintes variáveis:

   ```
   VITE_SUPABASE_PROJECT_ID = kjsionbgfvhjwefdqoat
   VITE_SUPABASE_PUBLISHABLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtqc2lvbmJnZnZoandlZmRxb2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNjQ5OTcsImV4cCI6MjA3MTc0MDk5N30.EsR7eee7aMJLHNgoT3RtaSsIwdWaFqb699GveoSP5BQ
   VITE_SUPABASE_URL = https://kjsionbgfvhjwefdqoat.supabase.co
   ```

2. **Clique em "Deploy"**

### Etapa 4: Aguardar o Build

- O Vercel fará automaticamente:
  - Clone do repositório
  - Instalação das dependências
  - Build da aplicação
  - Deploy

### Etapa 5: Configurar Domínio (Opcional)

1. **Domínio automático**: Vercel gera automaticamente um domínio como `seu-projeto.vercel.app`
2. **Domínio customizado**: 
   - Vá em "Settings" > "Domains"
   - Adicione seu domínio personalizado
   - Configure os DNS conforme instruções

## ⚙️ Configurações Avançadas de Produção

### 1. Otimizações de Performance

O `vercel.json` já inclui:
- Cache de assets estáticos
- Rewrites para SPA
- Headers de performance

### 2. Configurar CORS no Supabase

1. **Acesse seu projeto no Supabase**
2. **Vá em "Settings" > "API"**
3. **Adicione seu domínio Vercel nas "CORS Origins":**
   ```
   https://seu-projeto.vercel.app
   ```

### 3. Configurar Edge Functions

Se você está usando as Edge Functions do Supabase:

```bash
# Deploy das functions
supabase functions deploy create-pix-payment
supabase functions deploy check-payment-status  
supabase functions deploy mercadopago-webhook
```

## 🔍 Verificações Pós-Deploy

### 1. Teste as Funcionalidades

- ✅ Login/Registro funcionando
- ✅ Conexão com Supabase ativa
- ✅ Agendamentos funcionais
- ✅ Pagamentos Pix (se configurado)

### 2. Performance

- Use o [PageSpeed Insights](https://pagespeed.web.dev)
- Verifique métricas de Core Web Vitals

### 3. Monitoramento

- **Vercel Analytics**: Habilite nas configurações
- **Logs**: Acesse em "Functions" > "View Function Logs"

## 🔄 Deploys Automáticos

### Configuração de Branches

1. **Branch de Produção (main)**:
   - Deploy automático para o domínio principal
   
2. **Branch de Desenvolvimento**:
   - Crie um branch `dev`
   - Vercel criará previews automáticos

### Workflow Recomendado

```bash
# Desenvolvimento
git checkout -b feature/nova-funcionalidade
# Faça suas alterações
git push origin feature/nova-funcionalidade

# Preview automático gerado pelo Vercel

# Merge para produção
git checkout main
git merge feature/nova-funcionalidade
git push origin main

# Deploy automático para produção
```

## 🚨 Troubleshooting

### Erro de Build

```bash
# Teste localmente
npm run build

# Se der erro, corrija e commit novamente
```

### Erro de Environment Variables

1. Verifique se todas as variáveis estão configuradas
2. Certifique-se que começam com `VITE_`
3. Redeploy após adicionar variáveis

### Erro 404 nas Rotas

- O `vercel.json` já está configurado com rewrites
- Certifique-se que está usando React Router corretamente

## 📊 Monitoramento em Produção

### 1. Vercel Analytics
```bash
# Instalar (opcional)
npm install @vercel/analytics
```

### 2. Error Tracking
```bash
# Sentry (opcional)
npm install @sentry/react
```

## 🎯 URLs Importantes

- **Dashboard Vercel**: https://vercel.com/dashboard
- **Documentação**: https://vercel.com/docs
- **Status**: https://vercel-status.com

## 🏆 Resultado Final

Após seguir este guia, você terá:

- ✅ App hospedado no Vercel
- ✅ Deploy automático a cada push
- ✅ HTTPS configurado
- ✅ Performance otimizada
- ✅ Domínio global
- ✅ Monitoramento ativo

**URL da sua aplicação**: `https://seu-projeto.vercel.app`