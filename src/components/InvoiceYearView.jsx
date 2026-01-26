import { useState, useMemo } from 'react';
import { getAvailableYears, groupInvoicesByProviderAndMonth, getProviders, compareProviders, calculateInvoiceTotal, getInvoicesByProvider, getInvoicesByYear } from '../utils/invoiceUtils';
import './InvoiceYearView.css';

export default function InvoiceYearView({ invoices }) {
    const availableYears = useMemo(() => getAvailableYears(invoices), [invoices]);
    const [selectedYear, setSelectedYear] = useState(availableYears[0] || new Date().getFullYear());
    const [expandedCells, setExpandedCells] = useState(new Set()); // Track multiple expanded cells

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    };

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    // Group data for selected year
    const yearData = useMemo(() => groupInvoicesByProviderAndMonth(invoices, selectedYear), [invoices, selectedYear]);
    const providers = useMemo(() => {
        const list = getProviders(invoices, selectedYear);
        // Sort to ensure VJ comes first, then BF
        return [...list].sort((a, b) => {
            if (a === 'VJ') return -1;
            if (b === 'VJ') return 1;
            if (a === 'BF') return -1;
            if (b === 'BF') return 1;
            return a.localeCompare(b);
        });
    }, [invoices, selectedYear]);

    // Calculate totals for each provider
    const yearTotals = useMemo(() => {
        const totals = {};
        providers.forEach(provider => {
            const yearInvoices = getInvoicesByProvider(getInvoicesByYear(invoices, selectedYear), provider);
            totals[provider] = calculateInvoiceTotal(yearInvoices);
        });
        return totals;
    }, [providers, invoices, selectedYear]);

    // Compare VJ and BF if both exist
    const vjBfComparison = useMemo(() => {
        if (providers.includes('VJ') && providers.includes('BF')) {
            return compareProviders(invoices, selectedYear, 'VJ', 'BF');
        }
        return null;
    }, [providers, invoices, selectedYear]);

    // Compare VJ and BF for the last 12 months (rolling)
    const vjBfLast12MonthsComparison = useMemo(() => {
        const allProviders = [...new Set(invoices.map(inv => inv.Provider))];

        if (allProviders.includes('VJ') && allProviders.includes('BF')) {
            const today = new Date();
            const currentYear = today.getFullYear();
            const currentMonth = today.getMonth();

            // Start Date: 1st day of the 12th month ago
            // Example: If today is Jan 2026 (month 0), we want Jan 2025.
            // new Date(2026, 0 - 12, 1) = Jan 1, 2025.
            const startDate = new Date(currentYear, currentMonth - 12, 1, 0, 0, 0, 0);

            // End Date: Last day of the previous month
            // Example: If today is Jan 2026, we want Dec 31, 2025.
            // new Date(2026, 0, 0) gives the last day of the previous month (Dec 2025).
            const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

            // Filter invoices within this strictly defined range (full previous 12 months)
            const last12MonthsInvoices = invoices.filter(inv => {
                const invDate = new Date(inv.date);
                return invDate >= startDate && invDate <= endDate;
            });

            // Calculate totals for each provider
            const vjTotal = last12MonthsInvoices
                .filter(inv => inv.Provider === 'VJ')
                .reduce((sum, inv) => sum + (parseFloat(inv.Value) || 0), 0);

            const bfTotal = last12MonthsInvoices
                .filter(inv => inv.Provider === 'BF')
                .reduce((sum, inv) => sum + (parseFloat(inv.Value) || 0), 0);

            const difference = Math.abs(vjTotal - bfTotal);
            const higher = vjTotal > bfTotal ? 'VJ' : (bfTotal > vjTotal ? 'BF' : 'equal');

            return {
                VJ: vjTotal,
                BF: bfTotal,
                difference,
                higher
            };
        }
        return null;
    }, [invoices]);

    // Get invoices for a specific month and provider
    const getMonthInvoices = (provider, monthIndex) => {
        return invoices.filter(inv => {
            const invDate = new Date(inv.date);
            return inv.Provider === provider &&
                invDate.getFullYear() === selectedYear &&
                invDate.getMonth() === monthIndex;
        }).sort((a, b) => new Date(a.date) - new Date(b.date));
    };

    const toggleCell = (provider, monthIndex) => {
        const cellKey = `${provider}-${monthIndex}`;
        setExpandedCells(prev => {
            const newSet = new Set(prev);
            if (newSet.has(cellKey)) {
                newSet.delete(cellKey);
            } else {
                newSet.add(cellKey);
            }
            return newSet;
        });
    };

    if (invoices.length === 0) {
        return (
            <div className="invoice-year-view">
                <div className="empty-state">
                    <p>Nenhuma nota fiscal encontrada.</p>
                    <p className="empty-hint">Configure o link do Google Sheets para a página "notas" em config.js</p>
                </div>
            </div>
        );
    }

    return (
        <div className="invoice-year-view">
            {/* VJ vs BF Comparison - Last 12 Months */}
            {vjBfLast12MonthsComparison && (
                <div className="vj-bf-comparison last-12-months">
                    <h3>Comparação VJ x BF nos 12 meses Anteriores</h3>
                    <div className="comparison-cards">
                        <div className="comparison-card">
                            <span className="provider-name">VJ</span>
                            <span className="provider-amount">{formatCurrency(vjBfLast12MonthsComparison.VJ)}</span>
                        </div>
                        <div className="comparison-card">
                            <span className="provider-name">BF</span>
                            <span className="provider-amount">{formatCurrency(vjBfLast12MonthsComparison.BF)}</span>
                        </div>
                    </div>
                    <div className="comparison-result">
                        {vjBfLast12MonthsComparison.higher !== 'equal' ? (
                            <>
                                <span className="highlight-provider">{vjBfLast12MonthsComparison.higher}</span> emitiu <strong>{formatCurrency(vjBfLast12MonthsComparison.difference)}</strong> a mais
                            </>
                        ) : (
                            <span>Valores iguais</span>
                        )}
                    </div>
                </div>
            )}

            {/* Year Tabs */}
            <div className="year-tabs">
                {availableYears.map(year => (
                    <button
                        key={year}
                        className={`year-tab ${year === selectedYear ? 'active' : ''}`}
                        onClick={() => setSelectedYear(year)}
                    >
                        {year}
                    </button>
                ))}
            </div>

            {/* Main Table */}
            <div className="invoice-table-container">
                <table className="invoice-table">
                    <thead>
                        <tr>
                            <th className="month-col">Mês</th>
                            {providers.map(provider => (
                                <th key={provider} className="provider-col">{provider}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {monthNames.map((monthName, monthIndex) => {
                            return (
                                <>
                                    <tr key={monthIndex}>
                                        <td className="month-name">{monthName}</td>
                                        {providers.map(provider => {
                                            const value = yearData[provider]?.[monthIndex] || 0;
                                            const cellKey = `${provider}-${monthIndex}`;
                                            const isExpanded = expandedCells.has(cellKey);
                                            const monthInvoices = getMonthInvoices(provider, monthIndex);

                                            return (
                                                <td
                                                    key={provider}
                                                    className={`provider-value ${value > 0 ? 'clickable' : ''} ${isExpanded ? 'expanded' : ''}`}
                                                    onClick={() => value > 0 && toggleCell(provider, monthIndex)}
                                                    title={value > 0 ? 'Clique para ver detalhes' : ''}
                                                >
                                                    <div className="cell-content">
                                                        {value > 0 ? formatCurrency(value) : '-'}
                                                        {value > 0 && monthInvoices.length > 0 && (
                                                            <span className="invoice-count">({monthInvoices.length})</span>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                    {/* Expanded row with invoice details */}
                                    {providers.map(provider => {
                                        const cellKey = `${provider}-${monthIndex}`;
                                        const isExpanded = expandedCells.has(cellKey);
                                        const monthInvoices = getMonthInvoices(provider, monthIndex);

                                        if (!isExpanded || monthInvoices.length === 0) return null;

                                        return (
                                            <tr key={`${monthIndex}-${provider}-details`} className="invoice-details-row">
                                                <td colSpan={providers.length + 1} className="invoice-details-cell">
                                                    <div className="invoice-details-content">
                                                        <h4>{monthName} - {provider}</h4>
                                                        <div className="invoice-list">
                                                            {monthInvoices.map(inv => (
                                                                <div key={inv.id} className="invoice-detail-item">
                                                                    <span className="invoice-date">
                                                                        {new Date(inv.date).toLocaleDateString('pt-BR')}
                                                                    </span>
                                                                    <span className="invoice-client">{inv.Client}</span>
                                                                    {inv.Description && (
                                                                        <span className="invoice-description">{inv.Description}</span>
                                                                    )}
                                                                    <span className="invoice-value">{formatCurrency(inv.Value)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </>
                            );
                        })}
                        <tr className="total-row">
                            <td className="month-name">
                                <strong>Total {selectedYear}</strong>
                            </td>
                            {providers.map(provider => (
                                <td key={provider} className="provider-total">
                                    <strong>{formatCurrency(yearTotals[provider] || 0)}</strong>
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* VJ vs BF Comparison */}
            {vjBfComparison && (
                <div className="vj-bf-comparison">
                    <h3>Comparação VJ x BF</h3>
                    <div className="comparison-cards">
                        <div className="comparison-card">
                            <span className="provider-name">VJ</span>
                            <span className="provider-amount">{formatCurrency(vjBfComparison.VJ)}</span>
                        </div>
                        <div className="comparison-card">
                            <span className="provider-name">BF</span>
                            <span className="provider-amount">{formatCurrency(vjBfComparison.BF)}</span>
                        </div>
                    </div>
                    <div className="comparison-result">
                        {vjBfComparison.higher !== 'equal' ? (
                            <>
                                <span className="highlight-provider">{vjBfComparison.higher}</span> emitiu <strong>{formatCurrency(vjBfComparison.difference)}</strong> a mais
                            </>
                        ) : (
                            <span>Valores iguais</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
