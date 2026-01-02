import React from 'react';
import { cn } from '@/lib/utils';
import { QuickPreviewEmpty } from './QuickPreview';

interface SelectableListLayoutProps {
  listContent: React.ReactNode;
  previewContent: React.ReactNode | null;
  hasSelection: boolean;
  emptyMessage?: string;
  className?: string;
}

/**
 * Layout wrapper for lists with inline QuickPreview
 * - Desktop: 60/40 split when item selected
 * - Mobile: Preview appears below list (or as bottom sheet)
 */
export function SelectableListLayout({
  listContent,
  previewContent,
  hasSelection,
  emptyMessage = 'Select an item to preview',
  className,
}: SelectableListLayoutProps) {
  return (
    <div className={cn('flex flex-col lg:flex-row gap-4 lg:gap-6', className)}>
      {/* List Section */}
      <div
        className={cn(
          'transition-all duration-200',
          hasSelection ? 'lg:w-[60%]' : 'w-full'
        )}
      >
        {listContent}
      </div>

      {/* Preview Section - Desktop */}
      <div
        className={cn(
          'hidden lg:block transition-all duration-200',
          hasSelection ? 'lg:w-[40%] opacity-100' : 'lg:w-0 opacity-0 overflow-hidden'
        )}
      >
        {hasSelection && previewContent ? (
          <div className="sticky top-4">{previewContent}</div>
        ) : (
          hasSelection && <QuickPreviewEmpty message={emptyMessage} />
        )}
      </div>

      {/* Preview Section - Mobile (bottom sheet style) */}
      {hasSelection && previewContent && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t shadow-lg animate-in slide-in-from-bottom duration-200">
          <div className="max-h-[50vh] overflow-y-auto">{previewContent}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Wrapper for individual list items to make them selectable
 */
interface SelectableListItemProps {
  isSelected: boolean;
  onClick: () => void;
  onDoubleClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function SelectableListItem({
  isSelected,
  onClick,
  onDoubleClick,
  children,
  className,
}: SelectableListItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onDoubleClick?.();
      }}
      className={cn(
        'cursor-pointer transition-all duration-150',
        'hover:bg-muted/50',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
        isSelected && 'bg-primary/5 ring-2 ring-primary/20',
        className
      )}
    >
      {children}
    </div>
  );
}
