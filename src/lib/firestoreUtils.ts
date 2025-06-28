
import { collection, getDocs, query, orderBy, doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import type { LogEntry } from "@/types";

async function processLogDoc(logDocSnapshot: any): Promise<LogEntry> {
  const logData = logDocSnapshot.data();
  const relatedLogTitles: string[] = [];

  if (logData.relatedLogIds && Array.isArray(logData.relatedLogIds)) {
    for (const relatedId of logData.relatedLogIds) {
      if (typeof relatedId === 'string' && relatedId.trim() !== "") {
        try {
          const relatedLogDocRef = doc(db, "logs", relatedId);
          const relatedLogDocSnap = await getDoc(relatedLogDocRef);
          if (relatedLogDocSnap.exists()) {
            relatedLogTitles.push(relatedLogDocSnap.data().title || "Log Tanpa Judul");
          } else {
            relatedLogTitles.push("Log Tidak Ditemukan");
          }
        } catch (e) {
          console.error(`Error mengambil judul log terkait untuk ID ${relatedId}:`, e);
          relatedLogTitles.push("Gagal Mengambil Judul");
        }
      }
    }
  }

  const createdAt = logData.createdAt;
  const updatedAt = logData.updatedAt;

  return {
    id: logDocSnapshot.id,
    title: logData.title || "Tanpa Judul",
    description: logData.description || "",
    imageUrls: logData.imageUrls || [],
    youtubeLink: logData.youtubeLink || null,
    relatedLogIds: logData.relatedLogIds || [],
    relatedLogTitles: relatedLogTitles,
    isPublic: logData.isPublic || false,
    ownerId: logData.ownerId || '', // Ensure ownerId is part of the return
    createdAt: createdAt instanceof Timestamp ? createdAt.toDate().toISOString() : (typeof createdAt === 'string' ? createdAt : new Date().toISOString()),
    updatedAt: updatedAt instanceof Timestamp ? updatedAt.toDate().toISOString() : (typeof updatedAt === 'string' ? updatedAt : new Date().toISOString()),
  };
}

export async function getLogs(): Promise<LogEntry[] | { error: string; type: "firebase_setup" | "generic" }> {
  try {
    const logsCollection = collection(db, "logs");
    const logsQuery = query(logsCollection, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(logsQuery);

    const logsPromises = querySnapshot.docs.map(logDoc => processLogDoc(logDoc));
    const logs = await Promise.all(logsPromises);
    return logs;

  } catch (error: any) {
    console.error("Error mengambil log dari Firestore:", error);
    if (error.code && (error.code === 'unavailable' || error.code === 'failed-precondition' || error.code === 'unimplemented')) {
      return { error: "Firebase (Firestore) tidak tersedia. Pastikan emulator berjalan atau koneksi valid dan indeks telah dibuat jika diperlukan.", type: "firebase_setup" };
    }
    return { error: error.message || "Terjadi kesalahan saat mengambil log.", type: "generic" };
  }
}

export async function searchLogs(searchTerm: string): Promise<LogEntry[] | { error: string; type: "firebase_setup" | "generic" }> {
  if (!searchTerm.trim()) {
    return getLogs(); 
  }
  try {
    const logsCollection = collection(db, "logs");
    const logsQuery = query(logsCollection, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(logsQuery);

    const lowerSearchTerm = searchTerm.toLowerCase();
    const allLogsProcessed = await Promise.all(querySnapshot.docs.map(logDoc => processLogDoc(logDoc)));
    
    const matchedLogs: LogEntry[] = [];
    const addedLogIds = new Set<string>(); 

    for (const log of allLogsProcessed) {
      const titleMatch = log.title?.toLowerCase().includes(lowerSearchTerm);
      const descriptionMatch = log.description?.toLowerCase().includes(lowerSearchTerm);

      if ((titleMatch || descriptionMatch) && log.id) {
        if (!addedLogIds.has(log.id)) {
          matchedLogs.push(log);
          addedLogIds.add(log.id);
        }
      }
    }
    
    const directMatchIds = new Set<string>(matchedLogs.map(log => log.id).filter((id): id is string => !!id));

    for (const log of allLogsProcessed) {
        if (log.id && !addedLogIds.has(log.id)) {
            const isRelatedToDirectMatch = log.relatedLogIds?.some((relatedId: string) => directMatchIds.has(relatedId));
            const relatedTitleMatchesSearch = log.relatedLogTitles?.some((title: string) => title.toLowerCase().includes(lowerSearchTerm));

            if (isRelatedToDirectMatch || relatedTitleMatchesSearch) {
                matchedLogs.push(log);
                addedLogIds.add(log.id);
            }
        }
    }
    return matchedLogs;

  } catch (error: any) {
    console.error("Error mencari log di Firestore:", error);
    if (error.code && (error.code === 'unavailable' || error.code === 'failed-precondition' || error.code === 'unimplemented')) {
      return { error: "Firebase (Firestore) tidak tersedia. Pastikan emulator berjalan atau koneksi valid dan indeks telah dibuat jika diperlukan.", type: "firebase_setup" };
    }
    return { error: error.message || "Terjadi kesalahan saat mencari log.", type: "generic" };
  }
}

export { db };
