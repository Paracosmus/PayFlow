import { useMemo, useState, useEffect } from 'react';
import './Sidebar.css';

export default function Sidebar({ accounts, remainingToPay = 0, selectedPayment, selectedInvoice, onBack, isMobile = false, isOpen = false, onClose, categories = [], disabledCategories = new Set(), onToggleCategory, searchQuery = '', onSearch }) {
    const [localSearchInput, setLocalSearchInput] = useState(searchQuery);
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    const formatCurrency = (val, item = null) => {
        const brlFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

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

    const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('pt-BR');
    };

    const formatDescription = (description) => {
        if (!description) return "Sem descrição disponível.";

        // Split by semicolon and filter out empty parts
        const parts = description.split(';').map(part => part.trim()).filter(part => part.length > 0);

        // If only one part or no semicolons, return as is
        if (parts.length <= 1) {
            return description;
        }

        // Return each part as a separate line with spacing
        return parts.map((part, index) => (
            <span key={index} className="description-line">
                {part}
            </span>
        ));
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
            'periodicos': '#8b5cf6',
            'impostos': '#f97316',
            'manual': '#ec4899',
            'recorrentes': '#64748b',
            'compras': '#FFE600',
            'folha': '#db2777',
            'individual': '#06b6d4',
            'notas': '#10b981'
        };
        return colors[category] || '#64748b';
    };

    const categoryNames = {
        'boletos': 'Boletos',
        'financiamentos': 'Financ.',
        'emprestimos': 'Emprést.',
        'periodicos': 'Periódicos',
        'impostos': 'Impostos',
        'recorrentes': 'Recorr.',
        'compras': 'Compras',
        'folha': 'Folha',
        'individual': 'Individual',
        'notas': 'Notas'
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
                            <h3 className="detail-title">{selectedPayment.FullName || selectedPayment.Beneficiary}</h3>
                            <div className="detail-value">{formatCurrency(selectedPayment.Value, selectedPayment)}</div>
                            <div className="detail-date">Vencimento: {formatDate(selectedPayment.date)}</div>

                            {selectedPayment.totalInstallments && selectedPayment.totalInstallments > 1 && (
                                <div className="detail-installments">
                                    Parcela {selectedPayment.currentInstallment} de {selectedPayment.totalInstallments}
                                </div>
                            )}

                            {selectedPayment.category === 'compras' && selectedPayment.Shop && (
                                <div className="detail-shop">
                                    Loja: {selectedPayment.Shop}
                                </div>
                            )}

                            {selectedPayment.Interval && (selectedPayment.category === 'periodicos' || selectedPayment.category === 'individual') && (
                                <div className="detail-interval">
                                    {(() => {
                                        // Check if this is a weekly interval
                                        if (selectedPayment.IsWeekly) {
                                            const intervalStr = selectedPayment.IntervalStr || selectedPayment.Interval;
                                            const weekMatch = intervalStr.toString().match(/^(\d+)week$/i);
                                            if (weekMatch) {
                                                const weeks = parseInt(weekMatch[1]);
                                                if (weeks === 1) return 'Cobrança: Semanal';
                                                if (weeks === 2) return 'Cobrança: Quinzenal';
                                                return `Cobrança: A cada ${weeks} semanas`;
                                            }
                                        }

                                        // Monthly interval (original logic)
                                        const interval = parseInt(selectedPayment.Interval);
                                        if (interval === 1) return 'Cobrança: Mensal';
                                        if (interval === 12) return 'Cobrança: Anual';
                                        if (interval === 6) return 'Cobrança: Semestral';
                                        if (interval === 3) return 'Cobrança: Trimestral';
                                        if (interval === 2) return 'Cobrança: Bimestral';
                                        return `Cobrança: A cada ${interval} meses`;
                                    })()}
                                </div>
                            )}

                            <div className="detail-divider"></div>
                            <div className="detail-description-label">Descrição</div>
                            <p className="detail-description">
                                {formatDescription(selectedPayment.Description)}
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
                            <div className="detail-value income-value">{formatCurrency(selectedInvoice.Value, selectedInvoice)}</div>
                            <div className="detail-date">Emissão: {formatDate(selectedInvoice.date)}</div>

                            <div className="detail-divider"></div>
                            <div className="detail-description-label">Descrição</div>
                            <p className="detail-description">
                                {formatDescription(selectedInvoice.Description)}
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
                            <div className="acc-label">Soma das contas bancárias</div>
                            <div className="acc-value">
                                {formatCurrency(totalBalance)}
                            </div>
                        </div>

                        <div className={`account-box available-box ${availableBalance > 0 ? 'positive' : ''}`}>
                            <div className="acc-label">Saldo no Final do Mês</div>
                            <div className="acc-sub-label">Após pagar todas as contas deste mês</div>
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
                        {deferredPrompt && (
                            <button className="mobile-install-btn" onClick={handleInstallClick} title="Instalar App">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                <span style={{ marginLeft: '8px', fontSize: '0.9rem' }}>Instalar</span>
                            </button>
                        )}
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
