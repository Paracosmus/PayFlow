import { detectCurrency, parseCurrencyValue } from './currencyUtils.js';

/**
 * Parses a CSV string into an array of objects.
 * Supports both comma (Google Sheets) and semicolon (PT-BR) delimiters.
 * Converts "1.234,56" and "1,234.56" number formats to valid JS numbers.
 * Detects and stores currency information for multi-currency support.
 */
export const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];

    // Detect delimiter by checking the first line
    const firstLine = lines[0];
    const delimiter = firstLine.includes(',') ? ',' : ';';

    // Parse a line respecting quoted fields
    const parseLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };

    const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());

    return lines.slice(1).map((line) => {
        if (!line.trim()) return null;

        const values = parseLine(line);
        const obj = {};

        headers.forEach((header, index) => {
            let val = values[index] ? values[index].trim() : '';

            // Remove quotes if present
            val = val.replace(/^"|"$/g, '');

            if (header.toLowerCase() === 'value') {
                // Detect currency from the value string
                const { currency, cleanValue } = detectCurrency(val);

                // Parse the numeric value
                const numericValue = parseCurrencyValue(cleanValue);

                // Store both the value and currency information
                obj[header] = numericValue;
                obj.currency = currency; // Store original currency
                obj.originalValue = numericValue; // Store original value
            } else {
                obj[header] = val;
            }
        });

        return obj;
    }).filter(item => item !== null);
};
