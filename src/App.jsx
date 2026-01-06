import { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Calendar from './components/Calendar';
import ListView from './components/ListView';
import MonthTabs from './components/MonthTabs';
import { parseCSV } from './utils/csvParser';
import { normalizeFixedDate, adjustToBusinessDay } from './utils/dateUtils';
import { calculateTotals } from './utils/financials';
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
  'lila',
  'bruno'
];

function App() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tabs, setTabs] = useState([]);

  // Category visibility state - Set of disabled categories
  // On mobile, disable 'bruno' and 'lila' by default
  const [disabledCategories, setDisabledCategories] = useState(() => {
    if (window.innerWidth <= 768) {
      return new Set(['bruno', 'lila']);
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

  // Mobile responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // View mode state: 'calendar' or 'list'
  const [viewMode, setViewMode] = useState('calendar');

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
          'bruno'
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
            } else if (file.name === 'recorrentes' || file.name === 'mensais' || file.name === 'lila' || file.name === 'bruno') {
              const years = [2024, 2025, 2026, 2027, 2028, 2029, 2030];
              years.forEach(year => {
                for (let month = 1; month <= 12; month++) {
                  const mStr = String(month).padStart(2, '0');
                  const dStr = String(d).padStart(2, '0');
                  const dateStr = `${year}-${mStr}-${dStr}`;
                  occurrences.push({
                    dateStr: dateStr,
                    currentInstallment: null,
                    totalInstallments: null
                  });
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

              if (file.name !== 'anuais' && file.name !== 'recorrentes' && file.name !== 'mensais' && file.name !== 'lila' && file.name !== 'bruno') {
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

  // Filter transactions based on disabled categories
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => !disabledCategories.has(t.category));
  }, [transactions, disabledCategories]);

  const totals = useMemo(() => {
    return calculateTotals(filteredTransactions);
  }, [filteredTransactions]);

  const handleTabClick = (date) => {
    setCurrentDate(date);
  };

  const [selectedPayment, setSelectedPayment] = useState(null);

  const handlePaymentClick = (payment) => {
    setSelectedPayment(payment);
  };

  const handleClearSelection = () => {
    setSelectedPayment(null);
  };


  return (
    <div className="app-container">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sidebar
          accounts={accounts}
          selectedPayment={selectedPayment}
          onBack={handleClearSelection}
          isMobile={false}
          categories={ALL_CATEGORIES}
          disabledCategories={disabledCategories}
          onToggleCategory={toggleCategory}
        />
      )}

      <main className="main-content">
        <div className="main-header">
          <MonthTabs
            tabs={tabs}
            activeDate={currentDate}
            onTabClick={handleTabClick}
            viewMode={viewMode}
            onToggleView={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}
          />
          {!isMobile && (
            <button
              className={`view-toggle-btn ${viewMode}`}
              onClick={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}
              title={viewMode === 'calendar' ? 'Ver como lista' : 'Ver como calendário'}
            >
              {viewMode === 'calendar' ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="8" y1="6" x2="21" y2="6"></line>
                    <line x1="8" y1="12" x2="21" y2="12"></line>
                    <line x1="8" y1="18" x2="21" y2="18"></line>
                    <line x1="3" y1="6" x2="3.01" y2="6"></line>
                    <line x1="3" y1="12" x2="3.01" y2="12"></line>
                    <line x1="3" y1="18" x2="3.01" y2="18"></line>
                  </svg>
                  <span>Lista</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span>Calendário</span>
                </>
              )}
            </button>
          )}
        </div>
        {viewMode === 'calendar' ? (
          <Calendar
            year={currentDate.getFullYear()}
            month={currentDate.getMonth()}
            transactions={filteredTransactions}
            onPaymentClick={handlePaymentClick}
          />
        ) : (
          <ListView
            year={currentDate.getFullYear()}
            month={currentDate.getMonth()}
            transactions={filteredTransactions}
            onPaymentClick={handlePaymentClick}
          />
        )}
      </main>


    </div>
  );
}

export default App;
