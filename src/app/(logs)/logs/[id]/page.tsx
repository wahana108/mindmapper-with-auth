
// src/app/(logs)/logs/[id]/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { notFound, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from "@/lib/firebase";
import { doc, getDoc, Timestamp as FirestoreTimestamp } from "firebase/firestore";
import type { LogEntry } from "@/types";
import LogItem from "@/components/LogItem";
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

// Helper function to fetch related titles, can be used client-side
async function fetchRelatedLogTitles(relatedLogIds: string[]): Promise<string[]> {
  const titles: string[] = [];
  for (const relatedId of relatedLogIds) {
    if (typeof relatedId === 'string' && relatedId.trim() !== '') {
      try {
        const relatedLogRef = doc(db, "logs", relatedId);
        const relatedLogSnap = await getDoc(relatedLogRef);
        if (relatedLogSnap.exists()) {
          const relatedLogData = relatedLogSnap.data();
          // On the client, we can't know if it's public or private without an extra check,
          // but for simplicity, we just grab the title. The link will handle access.
          titles.push(relatedLogData.title || "Untitled Related Log");
        } else {
          titles.push("Deleted/Unknown Log");
        }
      } catch (e) {
        console.warn(`Could not fetch title for related log ${relatedId}:`, e);
        titles.push("Title Unavailable");
      }
    }
  }
  return titles;
}

export default function LogDetailPage() {
  const { currentUser } = useAuth();
  const params = useParams();
  const id = params.id as string;

  const [logData, setLogData] = useState<LogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchLog = async () => {
      setLoading(true);
      setError(null);
      try {
        const logRef = doc(db, "logs", id);
        const logSnap = await getDoc(logRef);

        if (!logSnap.exists()) {
          setError("Log not found.");
          setLoading(false);
          return;
        }

        const data = logSnap.data();
        const isOwner = currentUser && data.ownerId === currentUser.uid;

        // Security Check: User can only view if it's public or they are the owner.
        if (!data.isPublic && !isOwner) {
          setError("You do not have permission to view this log.");
          setLoading(false);
          return;
        }

        // Fetch related log titles client-side
        const relatedLogTitles = data.relatedLogIds ? await fetchRelatedLogTitles(data.relatedLogIds) : [];

        const finalLogData: LogEntry = {
          id: logSnap.id,
          ...data,
          createdAt: data.createdAt instanceof FirestoreTimestamp ? data.createdAt.toDate().toISOString() : String(data.createdAt),
          updatedAt: data.updatedAt instanceof FirestoreTimestamp ? data.updatedAt.toDate().toISOString() : String(data.updatedAt),
          relatedLogIds: data.relatedLogIds || [],
          relatedLogTitles: relatedLogTitles,
        } as LogEntry;

        setLogData(finalLogData);

      } catch (e) {
        console.error("Error fetching log:", e);
        setError("Failed to fetch log data.");
      } finally {
        setLoading(false);
      }
    };

    fetchLog();
  }, [id, currentUser]); // Re-fetch if user logs in/out

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <Card className="w-full">
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    // For a "not found" error, we use Next.js's notFound utility
    if (error.includes("not found")) {
        notFound();
    }
    // For other errors, we display a message
    return <div className="container mx-auto p-4 text-center text-destructive">{error}</div>;
  }

  if (!logData) {
    return null; // Should be covered by loading/error states
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <LogItem log={logData} showControls={true} isDetailPage={true} />
    </div>
  );
}
