/**
 * Groups payments by week and month and calculates totals.
 * @param {Array} payments - Array of payment objects { date: Date, value: number, category: string, ... }
 * @returns {Object} - { byMonth: Object, byWeek: Object, total: number }
 */
export const calculateTotals = (payments) => {
    const byMonth = {};
    const byWeek = {};
    let globalTotal = 0;

    payments.forEach(payment => {
        const date = new Date(payment.date);
        const value = parseFloat(payment.value || 0);

        // Month Key: YYYY-MM
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!byMonth[monthKey]) {
            byMonth[monthKey] = { total: 0, categories: {} };
        }
        byMonth[monthKey].total += value;
        byMonth[monthKey].categories[payment.category] = (byMonth[monthKey].categories[payment.category] || 0) + value;

        // Week Key: YYYY-Www (ISO week not strictly needed, just simple bucketing by start of week)
        // Actually, simple way: get the Monday of the week
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new Date(date.setDate(diff));
        const weekKey = monday.toISOString().split('T')[0];

        if (!byWeek[weekKey]) {
            byWeek[weekKey] = 0;
        }
        byWeek[weekKey] += value;

        globalTotal += value;
    });

    return { byMonth, byWeek, globalTotal };
};
