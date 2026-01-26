# Implementação dos Campos 'End' e 'Interval' para Pagamentos Periódicos e Individuais

## Resumo
Foram implementadas duas funcionalidades importantes nas tabelas 'periodicos' e 'individual':
1. **Campo 'End'**: Determina a data final a partir da qual os pagamentos não devem mais ser repetidos
2. **Pagamentos Únicos**: Quando o campo 'Interval' está vazio ou é 0, o pagamento aparece apenas uma vez

## Como Funciona

### Campo 'End' (Data Final)
- **Formato aceito**: DD/MM/YYYY (formato brasileiro) ou YYYY-MM-DD
- **Opcional**: Se não for fornecido, os pagamentos continuam até 31/12/2030 (padrão)
- **Validação**: O sistema valida se a data está em formato correto e dentro de um intervalo válido (1900-2100)

#### Comportamento
1. Quando um item nas tabelas 'periodicos' ou 'individual' possui o campo 'End' preenchido:
   - O sistema gera ocorrências de pagamento a partir da data inicial (campo 'Date')
   - As ocorrências são geradas respeitando o intervalo definido (campo 'Interval')
   - **As ocorrências param de ser geradas após a data especificada no campo 'End'**

2. Se o campo 'End' estiver vazio ou inválido:
   - O sistema usa a data padrão de 31/12/2030 como limite
   - Um aviso é exibido no console se a data for inválida

### Campo 'Interval' (Frequência de Pagamento)
- **Valores aceitos**:
  - Número inteiro de 1 a 120 (meses) para pagamentos recorrentes
  - **0 ou vazio** para pagamentos únicos (não recorrentes)
- **Exemplos**:
  - `1` = Mensal
  - `3` = Trimestral
  - `6` = Semestral
  - `12` = Anual
  - `0` ou vazio = **Pagamento único**

#### Comportamento - Pagamentos Únicos
Quando o campo 'Interval' está **vazio ou é 0**:
- O pagamento aparece **apenas uma vez** na data especificada no campo 'Date'
- **Não se repete** em meses subsequentes
- O campo 'End' é ignorado (não é necessário)
- Ideal para pagamentos pontuais como taxas únicas, compras específicas, etc.

#### Comportamento - Pagamentos Recorrentes
Quando o campo 'Interval' tem um **valor maior que 0**:
- O pagamento se repete a cada X meses (conforme o valor do Interval)
- Respeita o campo 'End' se fornecido
- Continua até 31/12/2030 se 'End' não for especificado

### Exemplos de Uso

#### Tabela 'periodicos' ou 'individual':
```csv
Date,Beneficiary,Value,Interval,End
01/01/2024,Netflix,49.90,1,31/12/2024
15/03/2024,Seguro Anual,1200.00,12,15/03/2027
10/05/2024,Taxa de Registro,350.00,0,
20/06/2024,Consulta Médica,200.00,,
```

**Resultado**:
- **Netflix**: Pagamentos **mensais** de 01/01/2024 até 01/12/2024 (último pagamento antes de 31/12/2024)
- **Seguro Anual**: Pagamentos **anuais** em 15/03/2024, 15/03/2025, 15/03/2026, e 15/03/2027
- **Taxa de Registro**: Pagamento **único** em 10/05/2024 (Interval = 0)
- **Consulta Médica**: Pagamento **único** em 20/06/2024 (Interval vazio)

### Logs no Console
O sistema exibe mensagens informativas no console do navegador:
- `End date for [Nome do Beneficiário]: [Data]` - Quando uma data 'End' válida é detectada
- `Invalid End date for [Nome do Beneficiário] in [categoria]: [valor]` - Quando a data é inválida
- `One-time payment for [Nome do Beneficiário] on [Data]` - Quando um pagamento único é detectado

## Código Modificado
O arquivo `src/App.jsx` foi atualizado na função `loadData()`, especificamente na seção que processa as categorias 'periodicos' e 'individual' (linhas 220-305).

### Principais Mudanças:
1. Adicionado parsing do campo 'End' do CSV
2. Suporte para formatos DD/MM/YYYY e YYYY-MM-DD
3. Validação robusta da data
4. **Detecção de pagamentos únicos (Interval vazio ou 0)**
5. **Lógica separada para pagamentos únicos vs. recorrentes**
6. Loop de geração de ocorrências agora respeita a data final
7. Logs informativos para debugging

## Casos de Uso

### 1. Assinatura com Data de Término
```csv
Date,Beneficiary,Value,Interval,End
01/01/2024,Spotify,19.90,1,30/06/2024
```
→ Pagamentos mensais de janeiro a junho de 2024

### 2. Pagamento Anual Contínuo
```csv
Date,Beneficiary,Value,Interval,End
15/03/2024,IPVA,1500.00,12,
```
→ Pagamentos anuais todo dia 15/03 até 2030

### 3. Pagamento Único
```csv
Date,Beneficiary,Value,Interval,End
10/08/2024,Renovação CNH,250.00,0,
```
→ Pagamento único em 10/08/2024

### 4. Pagamento Trimestral com Término
```csv
Date,Beneficiary,Value,Interval,End
01/01/2024,Manutenção,500.00,3,31/12/2025
```
→ Pagamentos a cada 3 meses de 01/01/2024 até 01/10/2025

## Testando
1. Adicione o campo 'End' e/ou deixe 'Interval' vazio/0 nas suas planilhas Google Sheets
2. Preencha com datas no formato DD/MM/YYYY (ex: 31/12/2024)
3. Recarregue a aplicação
4. Verifique no console do navegador se as datas foram detectadas corretamente
5. Confirme que:
   - Pagamentos recorrentes param após a data 'End'
   - Pagamentos com Interval vazio/0 aparecem apenas uma vez

## Compatibilidade
- ✅ Totalmente compatível com entradas existentes (sem o campo 'End')
- ✅ Não afeta outras categorias de pagamento
- ✅ Funciona com qualquer valor de 'Interval' (incluindo vazio/0)
- ✅ Permite usar as mesmas tabelas para pagamentos únicos e recorrentes

