import { useState, useMemo } from 'react';
import './CategoryYearView.css';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

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

    // Calculate overall year statistics for charts
    const overallYearStats = useMemo(() => {
        // Aggregate all categories by month
        const monthlyTotals = Array(12).fill(0);
        const categoryTotals = {};
        const allBeneficiaries = {};

        Object.keys(yearData).forEach(category => {
            const categoryData = yearData[category];

            // Sum monthly totals across all categories
            categoryData.months.forEach((value, monthIndex) => {
                monthlyTotals[monthIndex] += value;
            });

            // Track category totals
            categoryTotals[category] = categoryData.yearTotal;

            // Aggregate all beneficiaries
            Object.entries(categoryData.beneficiaries).forEach(([name, total]) => {
                if (!allBeneficiaries[name]) {
                    allBeneficiaries[name] = 0;
                }
                allBeneficiaries[name] += total;
            });
        });

        // Get top 10 beneficiaries
        const topBeneficiaries = Object.entries(allBeneficiaries)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        return {
            monthlyTotals,
            categoryTotals,
            topBeneficiaries
        };
    }, [yearData]);

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

    // Prepare data for monthly line chart (all categories)
    const getMonthlyLineChartData = () => {
        const datasets = categoriesWithData.map(category => {
            const color = getCategoryColor(category);
            return {
                label: categoryNames[category],
                data: yearData[category].months,
                borderColor: color,
                backgroundColor: `${color}20`,
                fill: false,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: color,
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            };
        });

        return {
            labels: monthNames,
            datasets
        };
    };

    // Prepare data for category distribution pie chart
    const getCategoryPieChartData = () => {
        const data = categoriesWithData.map(cat => overallYearStats.categoryTotals[cat]);
        const colors = categoriesWithData.map(cat => getCategoryColor(cat));

        return {
            labels: categoriesWithData.map(cat => categoryNames[cat]),
            datasets: [{
                data,
                backgroundColor: colors,
                borderColor: '#fff',
                borderWidth: 3,
                hoverOffset: 15
            }]
        };
    };

    // Prepare data for top beneficiaries pie chart
    const getTopBeneficiariesPieChartData = () => {
        const colors = [
            '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981',
            '#ec4899', '#06b6d4', '#f97316', '#64748b', '#FFE600'
        ];

        return {
            labels: overallYearStats.topBeneficiaries.map(b => b.name),
            datasets: [{
                data: overallYearStats.topBeneficiaries.map(b => b.total),
                backgroundColor: colors,
                borderColor: '#fff',
                borderWidth: 3,
                hoverOffset: 15
            }]
        };
    };

    // Prepare data for category-specific beneficiaries pie chart
    const getCategoryBeneficiariesPieChartData = (category) => {
        const beneficiariesList = yearData[category].beneficiariesList;
        const top10 = beneficiariesList.slice(0, 10);
        const others = beneficiariesList.slice(10);

        const labels = top10.map(b => b.name);
        const data = top10.map(b => b.total);

        // Add "Outros" if there are more than 10 beneficiaries
        if (others.length > 0) {
            const othersTotal = others.reduce((sum, b) => sum + b.total, 0);
            labels.push('Outros');
            data.push(othersTotal);
        }

        const colors = [
            '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981',
            '#ec4899', '#06b6d4', '#f97316', '#64748b', '#FFE600', '#94a3b8'
        ];

        return {
            labels,
            datasets: [{
                data,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#fff',
                borderWidth: 3,
                hoverOffset: 15
            }]
        };
    };

    // Chart options
    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 15,
                    font: {
                        size: 12,
                        weight: '600'
                    },
                    usePointStyle: true,
                    pointStyle: 'circle'
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: {
                    size: 14,
                    weight: 'bold'
                },
                bodyFont: {
                    size: 13
                },
                callbacks: {
                    label: (context) => {
                        return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value) => {
                        return new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                        }).format(value);
                    },
                    font: {
                        size: 11
                    }
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        size: 11
                    }
                }
            }
        }
    };

    const pieChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    padding: 12,
                    font: {
                        size: 11,
                        weight: '600'
                    },
                    usePointStyle: true,
                    pointStyle: 'circle',
                    generateLabels: (chart) => {
                        const data = chart.data;
                        if (data.labels.length && data.datasets.length) {
                            return data.labels.map((label, i) => {
                                const value = data.datasets[0].data[i];
                                const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return {
                                    text: `${label} (${percentage}%)`,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    hidden: false,
                                    index: i
                                };
                            });
                        }
                        return [];
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: {
                    size: 14,
                    weight: 'bold'
                },
                bodyFont: {
                    size: 13
                },
                callbacks: {
                    label: (context) => {
                        const value = context.parsed;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${formatCurrency(value)} (${percentage}%)`;
                    }
                }
            }
        }
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
                <>
                    {/* Overall Year Charts */}
                    <div className="overall-charts-section">
                        <h2 className="section-title">Visão Geral do Ano {selectedYear}</h2>

                        {/* Monthly Line Chart */}
                        <div className="chart-container chart-line">
                            <div className="chart-header">
                                <h3 className="chart-title">Evolução Mensal por Categoria</h3>
                                <p className="chart-subtitle">Acompanhe o comportamento de cada categoria ao longo do ano</p>
                            </div>
                            <div className="chart-wrapper">
                                <Line data={getMonthlyLineChartData()} options={lineChartOptions} />
                            </div>
                        </div>

                        {/* Pie Charts Grid */}
                        <div className="pie-charts-grid">
                            {/* Category Distribution Pie */}
                            <div className="chart-container chart-pie">
                                <div className="chart-header">
                                    <h3 className="chart-title">Distribuição por Categoria</h3>
                                    <p className="chart-subtitle">Proporção de gastos em cada categoria</p>
                                </div>
                                <div className="chart-wrapper">
                                    <Pie data={getCategoryPieChartData()} options={pieChartOptions} />
                                </div>
                            </div>

                            {/* Top Beneficiaries Pie */}
                            <div className="chart-container chart-pie">
                                <div className="chart-header">
                                    <h3 className="chart-title">Top 10 Beneficiários</h3>
                                    <p className="chart-subtitle">Maiores destinatários de pagamentos do ano</p>
                                </div>
                                <div className="chart-wrapper">
                                    <Pie data={getTopBeneficiariesPieChartData()} options={pieChartOptions} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Categories Detail */}
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
                                        {/* Column 1: Months Grid */}
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

                                        {/* Column 2: Beneficiaries Table */}
                                        <div className="beneficiaries-list">
                                            <h4 className="beneficiaries-title">Beneficiários</h4>
                                            {categoryData.beneficiariesList && categoryData.beneficiariesList.length > 0 ? (
                                                <div className="beneficiaries-table-container">
                                                    <table className="beneficiaries-table">
                                                        <thead>
                                                            <tr>
                                                                <th className="th-rank">#</th>
                                                                <th className="th-name">Beneficiário</th>
                                                                <th className="th-total">Total</th>
                                                                <th className="th-monthly">Média/Mês</th>
                                                                <th className="th-daily">Média/Dia</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {categoryData.beneficiariesList.map((beneficiary, idx) => (
                                                                <tr key={idx}>
                                                                    <td className="td-rank">
                                                                        <span className="rank-badge">{idx + 1}</span>
                                                                    </td>
                                                                    <td className="td-name">
                                                                        <div className="name-text" title={beneficiary.name}>{beneficiary.name}</div>
                                                                    </td>
                                                                    <td className="td-total" style={{ color }}>
                                                                        {formatCurrency(beneficiary.total)}
                                                                    </td>
                                                                    <td className="td-monthly">
                                                                        {formatCurrency(beneficiary.monthlyAvg)}
                                                                    </td>
                                                                    <td className="td-daily">
                                                                        {formatCurrency(beneficiary.dailyAvg)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <p className="no-beneficiaries">Nenhum beneficiário encontrado</p>
                                            )}
                                        </div>

                                        {/* Column 3: Beneficiaries Pie Chart */}
                                        {categoryData.beneficiariesList && categoryData.beneficiariesList.length > 0 && (
                                            <div className="beneficiaries-chart-column">
                                                <h4 className="beneficiaries-title">Distribuição</h4>
                                                <div className="category-beneficiaries-chart">
                                                    <div className="chart-wrapper-small">
                                                        <Pie
                                                            data={getCategoryBeneficiariesPieChartData(category)}
                                                            options={pieChartOptions}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
