import { useState, useCallback, useEffect, useRef } from 'react';

interface UseListSelectionOptions<T> {
  items: T[];
  getItemId: (item: T) => string;
  onOpenDetail?: (item: T) => void;
  enabled?: boolean;
}

interface UseListSelectionReturn<T> {
  selectedId: string | null;
  selectedItem: T | null;
  selectItem: (id: string | null) => void;
  handleItemClick: (item: T) => void;
  handleItemDoubleClick: (item: T) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function useListSelection<T>({
  items,
  getItemId,
  onOpenDetail,
  enabled = true,
}: UseListSelectionOptions<T>): UseListSelectionReturn<T> {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastClickTimeRef = useRef<number>(0);
  const lastClickIdRef = useRef<string | null>(null);

  const selectedItem = items.find((item) => getItemId(item) === selectedId) || null;

  const selectItem = useCallback((id: string | null) => {
    if (!enabled) return;
    setSelectedId(id);
  }, [enabled]);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedId === id,
    [selectedId]
  );

  const handleItemClick = useCallback(
    (item: T) => {
      if (!enabled) return;
      
      const itemId = getItemId(item);
      const now = Date.now();
      
      // Check for double-click (within 300ms on same item)
      if (
        lastClickIdRef.current === itemId &&
        now - lastClickTimeRef.current < 300
      ) {
        // Double-click detected
        onOpenDetail?.(item);
        lastClickTimeRef.current = 0;
        lastClickIdRef.current = null;
        return;
      }
      
      // Single click - select the item
      lastClickTimeRef.current = now;
      lastClickIdRef.current = itemId;
      setSelectedId(itemId);
    },
    [enabled, getItemId, onOpenDetail]
  );

  const handleItemDoubleClick = useCallback(
    (item: T) => {
      if (!enabled) return;
      onOpenDetail?.(item);
    },
    [enabled, onOpenDetail]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!enabled || items.length === 0) return;

      const currentIndex = selectedId
        ? items.findIndex((item) => getItemId(item) === selectedId)
        : -1;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < items.length - 1) {
            setSelectedId(getItemId(items[currentIndex + 1]));
          } else if (currentIndex === -1 && items.length > 0) {
            setSelectedId(getItemId(items[0]));
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            setSelectedId(getItemId(items[currentIndex - 1]));
          }
          break;

        case 'Enter':
          e.preventDefault();
          if (selectedItem) {
            onOpenDetail?.(selectedItem);
          }
          break;

        case 'Escape':
          e.preventDefault();
          clearSelection();
          break;
      }
    },
    [enabled, items, selectedId, selectedItem, getItemId, onOpenDetail, clearSelection]
  );

  // Click outside to deselect
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        // Don't clear if clicking on a preview card
        const target = e.target as HTMLElement;
        if (target.closest('[data-quick-preview]')) return;
        
        clearSelection();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [clearSelection]);

  return {
    selectedId,
    selectedItem,
    selectItem,
    handleItemClick,
    handleItemDoubleClick,
    handleKeyDown,
    clearSelection,
    isSelected,
    containerRef,
  };
}
