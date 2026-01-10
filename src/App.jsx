import { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Calendar from './components/Calendar';
import ListView from './components/ListView';
import MonthTabs from './components/MonthTabs';
import InvoiceYearView from './components/InvoiceYearView';
import TaxEstimateView from './components/TaxEstimateView';
import { parseCSV } from './utils/csvParser';
import { normalizeFixedDate, adjustToBusinessDay } from './utils/dateUtils';
import './index.css';

// All categories available in the app
const ALL_CATEGORIES = [
  'boletos',
  'financiamentos',
  'emprestimos',
  'anuais',
  'impostos',
  'recorrentes',
  'mensais',
  'proprio',
  'notas', // Invoice category
  'lila',
];

function App() {
  const [transactions, setTransactions] = useState([]);
  const [invoices, setInvoices] = useState([]); // Notas fiscais (receitas)
  const [accounts, setAccounts] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tabs, setTabs] = useState([]);

  // Category visibility state - Set of disabled categories
  // 'lila' is always disabled by default (on all devices)
  // On mobile, 'proprio' is also disabled by default
  const [disabledCategories, setDisabledCategories] = useState(() => {
    if (window.innerWidth <= 768) {
      return new Set(['proprio', 'lila']);
    }
    return new Set(['lila']);
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

  // View mode state: 'calendar', 'list', 'invoices', 'taxes'
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
        const fileNames = [
          'boletos',
          'financiamentos',
          'emprestimos',
          'anuais',
          'impostos',
          'recorrentes',
          'mensais',
          'lila',
          'proprio'
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

            if (file.name === 'anuais') {
              [2025, 2026, 2027, 2028, 2029, 2030].forEach(year => {
                occurrences.push({
                  dateStr: `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
                  currentInstallment: null,
                  totalInstallments: null
                });
              });
            } else if (file.name === 'recorrentes' || file.name === 'mensais' || file.name === 'lila' || file.name === 'proprio') {
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

              adjustedDate = adjustToBusinessDay(adjustedDate);

              if (file.name !== 'anuais' && file.name !== 'recorrentes' && file.name !== 'mensais' && file.name !== 'lila' && file.name !== 'proprio') {
                if (adjustedDate > maxDataDate) {
                  maxDataDate = adjustedDate;
                }
              }

              if (file.name === 'recorrentes') {
                const isDuplicate = allData.some(existing =>
                  existing.category !== 'recorrentes' &&
                  existing.Beneficiary === item.Beneficiary &&
                  existing.date.getTime() === adjustedDate.getTime()
                );
                if (isDuplicate) return;
              }

              allData.push({
                ...item,
                originalDate: occ.dateStr,
                date: adjustedDate,
                category: file.name,
                id: Math.random().toString(36).substr(2, 9),
                currentInstallment: occ.currentInstallment,
                totalInstallments: occ.totalInstallments
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

              // Handle both 'Value' and 'Valor' column names
              const rawValue = nota.Value || nota.Valor || '0';
              const parsedValue = parseFloat(
                typeof rawValue === 'string'
                  ? rawValue.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
                  : rawValue
              ) || 0;

              return {
                ...nota,
                date,
                Value: parsedValue, // Normalize to 'Value'
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
      'anuais': 'Anuais',
      'impostos': 'Impostos',
      'manual': 'Manual',
      'recorrentes': 'Recorrentes',
      'mensais': 'Mensais Fixos',
      'lila': 'Lila',
      'proprio': 'Próprio'
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


    // Exclude 'lila' category from month and paid totals
    const monthTotal = currentMonthPayments
      .filter(p => p.category !== 'lila')
      .reduce((acc, p) => acc + (parseFloat(p.Value) || 0), 0);
    const paidTotal = pastDaysPayments
      .filter(p => p.category !== 'lila')
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
                className={`view-mode-btn ${viewMode === 'taxes' ? 'active' : ''}`}
                onClick={() => setViewMode('taxes')}
                title="Impostos Estimados"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                <span>Impostos</span>
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
              className={`mobile-view-tab ${viewMode === 'taxes' ? 'active' : ''}`}
              onClick={() => setViewMode('taxes')}
            >
              💰 Impostos
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
          <InvoiceYearView invoices={invoices} />
        ) : (
          <TaxEstimateView invoices={invoices} />
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
