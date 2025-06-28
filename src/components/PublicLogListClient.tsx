
import type { LogEntry, ImageItem } from "@/types";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Map, Image as ImageIcon, Link as LinkIcon, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firestoreUtils";
import { Timestamp } from "firebase/firestore";

async function getPublicLogs(): Promise<LogEntry[] | { error: string; type: "firebase_setup" | "generic" }> {
  try {
    const logsCollection = collection(db, "logs");
    const logsQuery = query(
      logsCollection,
      where("isPublic", "==", true),
      orderBy("updatedAt", "asc")
    );
    const querySnapshot = await getDocs(logsQuery);

    const logs: LogEntry[] = [];
    for (const logDoc of querySnapshot.docs) {
      const data = logDoc.data();
      const relatedLogTitles: string[] = [];

      if (data.relatedLogIds && Array.isArray(data.relatedLogIds)) {
        for (const relatedId of data.relatedLogIds) {
          if (typeof relatedId === 'string' && relatedId.trim() !== "") {
            try {
              const relatedLogRef = doc(db, "logs", relatedId);
              const relatedLogSnap = await getDoc(relatedLogRef);
              if (relatedLogSnap.exists() && relatedLogSnap.data()?.isPublic) {
                relatedLogTitles.push(relatedLogSnap.data().title || "Untitled Related Log");
              }
            } catch (e) {
              console.error(`Error fetching related log title for ID ${relatedId}:`, e);
            }
          }
        }
      }
      
      const createdAt = data.createdAt;
      const updatedAt = data.updatedAt;

      logs.push({
        id: logDoc.id,
        title: data.title || "Untitled Log",
        description: data.description || "",
        imageUrls: data.imageUrls || [],
        youtubeLink: data.youtubeLink || null,
        relatedLogIds: (data.relatedLogIds || []).filter((id: string) => 
            logs.some(l => l.id === id && l.isPublic)
        ),
        relatedLogTitles,
        isPublic: data.isPublic,
        ownerId: data.ownerId || '',
        createdAt: createdAt instanceof Timestamp ? createdAt.toDate().toISOString() : (typeof createdAt === 'string' ? createdAt : new Date().toISOString()),
        updatedAt: updatedAt instanceof Timestamp ? updatedAt.toDate().toISOString() : (typeof updatedAt === 'string' ? updatedAt : new Date().toISOString()),
      });
    }
    console.log("[PublicLogListClient] Public logs fetched:", logs.length);
    return logs;
  } catch (error: any) {
    console.error("[PublicLogListClient] Error fetching public logs:", error);
    if (error.code && (error.code === 'unavailable' || error.code === 'failed-precondition' || error.code === 'unimplemented' || error.message.includes("query requires an index"))) {
      const firestoreIndexLink = "https://console.firebase.google.com/v1/r/project/the-mother-earth-project/firestore/indexes?create_composite=ClVwcm9qZWN0cy90aGUtbW90aGVyLWVhcnRoLXByb2plY3QvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2xvZ3MvaW5kZXhlcy9fEAEaDAoIaXNQdWJsaWMQARoNCgl1cGRhdGVkQXQQAhoMCghfX25hbWVfXxAC";
      return { 
        error: `${error.message}. You may need to create a composite index in Firestore. Try this link: ${firestoreIndexLink} (Ensure 'updatedAt' field is sorted 'Ascending' if your query uses 'orderBy("updatedAt", "asc")')`, 
        type: "firebase_setup" 
      };
    }
    return { error: error.message || "An error occurred while fetching public logs.", type: "generic" };
  }
}

