# Implementação dos Campos 'End' e 'Interval' para Pagamentos Periódicos e Individuais

## Resumo
Foram implementadas funcionalidades importantes nas tabelas 'periodicos' e 'individual':
1. **Campo 'End' Flexível**: Aceita tanto **data** (quando parar) quanto **número** (quantas vezes repetir)
2. **Pagamentos Únicos**: Quando o campo 'Interval' está vazio ou é 0, o pagamento aparece apenas uma vez

## Como Funciona

### Campo 'End' (Data Final ou Contador de Repetições)
O campo 'End' agora aceita **dois tipos de valores**:

#### 1️⃣ **Data** (DD/MM/YYYY ou YYYY-MM-DD)
Quando você fornece uma data, os pagamentos param após essa data.

- **Formato aceito**: DD/MM/YYYY (formato brasileiro) ou YYYY-MM-DD
- **Exemplo**: `31/12/2024` ou `2024-12-31`
- **Comportamento**: Pagamentos são gerados até a data especificada

**Exemplo:**
```csv
Date,Beneficiary,Value,Interval,End
01/01/2024,Netflix,49.90,1,31/12/2024
```
→ Pagamentos mensais de janeiro até dezembro/2024

---

#### 2️⃣ **Número** (Contador de Repetições)
Quando você fornece um número, ele representa **quantas vezes** o pagamento deve se repetir.

- **Formato aceito**: Número inteiro de 1 a 1000
- **Exemplo**: `12` (repete 12 vezes)
- **Comportamento**: Gera exatamente N ocorrências do pagamento

**Exemplo:**
```csv
Date,Beneficiary,Value,Interval,End
01/01/2024,Academia,150.00,1,6
```
→ Pagamentos mensais por **6 meses** (janeiro a junho/2024)

**Outro exemplo:**
```csv
Date,Beneficiary,Value,Interval,End
15/03/2024,Seguro Trimestral,500.00,3,4
```
→ Pagamentos trimestrais por **4 vezes** (15/03, 15/06, 15/09, 15/12 de 2024)

---

#### 3️⃣ **Vazio** (Sem Limite)
Se o campo 'End' estiver vazio, os pagamentos continuam até 31/12/2030 (padrão).

**Validação Automática:**
- O sistema detecta automaticamente se o valor é uma data ou um número
- Datas devem conter `/` ou `-` para serem reconhecidas
- Números puros são interpretados como contador de repetições
- Valores inválidos geram avisos no console

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
01/02/2024,Academia,150.00,1,6
10/01/2024,Curso Online,99.00,1,12
```

**Resultado**:
- **Netflix**: Pagamentos **mensais** de 01/01/2024 até 01/12/2024 (End = data)
- **Seguro Anual**: Pagamentos **anuais** em 15/03/2024, 15/03/2025, 15/03/2026, e 15/03/2027 (End = data)
- **Taxa de Registro**: Pagamento **único** em 10/05/2024 (Interval = 0)
- **Consulta Médica**: Pagamento **único** em 20/06/2024 (Interval vazio)
- **Academia**: Pagamentos **mensais** por **6 meses** - fev a jul/2024 (End = número)
- **Curso Online**: Pagamentos **mensais** por **12 meses** - jan a dez/2024 (End = número)

### Logs no Console
O sistema exibe mensagens informativas no console do navegador:
- ✅ `End date for [Beneficiário]: [Data]` - Data final detectada
- ✅ `Repetition count for [Beneficiário]: [N] times` - Contador de repetições detectado
- ✅ `One-time payment for [Beneficiário] on [Data]` - Pagamento único detectado
- ⚠️ `Invalid End date for [Beneficiário]...` - Data inválida
- ⚠️ `Invalid repetition count for [Beneficiário]...` - Contador inválido
- ⚠️ `Invalid End value for [Beneficiário]...` - Valor não reconhecido

## Código Modificado
O arquivo `src/App.jsx` foi atualizado na função `loadData()`, especificamente na seção que processa as categorias 'periodicos' e 'individual' (linhas 220-330).

### Principais Mudanças:
1. **Detecção automática do tipo de valor no campo 'End'**:
   - Identifica se é uma data (contém `/` ou `-`)
   - Identifica se é um número (contador de repetições)
2. Suporte para formatos DD/MM/YYYY e YYYY-MM-DD para datas
3. Validação robusta de datas e números
4. **Detecção de pagamentos únicos (Interval vazio ou 0)**
5. **Lógica separada para pagamentos únicos vs. recorrentes**
6. Loop de geração de ocorrências com duas condições de parada:
   - Por data final (quando End é uma data)
   - Por contador de repetições (quando End é um número)
7. Logs informativos detalhados para debugging

## Casos de Uso

### 1. Assinatura com Data de Término
```csv
Date,Beneficiary,Value,Interval,End
01/01/2024,Spotify,19.90,1,30/06/2024
```
→ Pagamentos mensais de janeiro a junho de 2024 (usando **data**)

### 2. Assinatura por Número de Meses
```csv
Date,Beneficiary,Value,Interval,End
01/01/2024,Plano Premium,29.90,1,6
```
→ Pagamentos mensais por exatamente **6 meses** (usando **número**)

### 3. Pagamento Anual Contínuo
```csv
Date,Beneficiary,Value,Interval,End
15/03/2024,IPVA,1500.00,12,
```
→ Pagamentos anuais todo dia 15/03 até 2030 (sem limite)

### 4. Pagamento Anual Limitado
```csv
Date,Beneficiary,Value,Interval,End
15/03/2024,Licença Software,800.00,12,3
```
→ Pagamentos anuais por **3 anos** (2024, 2025, 2026) (usando **número**)

### 5. Pagamento Único
```csv
Date,Beneficiary,Value,Interval,End
10/08/2024,Renovação CNH,250.00,0,
```
→ Pagamento único em 10/08/2024

### 6. Pagamento Trimestral com Término por Data
```csv
Date,Beneficiary,Value,Interval,End
01/01/2024,Manutenção,500.00,3,31/12/2025
```
→ Pagamentos a cada 3 meses de 01/01/2024 até 01/10/2025 (usando **data**)

### 7. Pagamento Trimestral com Número de Repetições
```csv
Date,Beneficiary,Value,Interval,End
01/01/2024,Consultoria,1200.00,3,8
```
→ Pagamentos trimestrais por **8 vezes** (2 anos completos) (usando **número**)

## Testando
1. Adicione o campo 'End' nas suas planilhas Google Sheets para as tabelas 'periodicos' e/ou 'individual'
2. Experimente diferentes formatos:
   - **Data**: `31/12/2024` ou `2024-12-31`
   - **Número**: `6`, `12`, `24`, etc.
   - **Vazio**: deixe em branco para pagamentos contínuos
3. Para pagamentos únicos, deixe 'Interval' vazio ou coloque `0`
4. Recarregue a aplicação
5. Verifique no console do navegador:
   - `End date for...` - Confirma detecção de data
   - `Repetition count for... N times` - Confirma detecção de contador
   - `One-time payment for...` - Confirma pagamento único
6. Confirme no calendário/lista que:
   - Pagamentos com data param após a data especificada
   - Pagamentos com número repetem exatamente N vezes
   - Pagamentos únicos aparecem apenas uma vez

## Compatibilidade
- ✅ Totalmente compatível com entradas existentes (sem o campo 'End')
- ✅ Não afeta outras categorias de pagamento
- ✅ Funciona com qualquer valor de 'Interval' (incluindo vazio/0)
- ✅ Permite usar as mesmas tabelas para pagamentos únicos e recorrentes

