import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const DISMISSED_KEY = 'market-data-banner-dismissed';

/**
 * This banner is no longer needed since we use server-side Polygon.
 * Kept as a no-op for any remaining imports.
 */
export function FinnhubApiBanner() {
  // Polygon is configured server-side, so this banner never shows
  return null;
}
