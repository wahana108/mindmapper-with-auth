
// src/components/CommentList.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp as FirestoreTimestamp } from 'firebase/firestore';
import type { CommentEntry } from '@/types';

interface CommentListProps {
  logId: string;
  refreshKey: number; 
}

export default function CommentList({ logId, refreshKey }: CommentListProps) {
  const [comments, setComments] = useState<CommentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!logId) return;

    setLoading(true);
    setError(null);

    const commentsCollection = collection(db, 'logs', logId, 'comments');
    const q = query(commentsCollection, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const commentsData = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt instanceof FirestoreTimestamp 
                       ? data.createdAt.toDate().toISOString() 
                       : typeof data.createdAt === 'string' 
                       ? data.createdAt
                       : new Date().toISOString(), 
          } as CommentEntry;
        });
        setComments(commentsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching comments:', err);
        setError('Failed to load comments.');
        setLoading(false);
      }
    );

    return () => unsubscribe(); 
  }, [logId, refreshKey]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading comments...</p>;
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (comments.length === 0) {
    return <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</p>;
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="p-3 bg-muted/50 rounded-md border">
          <div className="flex justify-between items-center mb-1">
            <p className="text-sm font-semibold">{comment.userName}</p>
            {/* Removed category display: 
            <p className="text-xs text-muted-foreground capitalize bg-secondary px-2 py-0.5 rounded-full">{comment.category}</p> 
            */}
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(comment.createdAt).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
