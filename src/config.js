/**
 * Google Sheets Configuration
 *
 * Configure the Google Sheets published CSV URLs for each category.
 *
 * To get the URL for each sheet:
 * 1. Open your Google Sheets document
 * 2. Go to File > Share > Publish to web
 * 3. Select the specific sheet/page you want to publish
 * 4. Choose "Comma-separated values (.csv)" as the format
 * 5. Click "Publish" and copy the URL
 * 6. Paste the URL below for the corresponding category
 *
 * Each category corresponds to a sheet/page in your Google Sheets document.
 */

export const GOOGLE_SHEETS_CONFIG = {
  // Payment categories - each should have its own sheet/page in Google Sheets
  categories: {
    boletos: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0LmrW4gk7423xpxND_qp-QgyHacGH2vEGMuIE3OMF5IVW2HqL-SXPq0wtRM05q19lMvdQsviSbV5t/pub?gid=0&single=true&output=csv',
    financiamentos: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0LmrW4gk7423xpxND_qp-QgyHacGH2vEGMuIE3OMF5IVW2HqL-SXPq0wtRM05q19lMvdQsviSbV5t/pub?gid=1957297979&single=true&output=csv',
    emprestimos: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0LmrW4gk7423xpxND_qp-QgyHacGH2vEGMuIE3OMF5IVW2HqL-SXPq0wtRM05q19lMvdQsviSbV5t/pub?gid=788995271&single=true&output=csv',
    periodicos: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0LmrW4gk7423xpxND_qp-QgyHacGH2vEGMuIE3OMF5IVW2HqL-SXPq0wtRM05q19lMvdQsviSbV5t/pub?gid=328177311&single=true&output=csv',
    impostos: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0LmrW4gk7423xpxND_qp-QgyHacGH2vEGMuIE3OMF5IVW2HqL-SXPq0wtRM05q19lMvdQsviSbV5t/pub?gid=342630177&single=true&output=csv',
    recorrentes: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0LmrW4gk7423xpxND_qp-QgyHacGH2vEGMuIE3OMF5IVW2HqL-SXPq0wtRM05q19lMvdQsviSbV5t/pub?gid=2059867118&single=true&output=csv',
    compras: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0LmrW4gk7423xpxND_qp-QgyHacGH2vEGMuIE3OMF5IVW2HqL-SXPq0wtRM05q19lMvdQsviSbV5t/pub?gid=1916499634&single=true&output=csv',
    folha: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0LmrW4gk7423xpxND_qp-QgyHacGH2vEGMuIE3OMF5IVW2HqL-SXPq0wtRM05q19lMvdQsviSbV5t/pub?gid=20656715&single=true&output=csv',
    individual: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0LmrW4gk7423xpxND_qp-QgyHacGH2vEGMuIE3OMF5IVW2HqL-SXPq0wtRM05q19lMvdQsviSbV5t/pub?gid=318522136&single=true&output=csv',
  },

  // Invoices data - notas fiscais emitidas (receitas, não pagamentos)
  // TODO: Replace 'YOUR_GID_HERE' with the actual gid from your published Google Sheets page
  notas: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0LmrW4gk7423xpxND_qp-QgyHacGH2vEGMuIE3OMF5IVW2HqL-SXPq0wtRM05q19lMvdQsviSbV5t/pub?gid=522547108&single=true&output=csv',

  // Accounts data - should have its own sheet/page in Google Sheets
  accounts: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0LmrW4gk7423xpxND_qp-QgyHacGH2vEGMuIE3OMF5IVW2HqL-SXPq0wtRM05q19lMvdQsviSbV5t/pub?gid=1211932616&single=true&output=csv',

  // Fontes (sources) - configuration variables like IOF rate
  // TODO: Replace 'YOUR_GID_HERE' with the actual gid from your published Google Sheets page
  fontes: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTpfFl6fsNOsPpKFrqkSX--ATR22_0GgZ3WFKhpl0OfzXMPzFWSpq9fG_u-dJmr5YbSwWGlfyjYnfRX/pub?gid=833702603&single=true&output=csv',
};

/**
 * Get the CSV URL for a specific category
 * @param {string} categoryName - The name of the category
 * @returns {string} The Google Sheets CSV export URL
 */
export const getCategoryURL = (categoryName) => {
  const url = GOOGLE_SHEETS_CONFIG.categories[categoryName];
  if (!url) {
    throw new Error(`No Google Sheets URL configured for category: ${categoryName}`);
  }
  return url;
};

/**
 * Get the CSV URL for accounts data
 * @returns {string} The Google Sheets CSV export URL for accounts
 */
export const getAccountsURL = () => {
  return GOOGLE_SHEETS_CONFIG.accounts;
};

/**
 * Get the CSV URL for notas (invoices) data
 * @returns {string} The Google Sheets CSV export URL for notas
 */
export const getNotasURL = () => {
  return GOOGLE_SHEETS_CONFIG.notas;
};

/**
 * Get the CSV URL for fontes (configuration sources) data
 * @returns {string} The Google Sheets CSV export URL for fontes
 */
export const getFontesURL = () => {
  return GOOGLE_SHEETS_CONFIG.fontes;
};
