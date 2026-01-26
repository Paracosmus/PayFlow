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
