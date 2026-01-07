import { useState } from 'react';
import './KeyboardShortcuts.css';

type KeyboardShortcutsProps = {
    isOpen: boolean;
    onClose: () => void;
};

const SHORTCUTS = [
    { key: 'Esc', description: 'Close any open overlay' },
    { key: '?', description: 'Show this help' }
];

export default function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 200);
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className={`shortcuts-overlay ${isClosing ? 'shortcuts-overlay--closing' : ''}`}
            onClick={handleBackdropClick}
        >
            <div className="shortcuts-modal">
                <div className="shortcuts-header">
                    <h2 className="shortcuts-title">Keyboard Shortcuts</h2>
                    <button className="shortcuts-close" onClick={handleClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div className="shortcuts-list">
                    {SHORTCUTS.map((shortcut, index) => (
                        <div key={index} className="shortcuts-item">
                            <kbd className="shortcuts-key">{shortcut.key}</kbd>
                            <span className="shortcuts-desc">{shortcut.description}</span>
                        </div>
                    ))}
                </div>
                <p className="shortcuts-hint">Press <kbd>?</kbd> anytime to see shortcuts</p>
            </div>
        </div>
    );
}
