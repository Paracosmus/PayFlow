# Multi-Currency Support - PayFlow

## Overview
O sistema PayFlow agora suporta múltiplas moedas com conversão automática para Real Brasileiro (BRL).

## Como Funciona

### 1. Detecção Automática de Moeda
O sistema detecta automaticamente a moeda através do formato do valor na planilha CSV:

- **Sem símbolo ou com R$**: Valor em Real Brasileiro (BRL)
  - Exemplo: `100`, `R$ 100`, `100,00`

- **USD ou $**: Dólar Americano
  - Exemplo: `USD 100`, `$ 100`, `100 USD`

- **EUR ou €**: Euro
  - Exemplo: `EUR 100`, `€ 100`, `100 EUR`

- **GBP ou £**: Libra Esterlina
  - Exemplo: `GBP 100`, `£ 100`, `100 GBP`

- **Outras moedas suportadas**: JPY (¥), CAD (C$), AUD (A$), CHF, CNY (元)

### 2. Conversão em Tempo Real com IOF
- O sistema busca cotações em tempo real ao carregar os dados
- **IOF Configurável**: A taxa de IOF é carregada dinamicamente da tabela "fontes" no Google Sheets
- Taxa padrão: 3,8% (caso a tabela não esteja configurada)
- As cotações são armazenadas em cache por 1 hora para melhor performance
- Se a API de cotação falhar, valores de fallback são utilizados

**Importante**: O valor em BRL exibido já inclui o IOF (Imposto sobre Operações Financeiras), que é cobrado pelo governo brasileiro em operações de câmbio. A taxa de IOF pode ser atualizada na tabela "fontes" sem necessidade de alterar código. Veja [FONTES_CONFIG.md](FONTES_CONFIG.md) para instruções de configuração.

### 3. Exibição no Sistema

#### Calendário e Lista
Quando um valor está em moeda estrangeira, o sistema mostra:
```
R$ 500,00 (USD 100.00)
```

Onde:
- `R$ 500,00` é o valor convertido em Real Brasileiro
- `(USD 100.00)` é o valor original na moeda estrangeira

#### Sidebar (Detalhes)
Ao clicar em um pagamento ou nota fiscal, a sidebar mostra o valor no mesmo formato.

### 4. Cálculos
- **Todos os cálculos** (totais semanais, mensais, saldo disponível) são feitos em BRL
- Os valores são convertidos automaticamente antes de serem somados

## Exemplos de Uso

### Exemplo 1: Pagamento em Dólar (com IOF)
Na planilha CSV:
```csv
Beneficiary,Value,Date,Description
Amazon AWS,USD 50.00,15/01/2026,Servidor Cloud
```

No sistema será exibido:
```
R$ 279,39 (USD 50.00)
```

**Cálculo**:
- Cotação: 1 USD = 5,38 BRL (cotação atual)
- Valor convertido: 50 × 5,38 = R$ 269,00
- IOF (3,8%): R$ 269,00 × 0,038 = R$ 10,22
- **Total com IOF: R$ 279,22**

### Exemplo 2: Nota Fiscal em Euro (com IOF)
Na planilha CSV:
```csv
Client,Provider,Value,Date,Description
Cliente Europa,Minha Empresa,EUR 200.00,20/01/2026,Consultoria
```

No sistema será exibido:
```
R$ 1.224,20 (EUR 200.00)
```

**Cálculo**:
- Cotação: 1 EUR = 5,90 BRL
- Valor convertido: 200 × 5,90 = R$ 1.180,00
- IOF (3,8%): R$ 1.180,00 × 0,038 = R$ 44,84
- **Total com IOF: R$ 1.224,84**

### Exemplo 3: Pagamento em Real (padrão)
Na planilha CSV:
```csv
Beneficiary,Value,Date,Description
Fornecedor Local,1500.00,25/01/2026,Serviços
```

No sistema será exibido:
```
R$ 1.500,00
```

## API de Cotação
O sistema utiliza a API gratuita do exchangerate-api.com:
- Limite: 1500 requisições/mês
- Cache: 1 hora
- Fallback: Cotações aproximadas em caso de falha

## Notas Técnicas
- As conversões são feitas no momento do carregamento dos dados
- Os valores em BRL são armazenados para cálculos
- Os valores originais são preservados para exibição
- A moeda original é detectada através de padrões regex no valor
- **IOF de 3,8% é aplicado automaticamente** em todas as conversões de moeda estrangeira
- Pagamentos em BRL não têm IOF aplicado (apenas transações internacionais)
- A API usa BRL como moeda base para cotações mais precisas

## Moedas Suportadas
1. **BRL** - Real Brasileiro (padrão)
2. **USD** - Dólar Americano
3. **EUR** - Euro
4. **GBP** - Libra Esterlina
5. **JPY** - Iene Japonês
6. **CAD** - Dólar Canadense
7. **AUD** - Dólar Australiano
8. **CHF** - Franco Suíço
9. **CNY** - Yuan Chinês

## Troubleshooting

### Cotação não atualiza
- O cache é de 1 hora. Recarregue a página após esse período
- Verifique a conexão com a internet

### Valor não é reconhecido como moeda estrangeira
- Certifique-se de usar o formato correto: `USD 100` ou `$ 100`
- O símbolo deve estar junto ao valor na planilha

### Cálculos incorretos
- Todos os cálculos são feitos em BRL após conversão
- Verifique se a cotação está correta no console do navegador
