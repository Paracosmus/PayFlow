/**
 * Utility functions for invoice (notas) calculations and processing
 */

/**
 * Filter invoices by provider (company)
 * @param {Array} invoices - Array of invoice objects
 * @param {string} provider - Provider name to filter by
 * @returns {Array} Filtered invoices
 */
export const getInvoicesByProvider = (invoices, provider) => {
    return invoices.filter(inv => inv.Provider === provider);
};

/**
 * Filter invoices by specific month and year
 * @param {Array} invoices - Array of invoice objects
 * @param {number} year - Year to filter by
 * @param {number} month - Month to filter by (0-11, JavaScript format)
 * @returns {Array} Filtered invoices
 */
export const getInvoicesByMonth = (invoices, year, month) => {
    return invoices.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate.getFullYear() === year && invDate.getMonth() === month;
    });
};

/**
 * Filter invoices by year
 * @param {Array} invoices - Array of invoice objects
 * @param {number} year - Year to filter by
 * @returns {Array} Filtered invoices
 */
export const getInvoicesByYear = (invoices, year) => {
    return invoices.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate.getFullYear() === year;
    });
};

/**
 * Calculate total value for an array of invoices
 * @param {Array} invoices - Array of invoice objects
 * @returns {number} Total value
 */
export const calculateInvoiceTotal = (invoices) => {
    return invoices.reduce((acc, inv) => acc + (parseFloat(inv.Value) || 0), 0);
};

/**
 * Get unique list of years from invoices
 * @param {Array} invoices - Array of invoice objects
 * @returns {Array} Sorted array of years (newest first)
 */
export const getAvailableYears = (invoices) => {
    const years = [...new Set(invoices.map(inv => new Date(inv.date).getFullYear()))];
    return years.sort((a, b) => b - a); // Descending order
};

/**
 * Get unique list of providers from invoices
 * @param {Array} invoices - Array of invoice objects
 * @param {number} year - Optional year to filter providers
 * @returns {Array} Sorted array of provider names
 */
export const getProviders = (invoices, year = null) => {
    let filtered = invoices;
    if (year !== null) {
        filtered = getInvoicesByYear(invoices, year);
    }
    const providers = [...new Set(filtered.map(inv => inv.Provider))];
    return providers.sort();
};

/**
 * Group invoices by provider and month for a specific year
 * @param {Array} invoices - Array of invoice objects
 * @param {number} year - Year to group by
 * @returns {Object} Object with provider names as keys, each containing monthly totals (0-11)
 */
export const groupInvoicesByProviderAndMonth = (invoices, year) => {
    const yearInvoices = getInvoicesByYear(invoices, year);
    const providers = getProviders(yearInvoices);

    const grouped = {};
    providers.forEach(provider => {
        grouped[provider] = Array(12).fill(0); // Initialize 12 months with 0

        const providerInvoices = getInvoicesByProvider(yearInvoices, provider);
        providerInvoices.forEach(inv => {
            const month = new Date(inv.date).getMonth();
            grouped[provider][month] += parseFloat(inv.Value) || 0;
        });
    });

    return grouped;
};

/**
 * Calculate sum of invoices for the last 12 months, excluding the target month
 * @param {Array} invoices - Array of invoice objects
 * @param {number} targetYear - Target year
 * @param {number} targetMonth - Target month (0-11)
 * @param {string} provider - Provider name
 * @returns {number} Sum of last 12 months
 */
export const calculate12MonthSum = (invoices, targetYear, targetMonth, provider) => {
    const providerInvoices = getInvoicesByProvider(invoices, provider);

    // Calculate date range: 12 months BEFORE the target month (excluding target month)
    // For example, if target is Jan 2026 (month=0, year=2026):
    // - End date: Dec 2025 (last day)
    // - Start date: Jan 2025 (first day)
    const endDate = new Date(targetYear, targetMonth, 0); // Last day of previous month
    const startDate = new Date(targetYear, targetMonth - 12, 1); // First day of 12 months before

    const filteredInvoices = providerInvoices.filter(inv => {
        const invDate = new Date(inv.date);
        // Check if invoice date is within the range (inclusive)
        return invDate >= startDate && invDate <= endDate;
    });

    return calculateInvoiceTotal(filteredInvoices);
};

/**
 * Calculate estimated tax using Simples Nacional (Anexo III - Serviços)
 * Progressive rates based on 12-month revenue (RBT12)
 * @param {number} rbt12 - Receita Bruta Total dos últimos 12 meses
 * @returns {number} Tax amount based on Simples Nacional table
 */
export const getTaxEstimate = (rbt12) => {
    // Simples Nacional - Anexo III (2024 values)
    // Faixas de faturamento anual
    const brackets = [
        { limit: 180000, rate: 0.06, deduction: 0 },
        { limit: 360000, rate: 0.112, deduction: 9360 },
        { limit: 720000, rate: 0.135, deduction: 17640 },
        { limit: 1800000, rate: 0.16, deduction: 35640 },
        { limit: 3600000, rate: 0.21, deduction: 125640 },
        { limit: Infinity, rate: 0.33, deduction: 648000 }
    ];

    // Find the applicable bracket
    let applicableBracket = brackets[0];
    for (const bracket of brackets) {
        if (rbt12 <= bracket.limit) {
            applicableBracket = bracket;
            break;
        }
    }

    // Calculate effective rate: (RBT12 × Alíquota) - Parcela a Deduzir
    const totalTax = (rbt12 * applicableBracket.rate) - applicableBracket.deduction;

    // Monthly tax estimate (divide by 12)
    return totalTax / 12;
};

/**
 * Compare two providers for a specific year
 * @param {Array} invoices - Array of invoice objects
 * @param {number} year - Year to compare
 * @param {string} providerA - First provider name (e.g., 'VJ')
 * @param {string} providerB - Second provider name (e.g., 'BF')
 * @returns {Object} Comparison result with totals and difference
 */
export const compareProviders = (invoices, year, providerA, providerB) => {
    const yearInvoices = getInvoicesByYear(invoices, year);

    const totalA = calculateInvoiceTotal(getInvoicesByProvider(yearInvoices, providerA));
    const totalB = calculateInvoiceTotal(getInvoicesByProvider(yearInvoices, providerB));

    const difference = Math.abs(totalA - totalB);
    const higher = totalA > totalB ? providerA : (totalB > totalA ? providerB : 'equal');

    return {
        [providerA]: totalA,
        [providerB]: totalB,
        difference,
        higher
    };
};

/**
 * Get invoices for a specific date
 * @param {Array} invoices - Array of invoice objects
 * @param {Date} date - Date to filter by
 * @returns {Array} Invoices for that date
 */
export const getInvoicesForDate = (invoices, date) => {
    return invoices.filter(inv => {
        const invDate = new Date(inv.date);
        return (
            invDate.getDate() === date.getDate() &&
            invDate.getMonth() === date.getMonth() &&
            invDate.getFullYear() === date.getFullYear()
        );
    });
};
