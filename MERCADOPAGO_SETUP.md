# 🔑 Configuração das Credenciais do Mercado Pago

## 1. Criar Conta no Mercado Pago

1. Acesse [mercadopago.com.br](https://www.mercadopago.com.br)
2. Crie sua conta como **Pessoa Jurídica** (para receber pagamentos)
3. Complete a verificação de identidade

## 2. Obter Credenciais de Desenvolvimento

### Passo a Passo:

1. **Acesse o Portal de Desenvolvedores:**
   - Vá para [developers.mercadopago.com.br](https://www.mercadopago.com.br/developers)
   - Faça login com sua conta

2. **Criar uma Aplicação:**
   - Clique em "Criar aplicação"
   - Nome: "Sistema de Agendamento"
   - Selecione: "Pagamentos online"
   - Clique em "Criar aplicação"

3. **Copiar as Credenciais:**
   - Vá em "Credenciais" no menu lateral
   - **Para TESTE:**
     - `TEST_ACCESS_TOKEN` (começa com TEST-)
     - `TEST_PUBLIC_KEY` (começa com TEST-)
   - **Para PRODUÇÃO:**
     - `PROD_ACCESS_TOKEN`
     - `PROD_PUBLIC_KEY`

## 3. Configurar no Backend

Edite seu arquivo `.env`:

```env
# DESENVOLVIMENTO (usar credenciais de teste)
MERCADOPAGO_ACCESS_TOKEN=TEST-1234567890-123456-abcdef123456789-12345678

# PRODUÇÃO (usar credenciais reais)
# MERCADOPAGO_ACCESS_TOKEN=APP_USR-1234567890-123456-abcdef123456789-12345678

PORT=3001
NODE_ENV=development
```

## 4. Testar com Usuários de Teste

### Criar Usuários de Teste:

1. No portal do desenvolvedor, vá em "Contas de teste"
2. Crie dois usuários:
   - **Vendedor** (para receber pagamentos)
   - **Comprador** (para fazer pagamentos)

### CPFs de Teste Válidos:

- `19119119100` ✅ (aprovado)
- `19119119101` ❌ (rejeitado)
- `19119119102` ⏳ (pendente)

### Emails de Teste:

- `test_user_123456@testuser.com`
- `test_user_789012@testuser.com`

## 5. Testar Pagamentos Pix

### Dados para Teste:

```json
{
  "payer": {
    "email": "test_user_123456@testuser.com",
    "first_name": "Test",
    "last_name": "User",
    "identification": {
      "type": "CPF",
      "number": "19119119100"
    }
  }
}
```

### Simular Aprovação:

1. Em ambiente de teste, o QR Code é **fictício**
2. Para simular aprovação, use o webhook ou polling
3. O status muda automaticamente após alguns segundos

## 6. Configuração para Produção

### Ativar Conta para Produção:

1. **Complete a verificação:**
   - Envie documentos da empresa
   - Configure dados bancários
   - Aguarde aprovação (1-3 dias úteis)

2. **Configure Webhook de Produção:**
   - URL: `https://seu-backend.com/api/webhooks/mercadopago`
   - Eventos: `payment`

3. **Altere as Credenciais:**
   ```env
   MERCADOPAGO_ACCESS_TOKEN=APP_USR-[sua-credencial-de-produção]
   NODE_ENV=production
   ```

## 7. Verificar se Está Funcionando

### ✅ Checklist:

- [ ] Conta Mercado Pago criada
- [ ] Aplicação criada no portal
- [ ] Credenciais de teste configuradas
- [ ] Backend rodando sem erros
- [ ] Teste de conexão passa
- [ ] QR Code sendo gerado
- [ ] Polling de status funcionando

### 🔧 Troubleshooting:

**Erro 401 - Unauthorized:**
- Verifique se o `ACCESS_TOKEN` está correto
- Confirme se está usando credencial de TEST para desenvolvimento

**Erro 400 - Bad Request:**
- Verifique se todos os campos obrigatórios estão preenchidos
- CPF deve ter 11 dígitos sem pontos/traços

**QR Code não aparece:**
- Verifique se `qr_code_base64` está na resposta
- Confirme se o pagamento foi criado com sucesso

## 8. Próximos Passos

1. **Teste completo** com usuários de teste
2. **Configure webhook** para notificações automáticas
3. **Implemente logs** para debug em produção
4. **Configure monitoramento** de pagamentos
5. **Solicite aprovação** para produção

## 📞 Suporte

- [Central de Ajuda](https://www.mercadopago.com.br/ajuda)
- [Documentação Técnica](https://www.mercadopago.com.br/developers/pt/docs)
- [Fórum de Desenvolvedores](https://www.mercadopago.com.br/developers/panel/forum)