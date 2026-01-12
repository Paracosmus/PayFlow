# Configuração da Tabela "Fontes"

## Visão Geral
A tabela "fontes" permite configurar variáveis dinâmicas do sistema sem precisar alterar o código fonte. Atualmente, ela é usada para definir a taxa de IOF, mas pode ser expandida para outras configurações no futuro.

## Estrutura da Tabela

A tabela deve ter as seguintes colunas:

| Variable | Value | Description |
|----------|-------|-------------|
| IOF | 0.038 | Taxa de IOF para operações de câmbio (3.8%) |

### Colunas

1. **Variable** (obrigatório)
   - Nome da variável de configuração
   - Use MAIÚSCULAS para facilitar a identificação
   - Exemplos: `IOF`, `TAXA_CONVERSAO`, `LIMITE_CREDITO`

2. **Value** (obrigatório)
   - Valor da variável
   - Para percentuais, use formato decimal (ex: 0.038 para 3.8%)
   - Para valores monetários, use números sem formatação

3. **Description** (opcional)
   - Descrição da variável para documentação
   - Ajuda a entender o propósito de cada configuração

## Exemplo de Tabela

```csv
Variable,Value,Description
IOF,0.038,Taxa de IOF para operações de câmbio (3.8%)
```

## Como Configurar

### 1. Criar a Planilha no Google Sheets

1. Abra seu documento do Google Sheets do PayFlow
2. Crie uma nova aba chamada "fontes"
3. Adicione as colunas: `Variable`, `Value`, `Description`
4. Adicione a linha do IOF:
   - Variable: `IOF`
   - Value: `0.038` (para 3.8%)
   - Description: `Taxa de IOF para operações de câmbio`

### 2. Publicar a Planilha

1. Clique em **Arquivo > Compartilhar > Publicar na Web**
2. Selecione a aba **"fontes"**
3. Escolha o formato **"Valores separados por vírgula (.csv)"**
4. Clique em **"Publicar"**
5. Copie a URL gerada

### 3. Configurar no Sistema

1. Abra o arquivo `src/config.js`
2. Localize a linha:
   ```javascript
   fontes: 'YOUR_GID_HERE',
   ```
3. Substitua `'YOUR_GID_HERE'` pela URL copiada:
   ```javascript
   fontes: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0LmrW4gk7423xpxND_qp-QgyHacGH2vEGMuIE3OMF5IVW2HqL-SXPq0wtRM05q19lMvdQsviSbV5t/pub?gid=SEU_GID_AQUI&single=true&output=csv',
   ```

## Formato dos Valores

### Taxa de IOF
- **Formato**: Decimal entre 0 e 1
- **Exemplo**: `0.038` para 3.8%
- **Cálculo**: Percentual ÷ 100
  - 3.8% → 3.8 ÷ 100 = 0.038
  - 5.0% → 5.0 ÷ 100 = 0.05

### Validação
O sistema valida automaticamente:
- ✅ Valor deve ser numérico
- ✅ Valor deve estar entre 0 e 1 (0% a 100%)
- ❌ Valores inválidos usarão o padrão (3.8%)

## Atualizando o IOF

Para atualizar a taxa de IOF:

1. Abra a planilha "fontes" no Google Sheets
2. Altere o valor na coluna `Value` da linha `IOF`
3. Salve a planilha
4. Recarregue a página do PayFlow

**Nota**: O sistema carrega as configurações ao iniciar. Após alterar valores na planilha, é necessário recarregar a página.

## Variáveis Futuras

Você pode adicionar novas variáveis seguindo o mesmo padrão:

```csv
Variable,Value,Description
IOF,0.038,Taxa de IOF para operações de câmbio (3.8%)
TAXA_ADMIN,0.02,Taxa administrativa (2%)
LIMITE_ALERTA,5000,Limite para alertas de gastos
```

Para usar novas variáveis, será necessário adicionar código no `App.jsx` para processá-las.

## Troubleshooting

### IOF não está sendo aplicado
1. Verifique se a URL em `config.js` está correta
2. Confirme que a planilha está publicada
3. Verifique o console do navegador para mensagens de erro
4. Certifique-se de que o valor está no formato correto (0.038, não 3.8)

### Valor padrão sendo usado
Se você ver "Using default IOF rate" no console:
- A URL não está configurada (ainda está como 'YOUR_GID_HERE')
- A planilha não está acessível
- Houve erro ao carregar os dados

### Console mostra "Invalid IOF rate"
- O valor não é numérico
- O valor está fora do range 0-1
- Use formato decimal: 0.038 (não "3.8%" ou "0,038")

## Logs do Console

O sistema mostra logs úteis no console do navegador:

```
Loading configuration from fontes...
IOF loaded from fontes: 3.80%
Configuration loaded from fontes
```

Ou, se houver problemas:

```
Fontes URL not configured, using default IOF rate
```

## Exemplo Completo

Tabela "fontes" no Google Sheets:

| Variable | Value | Description |
|----------|-------|-------------|
| IOF | 0.038 | Taxa de IOF para operações de câmbio (3.8%) |

Resultado no sistema:
- Todas as conversões de moeda estrangeira usarão 3.8% de IOF
- Você pode alterar para 0.05 (5%) e o sistema usará o novo valor
- Sem necessidade de alterar código ou fazer deploy
