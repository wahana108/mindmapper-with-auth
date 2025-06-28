// src/app/mindmap/[id]/page.tsx
import { db } from "@/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore"; // Import Timestamp

import type { LogEntry } from "@/types";
import { collection, getDocs } from "firebase/firestore";

export async function generateStaticParams() {
  try {
    const logsCollection = collection(db, "logs");
    const querySnapshot = await getDocs(logsCollection);
    const logIds = querySnapshot.docs.map((doc) => ({
      id: doc.id,
    }));
    console.log("[generateStaticParams] MindMap page IDs:", logIds);
    return logIds;
  } catch (error) {
    console.error("[generateStaticParams] Error fetching log IDs for mindmap page:", error);
    return [];
  }
}

export default async function MindMapPage({ params }: { params: { id: string } }) {
  const { id } = params;
  try {
    const logRef = doc(db, "logs", id);
    const logSnap = await getDoc(logRef);

    if (!logSnap.exists()) {
      return <div className="container mx-auto p-4 text-center text-destructive">Log not found</div>;
    }

    const data = logSnap.data();
    const logData: LogEntry = {
      id: logSnap.id,
      title: data.title || "Untitled Log",
      description: data.description || "",
      ownerId: data.ownerId || "",
      imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls.map((item: any) => ({ url: item.url || '', isMain: item.isMain || false, caption: item.caption || '' })) : [],
      relatedLogIds: Array.isArray(data.relatedLogIds) ? data.relatedLogIds : [],
      relatedLogTitles: Array.isArray(data.relatedLogTitles) ? data.relatedLogTitles : [],
      isPublic: data.isPublic || false,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : (typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString()),
    };

    return (
      <div className="container mx-auto p-4 md:p-8">
        <div className="bg-card text-card-foreground rounded-lg shadow-md p-6 space-y-4">
          <h1 className="text-3xl font-bold">{logData.title}</h1>
          <p className="text-muted-foreground">{logData.description}</p>
          {logData.imageUrls && logData.imageUrls.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {logData.imageUrls.map((img, index) => (
                <div key={index} className="relative w-full h-48 bg-gray-200 rounded-md overflow-hidden">
                  <img src={img.url} alt={img.caption || `Image ${index + 1}`} className="w-full h-full object-cover" />
                  {img.caption && <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1">{img.caption}</p>}
                </div>
              ))}
            </div>
          )}
          {logData.youtubeLink && (
            <div>
              <h2 className="text-xl font-semibold mb-2">YouTube Video</h2>
              <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
                <iframe
                  src={logData.youtubeLink.replace("watch?v=", "embed/")}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="YouTube video"
                  className="absolute top-0 left-0 w-full h-full"
                ></iframe>
              </div>
            </div>
          )}
          {logData.relatedLogIds && logData.relatedLogIds.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-2">Related Logs</h2>
              <ul className="list-disc list-inside">
                {logData.relatedLogIds.map((relatedId, index) => (
                  <li key={relatedId}>
                    <a href={`/logs/${relatedId}`} className="text-primary hover:underline">
                      {logData.relatedLogTitles?.[index] || `Log ${relatedId}`}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error(`[MindMapPage] Error fetching log data for ID ${id}:`, error);
    return <div className="container mx-auto p-4 text-center text-destructive">Error loading mind map data. Please try again.</div>;
  }
}
