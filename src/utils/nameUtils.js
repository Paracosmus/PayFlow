/**
 * Utility functions for name processing
 */

/**
 * Get abbreviated client name (first + last name)
 * @param {string} fullName - Full client name
 * @returns {string} Abbreviated name (first + last)
 */
export const getAbbreviatedName = (fullName) => {
    if (!fullName) return '';

    const parts = fullName.trim().split(' ').filter(p => p.length > 0);

    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];

    // First + Last name
    return `${parts[0]} ${parts[parts.length - 1]}`;
};
