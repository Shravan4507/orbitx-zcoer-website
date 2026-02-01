import { useState, useRef, useEffect, useCallback } from 'react';
import './Autocomplete.css';

interface AutocompleteProps {
    options: string[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    error?: boolean;
    maxSuggestions?: number;
}

export default function Autocomplete({
    options,
    value,
    onChange,
    placeholder = 'Start typing...',
    error = false,
    maxSuggestions = 8
}: AutocompleteProps) {
    const [inputValue, setInputValue] = useState(value);
    const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Update input when value changes externally
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    // Filter options based on input
    const filterOptions = useCallback((query: string) => {
        if (!query.trim()) {
            return [];
        }
        const lowerQuery = query.toLowerCase();
        return options
            .filter(option => option.toLowerCase().includes(lowerQuery))
            .slice(0, maxSuggestions);
    }, [options, maxSuggestions]);

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setFilteredOptions(filterOptions(newValue));
        setIsOpen(true);
        setHighlightedIndex(-1);

        // Clear the actual value when typing (user must select from list)
        if (value !== '') {
            onChange('');
        }
    };

    // Handle option selection
    const handleSelect = (option: string) => {
        setInputValue(option);
        onChange(option);
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
    };

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setFilteredOptions(filterOptions(inputValue));
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
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                    handleSelect(filteredOptions[highlightedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setHighlightedIndex(-1);
                break;
            case 'Tab':
                setIsOpen(false);
                break;
        }
    };

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const items = listRef.current.querySelectorAll('.autocomplete__option');
            const highlightedItem = items[highlightedIndex] as HTMLElement;
            if (highlightedItem) {
                highlightedItem.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                // If no valid selection was made, clear the input
                if (!options.includes(inputValue)) {
                    setInputValue(value);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [inputValue, value, options]);

    return (
        <div
            ref={containerRef}
            className={`autocomplete ${isOpen && filteredOptions.length > 0 ? 'autocomplete--open' : ''} ${error ? 'autocomplete--error' : ''}`}
        >
            <div className="autocomplete__input-wrapper">
                <input
                    ref={inputRef}
                    type="text"
                    className="autocomplete__input"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (inputValue.trim()) {
                            setFilteredOptions(filterOptions(inputValue));
                            setIsOpen(true);
                        }
                    }}
                    placeholder={placeholder}
                    autoComplete="off"
                />
                <span className="autocomplete__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </span>
            </div>

            {isOpen && filteredOptions.length > 0 && (
                <ul ref={listRef} className="autocomplete__dropdown">
                    {filteredOptions.map((option, index) => (
                        <li
                            key={option}
                            className={`autocomplete__option ${index === highlightedIndex ? 'autocomplete__option--highlighted' : ''
                                } ${option === value ? 'autocomplete__option--selected' : ''}`}
                            onClick={() => handleSelect(option)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                        >
                            {option}
                        </li>
                    ))}
                </ul>
            )}

            {isOpen && inputValue.trim() && filteredOptions.length === 0 && (
                <div className="autocomplete__dropdown autocomplete__no-results">
                    No matching colleges found
                </div>
            )}
        </div>
    );
}
