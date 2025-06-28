
// src/components/LogItem.tsx
"use client";
import type { LogEntry } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, Lock, MessageSquare, Heart, Edit, ExternalLink, YoutubeIcon, ImageIcon, Link as LinkLucide } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import CommentForm from './CommentForm';
import CommentList from './CommentList';
import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';

interface LogItemProps {
  log: LogEntry;
  showControls?: boolean;
  isDetailPage?: boolean; // New prop to indicate if this is the full detail page
}

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  let videoId = null;
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.slice(1);
    } else if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
      videoId = urlObj.searchParams.get('v');
    } else if (urlObj.hostname.includes('youtube.com') && urlObj.pathname.startsWith('/embed/')) {
      videoId = urlObj.pathname.split('/embed/')[1].split('?')[0];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch (e) {
    return null; 
  }
}

export default function LogItem({ log, showControls = false, isDetailPage = false }: LogItemProps) {
  const { currentUser } = useAuth();
  const isOwner = currentUser && currentUser.uid === log.ownerId;
  const youtubeEmbedUrl = log.youtubeLink ? getYouTubeEmbedUrl(log.youtubeLink) : null;
  const [commentRefreshKey, setCommentRefreshKey] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(log.commentCount || 0);
  const [currentLogData, setCurrentLogData] = useState<LogEntry>(log);


  useEffect(() => {
     setCurrentLogData(log);
     setLocalCommentCount(log.commentCount || 0); 
  }, [log]);


  useEffect(() => {
    if (!currentLogData.id || !currentUser) {
      setIsLiked(false);
      return;
    }
    const likedDocRef = doc(db, 'users', currentUser.uid, 'likedLogs', currentLogData.id);
    const unsubscribe = onSnapshot(likedDocRef, (docSnap) => {
      setIsLiked(docSnap.exists());
    });
    return () => unsubscribe();
  }, [currentUser, currentLogData.id]);

  const handleCommentAdded = useCallback(() => {
    setCommentRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!currentLogData.id) return;
    const commentsCol = collection(db, 'logs', currentLogData.id, 'comments');
    const unsubscribe = onSnapshot(commentsCol, (snapshot) => {
      setLocalCommentCount(snapshot.size);
    }, (error) => {
      console.error("Error listening to comment count:", error);
    });
    return () => unsubscribe();
  }, [currentLogData.id]);

  const handleLike = async () => {
    if (!currentUser || !currentLogData.id) {
      return;
    }
    setIsLiking(true);
    const likedDocRef = doc(db, 'users', currentUser.uid, 'likedLogs', currentLogData.id);

    try {
      if (isLiked) {
        await deleteDoc(likedDocRef);
      } else {
        await setDoc(likedDocRef, {
          logId: currentLogData.id,
          createdAt: new Date().toISOString(),
          logTitle: currentLogData.title 
        });
      }
    } catch (error) {
      console.error("Error liking/unliking log:", error);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <Card className="w-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-xl md:text-2xl font-semibold">{currentLogData.title}</CardTitle>
          <div className="flex-shrink-0">
            {currentLogData.isPublic ? (
              <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-600">
                <Globe size={14} /> Public
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-1 text-orange-600 border-orange-600">
                <Lock size={14} /> Private
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-xs text-muted-foreground pt-1">
          By: User {currentLogData.ownerId.substring(0, 6)}... | Updated: {new Date(currentLogData.updatedAt).toLocaleDateString()}
        </CardDescription>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            {currentLogData.imageUrls && currentLogData.imageUrls.length > 0 && <ImageIcon size={14} className="text-blue-500" />}
            {currentLogData.youtubeLink && <YoutubeIcon size={16} className="text-red-500" />}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {currentLogData.imageUrls && currentLogData.imageUrls.length > 0 && (
          <div className="mb-4 aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center border">
            <img 
              src={currentLogData.imageUrls[0].url} 
              alt={currentLogData.imageUrls[0].caption || currentLogData.title} 
              className="w-full h-full object-contain" 
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.onerror = null; 
                target.style.display='none'; 
                const errorText = target.parentElement?.querySelector('.image-error-text') as HTMLElement;
                if(errorText) errorText.style.display = 'block';
              }}
              data-ai-hint="log image"
            />
            <p className="image-error-text text-xs text-destructive hidden">Image failed to load.</p>
          </div>
        )}
        {youtubeEmbedUrl && (
          <div className="mb-4 aspect-video">
            <iframe
              width="100%"
              height="100%"
              src={youtubeEmbedUrl}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="rounded-md border"
            ></iframe>
          </div>
        )}
        <p className={`text-muted-foreground whitespace-pre-wrap ${!isDetailPage ? 'line-clamp-3' : ''}`}>
          {currentLogData.description}
        </p>

        {currentLogData.relatedLogIds && currentLogData.relatedLogIds.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-semibold mb-2 flex items-center">
              <LinkLucide size={16} className="mr-2 text-primary" />
              Related Logs:
            </h4>
            <div className="flex flex-wrap gap-2">
              {currentLogData.relatedLogIds.map((relatedId, index) => (
                <Link key={relatedId} href={`/logs/${relatedId}`} legacyBehavior>
                  <a className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-md hover:bg-secondary/80 transition-colors">
                    {currentLogData.relatedLogTitles?.[index] || `Log ID: ${relatedId.substring(0,6)}...`}
                  </a>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      
      {isDetailPage && (
        <>
          <Separator className="my-0" />
          <div className="px-6 py-4 space-y-4">
            <h4 className="text-md font-semibold">Comments ({localCommentCount})</h4>
            <CommentForm logId={currentLogData.id!} onCommentAdded={handleCommentAdded} />
            <CommentList logId={currentLogData.id!} refreshKey={commentRefreshKey} />
          </div>
        </>
      )}

      <Separator className="my-0" />

      <CardFooter className="flex flex-wrap justify-between items-center pt-4 border-t">
        <div className="flex gap-3 text-muted-foreground items-center">
          <Button variant="ghost" size="sm" className="p-1 h-auto" onClick={handleLike} disabled={isLiking || !currentUser}>
            <Heart size={16} className={`mr-1 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            {/* Removed like count display: {localLikeCount} */}
          </Button>
          <div className="flex items-center gap-1 p-1 h-auto text-sm">
            <MessageSquare size={16} className="mr-1" /> {localCommentCount}
          </div>
        </div>
        <div className="flex gap-2 mt-2 sm:mt-0">
          {showControls && isOwner && (
            <Link href={`/create-log?edit=${currentLogData.id}`}>
              <Button variant="outline" size="sm">
                <Edit size={16} className="mr-1 sm:mr-2" /> Edit
              </Button>
            </Link>
          )}
           <Link href={`/logs/${currentLogData.id}`}>
              <Button variant="outline" size="sm">
                <ExternalLink size={16} className="mr-1 sm:mr-2" /> View
              </Button>
            </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
