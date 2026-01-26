# Formatação de Descrição com Ponto e Vírgula

## Funcionalidade Implementada

O campo 'Description' no painel de detalhes agora suporta **formatação automática** usando ponto e vírgula (`;`) como separador.

### Como Funciona

Quando você clica em um pagamento ou nota fiscal e visualiza o painel de detalhes:
- Se a descrição contém **ponto e vírgula** (`;`), cada parte é exibida em sua própria linha
- Os **pontos e vírgulas não são mostrados** na interface
- Cada linha tem **espaçamento adequado** para melhor legibilidade

### Exemplos de Uso

#### Antes (sem ponto e vírgula):
```
Descrição: Pagamento mensal da internet banda larga 500MB
```

**Resultado:** Exibido em uma única linha.

---

#### Depois (com ponto e vírgula):
```
Descrição: Pagamento mensal da internet; Banda larga 500MB; Vencimento todo dia 10
```

**Resultado:** Exibido como:
```
Pagamento mensal da internet
Banda larga 500MB
Vencimento todo dia 10
```

### Casos de Uso Práticos

#### 1. Detalhamento de Serviços
```csv
Description: Netflix Premium; 4 telas simultâneas; Ultra HD; Renovação automática
```

**Visualização:**
- Netflix Premium
- 4 telas simultâneas
- Ultra HD
- Renovação automática

---

#### 2. Informações de Contato
```csv
Description: Consultoria TI; Contato: João Silva; Tel: (11) 98765-4321; Email: joao@empresa.com
```

**Visualização:**
- Consultoria TI
- Contato: João Silva
- Tel: (11) 98765-4321
- Email: joao@empresa.com

---

#### 3. Detalhes de Compra
```csv
Description: Compra no Mercado; Frutas e verduras; Produtos de limpeza; Total de 15 itens
```

**Visualização:**
- Compra no Mercado
- Frutas e verduras
- Produtos de limpeza
- Total de 15 itens

---

#### 4. Notas Fiscais Detalhadas
```csv
Description: Desenvolvimento de website; 40 horas trabalhadas; Período: 01/01 a 15/01; Entrega: 20/01
```

**Visualização:**
- Desenvolvimento de website
- 40 horas trabalhadas
- Período: 01/01 a 15/01
- Entrega: 20/01

## Características Técnicas

### Processamento
- **Divisão automática**: O texto é dividido por `;`
- **Limpeza**: Espaços em branco extras são removidos
- **Filtro**: Partes vazias são ignoradas
- **Compatibilidade**: Descrições sem `;` continuam funcionando normalmente

### Estilização
- Cada linha tem **padding vertical** de 4px
- **Gap de 8px** entre as linhas
- Mantém o **fundo cinza claro** e **borda** do painel
- **Responsivo**: Funciona tanto em desktop quanto mobile

## Como Usar nas Planilhas

1. Edite o campo 'Description' na sua planilha Google Sheets
2. Separe as informações com **ponto e vírgula** (`;`)
3. Exemplo: `Item 1; Item 2; Item 3`
4. Salve e recarregue a aplicação
5. Clique no pagamento para ver a descrição formatada

## Benefícios

✅ **Melhor organização** das informações
✅ **Mais legível** - cada item em sua própria linha
✅ **Sem poluição visual** - pontos e vírgulas ocultos
✅ **Flexível** - funciona com qualquer número de itens
✅ **Compatível** - não quebra descrições existentes
✅ **Funciona em ambos** - pagamentos e notas fiscais

## Notas

- Se não houver ponto e vírgula, a descrição é exibida normalmente
- Espaços antes/depois do ponto e vírgula são automaticamente removidos
- Funciona tanto para pagamentos quanto para notas fiscais (invoices)
