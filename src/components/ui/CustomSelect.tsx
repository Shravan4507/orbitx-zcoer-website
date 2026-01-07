import { useState, useRef, useEffect } from 'react';
import './CustomSelect.css';

type Option = {
    value: string;
    label: string;
};

type CustomSelectProps = {
    options: readonly Option[] | Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    error?: boolean;
    searchable?: boolean;
    name?: string;
    disabled?: boolean;
};

export default function CustomSelect({
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    error = false,
    searchable = false,
    name,
    disabled = false
}: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const optionsListRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    const filteredOptions = searchable && searchTerm
        ? options.filter(opt =>
            opt.label.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : options;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && searchable && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen, searchable]);

    useEffect(() => {
        if (isOpen && highlightedIndex >= 0 && optionsListRef.current) {
            const highlightedElement = optionsListRef.current.children[highlightedIndex] as HTMLElement;
            if (highlightedElement) {
                highlightedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex, isOpen]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < filteredOptions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
                    handleSelect(filteredOptions[highlightedIndex].value);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setSearchTerm('');
                setHighlightedIndex(-1);
                break;
        }
    };

    const handleTriggerClick = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };

    return (
        <div
            className={`custom-select ${isOpen ? 'custom-select--open' : ''} ${error ? 'custom-select--error' : ''} ${disabled ? 'custom-select--disabled' : ''}`}
            ref={containerRef}
            onKeyDown={handleKeyDown}
        >
            <button
                type="button"
                className="custom-select__trigger"
                onClick={handleTriggerClick}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                disabled={disabled}
            >
                <span className={`custom-select__value ${!selectedOption ? 'custom-select__value--placeholder' : ''}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <svg
                    className={`custom-select__arrow ${isOpen ? 'custom-select__arrow--open' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>

            {isOpen && (
                <div className="custom-select__dropdown">
                    {searchable && (
                        <div className="custom-select__search">
                            <input
                                ref={searchInputRef}
                                type="text"
                                className="custom-select__search-input"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setHighlightedIndex(-1);
                                }}
                                onClick={(e) => e.stopPropagation()}
                            />
                            <svg
                                className="custom-select__search-icon"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.3-4.3"></path>
                            </svg>
                        </div>
                    )}

                    <div
                        className="custom-select__options"
                        role="listbox"
                        ref={optionsListRef}
                    >
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, index) => (
                                <div
                                    key={option.value}
                                    className={`custom-select__option 
                                        ${option.value === value ? 'custom-select__option--selected' : ''} 
                                        ${index === highlightedIndex ? 'custom-select__option--highlighted' : ''}`}
                                    onClick={() => handleSelect(option.value)}
                                    role="option"
                                    aria-selected={option.value === value}
                                >
                                    {option.label}
                                    {option.value === value && (
                                        <svg
                                            className="custom-select__check"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="custom-select__no-results">
                                No options found
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Hidden input for form submission */}
            {name && <input type="hidden" name={name} value={value} />}
        </div>
    );
}
