import { useRef, useEffect, useState } from 'react';
import './MonthTabs.css';

export default function MonthTabs({ tabs, activeDate, onTabClick }) {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    // Handle resize for responsive detection
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Helper to check if two dates are same month/year
    const isSameMonth = (d1, d2) => {
        return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
    };

    // Find current tab index
    const currentTabIndex = tabs.findIndex(t => isSameMonth(t.date, activeDate));

    // Navigate to previous/next month
    const goToPrevMonth = () => {
        if (currentTabIndex > 0) {
            onTabClick(tabs[currentTabIndex - 1].date);
        }
    };

    const goToNextMonth = () => {
        if (currentTabIndex < tabs.length - 1) {
            onTabClick(tabs[currentTabIndex + 1].date);
        }
    };

    // Auto-scroll to active tab (desktop)
    const scrollRef = useRef(null);
    useEffect(() => {
        if (scrollRef.current && !isMobile) {
            const activeEl = scrollRef.current.querySelector('.active');
            if (activeEl) {
                activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [activeDate, isMobile]);

    // Handle mouse wheel for horizontal scrolling (desktop)
    const handleWheel = (e) => {
        if (scrollRef.current && !isMobile) {
            scrollRef.current.scrollLeft += e.deltaY;
        }
    };

    // Format month name
    const getMonthName = (date) => {
        return date.toLocaleDateString('pt-BR', { month: 'long' }).replace(/^\w/, c => c.toUpperCase());
    };

    // ==========================================
    // MOBILE LAYOUT: Arrow Navigation + Toggle
    // ==========================================
    if (isMobile) {
        return (
            <div className="mobile-month-nav">
                <button
                    className="mobile-nav-btn"
                    onClick={goToPrevMonth}
                    disabled={currentTabIndex <= 0}
                    aria-label="Mês anterior"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>

                <div className="mobile-month-display">
                    <span className="mobile-month-name">{getMonthName(activeDate)}</span>
                    <span className="mobile-month-year">{activeDate.getFullYear()}</span>
                </div>

                <button
                    className="mobile-nav-btn"
                    onClick={goToNextMonth}
                    disabled={currentTabIndex >= tabs.length - 1}
                    aria-label="Próximo mês"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </button>
            </div>
        );
    }

    // ==========================================
    // DESKTOP LAYOUT: Scrollable Tabs
    // ==========================================
    return (
        <div
            className="month-tabs-container"
            ref={scrollRef}
            onWheel={handleWheel}
        >
            {tabs.map((tab, index) => {
                const isActive = isSameMonth(tab.date, activeDate);
                const monthName = tab.date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
                const yearNum = tab.date.getFullYear();

                return (
                    <button
                        key={index}
                        className={`tab-btn ${isActive ? 'active' : ''}`}
                        onClick={() => onTabClick(tab.date)}
                    >
                        <span className="t-month">{monthName}</span>
                        <span className="t-year">{yearNum}</span>
                    </button>
                );
            })}
        </div>
    );
}
