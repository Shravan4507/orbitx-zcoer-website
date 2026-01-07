import { useState, useRef, useEffect } from 'react';
import './CustomTimePicker.css';

type CustomTimePickerProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    error?: boolean;
    name?: string;
};

// Generate hours (1-12)
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

// Generate minutes (00, 15, 30, 45 for simplicity, or all 00-59)
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

const PERIODS = ['AM', 'PM'];

export default function CustomTimePicker({
    value,
    onChange,
    placeholder = 'Select time',
    error = false,
    name
}: CustomTimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse value (HH:MM format in 24h) to display
    const parseValue = (val: string) => {
        if (!val) return { hour: '12', minute: '00', period: 'AM' };

        const [hours, minutes] = val.split(':');
        const h = parseInt(hours, 10);
        const period = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;

        return {
            hour: String(hour12).padStart(2, '0'),
            minute: minutes || '00',
            period
        };
    };

    const parsed = parseValue(value);
    const [selectedHour, setSelectedHour] = useState(parsed.hour);
    const [selectedMinute, setSelectedMinute] = useState(parsed.minute);
    const [selectedPeriod, setSelectedPeriod] = useState(parsed.period);

    // Update local state when value prop changes
    useEffect(() => {
        const p = parseValue(value);
        setSelectedHour(p.hour);
        setSelectedMinute(p.minute);
        setSelectedPeriod(p.period);
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatDisplayTime = () => {
        if (!value) return '';
        return `${selectedHour}:${selectedMinute} ${selectedPeriod}`;
    };

    const handleConfirm = () => {
        // Convert to 24h format for storage
        let hour24 = parseInt(selectedHour, 10);
        if (selectedPeriod === 'PM' && hour24 !== 12) {
            hour24 += 12;
        } else if (selectedPeriod === 'AM' && hour24 === 12) {
            hour24 = 0;
        }

        const formatted = `${String(hour24).padStart(2, '0')}:${selectedMinute}`;
        onChange(formatted);
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange('');
        setIsOpen(false);
    };

    return (
        <div
            className={`custom-time-picker ${isOpen ? 'custom-time-picker--open' : ''} ${error ? 'custom-time-picker--error' : ''}`}
            ref={containerRef}
        >
            <input type="hidden" name={name} value={value} />

            <button
                type="button"
                className="custom-time-picker__trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={value ? '' : 'custom-time-picker__placeholder'}>
                    {value ? formatDisplayTime() : placeholder}
                </span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
            </button>

            {isOpen && (
                <div className="custom-time-picker__dropdown">
                    <div className="custom-time-picker__columns">
                        <div className="custom-time-picker__column">
                            <span className="custom-time-picker__column-label">Hour</span>
                            <div className="custom-time-picker__scroll">
                                {HOURS.map(hour => (
                                    <button
                                        key={hour}
                                        type="button"
                                        className={`custom-time-picker__option ${selectedHour === hour ? 'custom-time-picker__option--selected' : ''}`}
                                        onClick={() => setSelectedHour(hour)}
                                    >
                                        {hour}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="custom-time-picker__column">
                            <span className="custom-time-picker__column-label">Min</span>
                            <div className="custom-time-picker__scroll">
                                {MINUTES.map(minute => (
                                    <button
                                        key={minute}
                                        type="button"
                                        className={`custom-time-picker__option ${selectedMinute === minute ? 'custom-time-picker__option--selected' : ''}`}
                                        onClick={() => setSelectedMinute(minute)}
                                    >
                                        {minute}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="custom-time-picker__column custom-time-picker__column--period">
                            <span className="custom-time-picker__column-label">Period</span>
                            <div className="custom-time-picker__scroll">
                                {PERIODS.map(period => (
                                    <button
                                        key={period}
                                        type="button"
                                        className={`custom-time-picker__option ${selectedPeriod === period ? 'custom-time-picker__option--selected' : ''}`}
                                        onClick={() => setSelectedPeriod(period)}
                                    >
                                        {period}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="custom-time-picker__actions">
                        <button
                            type="button"
                            className="custom-time-picker__btn custom-time-picker__btn--clear"
                            onClick={handleClear}
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            className="custom-time-picker__btn custom-time-picker__btn--confirm"
                            onClick={handleConfirm}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
