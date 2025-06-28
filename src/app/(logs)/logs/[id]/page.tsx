
// src/app/(logs)/logs/[id]/page.tsx
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, Timestamp as FirestoreTimestamp, query, where } from "firebase/firestore";
import type { LogEntry } from "@/types";
import LogItem from "@/components/LogItem"; 
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  try {
    const logsCollection = collection(db, "logs");
    // Query only for public logs to generate static paths for them
    const q = query(logsCollection, where("isPublic", "==", true));
    const querySnapshot = await getDocs(q);
    const logIds = querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
    }));
    // This console.log might still show an error if the 'list' rule isn't permissive enough
    // for unauthenticated build-time access, even with the 'where' clause.
    // The rule `allow list: if request.query.limit <= 100;` is a broad attempt to allow it.
    console.log("[LogDetailPage.generateStaticParams] Attempting to fetch public log IDs for static generation. Found:", logIds.length);
    return logIds;
  } catch (error) {
    // This error indicates issues with Firestore rules for `list` operations during build.
    console.error("[LogDetailPage.generateStaticParams] Error fetching public log IDs:", error);
    return []; // Return empty array if fetching fails, so build doesn't break entirely.
  }
}

async function getLog(id: string): Promise<LogEntry | null> {
  try {
    const logRef = doc(db, "logs", id);
    const logSnap = await getDoc(logRef);

    if (!logSnap.exists()) {
      console.log(`[LogDetailPage.getLog] Log not found for ID ${id}`);
      return null;
    }
    const data = logSnap.data();
    
    // Security check: If the log is private, this server-side fetch will be denied by rules
    // (because request.auth is null here). `logSnap.exists()` would be true but data access fails.
    // The permission denied error will be caught by the outer try-catch.
    // If it's public, it will be allowed.

    const relatedLogTitles: string[] = [];
    if (data.relatedLogIds && Array.isArray(data.relatedLogIds) && data.relatedLogIds.length > 0) {
      for (const relatedId of data.relatedLogIds) {
        if (typeof relatedId === 'string' && relatedId.trim() !== '') {
          try {
            const relatedLogRef = doc(db, "logs", relatedId);
            const relatedLogSnap = await getDoc(relatedLogRef); // This fetch is also server-side
            if (relatedLogSnap.exists()) {
              // If related log is public, title can be fetched.
              // If related log is private, this specific get() will also be denied by rules.
              relatedLogTitles.push(relatedLogSnap.data()?.title || "Untitled Related Log");
            } else {
              relatedLogTitles.push("Deleted/Unknown Log");
            }
          } catch (e: any) {
            if (e.code === 'permission-denied') {
              console.warn(`[LogDetailPage.getLog] Permission denied fetching title for related log ID ${relatedId}. It might be private.`);
              relatedLogTitles.push("Title Unavailable (Private Log)");
            } else {
              console.error(`[LogDetailPage.getLog] Error fetching title for related log ID ${relatedId}:`, e);
              relatedLogTitles.push("Error Fetching Title");
            }
          }
        }
      }
    }

    return {
      id: logSnap.id,
      ...data,
      createdAt: data.createdAt instanceof FirestoreTimestamp ? data.createdAt.toDate().toISOString() : String(data.createdAt),
      updatedAt: data.updatedAt instanceof FirestoreTimestamp ? data.updatedAt.toDate().toISOString() : String(data.updatedAt),
      relatedLogIds: data.relatedLogIds || [],
      relatedLogTitles: relatedLogTitles,
    } as LogEntry;
  } catch (error: any) {
    // This will catch permission denied errors if the main log is private and accessed server-side
    if (error.code === 'permission-denied') {
        console.warn(`[LogDetailPage.getLog] Permission denied fetching log data for ID ${id}. The log might be private or rules are too restrictive for server-side fetch.`);
        return null; // Treat as not found if permission is denied for server component
    }
    console.error(`[LogDetailPage.getLog] Generic error fetching log data for ID ${id}:`, error);
    return null; 
  }
}


export default async function LogDetailPage({ params }: { params: { id: string } }) {
  const logData = await getLog(params.id);

  if (!logData) {
    // This will be triggered if getLog returns null (e.g., doc doesn't exist or permission denied for server fetch)
    notFound(); 
  }
  
  // At this point, if logData is available, it's either a public log,
  // or a private log that somehow bypassed rules (which shouldn't happen with correct rules).
  // The critical check for private logs (is owner viewing?) must happen client-side if data is fetched client-side.
  // Since this is a server component, if it got here for a private log, the rules were too permissive for server access.
  // With the updated rules, private logs should lead to notFound() here due to server-side permission denial.

  return (
    <div className="container mx-auto p-4 md:p-8">
      <LogItem log={logData} showControls={true} isDetailPage={true} />
    </div>
  );
}
