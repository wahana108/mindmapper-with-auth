"use client";

import LogForm from "@/components/LogForm";
import LogList from "@/components/LogList";
import { SearchBar } from "@/components/SearchBar";
import { Separator } from "@/components/ui/separator";
import { Sparkles } from "lucide-react";
import { createLogAction } from "@/lib/actions";
import { useState, useCallback } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Info } from "lucide-react";
import AboutSection from "@/components/AboutSection";

export default function ClientHomePage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [accordionValue, setAccordionValue] = useState<string | undefined>(undefined);

  const handleLogCreated = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
    console.log("[ClientHomePage] Refresh triggered for LogList");
  }, []);

  const handleLogCreatedAndCollapse = useCallback(() => {
    handleLogCreated();
    setAccordionValue(undefined); // Collapse the accordion
  }, [handleLogCreated]);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 selection:bg-primary/20">
      <header className="mb-10 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
          MindMapper Lite
        </h1>
        <p className="mt-3 text-lg text-muted-foreground max-w-xl mx-auto">
          Capture your thoughts and ideas. Create visual logs with titles, descriptions, and images.
        </p>
      </header>

      <main className="w-full max-w-4xl space-y-12">
        <section aria-labelledby="search-heading" className="w-full">
          <SearchBar />
        </section>

        <section aria-labelledby="create-log-heading" className="w-full">
          <Accordion 
            type="single" 
            collapsible 
            className="w-full"
            value={accordionValue}
            onValueChange={setAccordionValue}
          >
            <AccordionItem value="create-log-item" className="border bg-card text-card-foreground rounded-lg shadow-sm">
              <AccordionTrigger className="hover:no-underline px-6 py-4 text-left w-full data-[state=open]:border-b">
                <div className="flex justify-between items-start w-full">
                    <div>
                        <h2 id="create-log-heading" className="text-2xl font-bold">Create New Log</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            Click to expand and add a new mind map entry.
                        </p>
                    </div>
                    {/* Default chevron is part of AccordionTrigger */}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-0">
                <div className="p-6 pt-0">
                  <LogForm 
                    action={createLogAction} 
                    onLogCreated={handleLogCreatedAndCollapse}
                    variant="embedded"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <Separator className="my-12" />

        <section aria-labelledby="logs-list-heading" className="w-full">
          <h2 id="logs-list-heading" className="text-3xl font-semibold mb-8 text-center md:text-left text-foreground">
            Your Mind Map Logs
          </h2>
          <LogList refreshKey={refreshKey} />
        </section>

        <AboutSection />
      </main>

      <footer className="mt-16 py-8 text-center text-muted-foreground text-sm">
        <p>© {new Date().getFullYear()} MindMapper Lite. Built with Next.js and Firebase.</p>
      </footer>
    </div>
  );
}
