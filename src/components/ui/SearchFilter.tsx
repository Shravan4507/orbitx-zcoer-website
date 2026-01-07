import { useState, useRef, useEffect, type ReactNode } from 'react';
import './SearchFilter.css';

/* ===== Search Input Component ===== */
interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export function SearchInput({
    value,
    onChange,
    placeholder = "Search...",
    className = ""
}: SearchInputProps) {
    return (
        <div className={`search-input ${className}`}>
            <input
                type="text"
                className="search-input__field"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            {value && (
                <button
                    className="search-input__clear"
                    onClick={() => onChange('')}
                    aria-label="Clear search"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            )}
        </div>
    );
}

/* ===== Filter Dropdown Component ===== */
interface FilterOption {
    value: string;
    label: string;
}

interface FilterDropdownProps {
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
    className?: string;
    showBadge?: boolean;
}

export function FilterDropdown({
    options,
    value,
    onChange,
    className = "",
    showBadge = true
}: FilterDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const hasActiveFilter = value !== '' && value !== options[0]?.value;

    return (
        <div className={`filter-dropdown ${className}`} ref={ref}>
            <button
                className={`filter-dropdown__trigger ${isOpen ? 'filter-dropdown__trigger--active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Filter options"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                {showBadge && hasActiveFilter && (
                    <span className="filter-dropdown__badge"></span>
                )}
            </button>

            {isOpen && (
                <div className="filter-dropdown__menu">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            className={`filter-dropdown__item ${value === option.value ? 'filter-dropdown__item--active' : ''}`}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ===== Multi-Section Filter Dropdown ===== */
interface FilterSection {
    title?: string;
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
}

interface MultiFilterDropdownProps {
    sections: FilterSection[];
    className?: string;
}

export function MultiFilterDropdown({
    sections,
    className = ""
}: MultiFilterDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Check if any filter is active (not default)
    const hasActiveFilter = sections.some(section =>
        section.value !== '' && section.value !== section.options[0]?.value
    );

    return (
        <div className={`filter-dropdown ${className}`} ref={ref}>
            <button
                className={`filter-dropdown__trigger ${isOpen ? 'filter-dropdown__trigger--active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Filter options"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                {hasActiveFilter && (
                    <span className="filter-dropdown__badge"></span>
                )}
            </button>

            {isOpen && (
                <div className="filter-dropdown__menu">
                    {sections.map((section, sectionIndex) => (
                        <div key={sectionIndex}>
                            {sectionIndex > 0 && <div className="filter-dropdown__divider" />}
                            {section.title && (
                                <span className="filter-dropdown__section-title">{section.title}</span>
                            )}
                            {section.options.map((option) => (
                                <button
                                    key={option.value}
                                    className={`filter-dropdown__item ${section.value === option.value ? 'filter-dropdown__item--active' : ''}`}
                                    onClick={() => section.onChange(option.value)}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ===== Select Dropdown (Form Select) ===== */
interface SelectDropdownProps {
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    required?: boolean;
}

export function SelectDropdown({
    options,
    value,
    onChange,
    placeholder = "Select an option",
    className = "",
    required = false
}: SelectDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className={`select-dropdown ${className}`} ref={ref}>
            <button
                type="button"
                className={`select-dropdown__trigger ${isOpen ? 'select-dropdown__trigger--open' : ''} ${value ? 'select-dropdown__trigger--selected' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-required={required}
            >
                <span className={value ? '' : 'select-dropdown__placeholder'}>
                    {selectedOption?.label || placeholder}
                </span>
                <svg
                    className={`select-dropdown__arrow ${isOpen ? 'select-dropdown__arrow--open' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>

            {isOpen && (
                <div className="select-dropdown__menu">
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className={`select-dropdown__item ${value === option.value ? 'select-dropdown__item--active' : ''}`}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ===== Toolbar Container ===== */
interface ToolbarProps {
    children: ReactNode;
    className?: string;
}

export function Toolbar({ children, className = "" }: ToolbarProps) {
    return (
        <div className={`toolbar-wrapper ${className}`}>
            <div className="toolbar">
                {children}
            </div>
        </div>
    );
}
