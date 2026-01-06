import { useState, useMemo } from 'react';
import { getProviders, calculate12MonthSum, getTaxEstimate, getInvoicesByMonth } from '../utils/invoiceUtils';
import './TaxEstimateView.css';

export default function TaxEstimateView({ invoices }) {
    const formatCurrency = (val) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    };

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Calculate next month
    const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
    const nextMonth = nextMonthDate.getMonth();
    const nextYear = nextMonthDate.getFullYear();

    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    // Get all providers that have any invoices in the system
    const allProviders = useMemo(() => {
        return [...new Set(invoices.map(inv => inv.Provider))].filter(Boolean);
    }, [invoices]);

    // Calculate 12-month sums and taxes for current month
    const currentMonthData = useMemo(() => {
        return allProviders.map(provider => {
            const sum12Months = calculate12MonthSum(invoices, currentYear, currentMonth, provider);
            const tax = getTaxEstimate(sum12Months);
            return { provider, sum12Months, tax };
        }).filter(data => data.sum12Months > 0); // Only show providers with data
    }, [allProviders, invoices, currentYear, currentMonth]);

    // Calculate 12-month sums and taxes for next month
    const nextMonthData = useMemo(() => {
        return allProviders.map(provider => {
            const sum12Months = calculate12MonthSum(invoices, nextYear, nextMonth, provider);
            const tax = getTaxEstimate(sum12Months);
            return { provider, sum12Months, tax };
        }).filter(data => data.sum12Months > 0); // Only show providers with data
    }, [allProviders, invoices, nextYear, nextMonth]);

    if (invoices.length === 0) {
        return (
            <div className="tax-estimate-view">
                <div className="empty-state">
                    <p>Nenhuma nota fiscal encontrada.</p>
                    <p className="empty-hint">Configure o link do Google Sheets para a página "notas" em config.js</p>
                </div>
            </div>
        );
    }

    const MonthSection = ({ title, monthData, year, month }) => {
        const [expandedProvider, setExpandedProvider] = useState(null);

        const toggleExpand = (provider) => {
            setExpandedProvider(expandedProvider === provider ? null : provider);
        };

        // Get invoices for the 12-month period for a provider
        const get12MonthInvoices = (provider) => {
            const startDate = new Date(year, month - 13, 1);
            const targetDate = new Date(year, month, 1);

            return invoices.filter(inv => {
                if (inv.Provider !== provider) return false;
                const invDate = new Date(inv.date);
                const invDateNormalized = new Date(invDate.getFullYear(), invDate.getMonth(), 1);
                return invDateNormalized >= startDate && invDateNormalized < targetDate;
            }).sort((a, b) => new Date(b.date) - new Date(a.date));
        };

        return (
            <div className="month-section">
                <h2 className="month-title">{title}</h2>
                <div className="provider-cards">
                    {monthData.length > 0 ? (
                        monthData.map(({ provider, sum12Months, tax }) => {
                            const isExpanded = expandedProvider === provider;
                            const invoicesList = isExpanded ? get12MonthInvoices(provider) : [];

                            return (
                                <div key={provider} className="provider-card">
                                    <div className="provider-header">
                                        <h3 className="provider-name">{provider}</h3>
                                        <button
                                            className="expand-btn"
                                            onClick={() => toggleExpand(provider)}
                                            aria-label={isExpanded ? 'Recolher' : 'Expandir'}
                                        >
                                            {isExpanded ? '▼' : '▶'}
                                        </button>
                                    </div>

                                    <div className="provider-summary">
                                        <div className="summary-row">
                                            <span className="summary-label">Faturamento 12 meses:</span>
                                            <span className="summary-value">{formatCurrency(sum12Months)}</span>
                                        </div>
                                        <div className="summary-row tax-row">
                                            <span className="summary-label">Imposto Simples Nacional (mensal):</span>
                                            <span className="summary-value tax-value">{formatCurrency(tax)}</span>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="invoices-detail">
                                            <h4 className="detail-title">Notas dos últimos 12 meses:</h4>
                                            <div className="invoices-list">
                                                {invoicesList.map(inv => (
                                                    <div key={inv.id} className="invoice-detail-item">
                                                        <span className="invoice-date">
                                                            {new Date(inv.date).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                                                        </span>
                                                        <span className="invoice-client">{inv.Client}</span>
                                                        <span className="invoice-value">{formatCurrency(inv.Value)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="no-data">Nenhuma nota fiscal para este período.</div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="tax-estimate-view">
            <div className="view-header">
                <h1>Imposto Estimado Mensal</h1>
                <p className="view-description">Cálculo baseado no Simples Nacional (Anexo III) - faturamento dos últimos 12 meses</p>
            </div>

            <MonthSection
                title={`${monthNames[currentMonth]} ${currentYear} (Mês Atual)`}
                monthData={currentMonthData}
                year={currentYear}
                month={currentMonth}
            />

            <MonthSection
                title={`${monthNames[nextMonth]} ${nextYear} (Próximo Mês)`}
                monthData={nextMonthData}
                year={nextYear}
                month={nextMonth}
            />
        </div>
    );
}
