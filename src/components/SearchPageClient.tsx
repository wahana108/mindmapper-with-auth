// src/components/SearchPageClient.tsx
"use client";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Image as ImageIcon } from "lucide-react";

interface Log {
  id: string;
  title: string;
  description: string;
  imageUrls?: { url: string; isMain?: boolean; caption?: string }[];
}

export default function SearchPageClient() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<Log[]>([]);

  useEffect(() => {
    async function fetchSearchResults() {
      try {
        const logsCollection = collection(db, "logs");
        const querySnapshot = await getDocs(logsCollection);
        const logData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Log[];
        const filtered = logData.filter(
          (log) =>
            log.title?.toLowerCase().includes(query.toLowerCase()) ||
            log.description?.toLowerCase().includes(query.toLowerCase())
        );
        setResults(filtered);
      } catch (error) {
        console.error("[SearchPageClient] Error fetching search results:", error);
      }
    }
    fetchSearchResults();
  }, [query]);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h2 className="text-2xl font-bold mb-4">Search Results for "{query}"</h2>
      {results.length === 0 ? (
        <p className="text-muted-foreground">No logs found matching your query.</p>
      ) : (
        <div className="space-y-6">
          {results.map((result) => {
            const validImageUrls = result.imageUrls?.filter((img) => img.url) || [];
            return (
              <div
                key={result.id}
                className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-semibold mb-2">{result.title || "Untitled"}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {result.description?.substring(0, 100) || "No description"}
                  {result.description?.length > 100 && "..."}
                </p>
                {validImageUrls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                    {validImageUrls.map((img, idx) => (
                      <Dialog key={`${result.id}-img-${idx}`}>
                        <DialogTrigger asChild>
                          <div className="relative aspect-square cursor-pointer group border rounded-md overflow-hidden">
                            <img
                              src={img.url}
                              alt={img.caption || `Log image ${idx + 1}`}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              className="group-hover:scale-105 transition-transform duration-300"
                            />
                            {img.caption && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                                {img.caption}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <ImageIcon className="h-8 w-8 text-white" />
                            </div>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl p-2 sm:p-4">
                          <DialogTitle className="sr-only">
                            Image: {img.caption || `${result.title} image ${idx + 1}`}
                          </DialogTitle>
                          <DialogDescription className="sr-only">
                            Enlarged view of {img.caption || `image ${idx + 1} for log titled "${result.title}"`}.
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
                <div className="flex gap-2">
                  <Button asChild variant="outline">
                    <Link href={`/logs/${result.id}`}>View Details</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/logs/${result.id}/edit`}>Edit</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}