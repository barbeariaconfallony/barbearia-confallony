#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configurações para deploy no Vercel...\n');

// Verificar se os arquivos necessários existem
const requiredFiles = [
  'vercel.json',
  'vite.config.ts',
  'package.json',
  '.env'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} - OK`);
  } else {
    console.log(`❌ ${file} - FALTANDO`);
    allFilesExist = false;
  }
});

// Verificar variáveis de ambiente
console.log('\n📋 Verificando variáveis de ambiente...');

if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  const requiredEnvVars = [
    'VITE_SUPABASE_PROJECT_ID',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_URL'
  ];

  requiredEnvVars.forEach(envVar => {
    if (envContent.includes(envVar)) {
      console.log(`✅ ${envVar} - Configurado`);
    } else {
      console.log(`❌ ${envVar} - FALTANDO`);
      allFilesExist = false;
    }
  });
}

// Verificar package.json scripts
console.log('\n⚙️ Verificando scripts de build...');

if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (packageJson.scripts && packageJson.scripts.build) {
    console.log('✅ Script de build - OK');
  } else {
    console.log('❌ Script de build - FALTANDO');
    allFilesExist = false;
  }
}

// Resultado final
console.log('\n' + '='.repeat(50));

if (allFilesExist) {
  console.log('🎉 PRONTO PARA DEPLOY!');
  console.log('📋 Próximos passos:');
  console.log('1. Commit e push para o GitHub');
  console.log('2. Conectar repositório no Vercel');
  console.log('3. Configurar variáveis de ambiente no Vercel');
  console.log('4. Deploy!');
} else {
  console.log('⚠️  CONFIGURAÇÃO INCOMPLETA');
  console.log('Por favor, corrija os itens marcados com ❌ antes do deploy.');
}

console.log('\n📖 Consulte o VERCEL_DEPLOYMENT_GUIDE.md para instruções detalhadas.');