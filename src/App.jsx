import { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Calendar from './components/Calendar';
import ListView from './components/ListView';
import MonthTabs from './components/MonthTabs';
import InvoiceYearView from './components/InvoiceYearView';

import CategoryYearView from './components/CategoryYearView';
import { parseCSV } from './utils/csvParser';
import { normalizeFixedDate, adjustToNextBusinessDay, adjustToPreviousBusinessDay, keepOriginalDate } from './utils/dateUtils';
import { fetchExchangeRates, convertToBRL, setIOFRate } from './utils/currencyUtils';
import './index.css';

// All categories available in the app
const ALL_CATEGORIES = [
  'boletos',
  'financiamentos',
  'emprestimos',
  'periodicos',
  'impostos',
  'recorrentes',
  'compras',
  'individual',
  'notas', // Invoice category
];

function App() {
  const [transactions, setTransactions] = useState([]);
  const [invoices, setInvoices] = useState([]); // Notas fiscais (receitas)
  const [accounts, setAccounts] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tabs, setTabs] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [exchangeRates, setExchangeRates] = useState(null); // Exchange rates for currency conversion
  const [providerRates, setProviderRates] = useState({ VJ: 0.14, BF: 0.14 }); // Provider specific tax rates

  // Category visibility state - Set of disabled categories
  // On mobile, 'individual' is disabled by default
  const [disabledCategories, setDisabledCategories] = useState(() => {
    if (window.innerWidth <= 768) {
      return new Set(['individual']);
    }
    return new Set();
  });

  // Toggle category visibility
  const toggleCategory = (category) => {
    setDisabledCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // Search handler
  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  // Mobile responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // View mode state: 'calendar', 'list', 'invoices', 'categories'
  const [viewMode, setViewMode] = useState('calendar');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Handle resize for responsive detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const generateTabs = (maxDate) => {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - 13, 1);
    const endDate = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);

    const newTabs = [];
    const iterDate = new Date(startDate);

    while (iterDate <= endDate || (iterDate.getMonth() === endDate.getMonth() && iterDate.getFullYear() === endDate.getFullYear())) {
      newTabs.push({
        label: iterDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        date: new Date(iterDate)
      });
      iterDate.setMonth(iterDate.getMonth() + 1);
    }
    setTabs(newTabs);

    const currentMonthTab = newTabs.find(t =>
      t.date.getMonth() === new Date().getMonth() &&
      t.date.getFullYear() === new Date().getFullYear()
    );

    if (currentMonthTab) {
      setCurrentDate(currentMonthTab.date);
    } else if (newTabs.length > 0) {
      setCurrentDate(newTabs[newTabs.length - 1].date);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load configuration variables from 'fontes' table first
        console.log('Loading configuration from fontes...');
        try {
          const { getFontesURL } = await import('./config.js');
          const fontesUrl = getFontesURL();

          // Only try to load if URL is configured (not placeholder)
          if (fontesUrl && !fontesUrl.includes('YOUR_GID_HERE')) {
            const fontesResponse = await fetch(fontesUrl);
            const fontesText = await fontesResponse.text();
            const fontesData = parseCSV(fontesText);

            // Process fontes data - look for variables
            let newVjRate = 0.14;
            let newBfRate = 0.14;
            let ratesFound = false;

            fontesData.forEach(item => {
              const variable = item.Variable ? item.Variable.trim() : '';
              const upperVar = variable.toUpperCase();

              if (upperVar === 'IOF') {
                const iofValue = parseFloat(item.Value);
                if (!isNaN(iofValue)) {
                  setIOFRate(iofValue);
                  console.log(`IOF loaded from fontes: ${(iofValue * 100).toFixed(2)}%`);
                }
              } else if (variable === 'AliquotaVJ') {
                const val = parseFloat(item.Value);
                if (!isNaN(val)) {
                  newVjRate = val / 100; // Convert 14 to 0.14
                  ratesFound = true;
                  console.log(`AliquotaVJ loaded: ${val.toFixed(2)}%`);
                }
              } else if (variable === 'AliquotaBF') {
                const val = parseFloat(item.Value);
                if (!isNaN(val)) {
                  newBfRate = val / 100; // Convert 14 to 0.14
                  ratesFound = true;
                  console.log(`AliquotaBF loaded: ${val.toFixed(2)}%`);
                }
              }
            });

            if (ratesFound) {
              setProviderRates({ VJ: newVjRate, BF: newBfRate });
            }

            console.log('Configuration loaded from fontes');
          } else {
            console.log('Fontes URL not configured, using default IOF rate');
          }
        } catch (error) {
          console.warn('Error loading fontes configuration:', error);
          console.log('Using default IOF rate');
        }

        // Fetch exchange rates
        console.log('Fetching exchange rates...');
        const rates = await fetchExchangeRates();
        setExchangeRates(rates);
        console.log('Exchange rates loaded:', rates);

        const fileNames = [
          'boletos',
          'financiamentos',
          'emprestimos',
          'periodicos',
          'impostos',
          'recorrentes',
          'compras',
          'individual',
        ];

        const fetchFile = async (name) => {
          const { getCategoryURL } = await import('./config.js');
          const url = getCategoryURL(name);
          const response = await fetch(url);
          const text = await response.text();
          return { name, content: text };
        };

        const files = await Promise.all(fileNames.map(fetchFile));

        let allData = [];
        let maxDataDate = new Date();

        for (const file of files) {
          const parsed = parseCSV(file.content);
          console.log(`Parsed ${parsed.length} items from ${file.name}`);

          parsed.forEach(item => {
            // Validate that we have a date
            if (!item.Date || typeof item.Date !== 'string') {
              console.warn(`Skipping item with invalid date in ${file.name}:`, item);
              return;
            }

            const originalDateStr = item.Date;

            // Parse date from Google Sheets format (DD/MM/YYYY)
            let y, m, d;
            if (originalDateStr.includes('/')) {
              // Google Sheets format: DD/MM/YYYY (Brazilian/European format)
              const parts = originalDateStr.split('/');
              d = parseInt(parts[0]); // Day first
              m = parseInt(parts[1]); // Month second
              y = parseInt(parts[2]); // Year third
            } else {
              // Fallback to YYYY-MM-DD format
              const parts = originalDateStr.split('-');
              y = parseInt(parts[0]);
              m = parseInt(parts[1]);
              d = parseInt(parts[2]);
            }

            // Validate parsed date components
            if (isNaN(y) || isNaN(m) || isNaN(d) || y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) {
              console.warn(`Skipping item with invalid date components in ${file.name}:`, originalDateStr, { y, m, d });
              return;
            }

            const installments = parseInt(item.Installments) || 1;

            // Safety check: limit installments to prevent infinite loops
            if (installments > 1000 || installments < 1) {
              console.warn(`Skipping item with invalid installments in ${file.name}:`, installments);
              return;
            }

            let occurrences = [];

            if (file.name === 'periodicos' || file.name === 'individual') {
              // Both 'periodicos' and 'individual' now use the 'Interval' column
              // Interval defines the payment frequency in months (1 = monthly, 12 = yearly, etc.)
              // If Interval is empty or 0, it's a one-time payment

              const intervalValue = item.Interval && item.Interval.toString().trim() !== ''
                ? parseInt(item.Interval)
                : 0;

              // Check if this is a one-time payment (Interval = 0 or empty)
              const isOneTimePayment = intervalValue === 0;

              if (!isOneTimePayment) {
                // Validate interval for recurring payments
                if (intervalValue < 1 || intervalValue > 120) {
                  console.warn(`Skipping item with invalid interval in ${file.name}:`, intervalValue);
                  return;
                }
              }

              // Create reference date from the original CSV entry
              const referenceDate = new Date(y, m - 1, d);

              if (isOneTimePayment) {
                // One-time payment: add only the reference date
                const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                occurrences.push({
                  dateStr: dateStr,
                  currentInstallment: null,
                  totalInstallments: null
                });
                console.log(`One-time payment for ${item.Beneficiary || 'item'} on ${referenceDate.toLocaleDateString('pt-BR')}`);
              } else {
                // Recurring payment: generate occurrences based on interval
                const interval = intervalValue;

                // Parse End field - can be either a date or a number (repetition count)
                let endDate = new Date(2030, 11, 31); // Default: December 31, 2030
                let maxOccurrences = null; // If set, limit to this many occurrences

                if (item.End && typeof item.End === 'string' && item.End.trim() !== '') {
                  const endValue = item.End.trim();

                  // Check if it's a number (repetition count)
                  const asNumber = parseInt(endValue);
                  const isNumeric = !isNaN(asNumber) && endValue === asNumber.toString();

                  if (isNumeric) {
                    // It's a number - use as repetition count
                    if (asNumber > 0 && asNumber <= 1000) {
                      maxOccurrences = asNumber;
                      console.log(`Repetition count for ${item.Beneficiary || 'item'}: ${maxOccurrences} times`);
                    } else {
                      console.warn(`Invalid repetition count for ${item.Beneficiary || 'item'} in ${file.name}:`, asNumber);
                    }
                  } else if (endValue.includes('/') || endValue.includes('-')) {
                    // It's a date - parse it
                    let endY, endM, endD;
                    if (endValue.includes('/')) {
                      // DD/MM/YYYY format
                      const parts = endValue.split('/');
                      endD = parseInt(parts[0]);
                      endM = parseInt(parts[1]);
                      endY = parseInt(parts[2]);
                    } else {
                      // YYYY-MM-DD format
                      const parts = endValue.split('-');
                      endY = parseInt(parts[0]);
                      endM = parseInt(parts[1]);
                      endD = parseInt(parts[2]);
                    }

                    // Validate parsed End date components
                    if (!isNaN(endY) && !isNaN(endM) && !isNaN(endD) &&
                      endY >= 1900 && endY <= 2100 && endM >= 1 && endM <= 12 && endD >= 1 && endD <= 31) {
                      endDate = new Date(endY, endM - 1, endD);
                      console.log(`End date for ${item.Beneficiary || 'item'}: ${endDate.toLocaleDateString('pt-BR')}`);
                    } else {
                      console.warn(`Invalid End date for ${item.Beneficiary || 'item'} in ${file.name}:`, item.End);
                    }
                  } else {
                    console.warn(`Invalid End value for ${item.Beneficiary || 'item'} in ${file.name}:`, item.End);
                  }
                }

                let currentDate = new Date(referenceDate);
                let occurrenceCount = 0;

                // Generate occurrences based on either end date or max occurrences
                while (currentDate <= endDate) {
                  // If maxOccurrences is set, check if we've reached the limit
                  if (maxOccurrences !== null && occurrenceCount >= maxOccurrences) {
                    break;
                  }

                  const occYear = currentDate.getFullYear();
                  const occMonth = currentDate.getMonth() + 1;
                  const occDay = currentDate.getDate();

                  const dateStr = `${occYear}-${String(occMonth).padStart(2, '0')}-${String(occDay).padStart(2, '0')}`;
                  occurrences.push({
                    dateStr: dateStr,
                    currentInstallment: null,
                    totalInstallments: null
                  });

                  occurrenceCount++;

                  // Move to next occurrence by adding 'interval' months
                  currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + interval, currentDate.getDate());
                }
              }
            } else if (file.name === 'recorrentes') {
              // Create reference date from the original CSV entry
              const referenceDate = new Date(y, m - 1, d);

              const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
              years.forEach(year => {
                for (let month = 1; month <= 12; month++) {
                  // Create candidate date for this occurrence
                  const candidateDate = new Date(year, month - 1, d);

                  // Only add occurrence if candidate date is >= reference date
                  if (candidateDate >= referenceDate) {
                    const mStr = String(month).padStart(2, '0');
                    const dStr = String(d).padStart(2, '0');
                    const dateStr = `${year}-${mStr}-${dStr}`;
                    occurrences.push({
                      dateStr: dateStr,
                      currentInstallment: null,
                      totalInstallments: null
                    });
                  }
                }
              });
            } else if (file.name === 'financiamentos' || file.name === 'emprestimos') {
              for (let i = 0; i < installments; i++) {
                const targetDate = new Date(y, m - 1 + i, 1);
                const targetYear = targetDate.getFullYear();
                const targetMonth = targetDate.getMonth() + 1;

                const iDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

                occurrences.push({
                  dateStr: iDateStr,
                  currentInstallment: i + 1,
                  totalInstallments: installments
                });
              }
            } else {
              // For regular categories (boletos, impostos), use the parsed date in YYYY-MM-DD format
              const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              occurrences.push({ dateStr: dateStr, currentInstallment: null, totalInstallments: null });
            }

            occurrences.forEach(occ => {
              let adjustedDate;

              if (file.name === 'financiamentos' || file.name === 'emprestimos') {
                adjustedDate = normalizeFixedDate(occ.dateStr);
              } else {
                adjustedDate = new Date(occ.dateStr + 'T12:00:00');
              }

              // Apply date adjustment based on table type
              if (file.name === 'boletos' || file.name === 'emprestimos' || file.name === 'financiamentos') {
                // Move to next business day if weekend/holiday
                adjustedDate = adjustToNextBusinessDay(adjustedDate);
              } else if (file.name === 'impostos' || file.name === 'recorrentes') {
                // Move to previous business day if weekend/holiday
                adjustedDate = adjustToPreviousBusinessDay(adjustedDate);
              } else if (file.name === 'periodicos' || file.name === 'individual') {
                // Keep original date (no adjustment)
                adjustedDate = keepOriginalDate(adjustedDate);
              }

              if (file.name !== 'periodicos' && file.name !== 'recorrentes' && file.name !== 'individual') {
                if (adjustedDate > maxDataDate) {
                  maxDataDate = adjustedDate;
                }
              }

              if (file.name === 'recorrentes') {
                const isDuplicate = allData.some(existing =>
                  existing.category !== 'recorrentes' &&
                  existing.Beneficiary === item.Beneficiary &&
                  existing.date.getMonth() === adjustedDate.getMonth() &&
                  existing.date.getFullYear() === adjustedDate.getFullYear()
                );
                if (isDuplicate) return;
              }

              const originalCurrency = item.currency || 'BRL';
              const originalValue = item.originalValue || item.Value || 0;
              const valueInBRL = originalCurrency === 'BRL'
                ? originalValue
                : convertToBRL(originalValue, originalCurrency, rates);

              // Normalize Beneficiary field for compras category
              // For 'compras', use 'Item' field as the display name (max 20 chars)
              let beneficiaryName;
              let fullName; // Store full name for detail panel

              if (file.name === 'compras') {
                const itemName = item.Item || item.Beneficiary || 'Item não especificado';
                fullName = itemName; // Keep full name for detail panel
                // Truncate to 20 characters for calendar/list display
                beneficiaryName = itemName.length > 20
                  ? itemName.substring(0, 20) + '...'
                  : itemName;
              } else {
                beneficiaryName = item.Beneficiary || 'Não especificado';
                fullName = beneficiaryName; // Same for other categories
              }

              allData.push({
                ...item,
                Beneficiary: beneficiaryName, // Truncated name for calendar/list
                FullName: fullName, // Full name for detail panel
                originalDate: occ.dateStr,
                date: adjustedDate,
                category: file.name,
                id: Math.random().toString(36).substr(2, 9),
                currentInstallment: occ.currentInstallment,
                totalInstallments: occ.totalInstallments,
                // Currency fields
                currency: originalCurrency,
                originalValue: originalValue,
                Value: valueInBRL // Always store BRL value for calculations
              });
            });
          });
        }
        setTransactions(allData);

        // Load invoices (notas fiscais)
        const { getNotasURL } = await import('./config.js');
        try {
          const notasUrl = getNotasURL();
          // Only try to load if URL is configured (not placeholder)
          if (!notasUrl.includes('YOUR_GID_HERE')) {
            const notasResponse = await fetch(notasUrl);
            const notasText = await notasResponse.text();
            const notasData = parseCSV(notasText);

            // Parse and process notas data
            const processedNotas = notasData.map(nota => {
              if (!nota.Date || typeof nota.Date !== 'string') {
                console.warn('Skipping nota with invalid date:', nota);
                return null;
              }

              // Parse date from Google Sheets format (DD/MM/YYYY)
              let y, m, d;
              if (nota.Date.includes('/')) {
                const parts = nota.Date.split('/');
                d = parseInt(parts[0]);
                m = parseInt(parts[1]);
                y = parseInt(parts[2]);
              } else {
                const parts = nota.Date.split('-');
                y = parseInt(parts[0]);
                m = parseInt(parts[1]);
                d = parseInt(parts[2]);
              }

              if (isNaN(y) || isNaN(m) || isNaN(d)) {
                console.warn('Skipping nota with invalid date components:', nota.Date);
                return null;
              }

              const date = new Date(y, m - 1, d, 12, 0, 0);

              // Currency is already detected and stored by parseCSV
              const originalCurrency = nota.currency || 'BRL';
              const originalValue = nota.originalValue || nota.Value || 0;
              const valueInBRL = originalCurrency === 'BRL'
                ? originalValue
                : convertToBRL(originalValue, originalCurrency, rates);

              return {
                ...nota,
                date,
                Value: valueInBRL, // Normalize to 'Value' in BRL
                currency: originalCurrency,
                originalValue: originalValue,
                id: Math.random().toString(36).substr(2, 9)
              };
            }).filter(nota => nota !== null);

            setInvoices(processedNotas);
            console.log(`Loaded ${processedNotas.length} invoices (notas)`);
          } else {
            console.log('Notas URL not configured yet. Please update config.js with the correct gid.');
          }
        } catch (error) {
          console.warn('Error loading invoices (notas):', error);
        }

        const { getAccountsURL } = await import('./config.js');
        const accountsUrl = getAccountsURL();
        const contasResponse = await fetch(accountsUrl);
        const contasText = await contasResponse.text();
        const accountsData = parseCSV(contasText);
        setAccounts(accountsData);

        generateTabs(maxDataDate);

      } catch (error) {
        console.error("Error loading data from Google Sheets:", error);
      }
    };

    loadData();
  }, []);

  // Helper function to check if an item matches the search query
  const matchesSearch = (item, query, isInvoice = false) => {
    if (!query || query.trim() === '') return true;

    const searchLower = query.toLowerCase();
    const formatCurrency = (val) => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    };
    const formatDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      return d.toLocaleDateString('pt-BR');
    };

    // Define category names for search
    const categoryNames = {
      'boletos': 'Boletos',
      'financiamentos': 'Financiamentos',
      'emprestimos': 'Empréstimos',
      'periodicos': 'Periódicos',
      'impostos': 'Impostos',
      'manual': 'Manual',
      'recorrentes': 'Recorrentes',
      'compras': 'Compras',
      'individual': 'Individual',
    };

    if (isInvoice) {
      // Search in invoice fields
      return (
        (item.Client && item.Client.toLowerCase().includes(searchLower)) ||
        (item.Provider && item.Provider.toLowerCase().includes(searchLower)) ||
        (item.Description && item.Description.toLowerCase().includes(searchLower)) ||
        (item.Value && formatCurrency(item.Value).toLowerCase().includes(searchLower)) ||
        (item.date && formatDate(item.date).includes(searchLower))
      );
    } else {
      // Search in transaction fields
      return (
        (item.Beneficiary && item.Beneficiary.toLowerCase().includes(searchLower)) ||
        (item.Description && item.Description.toLowerCase().includes(searchLower)) ||
        (item.Value && formatCurrency(item.Value).toLowerCase().includes(searchLower)) ||
        (item.category && item.category.toLowerCase().includes(searchLower)) ||
        (item.category && categoryNames[item.category] && categoryNames[item.category].toLowerCase().includes(searchLower)) ||
        (item.date && formatDate(item.date).includes(searchLower))
      );
    }
  };

  // Filter transactions based on disabled categories and search query
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => !disabledCategories.has(t.category))
      .filter(t => matchesSearch(t, searchQuery, false));
  }, [transactions, disabledCategories, searchQuery]);

  // Filter invoices based on disabled categories and search query
  const filteredInvoices = useMemo(() => {
    if (disabledCategories.has('notas')) return [];
    return invoices.filter(inv => matchesSearch(inv, searchQuery, true));
  }, [invoices, disabledCategories, searchQuery]);

  // Calculate remaining to pay for current month
  const remainingToPay = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Filter transactions for the current displayed month
    const currentMonthPayments = filteredTransactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    });

    // Calculate past days payments (not counting today)
    const pastDaysPayments = currentMonthPayments.filter(t => {
      const tDate = new Date(t.date);
      tDate.setHours(0, 0, 0, 0);
      return tDate < today;
    });


    const monthTotal = currentMonthPayments
      .reduce((acc, p) => acc + (parseFloat(p.Value) || 0), 0);
    const paidTotal = pastDaysPayments
      .reduce((acc, p) => acc + (parseFloat(p.Value) || 0), 0);

    return monthTotal - paidTotal;
  }, [filteredTransactions, currentDate]);

  const handleTabClick = (date) => {
    setCurrentDate(date);
  };

  const [selectedPayment, setSelectedPayment] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handlePaymentClick = (item) => {
    // Check if it's an invoice (has Provider field) or a payment
    if (item.Provider) {
      // It's an invoice
      setSelectedInvoice(item);
      setSelectedPayment(null);
    } else {
      // It's a payment
      setSelectedPayment(item);
      setSelectedInvoice(null);
    }

    // Open sidebar on mobile when an item is clicked
    if (isMobile) {
      setIsSidebarOpen(true);
    }
  };

  const handleClearSelection = () => {
    setSelectedPayment(null);
    setSelectedInvoice(null);
  };

  const handleOpenSidebar = () => {
    setIsSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };


  return (
    <div className="app-container">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sidebar
          accounts={accounts}
          remainingToPay={remainingToPay}
          selectedPayment={selectedPayment}
          selectedInvoice={selectedInvoice}
          onBack={handleClearSelection}
          isMobile={false}
          categories={ALL_CATEGORIES}
          disabledCategories={disabledCategories}
          onToggleCategory={toggleCategory}
          searchQuery={searchQuery}
          onSearch={handleSearch}
        />
      )}

      <main className="main-content">
        <div className="main-header">
          <MonthTabs
            tabs={tabs}
            activeDate={currentDate}
            onTabClick={handleTabClick}
          />
          {!isMobile && (
            <div className="view-mode-selector">
              <button
                className={`view-mode-btn ${viewMode === 'calendar' ? 'active' : ''}`}
                onClick={() => setViewMode('calendar')}
                title="Calendário"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>Calendário</span>
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="Lista"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
                <span>Lista</span>
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'invoices' ? 'active' : ''}`}
                onClick={() => setViewMode('invoices')}
                title="Notas do Ano"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <line x1="10" y1="9" x2="8" y2="9"></line>
                </svg>
                <span>Notas</span>
              </button>

              <button
                className={`view-mode-btn ${viewMode === 'categories' ? 'active' : ''}`}
                onClick={() => setViewMode('categories')}
                title="Categorias por Ano"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                <span>Categorias</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile View Navigation */}
        {isMobile && (
          <div className="mobile-view-tabs">
            <button
              className={`mobile-view-tab ${viewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              📅 Calendário
            </button>
            <button
              className={`mobile-view-tab ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              📋 Lista
            </button>
            <button
              className={`mobile-view-tab ${viewMode === 'invoices' ? 'active' : ''}`}
              onClick={() => setViewMode('invoices')}
            >
              📄 Notas
            </button>

            <button
              className={`mobile-view-tab ${viewMode === 'categories' ? 'active' : ''}`}
              onClick={() => setViewMode('categories')}
            >
              📊 Categorias
            </button>
          </div>
        )}

        {viewMode === 'calendar' ? (
          <Calendar
            year={currentDate.getFullYear()}
            month={currentDate.getMonth()}
            transactions={filteredTransactions}
            invoices={filteredInvoices}
            onPaymentClick={handlePaymentClick}
          />
        ) : viewMode === 'list' ? (
          <ListView
            year={currentDate.getFullYear()}
            month={currentDate.getMonth()}
            transactions={filteredTransactions}
            invoices={filteredInvoices}
            onPaymentClick={handlePaymentClick}
          />
        ) : viewMode === 'invoices' ? (
          <InvoiceYearView invoices={invoices} providerRates={providerRates} />
        ) : (
          <CategoryYearView transactions={filteredTransactions} />
        )
        }
      </main >

      {/* Mobile Sidebar (Bottom Sheet) */}
      {isMobile && (
        <Sidebar
          accounts={accounts}
          remainingToPay={remainingToPay}
          selectedPayment={selectedPayment}
          selectedInvoice={selectedInvoice}
          onBack={handleClearSelection}
          isMobile={true}
          isOpen={isSidebarOpen}
          onClose={handleCloseSidebar}
          categories={ALL_CATEGORIES}
          disabledCategories={disabledCategories}
          onToggleCategory={toggleCategory}
          searchQuery={searchQuery}
          onSearch={handleSearch}
        />
      )}

      {/* Mobile Floating Action Button to open sidebar */}
      {isMobile && !isSidebarOpen && (
        <button className="mobile-fab" onClick={handleOpenSidebar} title="Ver Contas">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor" />
            <path d="M11.5 8.5H10.5V7H13.5V8.5H12.5V11.5H14.5C15.33 11.5 16 12.17 16 13V15.5C16 16.33 15.33 17 14.5 17H13.5V18.5H10.5V17H11.5V14H9.5C8.67 14 8 13.33 8 12.5V10C8 9.17 8.67 8.5 9.5 8.5H11.5V8.5ZM10 10V12.5H12V10H10ZM12 14V16.5H14V14H12Z" fill="currentColor" />
          </svg>
        </button>
      )}

    </div >
  );
}

export default App;

