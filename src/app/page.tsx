
// src/app/page.tsx (Dashboard)
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc, Timestamp as FirestoreTimestamp } from 'firebase/firestore';
import type { LogEntry } from '@/types';
import LogList from '@/components/LogList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

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

export default function DashboardPage() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [userLogs, setUserLogs] = useState<LogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, loading, router]);

  useEffect(() => {
    if (currentUser) {
      const fetchUserLogs = async () => {
        setIsLoadingLogs(true);
        try {
          const logsCollection = collection(db, 'logs');
          const q = query(
            logsCollection,
            where('ownerId', '==', currentUser.uid),
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
          const logsData = await Promise.all(logsDataPromises);
          setUserLogs(logsData);
        } catch (error) {
          console.error("Error fetching user's logs:", error);
        } finally {
          setIsLoadingLogs(false);
        }
      };
      fetchUserLogs();
    }
  }, [currentUser]);

  if (loading || isLoadingLogs) {
    return <div className="container mx-auto p-4 text-center">Loading dashboard...</div>;
  }

  if (!currentUser) {
    return null; 
  }

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Logs</h1>
        <Link href="/create-log">
          <Button>
            <PlusCircle size={20} className="mr-2" /> Create New Log
          </Button>
        </Link>
      </div>
      
      <LogList 
        logs={userLogs} 
        showControls={true} 
        isListItem={true} // Indicate these are list items for compact view
        emptyStateMessage="You haven't created any logs yet. Get started by creating one!"
      />
    </div>
  );
}
