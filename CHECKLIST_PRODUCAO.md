# ✅ Checklist de Produção - Vercel

## 📋 Antes do Deploy

### Configurações do Projeto
- [ ] Arquivo `vercel.json` criado
- [ ] `vite.config.ts` otimizado para produção  
- [ ] Scripts de build funcionando localmente (`npm run build`)
- [ ] Arquivos desnecessários no `.gitignore`

### Variáveis de Ambiente
- [ ] `.env.example` criado com todas as variáveis necessárias
- [ ] Valores de produção do Supabase confirmados
- [ ] Variáveis começam com `VITE_` (para Vite)

### Código
- [ ] Todos os componentes testados
- [ ] Não há `console.log` desnecessários em produção
- [ ] Importações otimizadas
- [ ] Código commitado e pushed para GitHub

## 🚀 Durante o Deploy

### Vercel
- [ ] Projeto conectado ao GitHub
- [ ] Framework definido como "Vite"
- [ ] Variáveis de ambiente configuradas
- [ ] Build realizado com sucesso

### Supabase
- [ ] CORS configurado com domínio do Vercel
- [ ] Edge Functions deployadas (se aplicável)
- [ ] RLS policies ativas
- [ ] Secrets configurados

## ✅ Após o Deploy

### Testes Funcionais
- [ ] Homepage carregando corretamente
- [ ] Login/Registro funcionando
- [ ] Navegação entre páginas
- [ ] Formulários de agendamento
- [ ] Sistema de comandas
- [ ] Upload de imagens
- [ ] Notificações

### Performance
- [ ] PageSpeed Insights > 90
- [ ] Tempos de carregamento < 3s
- [ ] Images otimizadas
- [ ] Cache configurado

### SEO
- [ ] Meta tags configuradas
- [ ] Títulos únicos por página
- [ ] Descriptions relevantes
- [ ] Open Graph tags
- [ ] Sitemap gerado

### Segurança
- [ ] HTTPS ativo
- [ ] Headers de segurança
- [ ] Variáveis sensíveis não expostas
- [ ] RLS ativo no Supabase

### Monitoramento
- [ ] Vercel Analytics configurado
- [ ] Error tracking ativo
- [ ] Logs sendo coletados
- [ ] Métricas de performance

## 🔄 Manutenção

### Deploys Automáticos
- [ ] Branch `main` = produção
- [ ] Branch `dev` = preview
- [ ] Pull requests geram previews
- [ ] CI/CD funcionando

### Backup
- [ ] Backup do Supabase configurado
- [ ] Código versionado no GitHub
- [ ] Configurações documentadas

## 📞 Contatos de Emergência

- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Supabase Support**: [supabase.com/support](https://supabase.com/support)
- **GitHub Support**: [github.com/support](https://github.com/support)

## 🎯 KPIs para Monitorar

- **Uptime**: > 99.9%
- **Performance**: Core Web Vitals
- **Errors**: < 1% error rate
- **Loading**: < 3s primeiro carregamento
- **SEO**: PageSpeed score > 90