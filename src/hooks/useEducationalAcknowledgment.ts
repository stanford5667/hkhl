/**
 * Educational Acknowledgment Hook
 * 
 * Tracks whether the user has acknowledged the educational nature of the site.
 * Use this on key pages like Portfolio Explorer, Simulator, etc.
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'assetlabs_educational_acknowledged';
const EXPIRY_DAYS = 30; // Re-acknowledge every 30 days

interface AcknowledgmentData {
  acknowledged: boolean;
  timestamp: number;
}

export function useEducationalAcknowledgment() {
  const [hasAcknowledged, setHasAcknowledged] = useState(true); // Start true to prevent flash
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      
      if (!stored) {
        setHasAcknowledged(false);
        setShowDialog(true);
        setIsLoading(false);
        return;
      }

      const data: AcknowledgmentData = JSON.parse(stored);
      const now = Date.now();
      const expiryMs = EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      
      // Check if acknowledgment has expired
      if (now - data.timestamp > expiryMs) {
        setHasAcknowledged(false);
        setShowDialog(true);
      } else {
        setHasAcknowledged(data.acknowledged);
        setShowDialog(false);
      }
    } catch (error) {
      // If there's any error parsing, show the dialog
      setHasAcknowledged(false);
      setShowDialog(true);
    }
    
    setIsLoading(false);
  }, []);

  const acknowledge = useCallback(() => {
    const data: AcknowledgmentData = {
      acknowledged: true,
      timestamp: Date.now(),
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setHasAcknowledged(true);
    setShowDialog(false);
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHasAcknowledged(false);
    setShowDialog(true);
  }, []);

  return {
    hasAcknowledged,
    showDialog,
    isLoading,
    acknowledge,
    reset,
  };
}

/**
 * Hook for page-specific acknowledgment
 * Use when you want to track acknowledgment for specific features
 */
export function useFeatureAcknowledgment(featureKey: string) {
  const baseKey = `assetlabs_feature_ack_${featureKey}`;
  const [hasAcknowledged, setHasAcknowledged] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    const acknowledged = localStorage.getItem(baseKey);
    if (!acknowledged) {
      setHasAcknowledged(false);
      setShowDialog(true);
    }
  }, [baseKey]);

  const acknowledge = useCallback(() => {
    localStorage.setItem(baseKey, 'true');
    setHasAcknowledged(true);
    setShowDialog(false);
  }, [baseKey]);

  return { hasAcknowledged, showDialog, acknowledge };
}

export default useEducationalAcknowledgment;
