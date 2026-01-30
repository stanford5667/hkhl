/**
 * Builder History Hook
 * 
 * Provides undo/redo functionality for the Visual Strategy Builder.
 * Maintains a history stack of up to 50 states.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { CanvasBlock, Connection } from '@/lib/strategyBuilder/types';

export interface BuilderSnapshot {
  blocks: CanvasBlock[];
  connections: Connection[];
}

interface UseBuilderHistoryOptions {
  maxHistory?: number;
}

interface UseBuilderHistoryReturn {
  blocks: CanvasBlock[];
  connections: Connection[];
  setBlocks: (blocks: CanvasBlock[] | ((prev: CanvasBlock[]) => CanvasBlock[])) => void;
  setConnections: (connections: Connection[] | ((prev: Connection[]) => Connection[])) => void;
  pushSnapshot: (snapshot?: BuilderSnapshot) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyLength: number;
}

export function useBuilderHistory(
  initialBlocks: CanvasBlock[] = [],
  initialConnections: Connection[] = [],
  options: UseBuilderHistoryOptions = {}
): UseBuilderHistoryReturn {
  const { maxHistory = 50 } = options;

  // Current state
  const [blocks, setBlocksInternal] = useState<CanvasBlock[]>(initialBlocks);
  const [connections, setConnectionsInternal] = useState<Connection[]>(initialConnections);

  // History stacks
  const [undoStack, setUndoStack] = useState<BuilderSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<BuilderSnapshot[]>([]);

  // Track if we're currently undoing/redoing to avoid pushing to history
  const isUndoRedoRef = useRef(false);
  // Debounce timer for batching rapid changes
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSnapshotRef = useRef<BuilderSnapshot | null>(null);

  // Push current state to undo stack
  const pushSnapshot = useCallback((snapshot?: BuilderSnapshot) => {
    if (isUndoRedoRef.current) return;

    const snapshotToPush = snapshot || { blocks, connections };

    setUndoStack(prev => {
      const newStack = [...prev, snapshotToPush];
      // Limit history size
      if (newStack.length > maxHistory) {
        return newStack.slice(-maxHistory);
      }
      return newStack;
    });
    // Clear redo stack on new action
    setRedoStack([]);
  }, [blocks, connections, maxHistory]);

  // Debounced snapshot push (for parameter changes)
  const debouncedPushSnapshot = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }
    
    // Store current state
    pendingSnapshotRef.current = { blocks, connections };
    
    batchTimeoutRef.current = setTimeout(() => {
      if (pendingSnapshotRef.current) {
        pushSnapshot(pendingSnapshotRef.current);
        pendingSnapshotRef.current = null;
      }
    }, 500);
  }, [blocks, connections, pushSnapshot]);

  // Set blocks with history tracking
  const setBlocks = useCallback((
    blocksOrUpdater: CanvasBlock[] | ((prev: CanvasBlock[]) => CanvasBlock[])
  ) => {
    setBlocksInternal(prev => {
      const newBlocks = typeof blocksOrUpdater === 'function' 
        ? blocksOrUpdater(prev) 
        : blocksOrUpdater;
      
      // Only push to history for structural changes, not position/parameter tweaks
      if (!isUndoRedoRef.current) {
        const isStructuralChange = 
          newBlocks.length !== prev.length ||
          newBlocks.some(nb => !prev.find(pb => pb.id === nb.id));
        
        if (isStructuralChange) {
          // Push previous state before change
          setUndoStack(stack => {
            const newStack = [...stack, { blocks: prev, connections }];
            return newStack.length > maxHistory ? newStack.slice(-maxHistory) : newStack;
          });
          setRedoStack([]);
        }
      }
      
      return newBlocks;
    });
  }, [connections, maxHistory]);

  // Set connections with history tracking  
  const setConnections = useCallback((
    connsOrUpdater: Connection[] | ((prev: Connection[]) => Connection[])
  ) => {
    setConnectionsInternal(prev => {
      const newConnections = typeof connsOrUpdater === 'function'
        ? connsOrUpdater(prev)
        : connsOrUpdater;
      
      if (!isUndoRedoRef.current && newConnections.length !== prev.length) {
        setUndoStack(stack => {
          const newStack = [...stack, { blocks, connections: prev }];
          return newStack.length > maxHistory ? newStack.slice(-maxHistory) : newStack;
        });
        setRedoStack([]);
      }
      
      return newConnections;
    });
  }, [blocks, maxHistory]);

  // Undo
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;

    isUndoRedoRef.current = true;
    
    const prevSnapshot = undoStack[undoStack.length - 1];
    
    // Push current state to redo stack
    setRedoStack(prev => [...prev, { blocks, connections }]);
    
    // Pop from undo stack and apply
    setUndoStack(prev => prev.slice(0, -1));
    setBlocksInternal(prevSnapshot.blocks);
    setConnectionsInternal(prevSnapshot.connections);

    // Reset flag after state updates
    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 0);
  }, [undoStack, blocks, connections]);

  // Redo
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;

    isUndoRedoRef.current = true;

    const nextSnapshot = redoStack[redoStack.length - 1];
    
    // Push current state to undo stack
    setUndoStack(prev => [...prev, { blocks, connections }]);
    
    // Pop from redo stack and apply
    setRedoStack(prev => prev.slice(0, -1));
    setBlocksInternal(nextSnapshot.blocks);
    setConnectionsInternal(nextSnapshot.connections);

    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 0);
  }, [redoStack, blocks, connections]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z / Cmd+Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl+Y / Cmd+Shift+Z = Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);

  return {
    blocks,
    connections,
    setBlocks,
    setConnections,
    pushSnapshot: debouncedPushSnapshot,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    historyLength: undoStack.length,
  };
}
