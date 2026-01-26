import { useState, useMemo } from 'react';
import { getAvailableYears, groupInvoicesByProviderAndMonth, getProviders, compareProviders, calculateInvoiceTotal, getInvoicesByProvider, getInvoicesByYear } from '../utils/invoiceUtils';
import './InvoiceYearView.css';

export default function InvoiceYearView({ invoices, providerRates = { VJ: 0.14, BF: 0.14 } }) {
    const availableYears = useMemo(() => getAvailableYears(invoices), [invoices]);
    const [selectedYear, setSelectedYear] = useState(availableYears[0] || new Date().getFullYear());
    const [expandedCells, setExpandedCells] = useState(new Set()); // Track multiple expanded cells
    const [comparisonPeriod, setComparisonPeriod] = useState('previous12'); // 'previous12' or 'current11'

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

    const [isComparisonExpanded, setIsComparisonExpanded] = useState(false);

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

            // Start of Previous Month (for the 14% calculation)
            const startOfPreviousMonth = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);

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

            // Calculate totals for PREVIOUS MONTH ONLY (for the 14% estimate)
            const previousMonthInvoices = invoices.filter(inv => {
                const invDate = new Date(inv.date);
                return invDate >= startOfPreviousMonth && invDate <= endDate;
            });

            const vjTotalPrevMonth = previousMonthInvoices
                .filter(inv => inv.Provider === 'VJ')
                .reduce((sum, inv) => sum + (parseFloat(inv.Value) || 0), 0);

            const bfTotalPrevMonth = previousMonthInvoices
                .filter(inv => inv.Provider === 'BF')
                .reduce((sum, inv) => sum + (parseFloat(inv.Value) || 0), 0);

            const difference = Math.abs(vjTotal - bfTotal);
            const higher = vjTotal > bfTotal ? 'VJ' : (bfTotal > vjTotal ? 'BF' : 'equal');

            // Sort invoices by date descending for display
            const sortedInvoices = [...last12MonthsInvoices]
                .filter(inv => inv.Provider === 'VJ' || inv.Provider === 'BF')
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            return {
                VJ: vjTotal,
                BF: bfTotal,
                vjEstimate: vjTotalPrevMonth * providerRates.VJ,
                bfEstimate: bfTotalPrevMonth * providerRates.BF,
                difference,
                higher,
                invoices: sortedInvoices
            };
        }
        return null;
    }, [invoices, providerRates]);

    // Compare VJ and BF for current month + 11 previous months (rolling)
    const vjBfCurrent11MonthsComparison = useMemo(() => {
        const allProviders = [...new Set(invoices.map(inv => inv.Provider))];

        if (allProviders.includes('VJ') && allProviders.includes('BF')) {
            const today = new Date();
            const currentYear = today.getFullYear();
            const currentMonth = today.getMonth();

            // Start Date: 1st day of the 11th month ago
            // Example: If today is Jan 2026 (month 0), we want Feb 2025.
            const startDate = new Date(currentYear, currentMonth - 11, 1, 0, 0, 0, 0);

            // End Date: Last day of the current month
            const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

            // Start of Current Month (for the percentage calculation)
            const startOfCurrentMonth = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);

            // Filter invoices within this range (current month + 11 previous)
            const current11MonthsInvoices = invoices.filter(inv => {
                const invDate = new Date(inv.date);
                return invDate >= startDate && invDate <= endDate;
            });

            // Calculate totals for each provider
            const vjTotal = current11MonthsInvoices
                .filter(inv => inv.Provider === 'VJ')
                .reduce((sum, inv) => sum + (parseFloat(inv.Value) || 0), 0);

            const bfTotal = current11MonthsInvoices
                .filter(inv => inv.Provider === 'BF')
                .reduce((sum, inv) => sum + (parseFloat(inv.Value) || 0), 0);

            // Calculate totals for CURRENT MONTH ONLY (for the percentage estimate)
            const currentMonthInvoices = invoices.filter(inv => {
                const invDate = new Date(inv.date);
                return invDate >= startOfCurrentMonth && invDate <= endDate;
            });

            const vjTotalCurrentMonth = currentMonthInvoices
                .filter(inv => inv.Provider === 'VJ')
                .reduce((sum, inv) => sum + (parseFloat(inv.Value) || 0), 0);

            const bfTotalCurrentMonth = currentMonthInvoices
                .filter(inv => inv.Provider === 'BF')
                .reduce((sum, inv) => sum + (parseFloat(inv.Value) || 0), 0);

            const difference = Math.abs(vjTotal - bfTotal);
            const higher = vjTotal > bfTotal ? 'VJ' : (bfTotal > vjTotal ? 'BF' : 'equal');

            // Sort invoices by date descending for display
            const sortedInvoices = [...current11MonthsInvoices]
                .filter(inv => inv.Provider === 'VJ' || inv.Provider === 'BF')
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            return {
                VJ: vjTotal,
                BF: bfTotal,
                vjEstimate: vjTotalCurrentMonth * providerRates.VJ,
                bfEstimate: bfTotalCurrentMonth * providerRates.BF,
                difference,
                higher,
                invoices: sortedInvoices
            };
        }
        return null;
    }, [invoices, providerRates]);

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

    // Helper to format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    };

    return (
        <div className="invoice-year-view">
            {/* VJ vs BF Comparison - Last 12 Months with Tabs */}
            {vjBfLast12MonthsComparison && vjBfCurrent11MonthsComparison && (
                <div className="vj-bf-comparison-container">
                    {/* Tabs */}
                    <div className="comparison-tabs">
                        <button
                            className={`comparison-tab ${comparisonPeriod === 'previous12' ? 'active' : ''}`}
                            onClick={() => setComparisonPeriod('previous12')}
                        >
                            12 Meses Anteriores
                        </button>
                        <button
                            className={`comparison-tab ${comparisonPeriod === 'current11' ? 'active' : ''}`}
                            onClick={() => setComparisonPeriod('current11')}
                        >
                            Mês Atual + 11 Anteriores
                        </button>
                    </div>

                    {/* Comparison Content */}
                    <div
                        className={`vj-bf-comparison last-12-months ${isComparisonExpanded ? 'expanded' : ''}`}
                        onClick={() => setIsComparisonExpanded(!isComparisonExpanded)}
                        title="Clique para ver detalhes"
                        role="button"
                        tabIndex={0}
                    >
                        <h3>Comparação VJ x BF nos {comparisonPeriod === 'previous12' ? '12 meses anteriores' : 'mês atual + 11 anteriores'}</h3>
                        <div className="comparison-cards">
                            <div className="comparison-card">
                                <span className="provider-name">VJ</span>
                                <span className="provider-amount">
                                    {formatCurrency(comparisonPeriod === 'previous12' ? vjBfLast12MonthsComparison.VJ : vjBfCurrent11MonthsComparison.VJ)}
                                </span>
                                <span className="provider-percentage" title={`Estimativa baseada em ${(providerRates.VJ * 100).toLocaleString('pt-BR')}% do ${comparisonPeriod === 'previous12' ? 'mês anterior' : 'mês atual'}`}>
                                    (~{(providerRates.VJ * 100).toLocaleString('pt-BR')}% {comparisonPeriod === 'previous12' ? 'mês ant.' : 'mês atual'}: ~{formatCurrency(comparisonPeriod === 'previous12' ? vjBfLast12MonthsComparison.vjEstimate : vjBfCurrent11MonthsComparison.vjEstimate)})
                                </span>
                            </div>
                            <div className="comparison-card">
                                <span className="provider-name">BF</span>
                                <span className="provider-amount">
                                    {formatCurrency(comparisonPeriod === 'previous12' ? vjBfLast12MonthsComparison.BF : vjBfCurrent11MonthsComparison.BF)}
                                </span>
                                <span className="provider-percentage" title={`Estimativa baseada em ${(providerRates.BF * 100).toLocaleString('pt-BR')}% do ${comparisonPeriod === 'previous12' ? 'mês anterior' : 'mês atual'}`}>
                                    (~{(providerRates.BF * 100).toLocaleString('pt-BR')}% {comparisonPeriod === 'previous12' ? 'mês ant.' : 'mês atual'}: ~{formatCurrency(comparisonPeriod === 'previous12' ? vjBfLast12MonthsComparison.bfEstimate : vjBfCurrent11MonthsComparison.bfEstimate)})
                                </span>
                            </div>
                        </div>
                        <div className="comparison-result">
                            {(comparisonPeriod === 'previous12' ? vjBfLast12MonthsComparison.higher : vjBfCurrent11MonthsComparison.higher) !== 'equal' ? (
                                <>
                                    <span className="highlight-provider">{comparisonPeriod === 'previous12' ? vjBfLast12MonthsComparison.higher : vjBfCurrent11MonthsComparison.higher}</span> emitiu <strong>{formatCurrency(comparisonPeriod === 'previous12' ? vjBfLast12MonthsComparison.difference : vjBfCurrent11MonthsComparison.difference)}</strong> a mais
                                </>
                            ) : (
                                <span>Valores iguais</span>
                            )}
                        </div>

                        {isComparisonExpanded && (
                            <div className="comparison-details" onClick={(e) => e.stopPropagation()}>
                                <h4>Detalhamento das Notas</h4>
                                <div className="details-columns">
                                    <div className="details-column">
                                        <h5 className="column-header header-vj">VJ</h5>
                                        <div className="details-list">
                                            {(() => {
                                                const currentInvoices = (comparisonPeriod === 'previous12' ? vjBfLast12MonthsComparison.invoices : vjBfCurrent11MonthsComparison.invoices)
                                                    .filter(inv => inv.Provider === 'VJ');

                                                // If viewing current11, also show removed invoices from previous12
                                                const removedInvoices = comparisonPeriod === 'current11'
                                                    ? vjBfLast12MonthsComparison.invoices
                                                        .filter(inv => inv.Provider === 'VJ')
                                                        .filter(prevInv => !vjBfCurrent11MonthsComparison.invoices.some(
                                                            currInv => currInv.id === prevInv.id && currInv.Provider === 'VJ'
                                                        ))
                                                    : [];

                                                const allInvoices = [...currentInvoices, ...removedInvoices]
                                                    .sort((a, b) => new Date(b.date) - new Date(a.date));

                                                return allInvoices.map((inv, idx) => {
                                                    let highlightClass = 'is-vj';

                                                    if (comparisonPeriod === 'current11') {
                                                        const isInPrevious12 = vjBfLast12MonthsComparison.invoices.some(
                                                            prevInv => prevInv.id === inv.id && prevInv.Provider === 'VJ'
                                                        );
                                                        const isInCurrent11 = vjBfCurrent11MonthsComparison.invoices.some(
                                                            currInv => currInv.id === inv.id && currInv.Provider === 'VJ'
                                                        );

                                                        if (!isInPrevious12 && isInCurrent11) {
                                                            highlightClass = 'is-vj is-new'; // Blue for added
                                                        } else if (isInPrevious12 && !isInCurrent11) {
                                                            highlightClass = 'is-vj is-removed'; // Pink for removed
                                                        }
                                                    }

                                                    return (
                                                        <div key={idx} className={`detail-item ${highlightClass}`}>
                                                            <div className="detail-date">{formatDate(inv.date)}</div>
                                                            <div className="detail-client">{inv.Client}</div>
                                                            <div className="detail-value">{formatCurrency(inv.Value)}</div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                            {(comparisonPeriod === 'previous12' ? vjBfLast12MonthsComparison.invoices : vjBfCurrent11MonthsComparison.invoices).filter(inv => inv.Provider === 'VJ').length === 0 && (
                                                <div className="no-invoices">Nenhuma nota</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="details-column">
                                        <h5 className="column-header header-bf">BF</h5>
                                        <div className="details-list">
                                            {(() => {
                                                const currentInvoices = (comparisonPeriod === 'previous12' ? vjBfLast12MonthsComparison.invoices : vjBfCurrent11MonthsComparison.invoices)
                                                    .filter(inv => inv.Provider === 'BF');

                                                // If viewing current11, also show removed invoices from previous12
                                                const removedInvoices = comparisonPeriod === 'current11'
                                                    ? vjBfLast12MonthsComparison.invoices
                                                        .filter(inv => inv.Provider === 'BF')
                                                        .filter(prevInv => !vjBfCurrent11MonthsComparison.invoices.some(
                                                            currInv => currInv.id === prevInv.id && currInv.Provider === 'BF'
                                                        ))
                                                    : [];

                                                const allInvoices = [...currentInvoices, ...removedInvoices]
                                                    .sort((a, b) => new Date(b.date) - new Date(a.date));

                                                return allInvoices.map((inv, idx) => {
                                                    let highlightClass = 'is-bf';

                                                    if (comparisonPeriod === 'current11') {
                                                        const isInPrevious12 = vjBfLast12MonthsComparison.invoices.some(
                                                            prevInv => prevInv.id === inv.id && prevInv.Provider === 'BF'
                                                        );
                                                        const isInCurrent11 = vjBfCurrent11MonthsComparison.invoices.some(
                                                            currInv => currInv.id === inv.id && currInv.Provider === 'BF'
                                                        );

                                                        if (!isInPrevious12 && isInCurrent11) {
                                                            highlightClass = 'is-bf is-new'; // Blue for added
                                                        } else if (isInPrevious12 && !isInCurrent11) {
                                                            highlightClass = 'is-bf is-removed'; // Pink for removed
                                                        }
                                                    }

                                                    return (
                                                        <div key={idx} className={`detail-item ${highlightClass}`}>
                                                            <div className="detail-date">{formatDate(inv.date)}</div>
                                                            <div className="detail-client">{inv.Client}</div>
                                                            <div className="detail-value">{formatCurrency(inv.Value)}</div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                            {(comparisonPeriod === 'previous12' ? vjBfLast12MonthsComparison.invoices : vjBfCurrent11MonthsComparison.invoices).filter(inv => inv.Provider === 'BF').length === 0 && (
                                                <div className="no-invoices">Nenhuma nota</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
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
