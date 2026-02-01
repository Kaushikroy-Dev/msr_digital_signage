import { useState, useCallback, useEffect, useRef } from 'react';

export function useTemplateUndoRedo(initialZones) {
    const [history, setHistory] = useState([initialZones || []]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const prevZonesRef = useRef(initialZones);

    const isInitializedRef = useRef(false);

    // Update history when initialZones changes (e.g., when loading a template)
    useEffect(() => {
        const currentZones = Array.isArray(initialZones) ? initialZones : [];
        // Only reset history if this is the first initialization and we have zones
        if (!isInitializedRef.current && currentZones.length > 0) {
            setHistory([currentZones]);
            setHistoryIndex(0);
            prevZonesRef.current = currentZones;
            isInitializedRef.current = true;
        }
    }, [initialZones]);

    const currentZones = history[historyIndex] || initialZones || [];

    const pushToHistory = useCallback((zones) => {
        setHistory(prevHistory => {
            const newHistory = prevHistory.slice(0, historyIndex + 1);
            newHistory.push(zones);
            setHistoryIndex(newHistory.length - 1);
            return newHistory;
        });
    }, [historyIndex]);

    const undo = useCallback(() => {
        setHistoryIndex(prev => {
            if (prev > 0) {
                return prev - 1;
            }
            return prev;
        });
    }, []);

    const redo = useCallback(() => {
        setHistoryIndex(prev => {
            if (prev < history.length - 1) {
                return prev + 1;
            }
            return prev;
        });
    }, [history.length]);

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    return {
        currentZones,
        pushToHistory,
        undo,
        redo,
        canUndo,
        canRedo
    };
}
