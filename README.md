# Sistema de Controle de Escalas v2.0

Sistema web completo para gerenciamento de escalas de trabalho com integração Supabase para armazenamento em nuvem.

## 🚀 Funcionalidades

### ✨ Novas na v2.0
- ✅ **Escala Unificada**: Turno + Setor na mesma célula
- ✅ **Supabase Integration**: Armazenamento em nuvem gratuito
- ✅ **Modo Visualização Simplificado**: Interface limpa para colaboradores
- ✅ **Impressão Otimizada**: Layout profissional para impressão
- ✅ **Sincronização Automática**: Dados sempre atualizados

### 📋 Funcionalidades Existentes
- Cadastro de colaboradores
- Gerenciamento de turnos e setores
- Escalas semanais
- Exportação/Importação de dados
- Navegação entre semanas
- Cópia de escala anterior

## 🌐 Acesso Online

1. **GitHub Pages**: https://seu-usuario.github.io/sistema-escalas
2. **Custom Domain**: (Opcional) Configure seu próprio domínio

## 🔧 Configuração

### 1. Supabase (Armazenamento em Nuvem)

1. Acesse [Supabase](https://supabase.com)
2. Crie uma conta gratuita
3. Crie um novo projeto
4. No SQL Editor, execute:

```sql
-- Tabela para armazenar os dados das escalas
CREATE TABLE escala_data (
    id SERIAL PRIMARY KEY,
    company_id TEXT NOT NULL DEFAULT 'default',
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id)
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE escala_data ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública (ajuste conforme necessidade)
CREATE POLICY "Permitir leitura pública" ON escala_data
    FOR SELECT USING (true);

-- Política para escrita apenas autenticada (recomendado)
CREATE POLICY "Permitir escrita apenas para autenticados" ON escala_data
    FOR ALL USING (auth.role() = 'authenticated');