import { useState, useRef, useEffect } from 'react';
import './CustomDatePicker.css';

type CustomDatePickerProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    error?: boolean;
    minDate?: string;
    maxDate?: string;
    name?: string;
};

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CustomDatePicker({
    value,
    onChange,
    placeholder = 'Select date',
    error = false,
    minDate,
    maxDate,
    name
}: CustomDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(() => {
        if (value) {
            // Parse YYYY-MM-DD without timezone issues
            const [year, month] = value.split('-').map(Number);
            return { month: month - 1, year };
        }
        const today = new Date();
        return { month: today.getMonth(), year: today.getFullYear() };
    });
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse date string (YYYY-MM-DD) to get day, month, year without timezone issues
    const parseDateString = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return { year, month: month - 1, day };
    };

    const selectedDate = value ? parseDateString(value) : null;
    const minDateParsed = minDate ? parseDateString(minDate) : null;
    const maxDateParsed = maxDate ? parseDateString(maxDate) : null;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatDisplayDate = (dateStr: string) => {
        // Parse the date string (YYYY-MM-DD) and create date in local timezone
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return new Intl.DateTimeFormat('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(date);
    };

    // Format date to YYYY-MM-DD string without timezone conversion
    const formatDateString = (year: number, month: number, day: number): string => {
        const mm = String(month + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        return `${year}-${mm}-${dd}`;
    };

    const getDaysInMonth = (month: number, year: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month: number, year: number) => {
        return new Date(year, month, 1).getDay();
    };

    const isDateDisabled = (day: number) => {
        const checkYear = viewDate.year;
        const checkMonth = viewDate.month;

        if (minDateParsed) {
            // Check if date is before minDate
            if (checkYear < minDateParsed.year) return true;
            if (checkYear === minDateParsed.year && checkMonth < minDateParsed.month) return true;
            if (checkYear === minDateParsed.year && checkMonth === minDateParsed.month && day < minDateParsed.day) return true;
        }

        if (maxDateParsed) {
            // Check if date is after maxDate
            if (checkYear > maxDateParsed.year) return true;
            if (checkYear === maxDateParsed.year && checkMonth > maxDateParsed.month) return true;
            if (checkYear === maxDateParsed.year && checkMonth === maxDateParsed.month && day > maxDateParsed.day) return true;
        }

        return false;
    };

    const isDateSelected = (day: number) => {
        if (!selectedDate) return false;
        return (
            selectedDate.day === day &&
            selectedDate.month === viewDate.month &&
            selectedDate.year === viewDate.year
        );
    };

    const isToday = (day: number) => {
        const today = new Date();
        return (
            today.getDate() === day &&
            today.getMonth() === viewDate.month &&
            today.getFullYear() === viewDate.year
        );
    };

    const handleDateSelect = (day: number) => {
        if (isDateDisabled(day)) return;

        const formattedDate = formatDateString(viewDate.year, viewDate.month, day);
        onChange(formattedDate);
        setIsOpen(false);
    };

    const handlePrevMonth = () => {
        setViewDate(prev => {
            if (prev.month === 0) {
                return { month: 11, year: prev.year - 1 };
            }
            return { month: prev.month - 1, year: prev.year };
        });
    };

    const handleNextMonth = () => {
        setViewDate(prev => {
            if (prev.month === 11) {
                return { month: 0, year: prev.year + 1 };
            }
            return { month: prev.month + 1, year: prev.year };
        });
    };

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setViewDate(prev => ({ ...prev, year: parseInt(e.target.value) }));
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setViewDate(prev => ({ ...prev, month: parseInt(e.target.value) }));
    };

    // Generate year options (100 years range)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 100 }, (_, i) => currentYear - 80 + i);

    // Generate calendar grid
    const daysInMonth = getDaysInMonth(viewDate.month, viewDate.year);
    const firstDay = getFirstDayOfMonth(viewDate.month, viewDate.year);
    const calendarDays: (number | null)[] = [];

    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
        calendarDays.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(day);
    }

    return (
        <div
            className={`custom-datepicker ${isOpen ? 'custom-datepicker--open' : ''} ${error ? 'custom-datepicker--error' : ''}`}
            ref={containerRef}
        >
            <button
                type="button"
                className="custom-datepicker__trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={`custom-datepicker__value ${!value ? 'custom-datepicker__value--placeholder' : ''}`}>
                    {value ? formatDisplayDate(value) : placeholder}
                </span>
                <svg
                    className="custom-datepicker__icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
            </button>

            {isOpen && (
                <div className="custom-datepicker__dropdown">
                    {/* Header with navigation */}
                    <div className="custom-datepicker__header">
                        <button
                            type="button"
                            className="custom-datepicker__nav-btn"
                            onClick={handlePrevMonth}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>

                        <div className="custom-datepicker__selectors">
                            <select
                                className="custom-datepicker__month-select"
                                value={viewDate.month}
                                onChange={handleMonthChange}
                            >
                                {MONTHS.map((month, index) => (
                                    <option key={month} value={index}>{month}</option>
                                ))}
                            </select>
                            <select
                                className="custom-datepicker__year-select"
                                value={viewDate.year}
                                onChange={handleYearChange}
                            >
                                {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="button"
                            className="custom-datepicker__nav-btn"
                            onClick={handleNextMonth}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                    </div>

                    {/* Days header */}
                    <div className="custom-datepicker__days-header">
                        {DAYS.map(day => (
                            <span key={day} className="custom-datepicker__day-label">{day}</span>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    <div className="custom-datepicker__calendar">
                        {calendarDays.map((day, index) => (
                            <div key={index} className="custom-datepicker__cell">
                                {day !== null && (
                                    <button
                                        type="button"
                                        className={`custom-datepicker__day 
                                            ${isDateSelected(day) ? 'custom-datepicker__day--selected' : ''} 
                                            ${isToday(day) ? 'custom-datepicker__day--today' : ''}
                                            ${isDateDisabled(day) ? 'custom-datepicker__day--disabled' : ''}`}
                                        onClick={() => handleDateSelect(day)}
                                        disabled={isDateDisabled(day)}
                                    >
                                        {day}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Today button */}
                    <div className="custom-datepicker__footer">
                        <button
                            type="button"
                            className="custom-datepicker__today-btn"
                            onClick={() => {
                                const today = new Date();
                                const todayFormatted = formatDateString(
                                    today.getFullYear(),
                                    today.getMonth(),
                                    today.getDate()
                                );
                                // Check if today is within allowed range
                                setViewDate({ month: today.getMonth(), year: today.getFullYear() });
                                if (!isDateDisabled(today.getDate())) {
                                    onChange(todayFormatted);
                                    setIsOpen(false);
                                }
                            }}
                        >
                            Today
                        </button>
                    </div>
                </div>
            )}

            {/* Hidden input for form submission */}
            {name && <input type="hidden" name={name} value={value} />}
        </div>
    );
}
