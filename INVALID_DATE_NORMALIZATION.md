# Normalização de Datas Inválidas

## Problema Resolvido

Quando um pagamento cai em um dia que não existe em determinado mês (por exemplo, 31 de abril ou 29 de fevereiro em um ano não bissexto), o sistema agora mostra esse pagamento no último dia válido daquele mês.

## Exemplos

- **31 de Fevereiro** → Será mostrado em **28 de Fevereiro** (ou 29 em anos bissextos)
- **31 de Abril** → Será mostrado em **30 de Abril**
- **31 de Junho** → Será mostrado em **30 de Junho**
- **31 de Setembro** → Será mostrado em **30 de Setembro**
- **31 de Novembro** → Será mostrado em **30 de Novembro**

## Implementação

A solução utiliza a função `normalizeFixedDate` do arquivo `dateUtils.js`, que:

1. Recebe uma data no formato `YYYY-MM-DD`
2. Identifica o último dia válido do mês
3. Ajusta o dia para o menor valor entre o dia solicitado e o último dia do mês
4. Retorna a data normalizada

## Categorias Afetadas

Esta normalização é aplicada a todas as categorias de pagamento:

- **Boletos**
- **Financiamentos**
- **Empréstimos**
- **Impostos**
- **Periódicos**
- **Recorrentes**
- **Compras**
- **Individual**
- **Folha de Pagamento**

## Código Modificado

As alterações foram feitas no arquivo `App.jsx`, onde:

1. Importamos as funções `normalizeFixedDate` e `formatDateKey` de `dateUtils.js`
2. Aplicamos a normalização em todos os pontos onde datas são criadas para pagamentos
3. Garantimos que datas recorrentes mensais sempre usem o dia original do CSV, mas normalizadas para o último dia do mês quando necessário

## Exemplo de Uso

Se você tem um pagamento recorrente configurado para o dia 31 de cada mês:

- **Janeiro 31** → 31/01 (válido)
- **Fevereiro 31** → 28/02 ou 29/02 (normalizado)
- **Março 31** → 31/03 (válido)
- **Abril 31** → 30/04 (normalizado)
- **Maio 31** → 31/05 (válido)
- E assim por diante...

## Nota Técnica

A função `normalizeFixedDate` NÃO ajusta para dias úteis (fins de semana ou feriados). Ela apenas garante que a data seja válida no calendário. O ajuste para dias úteis é feito separadamente pelas funções `adjustToNextBusinessDay` e `adjustToPreviousBusinessDay`, conforme a categoria do pagamento.
