
// src/app/public/page.tsx
"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc, Timestamp as FirestoreTimestamp } from 'firebase/firestore';
import type { LogEntry } from '@/types';
import LogList from '@/components/LogList';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon } from 'lucide-react';
import AboutSection from '@/components/AboutSection';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

async function fetchLogTitles(logIds: string[]): Promise<string[]> {
  const titles: string[] = [];
  for (const id of logIds) {
    if (typeof id === 'string' && id.trim() !== '') {
      try {
        const logRef = doc(db, "logs", id);
        const logSnap = await getDoc(logRef);
        // For public logs, ensure related logs are also public if titles are to be shown,
        // or simply show a generic placeholder if not. For now, fetch title if exists.
        if (logSnap.exists() && logSnap.data()?.isPublic) {
          titles.push(logSnap.data()?.title || "Untitled Related Log");
        } else {
          titles.push("Private/Unknown Log"); // Or omit
        }
      } catch (e) {
        console.error(`Error fetching title for public related log ID ${id}:`, e);
        titles.push("Error fetching title");
      }
    }
  }
  return titles;
}


export default function PublicLogsPage() {
  const [publicLogs, setPublicLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchPublicLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const logsCollection = collection(db, 'logs');
      const q = query(
        logsCollection,
        where('isPublic', '==', true),
        orderBy('updatedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const logsDataPromises = querySnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        let relatedLogTitles: string[] = [];
        if (data.relatedLogIds && data.relatedLogIds.length > 0) {
          relatedLogTitles = await fetchLogTitles(data.relatedLogIds);
        }
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt instanceof FirestoreTimestamp ? data.createdAt.toDate().toISOString() : String(data.createdAt),
          updatedAt: data.updatedAt instanceof FirestoreTimestamp ? data.updatedAt.toDate().toISOString() : String(data.updatedAt),
          relatedLogIds: data.relatedLogIds || [],
          relatedLogTitles,
        } as LogEntry;
      });
      const fetchedLogs = await Promise.all(logsDataPromises);
      setPublicLogs(fetchedLogs);
    } catch (e) {
      console.error("Error fetching public logs:", e);
      setError("Failed to load public logs. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPublicLogs();
  }, [fetchPublicLogs]);

  const filteredLogs = useMemo(() => {
    if (!searchQuery) {
      return publicLogs;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return publicLogs.filter(log =>
      log.title.toLowerCase().includes(lowerCaseQuery) ||
      (log.description && log.description.toLowerCase().includes(lowerCaseQuery))
    );
  }, [publicLogs, searchQuery]);

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Loading public logs...</div>;
  }
  
  if (error) {
    return <div className="container mx-auto p-4 text-center text-destructive">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center">Public Logs</h1>
      <div className="mb-8 max-w-xl mx-auto">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search public logs by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
      </div>

      <div className="mb-8 max-w-2xl mx-auto">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="about-section">
            <AccordionTrigger className="text-muted-foreground hover:no-underline">
              About This Page & Comment Policy
            </AccordionTrigger>
            <AccordionContent>
              <AboutSection />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      
      <LogList 
        logs={filteredLogs} 
        showControls={false} // Controls like 'Edit' not typically shown on public list
        isListItem={true} // Indicate these are list items for compact view
        emptyStateMessage={searchQuery ? "No public logs match your search." : "No public logs available at the moment."}
      />
    </div>
  );
}

