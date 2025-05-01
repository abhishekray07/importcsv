"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import dynamic from "next/dynamic";
import { importersApi } from "@/utils/apiClient";

// Define types for our schema and data
interface ImporterField {
  name: string;
  key?: string;
  required?: boolean;
}

interface ImporterSchema {
  id: string;
  name: string;
  fields: ImporterField[];
}

interface ImportRow {
  values: Record<string, any>;
  errors?: Array<{ message: string }>;
}

interface ImportData {
  rows: ImportRow[];
  columns: Array<{ name: string }>;
  num_rows: number;
  num_columns: number;
  backendResponse?: any; // Response from direct backend integration
  error?: string; // Error message if processing failed
}

// Dynamically import the CSV Importer component directly from the library
const CSVImporter = dynamic(
  () =>
    import("@importcsv/react").then((mod) => ({ default: mod.CSVImporter })),
  { ssr: false },
);

// Separate component for the CSVImporter to prevent re-renders
function ImporterComponent({ importerKey, onComplete }: { importerKey: string, onComplete: (data: ImportData) => void }) {
  // Using useMemo to ensure the component doesn't re-render unnecessarily
  return useMemo(() => (
    <CSVImporter
      isModal={false}
      darkMode={false}
      primaryColor="#0284c7"
      showDownloadTemplateButton={true}
      skipHeaderRowSelection={false}
      importerKey={importerKey}
      onComplete={onComplete}
    />
  ), [importerKey, onComplete]);
}

export default function ImporterPreviewPage() {
  const params = useParams();
  const { isSignedIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [importer, setImporter] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Use useCallback to create a stable reference to the callback function
  const handleImportComplete = useCallback(async (data: ImportData) => {
    // Process import data
  }, []);

  // Fetch importer details to get the key
  useEffect(() => {
    if (!isSignedIn) return;

    let isMounted = true;
    setLoading(true);

    importersApi.getImporter(params.id as string)
      .then(data => {
        if (isMounted) setImporter(data);
      })
      .catch(err => {
        if (isMounted) setError(err instanceof Error ? err.message : "An error occurred");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [params.id, isSignedIn]);

  if (error)
    return (
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <Link
            href={`/dashboard/importers/${params.id}`}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to importer
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>Error: {error}</p>
        </div>
      </div>
    );

  if (loading)
    return (
      <div className="container mx-auto p-4">
        <div className="mb-6">
          <Link
            href={`/dashboard/importers/${params.id}`}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to importer
          </Link>
        </div>
        <div className="text-center py-10">
          <p>Loading importer details...</p>
        </div>
      </div>
    );

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Link
          href={`/dashboard/importers/${params.id}`}
          className="flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to importer
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {
          <>
            <div className="w-full min-h-[500px]">
              {importer?.key && (
                <ImporterComponent
                  importerKey={importer.key}
                  onComplete={handleImportComplete}
                />
              )}
            </div>
          </>
        }
      </div>
    </div>
  );
}
