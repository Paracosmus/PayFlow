/**
 * Normaliza valores numéricos para comparação
 * Remove pontos de milhares e converte vírgulas para ponto decimal
 * Exemplos: "1.123" -> "1123", "123,00" -> "123", "1.123,45" -> "1123.45"
 */
export function normalizeNumericValue(value) {
    if (value === null || value === undefined) return '';

    const str = String(value).trim();

    // Se for um número puro, retorna como string
    if (!isNaN(parseFloat(str)) && isFinite(str)) {
        return String(parseFloat(str));
    }

    // Remove pontos (separador de milhares) e substitui vírgula por ponto (decimal)
    // Exemplo: "1.123,45" -> "1123.45"
    const normalized = str.replace(/\./g, '').replace(/,/g, '.');

    // Tenta converter para número e retorna como string
    const num = parseFloat(normalized);
    if (!isNaN(num) && isFinite(num)) {
        return String(num);
    }

    // Se não for um número válido, retorna a string original em lowercase
    return str.toLowerCase();
}

/**
 * Normaliza uma string para comparação case-insensitive
 */
export function normalizeString(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim().toLowerCase();
}

/**
 * Compara dois valores normalizados
 */
export function areValuesEqual(value1, value2) {
    const norm1 = normalizeNumericValue(value1);
    const norm2 = normalizeNumericValue(value2);
    return norm1 === norm2;
}

/**
 * Verifica se dois itens são duplicatas
 * Duplicatas são entradas com a MESMA DATA e todos os campos iguais
 * Entradas com datas diferentes NÃO são duplicatas, mesmo que sejam idênticas
 */
export function areItemsDuplicate(item1, item2) {
    // Nunca comparar o mesmo item consigo mesmo
    if (item1.id === item2.id) return false;

    // CRITÉRIO OBRIGATÓRIO: Mesma data original
    // Se as datas são diferentes, NÃO são duplicatas (é uma recorrência normal)
    if (item1.originalDate !== item2.originalDate) {
        return false;
    }

    // Diferentes categorias não são duplicatas
    if (normalizeString(item1.category) !== normalizeString(item2.category)) {
        return false;
    }

    // Define os campos que devem ser comparados (exceto data, que já foi verificada)
    const fieldsToCompare = [
        'Beneficiary',
        'Description',
        'Value',
        'currency',
        'originalValue',
        'Installments',
        'currentInstallment',
        'totalInstallments',
        'Interval',
        'IntervalStr',
        'IsWeekly',
        'Item',
        'Shop',
        'Client',
        'Provider',
        'End'
    ];

    // Compara cada campo
    for (const field of fieldsToCompare) {
        const val1 = item1[field];
        const val2 = item2[field];

        // Se ambos são undefined/null, continua
        if ((val1 === undefined || val1 === null) && (val2 === undefined || val2 === null)) {
            continue;
        }

        // Se apenas um é undefined/null, não são iguais
        if ((val1 === undefined || val1 === null) !== (val2 === undefined || val2 === null)) {
            return false;
        }

        // Compara valores normalizados
        if (!areValuesEqual(val1, val2)) {
            return false;
        }
    }

    return true;
}

/**
 * Encontra todas as entradas duplicadas em um array de transações
 * Retorna um array de grupos de duplicatas
 */
export function findDuplicates(transactions, invoices = []) {
    const allItems = [...transactions, ...invoices];
    const duplicateGroups = [];
    const processedIds = new Set();

    for (let i = 0; i < allItems.length; i++) {
        // Pula se já foi processado
        if (processedIds.has(allItems[i].id)) continue;

        const duplicates = [allItems[i]];

        // Procura duplicatas deste item
        for (let j = i + 1; j < allItems.length; j++) {
            if (processedIds.has(allItems[j].id)) continue;

            if (areItemsDuplicate(allItems[i], allItems[j])) {
                duplicates.push(allItems[j]);
                processedIds.add(allItems[j].id);
            }
        }

        // Se encontrou duplicatas (mais de 1 item), adiciona ao resultado
        if (duplicates.length > 1) {
            processedIds.add(allItems[i].id);

            // Ordena as duplicatas por data
            duplicates.sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateA - dateB;
            });

            duplicateGroups.push(duplicates);
        }
    }

    return duplicateGroups;
}

/**
 * Formata a lista de duplicatas para exibição
 */
export function formatDuplicatesForDisplay(duplicateGroups) {
    return duplicateGroups.map(group => {
        const firstItem = group[0];
        const isInvoice = !!firstItem.Provider;

        return {
            id: group.map(item => item.id).join('-'),
            name: isInvoice ? firstItem.Client : (firstItem.FullName || firstItem.Beneficiary),
            category: firstItem.category,
            isInvoice,
            count: group.length,
            items: group.map(item => ({
                id: item.id,
                date: item.date,
                value: item.Value,
                currency: item.currency,
                originalValue: item.originalValue
            }))
        };
    });
}
