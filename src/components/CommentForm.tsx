
// src/components/CommentForm.tsx
"use client";

import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
// Removed Select imports as category is removed

// Removed commentCategories import

const commentFormSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty.').max(1000, 'Comment too long.'),
  // category: z.enum(commentCategories, { // Removed category validation
  //   errorMap: () => ({ message: "Please select a category." }),
  // }),
});

type CommentFormValues = z.infer<typeof commentFormSchema>;

interface CommentFormProps {
  logId: string;
  onCommentAdded: () => void;
}

export default function CommentForm({ logId, onCommentAdded }: CommentFormProps) {
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    // control, // Removed control as category is removed
    formState: { errors },
  } = useForm<CommentFormValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: {
      content: '',
      // category: 'other', // Removed category default
    },
  });

  const onSubmit: SubmitHandler<CommentFormValues> = async (data) => {
    if (!currentUser) {
      setError('You must be logged in to comment.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const commentData = {
        logId,
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Anonymous User',
        content: data.content,
        // category: data.category, // Removed category
        createdAt: new Date().toISOString(), 
      };
      await addDoc(collection(db, 'logs', logId, 'comments'), commentData);
      reset();
      onCommentAdded(); 
    } catch (e) {
      console.error('Error adding comment:', e);
      setError('Failed to add comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) {
    return <p className="text-sm text-muted-foreground">Please log in to add a comment.</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}
      <div>
        <Label htmlFor="content" className="block text-sm font-medium mb-1">Your Comment</Label>
        <Textarea
          id="content"
          {...register('content')}
          rows={3}
          placeholder="Write your comment..."
          className={errors.content ? 'border-destructive' : ''}
        />
        {errors.content && <p className="text-sm text-destructive mt-1">{errors.content.message}</p>}
      </div>
      {/* Removed Category Select Section */}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Comment'}
      </Button>
    </form>
  );
}
