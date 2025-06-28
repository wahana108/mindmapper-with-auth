
// src/app/search/page.tsx
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy, Timestamp as FirestoreTimestamp } from 'firebase/firestore';
import type { LogEntry, LikedLogEntry } from '@/types';
import LogList from '@/components/LogList';
import { Input } from '@/components/ui/input';
import { Search as SearchIcon } from 'lucide-react';
import Link from 'next/link';

async function fetchLogTitles(logIds: string[]): Promise<string[]> {
  const titles: string[] = [];
  for (const id of logIds) {
    if (typeof id === 'string' && id.trim() !== '') {
      try {
        const logRef = doc(db, "logs", id);
        const logSnap = await getDoc(logRef);
        if (logSnap.exists()) {
          titles.push(logSnap.data()?.title || "Untitled Related Log");
        } else {
          titles.push("Deleted/Unknown Log");
        }
      } catch (e) {
        console.error(`Error fetching title for related log ID ${id}:`, e);
        titles.push("Error fetching title");
      }
    }
  }
  return titles;
}

export default function SearchPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [userLogs, setUserLogs] = useState<LogEntry[]>([]);
  const [likedLogs, setLikedLogs] = useState<LogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authLoading, router]);

  useEffect(() => {
    if (currentUser) {
      const fetchLogs = async () => {
        setIsLoadingLogs(true);
        setError(null);
        try {
          // Fetch user's own logs
          const ownLogsQuery = query(
            collection(db, 'logs'),
            where('ownerId', '==', currentUser.uid),
            orderBy('updatedAt', 'desc')
          );
          const ownLogsSnapshot = await getDocs(ownLogsQuery);
          const fetchedUserLogsPromises = ownLogsSnapshot.docs.map(async (docSnap) => {
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
          const fetchedUserLogs = await Promise.all(fetchedUserLogsPromises);
          setUserLogs(fetchedUserLogs);

          // Fetch liked logs
          const likedLogsRef = collection(db, 'users', currentUser.uid, 'likedLogs');
          const likedLogsSnapshot = await getDocs(likedLogsRef);
          const likedLogEntries = likedLogsSnapshot.docs.map(docSnap => docSnap.data() as LikedLogEntry);
          
          const fetchedLikedLogsPromises = likedLogEntries.map(async (likedEntry) => {
            if (!likedEntry.logId) return null;
            const logDocRef = doc(db, 'logs', likedEntry.logId);
            const logDocSnap = await getDoc(logDocRef);
            if (logDocSnap.exists()) {
              const data = logDocSnap.data();
              let relatedLogTitles: string[] = [];
              if (data.relatedLogIds && data.relatedLogIds.length > 0) {
                relatedLogTitles = await fetchLogTitles(data.relatedLogIds);
              }
              return {
                id: logDocSnap.id,
                ...data,
                createdAt: data.createdAt instanceof FirestoreTimestamp ? data.createdAt.toDate().toISOString() : String(data.createdAt),
                updatedAt: data.updatedAt instanceof FirestoreTimestamp ? data.updatedAt.toDate().toISOString() : String(data.updatedAt),
                relatedLogIds: data.relatedLogIds || [],
                relatedLogTitles,
              } as LogEntry;
            }
            return null;
          });
          const fetchedLikedLogs = (await Promise.all(fetchedLikedLogsPromises)).filter(log => log !== null) as LogEntry[];
          setLikedLogs(fetchedLikedLogs);

        } catch (e) {
          console.error("Error fetching logs for search:", e);
          setError("Failed to load logs. Please try again.");
        } finally {
          setIsLoadingLogs(false);
        }
      };
      fetchLogs();
    }
  }, [currentUser]);

  const combinedLogs = useMemo(() => {
    const allLogsMap = new Map<string, LogEntry>();
    userLogs.forEach(log => allLogsMap.set(log.id!, log));
    likedLogs.forEach(log => {
      if (log.id) { 
         allLogsMap.set(log.id, log);
      }
    });
    return Array.from(allLogsMap.values()).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [userLogs, likedLogs]);

  const filteredLogs = useMemo(() => {
    if (!searchQuery) {
      return combinedLogs;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return combinedLogs.filter(log =>
      log.title.toLowerCase().includes(lowerCaseQuery) ||
      (log.description && log.description.toLowerCase().includes(lowerCaseQuery))
    );
  }, [combinedLogs, searchQuery]);

  if (authLoading || isLoadingLogs) {
    return <div className="container mx-auto p-4 text-center">Loading your logs...</div>;
  }

  if (!currentUser) {
    return (
       <div className="container mx-auto p-4 text-center">
        <p>Please log in to access your private search.</p>
        <Link href="/login" className="text-primary hover:underline">Go to Login</Link>
      </div>
    );
  }
  
  if (error) {
    return <div className="container mx-auto p-4 text-center text-destructive">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Your Private Search</h1>
      <div className="mb-8">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search your created and liked logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full md:w-1/2"
          />
        </div>
      </div>
      
      <LogList 
        logs={filteredLogs} 
        showControls={true} 
        isListItem={true} // Indicate these are list items for compact view
        emptyStateMessage={searchQuery ? "No logs match your search." : "You haven't created or liked any logs yet."}
      />
    </div>
  );
}
