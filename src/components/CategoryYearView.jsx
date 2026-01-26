import { useState, useMemo } from 'react';
import './CategoryYearView.css';

export default function CategoryYearView({ transactions = [] }) {
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);

    // Get available years from transactions
    const availableYears = useMemo(() => {
        const years = new Set();
        transactions.forEach(t => {
            const year = new Date(t.date).getFullYear();
            years.add(year);
        });
        // Add current year if not present
        years.add(currentYear);
        return Array.from(years).sort((a, b) => b - a); // Sort descending
    }, [transactions, currentYear]);

    // Category colors matching other components
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
            'individual': '#06b6d4',
            'notas': '#10b981'
        };
        return colors[category] || '#64748b';
    };

    const categoryNames = {
        'boletos': 'Boletos',
        'financiamentos': 'Financiamentos',
        'emprestimos': 'Empréstimos',
        'periodicos': 'Periódicos',
        'impostos': 'Impostos',
        'recorrentes': 'Recorrentes',
        'compras': 'Compras',
        'individual': 'Individual',
        'notas': 'Notas'
    };

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    // Calculate data for the selected year
    const yearData = useMemo(() => {
        // Initialize data structure: { category: { months, yearTotal, beneficiaries } }
        const data = {};

        // Filter transactions for selected year and exclude 'recorrentes' category
        const yearTransactions = transactions.filter(t => {
            const date = new Date(t.date);
            return date.getFullYear() === selectedYear && t.category !== 'recorrentes';
        });

        // Group by category and month
        yearTransactions.forEach(t => {
            const category = t.category;
            const month = new Date(t.date).getMonth();
            const value = parseFloat(t.Value) || 0;

            // Get beneficiary name - use FullName if available, otherwise Beneficiary
            const beneficiaryName = t.FullName || t.Beneficiary || 'Não especificado';

            if (!data[category]) {
                data[category] = {
                    months: Array(12).fill(0),
                    yearTotal: 0,
                    beneficiaries: {} // { beneficiaryName: total }
                };
            }

            data[category].months[month] += value;
            data[category].yearTotal += value;

            // Track beneficiary totals
            if (!data[category].beneficiaries[beneficiaryName]) {
                data[category].beneficiaries[beneficiaryName] = 0;
            }
            data[category].beneficiaries[beneficiaryName] += value;
        });

        // Calculate averages and convert beneficiaries to sorted array
        Object.keys(data).forEach(category => {
            const yearTotal = data[category].yearTotal;
            data[category].monthlyAvg = yearTotal / 12;
            data[category].weeklyAvg = yearTotal / 52; // 52 weeks in a year
            data[category].dailyAvg = yearTotal / 365;

            // Convert beneficiaries object to sorted array
            data[category].beneficiariesList = Object.entries(data[category].beneficiaries)
                .map(([name, total]) => ({
                    name,
                    total,
                    monthlyAvg: total / 12,
                    weeklyAvg: total / 52,
                    dailyAvg: total / 365
                }))
                .sort((a, b) => b.total - a.total); // Sort by total descending
        });

        return data;
    }, [transactions, selectedYear]);

    // Get all categories that have data, in the same order as the filter buttons
    const categoriesWithData = useMemo(() => {
        // Define the order matching ALL_CATEGORIES from App.jsx (excluding 'recorrentes')
        const categoryOrder = [
            'boletos',
            'financiamentos',
            'emprestimos',
            'periodicos',
            'impostos',
            'compras',
            'individual',
            'notas'
        ];

        // Filter to only include categories that have data
        return categoryOrder.filter(category => yearData[category]);
    }, [yearData]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2
        }).format(value);
    };

    return (
        <div className="category-year-view">
            <div className="year-selector-container">
                <label htmlFor="year-select" className="year-label">Selecione o Ano:</label>
                <select
                    id="year-select"
                    className="year-select"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                    {availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
            </div>

            {categoriesWithData.length === 0 ? (
                <div className="no-data-message">
                    <p>Nenhum dado disponível para o ano de {selectedYear}</p>
                </div>
            ) : (
                <div className="categories-container">
                    {categoriesWithData.map(category => {
                        const categoryData = yearData[category];
                        const color = getCategoryColor(category);

                        return (
                            <div key={category} className="category-section">
                                <div className="category-header" style={{ borderLeftColor: color }}>
                                    <h3 className="category-title" style={{ color }}>
                                        {categoryNames[category] || category}
                                    </h3>
                                    <div className="category-stats">
                                        <div className="stat-item">
                                            <span className="stat-label">Total Anual:</span>
                                            <span className="stat-value" style={{ color }}>
                                                {formatCurrency(categoryData.yearTotal)}
                                            </span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Média Mensal:</span>
                                            <span className="stat-value">
                                                {formatCurrency(categoryData.monthlyAvg)}
                                            </span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Média Semanal:</span>
                                            <span className="stat-value">
                                                {formatCurrency(categoryData.weeklyAvg)}
                                            </span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Média Diária:</span>
                                            <span className="stat-value">
                                                {formatCurrency(categoryData.dailyAvg)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="category-content">
                                    <div className="months-grid">
                                        {categoryData.months.map((total, monthIndex) => (
                                            <div
                                                key={monthIndex}
                                                className="month-box"
                                                style={{
                                                    borderColor: total > 0 ? color : 'var(--border)',
                                                    backgroundColor: total > 0 ? `${color}15` : 'transparent'
                                                }}
                                            >
                                                <div className="month-name">{monthNames[monthIndex]}</div>
                                                <div
                                                    className="month-total"
                                                    style={{ color: total > 0 ? color : 'var(--text-secondary)' }}
                                                >
                                                    {total > 0 ? formatCurrency(total) : '-'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="beneficiaries-list">
                                        <h4 className="beneficiaries-title">Beneficiários</h4>
                                        {categoryData.beneficiariesList && categoryData.beneficiariesList.length > 0 ? (
                                            <div className="beneficiaries-items">
                                                {categoryData.beneficiariesList.map((beneficiary, idx) => (
                                                    <div key={idx} className="beneficiary-item">
                                                        <div className="beneficiary-name" title={beneficiary.name}>
                                                            {beneficiary.name}
                                                        </div>
                                                        <div className="beneficiary-stats">
                                                            <div className="beneficiary-stat">
                                                                <span className="beneficiary-stat-label">Total:</span>
                                                                <span className="beneficiary-stat-value" style={{ color }}>
                                                                    {formatCurrency(beneficiary.total)}
                                                                </span>
                                                            </div>
                                                            <div className="beneficiary-stat">
                                                                <span className="beneficiary-stat-label">Mensal:</span>
                                                                <span className="beneficiary-stat-value">
                                                                    {formatCurrency(beneficiary.monthlyAvg)}
                                                                </span>
                                                            </div>
                                                            <div className="beneficiary-stat">
                                                                <span className="beneficiary-stat-label">Semanal:</span>
                                                                <span className="beneficiary-stat-value">
                                                                    {formatCurrency(beneficiary.weeklyAvg)}
                                                                </span>
                                                            </div>
                                                            <div className="beneficiary-stat">
                                                                <span className="beneficiary-stat-label">Diária:</span>
                                                                <span className="beneficiary-stat-value">
                                                                    {formatCurrency(beneficiary.dailyAvg)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="no-beneficiaries">Nenhum beneficiário encontrado</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
