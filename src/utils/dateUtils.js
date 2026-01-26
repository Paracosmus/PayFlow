/**
 * Adjusts a date to the next business day if it falls on a weekend OR holiday.
 * Used for: boletos, emprestimos, financiamentos
 * @param {string|Date} dateStr - The input date string (YYYY-MM-DD or similar).
 * @returns {Date} - The adjusted date object.
 */
export const adjustToNextBusinessDay = (dateStr) => {
    // If dateStr is already a Date object, use it; otherwise parse
    let date = (dateStr instanceof Date) ? new Date(dateStr) : new Date(dateStr + 'T12:00:00');

    // Helper to check if weekend or holiday
    const isNonBusinessDay = (d) => {
        const day = d.getDay();
        return day === 0 || day === 6 || isHoliday(d) !== null;
    };

    // Keep adding 1 day while it's a non-business day (weekend or holiday)
    // Safety counter to prevent infinite loops
    let counter = 0;
    const MAX_ITERATIONS = 30; // Max 30 days ahead

    while (isNonBusinessDay(date) && counter < MAX_ITERATIONS) {
        date.setDate(date.getDate() + 1);
        counter++;
    }

    if (counter >= MAX_ITERATIONS) {
        console.error('adjustToNextBusinessDay exceeded maximum iterations for date:', dateStr);
    }

    return date;
};

/**
 * Adjusts a date to the previous business day if it falls on a weekend OR holiday.
 * Used for: impostos, recorrentes
 * @param {string|Date} dateStr - The input date string (YYYY-MM-DD or similar).
 * @returns {Date} - The adjusted date object.
 */
export const adjustToPreviousBusinessDay = (dateStr) => {
    // If dateStr is already a Date object, use it; otherwise parse
    let date = (dateStr instanceof Date) ? new Date(dateStr) : new Date(dateStr + 'T12:00:00');

    // Helper to check if weekend or holiday
    const isNonBusinessDay = (d) => {
        const day = d.getDay();
        return day === 0 || day === 6 || isHoliday(d) !== null;
    };

    // Keep subtracting 1 day while it's a non-business day (weekend or holiday)
    // Safety counter to prevent infinite loops
    let counter = 0;
    const MAX_ITERATIONS = 30; // Max 30 days back

    while (isNonBusinessDay(date) && counter < MAX_ITERATIONS) {
        date.setDate(date.getDate() - 1);
        counter++;
    }

    if (counter >= MAX_ITERATIONS) {
        console.error('adjustToPreviousBusinessDay exceeded maximum iterations for date:', dateStr);
    }

    return date;
};

/**
 * Does not adjust the date - keeps it as is.
 * Used for: periodicos, individual, notas
 * @param {string|Date} dateStr - The input date string (YYYY-MM-DD or similar).
 * @returns {Date} - The date object without adjustment.
 */
export const keepOriginalDate = (dateStr) => {
    // If dateStr is already a Date object, use it; otherwise parse
    return (dateStr instanceof Date) ? new Date(dateStr) : new Date(dateStr + 'T12:00:00');
};

/**
 * Legacy function - now redirects to adjustToNextBusinessDay for backwards compatibility
 * @deprecated Use adjustToNextBusinessDay instead
 */
export const adjustToBusinessDay = adjustToNextBusinessDay;

/**
 * Normalizes a fixed date day.
 * If the day is valid for the month (e.g. Jan 5), returns that date.
 * If the day exceeds the month (e.g. Feb 30), returns the last day of the month (Feb 28/29).
 * Does NOT adjust for weekends.
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {Date}
 */
export const normalizeFixedDate = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    // Create date at start of month
    const date = new Date(y, m - 1, 1, 12, 0, 0);

    // Get last day of this month
    const lastDayOfMonth = new Date(y, m, 0).getDate();

    // Clamp day
    const validDay = Math.min(d, lastDayOfMonth);

    date.setDate(validDay);
    return date;
};

/**
 * Formats a date to YYYY-MM-DD string.
 * @param {Date} date
 * @returns {string}
 */
export const formatDateKey = (date) => {
    return date.toISOString().split('T')[0];
};

/**
 * Gets the month name from a month index (0-11).
 * @param {number} monthIndex
 * @returns {string}
 */
export const getMonthName = (monthIndex) => {
    const names = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return names[monthIndex];
};

/**
 * Gets list of days for a given month/year grid.
 * @param {number} year
 * @param {number} month (0-11)
 * @returns {Array} Array of day objects { date: Date, isCurrentMonth: boolean }
 */
export const getCalendarDays = (year, month) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Get day of week: 0 (Sun) to 6 (Sat)
    let startDay = firstDay.getDay();
    // Convert to Monday-based week: Monday = 0, Sunday = 6
    startDay = (startDay === 0) ? 6 : startDay - 1;

    const daysInMonth = lastDay.getDate();

    const days = [];

    // Previous month padding (to start on Monday)
    for (let i = 0; i < startDay; i++) {
        const d = new Date(year, month, 1 - (startDay - i));
        days.push({ date: d, isCurrentMonth: false });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        days.push({ date: d, isCurrentMonth: true });
    }

    // Next month padding to fill 6 weeks (42 cells total)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
        const d = new Date(year, month + 1, i);
        days.push({ date: d, isCurrentMonth: false });
    }

    return days;
};

/**
 * Calculates Easter Sunday for a given year.
 * Algorithm: Anonymous / Meeus/Jones/Butcher
 */
const getEasterDate = (year) => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
};

/**
 * Returns a map of holidays for a given year.
 * Key: "MM-DD", Value: Holiday Name
 */
const getHolidays = (year) => {
    const holidays = (
        {
            '01-01': 'Confraternização Universal',
            '04-21': 'Tiradentes',
            '05-01': 'Dia do Trabalho',
            '09-07': 'Independência do Brasil',
            '10-12': 'Nossa Senhora Aparecida',
            '11-02': 'Finados',
            '11-15': 'Proclamação da República',
            '11-20': 'Dia da Consciência Negra',
            '12-25': 'Natal'
        }
    );

    const easter = getEasterDate(year);

    // Carnival: 47 days before Easter
    const carnival = new Date(easter);
    carnival.setDate(easter.getDate() - 47);

    // Good Friday: 2 days before Easter
    const goodFriday = new Date(easter);
    goodFriday.setDate(easter.getDate() - 2);

    // Corpus Christi: 60 days after Easter
    const corpusChristi = new Date(easter);
    corpusChristi.setDate(easter.getDate() + 60);

    const fmt = (d) => {
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${mm}-${dd}`;
    };

    holidays[fmt(carnival)] = 'Carnaval';
    holidays[fmt(goodFriday)] = 'Sexta-feira Santa';
    holidays[fmt(easter)] = 'Páscoa';
    holidays[fmt(corpusChristi)] = 'Corpus Christi';

    return holidays;
};

/**
 * Checks if a date is a holiday.
 * Returns the holiday name or null.
 */
export const isHoliday = (date) => {
    const year = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const key = `${mm}-${dd}`;

    const holidays = getHolidays(year);
    return holidays[key] || null;
};
