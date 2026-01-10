import { useMemo, useState } from 'react';
import './Sidebar.css';

export default function Sidebar({ accounts, remainingToPay = 0, selectedPayment, selectedInvoice, onBack, isMobile = false, isOpen = false, onClose, categories = [], disabledCategories = new Set(), onToggleCategory, searchQuery = '', onSearch }) {
    const [localSearchInput, setLocalSearchInput] = useState(searchQuery);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('pt-BR');
    };

    // Search handlers
    const handleSearchClick = () => {
        onSearch && onSearch(localSearchInput);
    };

    const handleSearchKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearchClick();
        }
    };

    const handleClearSearch = () => {
        setLocalSearchInput('');
        onSearch && onSearch('');
    };

    const totalBalance = useMemo(() => {
        if (!accounts) return 0;
        return accounts.reduce((acc, item) => acc + (parseFloat(item.value) || 0), 0);
    }, [accounts]);

    // Calculate available balance after paying remaining bills
    const availableBalance = useMemo(() => {
        return totalBalance - remainingToPay;
    }, [totalBalance, remainingToPay]);

    const getBankStyle = (bankName) => {
        const bank = bankName ? bankName.toLowerCase() : '';
        let color = 'var(--border)';
        let accentColor = 'transparent';

        if (bank.includes('banco do brasil') || bank.includes('bb')) {
            color = '#d9a400';
            accentColor = 'rgba(217, 164, 0, 0.15)';
        } else if (bank.includes('sicoob')) {
            color = '#00ae9d';
            accentColor = 'rgba(0, 174, 157, 0.15)';
        } else if (bank.includes('bradesco')) {
            color = '#cc092f';
            accentColor = 'rgba(204, 9, 47, 0.15)';
        } else if (bank.includes('santander')) {
            color = '#ec0000';
            accentColor = 'rgba(236, 0, 0, 0.15)';
        }

        return {
            borderColor: color,
            background: `linear-gradient(135deg, ${accentColor} 0%, rgba(255,255,255,0.5) 100%)`,
            boxShadow: `0 0 0 1px ${color} inset`
        };
    };

    // Category colors matching Calendar.jsx
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
            'proprio': '#4ade80'
        };
        return colors[category] || '#64748b';
    };

    const categoryNames = {
        'boletos': 'Boletos',
        'financiamentos': 'Financ.',
        'emprestimos': 'Emprést.',
        'anuais': 'Anuais',
        'impostos': 'Impostos',
        'recorrentes': 'Recorr.',
        'mensais': 'Mensais',
        'lila': 'Lila',
        'proprio': 'Próprio'
    };

    // Category toggles section
    const categoryToggles = categories.length > 0 && (
        <div className="category-toggles">
            <div className="toggles-label">Categorias</div>
            <div className="toggles-grid">
                {categories.map(cat => {
                    const isDisabled = disabledCategories.has(cat);
                    const color = getCategoryColor(cat);
                    return (
                        <button
                            key={cat}
                            className={`category-toggle-btn ${isDisabled ? 'disabled' : ''}`}
                            onClick={() => onToggleCategory && onToggleCategory(cat)}
                            style={{
                                '--cat-color': color,
                                borderColor: isDisabled ? 'var(--border)' : color,
                                backgroundColor: isDisabled ? 'transparent' : `${color}15`
                            }}
                            title={isDisabled ? `Mostrar ${categoryNames[cat]}` : `Ocultar ${categoryNames[cat]}`}
                        >
                            <span
                                className="toggle-dot"
                                style={{ backgroundColor: isDisabled ? 'var(--border)' : color }}
                            />
                            <span className={`toggle-name ${isDisabled ? 'muted' : ''}`}>
                                {categoryNames[cat] || cat}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    // Search box component
    const searchBox = (
        <div className="search-box">
            <div className="search-label">Pesquisar</div>
            <div className="search-input-container">
                <input
                    type="text"
                    className="search-input"
                    placeholder="Buscar entradas..."
                    value={localSearchInput}
                    onChange={(e) => setLocalSearchInput(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                />
                {localSearchInput && (
                    <button
                        className="search-clear-btn"
                        onClick={handleClearSearch}
                        title="Limpar pesquisa"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                )}
                <button
                    className="search-btn"
                    onClick={handleSearchClick}
                    title="Pesquisar"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                    </svg>
                </button>
            </div>
        </div>
    );

    // Content to render (shared between desktop and mobile)
    const sidebarContent = (
        <>
            {selectedPayment || selectedInvoice ? (
                <div className="details-panel">
                    <button className="back-btn" onClick={onBack}>
                        &larr; Voltar
                    </button>
                    {selectedPayment && (
                        <div className="detail-card">
                            <div className={`detail-category category-${selectedPayment.category}`}>
                                {selectedPayment.category.toUpperCase()}
                            </div>
                            <h3 className="detail-title">{selectedPayment.Beneficiary}</h3>
                            <div className="detail-value">{formatCurrency(selectedPayment.Value)}</div>
                            <div className="detail-date">Vencimento: {formatDate(selectedPayment.date)}</div>

                            {selectedPayment.totalInstallments && (
                                <div className="detail-installments">
                                    Parcela {selectedPayment.currentInstallment} de {selectedPayment.totalInstallments}
                                </div>
                            )}

                            <div className="detail-divider"></div>
                            <div className="detail-description-label">Descrição</div>
                            <p className="detail-description">
                                {selectedPayment.Description || "Sem descrição disponível."}
                            </p>
                        </div>
                    )}
                    {selectedInvoice && (
                        <div className="detail-card invoice-detail">
                            <div className="detail-category invoice-category">
                                NOTA FISCAL
                            </div>
                            <div className="detail-provider-badge">{selectedInvoice.Provider}</div>
                            <h3 className="detail-title">{selectedInvoice.Client}</h3>
                            <div className="detail-value income-value">{formatCurrency(selectedInvoice.Value)}</div>
                            <div className="detail-date">Emissão: {formatDate(selectedInvoice.date)}</div>

                            <div className="detail-divider"></div>
                            <div className="detail-description-label">Descrição</div>
                            <p className="detail-description">
                                {selectedInvoice.Description || "Sem descrição disponível."}
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    <div className="accounts-grid compact">
                        {Object.entries(
                            (accounts || []).reduce((groups, acc) => {
                                const name = acc.account;
                                if (!groups[name]) groups[name] = { total: 0, items: [] };
                                groups[name].total += parseFloat(acc.value) || 0;
                                groups[name].items.push(acc);
                                return groups;
                            }, {})
                        ).map(([owner, data]) => (
                            <div key={owner} className="account-box owner-group">
                                <div className="acc-label owner-label">{owner}</div>
                                <div className="acc-value owner-total">{formatCurrency(data.total)}</div>
                                <div className="owner-divider"></div>
                                <div className="owner-items">
                                    {data.items.map((item, idx) => (
                                        <div key={idx} className="owner-item-row">
                                            <div className="owner-bank-name" style={{ color: getBankStyle(item.bank).borderColor }}>{item.bank}</div>
                                            <div className="owner-item-val">{formatCurrency(parseFloat(item.value))}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div className="account-box total-box">
                            <div className="acc-label">Saldo Total Geral</div>
                            <div className="acc-value">
                                {formatCurrency(totalBalance)}
                            </div>
                        </div>

                        <div className="account-box available-box">
                            <div className="acc-label">Saldo Disponível</div>
                            <div className="acc-sub-label">Após pagar contas do mês</div>
                            <div className="acc-value">
                                {formatCurrency(availableBalance)}
                            </div>
                        </div>
                    </div>
                    {searchBox}
                    {categoryToggles}
                </>
            )}
        </>
    );

    // ==========================================
    // MOBILE: Bottom Sheet
    // ==========================================
    if (isMobile) {
        return (
            <>
                {/* Overlay */}
                <div
                    className={`mobile-sidebar-overlay ${isOpen ? 'open' : ''}`}
                    onClick={onClose}
                />

                {/* Bottom Sheet */}
                <div className={`mobile-sidebar ${isOpen ? 'open' : ''}`}>
                    <div className="mobile-sidebar-handle" />
                    <div className="mobile-sidebar-header">
                        <div className="brand">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="brand-icon">
                                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="#10B981" />
                                <path d="M11.5 8.5H10.5V7H13.5V8.5H12.5V11.5H14.5C15.33 11.5 16 12.17 16 13V15.5C16 16.33 15.33 17 14.5 17H13.5V18.5H10.5V17H11.5V14H9.5C8.67 14 8 13.33 8 12.5V10C8 9.17 8.67 8.5 9.5 8.5H11.5V8.5ZM10 10V12.5H12V10H10ZM12 14V16.5H14V14H12Z" fill="#34D399" />
                            </svg>
                            <h2>PayFlow</h2>
                        </div>
                        <button className="mobile-close-btn" onClick={onClose}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    {sidebarContent}
                </div>
            </>
        );
    }

    // ==========================================
    // DESKTOP: Sidebar
    // ==========================================
    return (
        <aside className="sidebar">
            <div className="brand">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="brand-icon">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="#10B981" />
                    <path d="M11.5 8.5H10.5V7H13.5V8.5H12.5V11.5H14.5C15.33 11.5 16 12.17 16 13V15.5C16 16.33 15.33 17 14.5 17H13.5V18.5H10.5V17H11.5V14H9.5C8.67 14 8 13.33 8 12.5V10C8 9.17 8.67 8.5 9.5 8.5H11.5V8.5ZM10 10V12.5H12V10H10ZM12 14V16.5H14V14H12Z" fill="#34D399" />
                </svg>
                <h2>PayFlow</h2>
            </div>
            {sidebarContent}
        </aside>
    );
}
