/**
 * Currency detection and conversion utilities
 */

// Currency symbols and their codes
const CURRENCY_PATTERNS = {
  USD: /USD|US\$|\$(?!\s*R)/i,
  EUR: /EUR|€/i,
  GBP: /GBP|£/i,
  JPY: /JPY|¥/i,
  CAD: /CAD|C\$/i,
  AUD: /AUD|A\$/i,
  CHF: /CHF/i,
  CNY: /CNY|元/i,
  BRL: /R\$|BRL/i
};

/**
 * Detects the currency from a value string
 * @param {string} valueStr - The value string from CSV
 * @returns {object} - { currency: 'USD', cleanValue: '1234.56' }
 */
export const detectCurrency = (valueStr) => {
  if (!valueStr || typeof valueStr !== 'string') {
    return { currency: 'BRL', cleanValue: '0' };
  }

  const trimmed = valueStr.trim();

  // Check for currency patterns
  for (const [currency, pattern] of Object.entries(CURRENCY_PATTERNS)) {
    if (pattern.test(trimmed)) {
      // Remove currency symbols and clean the value
      const cleanValue = trimmed
        .replace(pattern, '')
        .replace(/[^\d.,-]/g, '')
        .trim();
      return { currency, cleanValue };
    }
  }

  // Default to BRL if no currency detected
  return { currency: 'BRL', cleanValue: trimmed };
};

/**
 * Parses a currency value string to a float
 * Handles both PT-BR format (1.234,56) and US format (1,234.56)
 * @param {string} str - The value string
 * @returns {number} - Parsed float value
 */
export const parseCurrencyValue = (str) => {
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

// Exchange rate cache
let exchangeRatesCache = null;
let lastFetchTime = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Fetches current exchange rates from an API
 * Uses cache to avoid excessive API calls
 * @returns {Promise<object>} - Exchange rates object with BRL as base
 */
export const fetchExchangeRates = async () => {
  const now = Date.now();

  // Return cached rates if still valid
  if (exchangeRatesCache && lastFetchTime && (now - lastFetchTime) < CACHE_DURATION) {
    return exchangeRatesCache;
  }

  try {
    // Using exchangerate-api.com free tier (1500 requests/month)
    // Using BRL as base currency for more accurate rates
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/BRL');

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();

    // Rates are already BRL-based, just need to use them directly
    const brlBasedRates = {
      BRL: 1,
      USD: data.rates.USD,
      EUR: data.rates.EUR,
      GBP: data.rates.GBP,
      JPY: data.rates.JPY,
      CAD: data.rates.CAD,
      AUD: data.rates.AUD,
      CHF: data.rates.CHF,
      CNY: data.rates.CNY,
      lastUpdated: new Date().toISOString()
    };

    // Update cache
    exchangeRatesCache = brlBasedRates;
    lastFetchTime = now;

    console.log('Exchange rates updated:', brlBasedRates);
    return brlBasedRates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);

    // Return fallback rates if API fails
    // Updated with current rates as of January 2026
    const fallbackRates = {
      BRL: 1,
      USD: 0.1858,  // 1 USD ≈ 5.38 BRL (current rate)
      EUR: 0.1695,  // 1 EUR ≈ 5.90 BRL
      GBP: 0.1493,  // 1 GBP ≈ 6.70 BRL
      JPY: 27.78,   // 100 JPY ≈ 3.60 BRL
      CAD: 0.2618,  // 1 CAD ≈ 3.82 BRL
      AUD: 0.2941,  // 1 AUD ≈ 3.40 BRL
      CHF: 0.1639,  // 1 CHF ≈ 6.10 BRL
      CNY: 1.351,   // 1 CNY ≈ 0.74 BRL
      lastUpdated: 'fallback'
    };

    exchangeRatesCache = fallbackRates;
    lastFetchTime = now;

    return fallbackRates;
  }
};

/**
 * IOF (Imposto sobre Operações Financeiras) rate for foreign exchange in Brazil
 * This value is loaded dynamically from the 'fontes' table
 * Default: 3.8% (0.038)
 */
let IOF_RATE = 0.038; // Default value, will be updated from fontes table

/**
 * Sets the IOF rate from the loaded configuration
 * @param {number} rate - The IOF rate as a decimal (e.g., 0.038 for 3.8%)
 */
export const setIOFRate = (rate) => {
  if (rate && !isNaN(rate) && rate >= 0 && rate <= 1) {
    IOF_RATE = rate;
    console.log(`IOF rate updated to: ${(rate * 100).toFixed(2)}%`);
  } else {
    console.warn(`Invalid IOF rate: ${rate}, keeping default ${(IOF_RATE * 100).toFixed(2)}%`);
  }
};

/**
 * Gets the current IOF rate
 * @returns {number} The current IOF rate as a decimal
 */
export const getIOFRate = () => {
  return IOF_RATE;
};

/**
 * Converts a value from one currency to BRL, including IOF tax
 * @param {number} value - The numeric value
 * @param {string} fromCurrency - The source currency code
 * @param {object} exchangeRates - Exchange rates object
 * @returns {number} - Converted value in BRL
 */
export const convertToBRL = (value, fromCurrency, exchangeRates) => {
  if (!value || !fromCurrency || !exchangeRates) return value;

  if (fromCurrency === 'BRL') return value;

  const rate = exchangeRates[fromCurrency];
  if (!rate) {
    console.warn(`No exchange rate found for ${fromCurrency}, using original value`);
    return value;
  }


  // Convert: divide by the rate (since rates are BRL-based)
  const convertedValue = value / rate;

  // Add IOF (0.38%) for foreign currency transactions
  const valueWithIOF = convertedValue * (1 + IOF_RATE);

  return valueWithIOF;
};

/**
 * Formats a currency value for display
 * @param {number} brlValue - Value in BRL
 * @param {number} originalValue - Original value in foreign currency
 * @param {string} originalCurrency - Original currency code
 * @returns {string} - Formatted string like "R$ 100,00 (USD 20.00)"
 */
export const formatCurrencyDisplay = (brlValue, originalValue, originalCurrency) => {
  const brlFormatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(brlValue || 0);

  if (!originalCurrency || originalCurrency === 'BRL') {
    return brlFormatted;
  }

  // Format original currency
  let originalFormatted;
  try {
    originalFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: originalCurrency
    }).format(originalValue || 0);
  } catch {
    // Fallback if currency code is not recognized
    originalFormatted = `${originalCurrency} ${originalValue.toFixed(2)}`;
  }

  return `${brlFormatted} (${originalFormatted})`;
};

/**
 * Gets a short currency symbol for display
 * @param {string} currencyCode - Currency code (USD, EUR, etc.)
 * @returns {string} - Short symbol like "$", "€", etc.
 */
export const getCurrencySymbol = (currencyCode) => {
  const symbols = {
    BRL: 'R$',
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CAD: 'C$',
    AUD: 'A$',
    CHF: 'CHF',
    CNY: '¥'
  };

  return symbols[currencyCode] || currencyCode;
};
