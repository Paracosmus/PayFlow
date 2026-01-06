/**
 * Parses a CSV string into an array of objects.
 * Supports both comma (Google Sheets) and semicolon (PT-BR) delimiters.
 * Converts "1.234,56" and "1,234.56" number formats to valid JS numbers.
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

    // Helper to parse PT-BR currency string to float (1.234,56)
    const parseBrFloat = (str) => {
        if (!str) return 0;
        // Remove quotes if present
        str = str.replace(/^"|"$/g, '').trim();

        // Check if it's PT-BR format (1.234,56) or US format (1,234.56)
        const hasBrFormat = str.includes(',') && str.lastIndexOf(',') > str.lastIndexOf('.');

        if (hasBrFormat) {
            // PT-BR format: remove dots, replace comma with dot
            const cleanStr = str.replace(/\./g, '').replace(',', '.');
            return parseFloat(cleanStr) || 0;
        } else {
            // US format: remove commas
            const cleanStr = str.replace(/,/g, '');
            return parseFloat(cleanStr) || 0;
        }
    };

    return lines.slice(1).map((line, i) => {
        if (!line.trim()) return null;

        const values = parseLine(line);
        const obj = {};

        headers.forEach((header, index) => {
            let val = values[index] ? values[index].trim() : '';

            // Remove quotes if present
            val = val.replace(/^"|"$/g, '');

            if (header.toLowerCase() === 'value') {
                obj[header] = parseBrFloat(val);
            } else {
                obj[header] = val;
            }
        });

        return obj;
    }).filter(item => item !== null);
};
