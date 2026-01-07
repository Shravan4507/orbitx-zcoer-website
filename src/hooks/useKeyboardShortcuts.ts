import { useEffect, useCallback } from 'react';

type UseKeyboardShortcutsProps = {
    onEscape?: () => void;
    onShowHelp?: () => void;
    enabled?: boolean;
};

export function useKeyboardShortcuts({
    onEscape,
    onShowHelp,
    enabled = true
}: UseKeyboardShortcutsProps) {
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (!enabled) return;

        const target = event.target as HTMLElement;
        const isTyping = target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable;

        if (event.key === 'Escape' && onEscape) {
            event.preventDefault();
            onEscape();
            return;
        }

        if (isTyping) return;

        if (event.key === '?' && onShowHelp) {
            event.preventDefault();
            onShowHelp();
        }
    }, [enabled, onEscape, onShowHelp]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}
