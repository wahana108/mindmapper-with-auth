
// src/app/create-log/page.tsx
"use client";

import LogForm from '@/components/LogForm';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp as FirestoreTimestamp } from 'firebase/firestore';
import type { LogEntry } from '@/types';

function CreateOrEditLogPageContent() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editLogId = searchParams.get('edit');

  const [initialData, setInitialData] = useState<Partial<LogEntry> | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(!!editLogId); 

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authLoading, router]);

  useEffect(() => {
    if (editLogId && currentUser) {
      const fetchLogData = async () => {
        setIsLoadingData(true);
        try {
          const logRef = doc(db, 'logs', editLogId);
          const logSnap = await getDoc(logRef);
          if (logSnap.exists()) {
            const data = logSnap.data();
            if (data.ownerId !== currentUser.uid) {
                console.error("User is not authorized to edit this log.");
                router.push('/'); 
                return;
            }
            setInitialData({
              id: logSnap.id,
              ...data,
              createdAt: data.createdAt instanceof FirestoreTimestamp ? data.createdAt.toDate().toISOString() : String(data.createdAt),
              updatedAt: data.updatedAt instanceof FirestoreTimestamp ? data.updatedAt.toDate().toISOString() : String(data.updatedAt),
              relatedLogIds: data.relatedLogIds || [], // Ensure this is passed
            } as LogEntry);
          } else {
            console.error("Log not found for editing.");
            router.push('/'); 
          }
        } catch (error) {
          console.error("Error fetching log data for edit:", error);
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchLogData();
    } else {
        setIsLoadingData(false); 
    }
  }, [editLogId, currentUser, router]);

  const handleLogSave = (logId: string) => {
    console.log(`Log saved/updated with ID: ${logId}, redirecting to dashboard.`);
    router.push('/'); 
  };
  
  const isDeveloper = currentUser?.uid === 'REPLACE_WITH_YOUR_ACTUAL_GOOGLE_UID';

  if (authLoading || isLoadingData) {
    return <div className="container mx-auto p-4 text-center">Loading...</div>;
  }

  if (!currentUser) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p>You need to be logged in.</p>
        <Link href="/login" className="text-primary hover:underline">
          Go to Login
        </Link>
      </div>
    );
  }

  if (editLogId && !initialData && !isLoadingData) {
    return <div className="container mx-auto p-4 text-center">Log data for editing could not be loaded.</div>;
  }

  return (
    <div className="container mx-auto p-4 min-h-screen">
      <LogForm 
        initialData={initialData || { relatedLogIds: [] }} 
        onSave={handleLogSave} 
        isDeveloper={isDeveloper} 
      />
    </div>
  );
}

export default function CreateOrEditLogPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-4 text-center">Loading page...</div>}>
      <CreateOrEditLogPageContent />
    </Suspense>
  );
}
