import { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Calendar from './components/Calendar';
import MonthTabs from './components/MonthTabs';
import { parseCSV } from './utils/csvParser';
import { normalizeFixedDate, adjustToBusinessDay } from './utils/dateUtils';
import { calculateTotals } from './utils/financials';
import './index.css';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tabs, setTabs] = useState([]);

  // Mobile responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

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
          'recorrentes'
        ];

        const fetchFile = async (name) => {
          const response = await fetch(`${name}.csv`);
          const text = await response.text();
          return { name, content: text };
        };

        const files = await Promise.all(fileNames.map(fetchFile));

        let allData = [];
        let maxDataDate = new Date();

        for (const file of files) {
          const parsed = parseCSV(file.content);

          parsed.forEach(item => {
            const originalDateStr = item.Date;
            const [y, m, d] = originalDateStr.split('-').map(Number);
            const installments = parseInt(item.Installments) || 1;

            let occurrences = [];

            if (file.name === 'anuais') {
              [2025, 2026, 2027, 2028, 2029, 2030].forEach(year => {
                occurrences.push({
                  dateStr: `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
                  currentInstallment: null,
                  totalInstallments: null
                });
              });
            } else if (file.name === 'recorrentes') {
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
              occurrences.push({ dateStr: originalDateStr, currentInstallment: null, totalInstallments: null });
            }

            occurrences.forEach(occ => {
              let adjustedDate;

              if (file.name === 'financiamentos' || file.name === 'emprestimos') {
                adjustedDate = normalizeFixedDate(occ.dateStr);
              } else {
                adjustedDate = new Date(occ.dateStr + 'T12:00:00');
              }

              adjustedDate = adjustToBusinessDay(adjustedDate);

              if (file.name !== 'anuais' && file.name !== 'recorrentes') {
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

        const contasResponse = await fetch('contas.csv');
        const contasText = await contasResponse.text();
        const accountsData = parseCSV(contasText);
        setAccounts(accountsData);

        generateTabs(maxDataDate);

      } catch (error) {
        console.error("Error loading CSVs:", error);
      }
    };

    loadData();
  }, []);

  const totals = useMemo(() => {
    return calculateTotals(transactions);
  }, [transactions]);

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
        />
      )}

      <main className="main-content">
        <MonthTabs
          tabs={tabs}
          activeDate={currentDate}
          onTabClick={handleTabClick}
        />
        <Calendar
          year={currentDate.getFullYear()}
          month={currentDate.getMonth()}
          transactions={transactions}
          onPaymentClick={handlePaymentClick}
        />
      </main>


    </div>
  );
}

export default App;
