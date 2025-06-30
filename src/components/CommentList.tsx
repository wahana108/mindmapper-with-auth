

// src/components/CommentList.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp as FirestoreTimestamp, doc, deleteDoc } from 'firebase/firestore';
import type { CommentEntry } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface CommentListProps {
  logId: string;
  refreshKey: number; 
}

export default function CommentList({ logId, refreshKey }: CommentListProps) {
  const [comments, setComments] = useState<CommentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();

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

  const handleDelete = async (commentId: string) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) {
      return;
    }
    try {
      const commentRef = doc(db, 'logs', logId, 'comments', commentId);
      await deleteDoc(commentRef);
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Failed to delete comment.");
    }
  };

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
            {currentUser && currentUser.uid === comment.userId && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => comment.id && handleDelete(comment.id)}
                aria-label="Delete comment"
                disabled={!comment.id}
              >
                <Trash2 size={14} />
              </Button>
            )}
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

