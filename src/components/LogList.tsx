
// src/components/LogList.tsx
import type { LogEntry } from '@/types';
import LogItem from './LogItem';

interface LogListProps {
  logs?: LogEntry[];
  showControls?: boolean; 
  isListItem?: boolean; // New prop
  emptyStateMessage?: string;
  refreshKey?: number; // Add refreshKey prop
}

export default function LogList({ 
  logs, 
  showControls = false, 
  isListItem = false, // Default to false if not specified, true when used in lists
  emptyStateMessage = "No logs found." 
}: LogListProps) {
  if (!logs || logs.length === 0) {
    return <p className="text-center text-muted-foreground py-8">{emptyStateMessage}</p>;
  }

  return (
    <div className="space-y-6">
      {logs.map((log) => (
        <LogItem 
          key={log.id} 
          log={log} 
          showControls={showControls} 
          isDetailPage={!isListItem} // if it's a list item, it's not the detail page
        />
      ))}
    </div>
  );
}
