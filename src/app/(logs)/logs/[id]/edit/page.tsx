// src/app/(logs)/logs/[id]/edit/page.tsx
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, Timestamp } from "firebase/firestore"; // Import Timestamp
import LogForm from "@/components/LogForm";
import type { LogEntry, ImageItem } from "@/types";

export async function generateStaticParams() {
  try {
    const logsCollection = collection(db, "logs");
    const querySnapshot = await getDocs(logsCollection);
    const logIds = querySnapshot.docs.map((doc) => ({
      id: doc.id,
    }));
    console.log("[generateStaticParams] Edit page IDs:", logIds);
    return logIds;
  } catch (error) {
    console.error("[generateStaticParams] Error fetching log IDs for edit page:", error);
    return [];
  }
}

export default async function EditLogPage({ params }: { params: { id: string } }) {
  let logDataForForm: LogEntry | null = null;

  try {
    const logRef = doc(db, "logs", params.id);
    const logSnap = await getDoc(logRef);

    if (!logSnap.exists()) {
      return <div className="container mx-auto p-4 text-center text-destructive">Log not found</div>;
    }
    const data = logSnap.data();
    logDataForForm = {
      id: logSnap.id,
      title: data.title || "",
      description: data.description || "",
      ownerId: data.ownerId || "",
      imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls.map((item: any) => ({ url: item.url || '', isMain: item.isMain || false, caption: item.caption || '' })) : [],
      relatedLogIds: Array.isArray(data.relatedLogIds) ? data.relatedLogIds : [],
      isPublic: data.isPublic || false,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : (typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString()),
    };
  } catch (error) {
    console.error(`[EditLogPage] Error fetching log data for ID ${params.id}:`, error);
    return <div className="container mx-auto p-4 text-center text-destructive">Error loading log data. Please try again.</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6 text-center md:text-left">Edit Log</h1>
      {logDataForForm && <LogForm initialData={logDataForForm as LogEntry} />}
    </div>
  );
}
