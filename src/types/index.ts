
import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface LogEntry {
  id?: string; // Firestore document ID
  title: string;
  description: string;
  
  youtubeLink?: string | null; // YouTube video URL
  isPublic: boolean;
  ownerId: string; // UID of the user who created the log
  createdAt: string; // ISO8601 timestamp string
  updatedAt: string; // ISO8601 timestamp string
  commentCount?: number; // Optional: for denormalized comment count
  relatedLogIds?: string[]; // Array of IDs of related logs
  relatedLogTitles?: string[]; // Array of titles of related logs (for display convenience)
  imageUrls?: ImageItem[]; // Add imageUrls to LogEntry
}

// Removed commentCategories and CommentCategory type

export interface CommentEntry {
  id?: string; // Firestore document ID
  logId: string; // ID of the log this comment belongs to
  userId: string; // UID of the user who wrote the comment
  userName: string; // Display name of the user
  // category: CommentCategory; // Removed category
  content: string;
  createdAt: string; // ISO8601 timestamp string
}

export interface LikedLogEntry {
  logId: string; // ID of the liked log
  createdAt: string; // ISO8601 timestamp string
  logTitle?: string; // Optional: if you want to store title for quick display
  // userId is implicit in the path users/{userId}/likedLogs/{logId}
}

// Props for LogForm component
export interface ImageItem {
  url: string;
  isMain?: boolean;
  caption?: string;
}

export interface LogFormProps {
  initialData?: Partial<LogEntry> & { id?: string }; // Ensure id can be part of initialData
  onSave?: (logId: string) => void; // Callback after successful save
  onLogCreated?: () => void; // Callback after successful log creation
  isDeveloper?: boolean; // To enable developer-specific features like image upload
  action?: (prevState: any, formData: FormData) => Promise<any>;
  variant?: "default" | "embedded";
}


