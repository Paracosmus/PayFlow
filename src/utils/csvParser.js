/**
 * Parses a CSV string into an array of objects.
 * Supports semicolon (;) delimiter for PT-BR format.
 * Converts "1.234,56" number format to valid JS numbers.
 */
export const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(';').map(h => h.trim());

    // Helper to parse PT-BR currency string to float
    const parseBrFloat = (str) => {
        if (!str) return 0;
        const cleanStr = str.replace(/\./g, '').replace(',', '.');
        return parseFloat(cleanStr) || 0;
    };

    return lines.slice(1).map((line, i) => {
        if (!line.trim()) return null;

        const values = line.split(';');
        const obj = {};

        headers.forEach((header, index) => {
            let val = values[index] ? values[index].trim() : '';

            // Handle quoted strings naturally by simple removal if present
            // (Basic handling, assuming no semicolons inside quotes for now)
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
