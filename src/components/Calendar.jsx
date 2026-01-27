import { useState, useEffect, useRef } from 'react';
import { getCalendarDays, isHoliday } from '../utils/dateUtils';
import { getAbbreviatedName } from '../utils/nameUtils';
import './Calendar.css';

export default function Calendar({ year, month, transactions, invoices = [], onPaymentClick }) {
    const days = getCalendarDays(year, month);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [selectedDay, setSelectedDay] = useState(null);

    // Track previous month/year to detect actual month changes
    const prevMonthRef = useRef({ month, year });

    // Reset selected day only when month actually changes
    useEffect(() => {
        if (prevMonthRef.current.month !== month || prevMonthRef.current.year !== year) {
            // Month changed - auto-select today or first day of month
            if (isMobile) {
                const today = new Date();
                if (today.getMonth() === month && today.getFullYear() === year) {
                    const todayDay = days.find(d =>
                        d.isCurrentMonth &&
                        d.date.getDate() === today.getDate()
                    );
                    setSelectedDay(todayDay || days.find(d => d.isCurrentMonth));
                } else {
                    setSelectedDay(days.find(d => d.isCurrentMonth));
                }
            }
            prevMonthRef.current = { month, year };
        } else if (isMobile && !selectedDay) {
            // Initial load on mobile - select today or first day
            const today = new Date();
            if (today.getMonth() === month && today.getFullYear() === year) {
                const todayDay = days.find(d =>
                    d.isCurrentMonth &&
                    d.date.getDate() === today.getDate()
                );
                setSelectedDay(todayDay || days.find(d => d.isCurrentMonth));
            } else {
                setSelectedDay(days.find(d => d.isCurrentMonth));
            }
        }
    }, [month, year, isMobile, days, selectedDay]);

    // Handle resize for responsive detection
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Group days into weeks of 7
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7));
    }

    // Helper to find payments for a day
    const getPaymentsForDay = (date) => {
        return transactions.filter(t => {
            const tDate = new Date(t.date);
            return (
                tDate.getDate() === date.getDate() &&
                tDate.getMonth() === date.getMonth() &&
                tDate.getFullYear() === date.getFullYear()
            );
        });
    };

    // Helper to find invoices for a day
    const getInvoicesForDay = (date) => {
        return invoices.filter(inv => {
            const invDate = new Date(inv.date);
            return (
                invDate.getDate() === date.getDate() &&
                invDate.getMonth() === date.getMonth() &&
                invDate.getFullYear() === date.getFullYear()
            );
        });
    };

    const getWeekTotal = (weekDays) => {
        let total = 0;
        weekDays.forEach(day => {
            const payments = getPaymentsForDay(day.date);
            payments.forEach(p => {
                total += (parseFloat(p.Value) || 0);
            });
        });
        return total;
    };

    const formatCurrency = (val, item = null) => {
        const brlFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

        // If item has currency info and it's not BRL, show both currencies
        if (item && item.currency && item.currency !== 'BRL' && item.originalValue) {
            let originalFormatted;
            try {
                originalFormatted = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: item.currency
                }).format(item.originalValue);
            } catch {
                // Fallback if currency code is not recognized
                originalFormatted = `${item.currency} ${item.originalValue.toFixed(2)}`;
            }
            return `${brlFormatted} (${originalFormatted})`;
        }

        return brlFormatted;
    };

    const weekDayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const weekDayNamesShort = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

    // Calculate category totals - STRICTLY for current month
    const currentMonthPayments = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === month && tDate.getFullYear() === year;
    });

    const categoryTotals = {};
    currentMonthPayments.forEach(p => {
        if (!categoryTotals[p.category]) categoryTotals[p.category] = 0;
        categoryTotals[p.category] += (parseFloat(p.Value) || 0);
    });

    // Calculate remaining total (total - past days payments, not counting today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastDaysPayments = currentMonthPayments.filter(t => {
        const tDate = new Date(t.date);
        tDate.setHours(0, 0, 0, 0);
        return tDate < today;
    });

    const monthTotal = currentMonthPayments
        .reduce((acc, p) => acc + (parseFloat(p.Value) || 0), 0);
    const paidTotal = pastDaysPayments
        .reduce((acc, p) => acc + (parseFloat(p.Value) || 0), 0);
    const remainingTotal = monthTotal - paidTotal;

    const categoryNames = {
        'boletos': 'Boletos',
        'financiamentos': 'Financiamentos',
        'emprestimos': 'Empréstimos',
        'periodicos': 'Periódicos',
        'impostos': 'Impostos',
        'manual': 'Manual',
        'recorrentes': 'Recorrentes',
        'compras': 'Compras',
        'folha': 'Folha de Pagamento',
        'individual': 'Individual',
    };

    // Get category colors for dots
    const getCategoryColor = (category) => {
        const colors = {
            'boletos': '#3b82f6',
            'financiamentos': '#f59e0b',
            'emprestimos': '#ef4444',
            'periodicos': '#8b5cf6',
            'impostos': '#f97316',
            'manual': '#ec4899',
            'recorrentes': '#64748b',
            'compras': '#FFE600',
            'folha': '#db2777',
            'individual': '#06b6d4',
        };
        return colors[category] || '#64748b';
    };

    // Check if date is the same as selected
    const isSameDay = (date1, date2) => {
        if (!date1 || !date2) return false;
        return date1.getDate() === date2.getDate() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear();
    };

    // ==========================================
    // MOBILE LAYOUT
    // ==========================================
    if (isMobile) {
        const selectedInvoices = selectedDay ? getInvoicesForDay(selectedDay.date) : [];
        const selectedPayments = selectedDay ? getPaymentsForDay(selectedDay.date) : [];
        const selectedDayTotal = selectedPayments
            .reduce((acc, p) => acc + (parseFloat(p.Value) || 0), 0);

        return (
            <div className="mobile-calendar">
                {/* Weekday Headers */}
                <div className="mobile-weekday-header">
                    {weekDayNamesShort.map((name, i) => (
                        <div key={i} className={`mobile-weekday ${i === 0 || i === 6 ? 'weekend' : ''}`}>
                            {name}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="mobile-cal-grid">
                    {days.map((dayObj, index) => {
                        const payments = getPaymentsForDay(dayObj.date);
                        const isToday = new Date().toDateString() === dayObj.date.toDateString();
                        const holidayName = isHoliday(dayObj.date);
                        const isWeekend = dayObj.date.getDay() === 0 || dayObj.date.getDay() === 6;
                        const isSelected = selectedDay && isSameDay(dayObj.date, selectedDay.date);

                        // Get unique category colors for dots (max 3)
                        const uniqueCategories = [...new Set(payments.map(p => p.category))].slice(0, 3);

                        return (
                            <div
                                key={index}
                                className={`mobile-day
                                    ${!dayObj.isCurrentMonth ? 'other-month' : ''}
                                    ${isToday ? 'today' : ''}
                                    ${holidayName ? 'holiday' : ''}
                                    ${isWeekend ? 'weekend' : ''}
                                    ${isSelected ? 'selected' : ''}
                                `}
                                onClick={() => dayObj.isCurrentMonth && setSelectedDay(dayObj)}
                                title={holidayName || ''}
                            >
                                <span className="mobile-day-number">{dayObj.date.getDate()}</span>
                                {payments.length > 0 && (
                                    <div className="mobile-day-dots">
                                        {uniqueCategories.map((cat, i) => (
                                            <span
                                                key={i}
                                                className="payment-dot"
                                                style={{ backgroundColor: getCategoryColor(cat) }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Selected Day Panel */}
                {selectedDay && (
                    <div className="day-payments-panel">
                        <div className="day-panel-header">
                            <span className="day-panel-date">
                                {selectedDay.date.toLocaleDateString('pt-BR', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long'
                                })}
                            </span>
                            {isHoliday(selectedDay.date) && (
                                <span className="day-panel-holiday">★ {isHoliday(selectedDay.date)}</span>
                            )}
                        </div>

                        {(selectedInvoices.length > 0 || selectedPayments.length > 0) ? (
                            <>
                                <div className="day-payments-list">
                                    {/* Invoices first */}
                                    {selectedInvoices.map(inv => (
                                        <div
                                            key={inv.id}
                                            className="mobile-payment-item invoice-item"
                                            onClick={() => onPaymentClick && onPaymentClick(inv)}
                                        >
                                            <div className="mobile-payment-left">
                                                <span className="mobile-payment-provider">{inv.Provider}</span>
                                                <span className="mobile-payment-name">{getAbbreviatedName(inv.Client)}</span>
                                            </div>
                                            <span className="mobile-payment-value">
                                                {formatCurrency(inv.Value, inv)}
                                            </span>
                                        </div>
                                    ))}
                                    {/* Payments after */}
                                    {selectedPayments.map(p => (
                                        <div
                                            key={p.id}
                                            className={`mobile-payment-item category-${p.category}`}
                                            onClick={() => onPaymentClick && onPaymentClick(p)}
                                        >
                                            <div className="mobile-payment-left">
                                                <span className="mobile-payment-name">{p.Beneficiary}</span>
                                                {p.totalInstallments && p.totalInstallments > 1 && (
                                                    <span className="mobile-payment-inst">
                                                        [{p.currentInstallment}/{p.totalInstallments}]
                                                    </span>
                                                )}
                                            </div>
                                            {p.category !== 'recorrentes' && (
                                                <span className="mobile-payment-value">
                                                    {formatCurrency(p.Value, p)}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {selectedPayments.length > 0 && (
                                    <div className="day-panel-total">
                                        <span>Total do dia:</span>
                                        <strong>{formatCurrency(selectedDayTotal)}</strong>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="day-no-payments">
                                Nenhum pagamento ou nota neste dia
                            </div>
                        )}
                    </div>
                )}

                {/* Month Summary Footer */}
                <div className="mobile-month-footer">
                    <div className="mobile-category-pills">
                        {Object.entries(categoryTotals)
                            .filter(([cat]) => cat !== 'recorrentes')
                            .map(([cat, val]) => (
                                <div key={cat} className={`mobile-cat-pill category-${cat}`}>
                                    <span className="cat-dot" style={{ backgroundColor: getCategoryColor(cat) }} />
                                    <span className="cat-val">{formatCurrency(val)}</span>
                                </div>
                            ))}
                    </div>
                    <div className="mobile-totals-row">
                        <div className="mobile-grand-total">
                            <span>Total Mensal</span>
                            <strong>{formatCurrency(monthTotal)}</strong>
                        </div>
                        <div className="mobile-remaining-total">
                            <span>Falta Pagar</span>
                            <strong>{formatCurrency(remainingTotal)}</strong>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // DESKTOP LAYOUT (Original)
    // ==========================================
    return (
        <div className="calendar">
            <div className="calendar-header">
                {weekDayNames.map(name => (
                    <div key={name} className="header-cell">{name}</div>
                ))}
                <div className="header-cell total-header">Total Semanal</div>
            </div>

            <div className="calendar-body">
                {weeks.map((week, wIndex) => {
                    const weekTotal = getWeekTotal(week);
                    return (
                        <div key={wIndex} className="calendar-row">
                            {week.map((dayObj, dIndex) => {
                                const dayInvoices = getInvoicesForDay(dayObj.date);
                                const payments = getPaymentsForDay(dayObj.date);
                                const isToday = new Date().toDateString() === dayObj.date.toDateString();
                                const holidayName = isHoliday(dayObj.date);
                                const isWeekend = dayObj.date.getDay() === 0 || dayObj.date.getDay() === 6;

                                return (
                                    <div
                                        key={dIndex}
                                        className={`calendar-cell ${!dayObj.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${holidayName ? 'holiday' : ''} ${isWeekend ? 'weekend' : ''}`}
                                        title={holidayName ? `Feriado: ${holidayName}` : ''}
                                    >
                                        <div className="date-number">
                                            {dayObj.date.getDate()}
                                            {holidayName && <span className="holiday-indicator" title={holidayName}>★</span>}
                                        </div>
                                        <div className="payments-list">
                                            {/* Invoices first */}
                                            {dayInvoices.map(inv => (
                                                <div
                                                    key={inv.id}
                                                    className="payment-item invoice-item"
                                                    title={`Nota (${inv.Provider}): ${inv.Client} - ${formatCurrency(inv.Value, inv)}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onPaymentClick && onPaymentClick(inv);
                                                    }}
                                                >
                                                    <div className="p-left">
                                                        <span className="p-provider">{inv.Provider}</span>
                                                        <span className="p-name">{getAbbreviatedName(inv.Client)}</span>
                                                    </div>
                                                    <span className="p-val">{formatCurrency(inv.Value, inv)}</span>
                                                </div>
                                            ))}
                                            {/* Payments after */}
                                            {payments.map(p => (
                                                <div
                                                    key={p.id}
                                                    className={`payment-item category-${p.category}`}
                                                    title={`${p.Beneficiary}: ${formatCurrency(p.Value, p)}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onPaymentClick && onPaymentClick(p);
                                                    }}
                                                >
                                                    <div className="p-left">
                                                        <span className="p-name">{p.Beneficiary}</span>
                                                        {p.totalInstallments && p.totalInstallments > 1 && (
                                                            <span className="p-inst">[{p.currentInstallment}/{p.totalInstallments}]</span>
                                                        )}
                                                    </div>
                                                    {p.category !== 'recorrentes' && (
                                                        <span className="p-val">{formatCurrency(p.Value, p)}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        {
                                            payments.length > 0 && (
                                                <div className="day-total">
                                                    {formatCurrency(payments.reduce((acc, p) => acc + (parseFloat(p.Value) || 0), 0))}
                                                </div>
                                            )
                                        }
                                    </div>
                                );
                            })}
                            <div className="calendar-cell week-total-cell">
                                <div className="week-total-label">Total Sem.</div>
                                <div className="week-total-val">{formatCurrency(weekTotal)}</div>
                            </div>
                        </div>
                    );
                })}
                <div className="month-total-footer">
                    <div className="category-breakdown">
                        {Object.entries(categoryTotals)
                            .filter(([cat]) => cat !== 'recorrentes')
                            .map(([cat, val]) => (
                                <div key={cat} className={`cat-total-badge category-${cat}`}>
                                    <span>{categoryNames[cat] || cat}:</span>
                                    <strong>{formatCurrency(val)}</strong>
                                </div>
                            ))}
                    </div>
                    <div className="totals-container">
                        <div className="grand-total">
                            <span>Total em {month + 1}/{year}: </span>
                            <span className="month-total-value">{formatCurrency(monthTotal)}</span>
                        </div>
                        <div className="remaining-total">
                            <span>Falta Pagar: </span>
                            <span className="remaining-total-value">{formatCurrency(remainingTotal)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