export default function PublicLogListClient() {
  const [logsResult, setLogsResult] = useState<LogEntry[] | { error: string; type: "firebase_setup" | "generic" } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAndSetLogs = useCallback(async () => {
    setIsLoading(true);
    console.log("[PublicLogListClient] Fetching public logs...");
    const result = await getPublicLogs();
    setLogsResult(result);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAndSetLogs();
  }, [fetchAndSetLogs]);

  if (isLoading) {
    return <p className="text-center text-muted-foreground py-10">Loading public logs...</p>;
  }

  if (!logsResult) {
    return <p className="text-center text-muted-foreground py-10">No public logs data available.</p>;
  }

  if ("error" in logsResult) {
    return (
      <div className="text-center text-destructive p-4 border border-destructive rounded-md">
        <AlertCircle className="inline-block mr-2" />
        <strong>Error:</strong> {logsResult.error}
        {logsResult.type === "firebase_setup" && (
          <p className="text-sm mt-2">
            Please ensure your Firebase project is correctly configured, emulators (if used) are running, and necessary Firestore indexes are created.
          </p>
        )}
      </div>
    );
  }

  const allPublicLogs = logsResult as LogEntry[];
  const filteredLogs = searchQuery
    ? allPublicLogs.filter(
        (log) =>
          (log.title?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
          (log.description?.toLowerCase() || "").includes(searchQuery.toLowerCase())
      )
    : allPublicLogs;

  return (
    <div className="space-y-8">
      <div className="mb-8 flex flex-col sm:flex-row gap-2 items-center justify-center">
        <div className="relative w-full max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search public logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
        </div>
      </div>

      {allPublicLogs.length === 0 && !searchQuery && (
        <p className="text-center text-muted-foreground py-10">No public logs found yet. Check back later!</p>
      )}

      {filteredLogs.length === 0 && searchQuery && (
        <p className="text-center text-muted-foreground py-10">
          No public logs match your search for "{searchQuery}".
        </p>
      )}

      <div className="space-y-6 w-full max-w-4xl mx-auto">
        {filteredLogs.map((log) => {
          const validImageUrls = log.imageUrls?.filter((img: ImageItem) => typeof img.url === "string" && img.url.trim() !== "") || [];
          return (
            <Card key={log.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold">{log.title}</CardTitle>
                <CardDescription>
                  Published:{" "}
                  {log.createdAt ? new Date(log.createdAt as string).toLocaleDateString() : "N/A"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground mb-4 whitespace-pre-wrap">{log.description}</p>
                {validImageUrls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                    {validImageUrls.map((img: ImageItem, idx: number) => ( 
                      <Dialog key={`${log.id}-img-${idx}`}>
                        <DialogTrigger asChild>
                          <div className="relative aspect-square cursor-pointer group border rounded-md overflow-hidden">
                            <img
                              src={img.url}
                              alt={img.caption || `Log image ${idx + 1}`}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              className="group-hover:scale-105 transition-transform duration-300"
                              data-ai-hint="log image"
                            />
                            {img.caption && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                                {img.caption}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <ImageIcon className="h-6 w-6 text-white" />
                            </div>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl p-2 sm:p-4">
                          <DialogTitle className="sr-only">
                            Image: {img.caption || `${log.title} image ${idx + 1}`}
                          </DialogTitle>
                          <DialogDescription className="sr-only">
                            Enlarged view of {img.caption || `image ${idx + 1} for log titled "${log.title}"`}.
                          </DialogDescription>
                          <div className="relative w-full h-[70vh] sm:h-[80vh]">
                            <img
                              src={img.url}
                              alt={img.caption || `Enlarged log image ${idx + 1}`}
                              style={{ width: "100%", height: "100%", objectFit: "contain" }}
                              className="rounded-md"
                            />
                          </div>
                          {img.caption && (
                            <p className="text-center text-sm text-muted-foreground mt-2">{img.caption}</p>
                          )}
                        </DialogContent>
                      </Dialog>
                    ))}
                  </div>
                )}
                {log.relatedLogTitles && log.relatedLogTitles.length > 0 && (
                  <div className="mt-auto pt-3 border-t">
                    <p className="text-xs font-semibold flex items-center text-muted-foreground">
                      <LinkIcon className="h-3 w-3 mr-1 text-primary" />
                      Related Public Logs:
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {log.relatedLogTitles.slice(0,3).map((title: string, idx: number) => (
                        <span key={idx} className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full">
                          {title}
                        </span>
                      ))}
                       {log.relatedLogTitles.length > 3 && (
                           <span className="text-xs text-muted-foreground">+{log.relatedLogTitles.length - 3} more</span>
                       )}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end space-x-2 mt-auto">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/logs/${log.id}`}>
                    <Map className="mr-2 h-4 w-4" /> View Details
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}