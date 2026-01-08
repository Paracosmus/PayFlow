import { useMemo } from 'react';
import { isHoliday } from '../utils/dateUtils';
import { getAbbreviatedName } from '../utils/nameUtils';
import './ListView.css';

export default function ListView({ year, month, transactions, invoices = [], onPaymentClick }) {
    // Filter transactions for current month only
    const currentMonthPayments = useMemo(() => {
        return transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getMonth() === month && tDate.getFullYear() === year;
        }).sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [transactions, month, year]);

    // Filter invoices for current month
    const currentMonthInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const invDate = new Date(inv.date);
            return invDate.getMonth() === month && invDate.getFullYear() === year;
        }).sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [invoices, month, year]);

    // Group payments and invoices by date
    const paymentsByDate = useMemo(() => {
        const grouped = {};

        // Add invoices first
        currentMonthInvoices.forEach(inv => {
            const dateKey = new Date(inv.date).toDateString();
            if (!grouped[dateKey]) {
                grouped[dateKey] = { date: new Date(inv.date), invoices: [], payments: [] };
            }
            grouped[dateKey].invoices.push(inv);
        });

        // Add payments
        currentMonthPayments.forEach(p => {
            const dateKey = new Date(p.date).toDateString();
            if (!grouped[dateKey]) {
                grouped[dateKey] = { date: new Date(p.date), invoices: [], payments: [] };
            }
            grouped[dateKey].payments.push(p);
        });

        return Object.values(grouped).sort((a, b) => a.date - b.date);
    }, [currentMonthPayments, currentMonthInvoices]);

    // Group days into weeks (Sunday-Saturday) based on calendar weeks
    const weeklyGroups = useMemo(() => {
        if (paymentsByDate.length === 0) return [];

        // Helper to get the start of week (Sunday) for a given date
        const getWeekStart = (date) => {
            const d = new Date(date);
            const day = d.getDay();
            const diff = d.getDate() - day; // Subtract days to get to Sunday
            return new Date(d.getFullYear(), d.getMonth(), diff);
        };

        // Helper to get the end of week (Saturday) for a given date
        const getWeekEnd = (date) => {
            const d = new Date(date);
            const day = d.getDay();
            const diff = d.getDate() + (6 - day); // Add days to get to Saturday
            return new Date(d.getFullYear(), d.getMonth(), diff);
        };

        // Group by calendar week
        const weekMap = new Map();

        paymentsByDate.forEach((dayData) => {
            const weekStart = getWeekStart(dayData.date);
            const weekKey = weekStart.toISOString().split('T')[0]; // Use ISO date as key

            if (!weekMap.has(weekKey)) {
                weekMap.set(weekKey, {
                    startDate: weekStart,
                    endDate: getWeekEnd(dayData.date),
                    days: [],
                    total: 0
                });
            }

            const week = weekMap.get(weekKey);
            const dayTotal = dayData.payments.reduce((acc, p) => acc + (parseFloat(p.Value) || 0), 0);
            week.days.push({ ...dayData, total: dayTotal });
            week.total += dayTotal;
        });

        // Convert map to array and sort by week start date
        return Array.from(weekMap.values()).sort((a, b) => a.startDate - b.startDate);
    }, [paymentsByDate]);

    // Calculate month total
    const monthTotal = currentMonthPayments.reduce((acc, p) => acc + (parseFloat(p.Value) || 0), 0);

    // Calculate remaining (unpaid) total
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const paidTotal = currentMonthPayments.filter(t => {
        const tDate = new Date(t.date);
        tDate.setHours(0, 0, 0, 0);
        return tDate < today;
    }).reduce((acc, p) => acc + (parseFloat(p.Value) || 0), 0);

    const remainingTotal = monthTotal - paidTotal;

    // Category totals
    const categoryTotals = {};
    currentMonthPayments.forEach(p => {
        if (!categoryTotals[p.category]) categoryTotals[p.category] = 0;
        categoryTotals[p.category] += (parseFloat(p.Value) || 0);
    });

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    };

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
        'bruno': 'Bruno'
    };

    const getCategoryColor = (category) => {
        const colors = {
            'boletos': '#3b82f6',
            'financiamentos': '#f59e0b',
            'emprestimos': '#ef4444',
            'anuais': '#8b5cf6',
            'impostos': '#f97316',
            'manual': '#ec4899',
            'recorrentes': '#64748b',
            'mensais': '#06b6d4',
            'lila': '#f472b6',
            'bruno': '#4ade80'
        };
        return colors[category] || '#64748b';
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit'
        });
    };

    const formatWeekRange = (startDate, endDate) => {
        const start = startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const end = endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        return `${start} - ${end}`;
    };

    return (
        <div className="list-view">
            <div className="list-view-body">
                {weeklyGroups.map((week, weekIndex) => (
                    <div key={weekIndex} className="week-group">
                        <div className="week-header">
                            <span className="week-label">Semana {weekIndex + 1}</span>
                            <span className="week-range">{formatWeekRange(week.startDate, week.endDate)}</span>
                            <span className="week-total-value">{formatCurrency(week.total)}</span>
                        </div>

                        {week.days.map((dayData, dayIndex) => {
                            const isToday = new Date().toDateString() === dayData.date.toDateString();
                            const holidayName = isHoliday(dayData.date);
                            const isWeekend = dayData.date.getDay() === 0 || dayData.date.getDay() === 6;

                            return (
                                <div key={dayIndex} className="day-group">
                                    <div className={`day-header ${isToday ? 'today' : ''} ${holidayName ? 'holiday' : ''} ${isWeekend ? 'weekend' : ''}`}>
                                        <div className="day-header-left">
                                            <span className="day-date">{formatDate(dayData.date)}</span>
                                            {holidayName && <span className="holiday-badge">★ {holidayName}</span>}
                                        </div>
                                        <span className="day-total">{formatCurrency(dayData.total)}</span>
                                    </div>

                                    <div className="day-payments">
                                        {/* Invoices first */}
                                        {dayData.invoices && dayData.invoices.map(inv => (
                                            <div
                                                key={inv.id}
                                                className="list-payment-item invoice-item"
                                                onClick={() => onPaymentClick && onPaymentClick(inv)}
                                            >
                                                <div className="payment-info">
                                                    <span className="payment-provider">{inv.Provider}</span>
                                                    <span className="payment-name">{getAbbreviatedName(inv.Client)}</span>
                                                    <span className="payment-category">Nota Fiscal</span>
                                                </div>
                                                <span className="payment-value">{formatCurrency(inv.Value)}</span>
                                            </div>
                                        ))}
                                        {/* Payments after */}
                                        {dayData.payments.map(p => (
                                            <div
                                                key={p.id}
                                                className={`list-payment-item category-${p.category}`}
                                                onClick={() => onPaymentClick && onPaymentClick(p)}
                                            >
                                                <div className="payment-info">
                                                    <span
                                                        className="payment-dot"
                                                        style={{ backgroundColor: getCategoryColor(p.category) }}
                                                    />
                                                    <span className="payment-name">{p.Beneficiary}</span>
                                                    {p.totalInstallments && (
                                                        <span className="payment-installment">
                                                            [{p.currentInstallment}/{p.totalInstallments}]
                                                        </span>
                                                    )}
                                                    <span className="payment-category">{categoryNames[p.category] || p.category}</span>
                                                </div>
                                                {p.category !== 'recorrentes' && (
                                                    <span className="payment-value">{formatCurrency(p.Value)}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}

                {weeklyGroups.length === 0 && (
                    <div className="no-payments">
                        Nenhum pagamento neste mês
                    </div>
                )}
            </div>

            {/* Footer with totals */}
            <div className="list-view-footer">
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
    );
}
