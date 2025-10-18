// src/components/BulkImportPanel.tsx
import React, { useState } from "react";

type ImportResponse = {
  ok: boolean;
  logs: string[];
  collections_created?: number;
  collections_updated?: number;
  products_created?: number;
  products_updated?: number;
  links_created?: number;
};

const API_BASE = import.meta.env.VITE_BULK_API_BASE || "http://localhost:9090";

interface FileInputProps {
  label: string;
  accept?: string;
  onFile: (file: File | null) => void;
}

const FileInput: React.FC<FileInputProps> = ({ label, accept = ".csv", onFile }) => {
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile);
    onFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
          dragOver 
            ? "border-blue-500 bg-blue-50" 
            : "border-gray-300 hover:border-gray-400"
        } ${file ? "bg-gray-50" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {file ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-gray-900">{file.name}</div>
                <div className="text-xs text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
            </div>
            <button
              onClick={() => handleFileSelect(null)}
              className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors"
              type="button"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <div>
              <p className="text-sm text-gray-600">
                Drag & drop your CSV file here, or{" "}
                <label className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer transition-colors">
                  browse files
                  <input
                    type="file"
                    accept={accept}
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  />
                </label>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supports .csv files
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function BulkImportPanel() {
  const [collectionsCsv, setCollectionsCsv] = useState<File | null>(null);
  const [productsCsv, setProductsCsv] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [summary, setSummary] = useState<Partial<ImportResponse> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setLogs([]);
    setSummary(null);
    setError(null);
  };

  const handleImport = async () => {
    resetState();
    
    if (!collectionsCsv && !productsCsv) {
      setError("Please upload at least one CSV file (collections or products).");
      return;
    }

    const formData = new FormData();
    if (collectionsCsv) formData.append("collections", collectionsCsv, collectionsCsv.name);
    if (productsCsv) formData.append("products", productsCsv, productsCsv.name);
    formData.append("dry_run", String(dryRun));

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/bulk-import`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Import failed: ${response.status} ${errorText}`);
      }
      
      const data: ImportResponse = await response.json();
      setLogs(data.logs || []);
      setSummary(data);
      
      if (!data.ok) {
        setError("Import completed with errors. Please check the logs below.");
      }
    } catch (err: any) {
      setError(err.message || "Bulk import failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6 min-h-screen">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">
          Bulk CSV Import
        </h2>
        <p className="text-sm text-gray-600">
          Upload <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">collections.csv</code> and/or{" "}
          <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">products.csv</code>. 
          Use <strong>dry-run</strong> mode to preview changes before applying them.
        </p>
      </div>

      {/* File Inputs */}
      <div className="grid md:grid-cols-2 gap-6">
        <FileInput 
          label="Collections CSV (Optional)" 
          onFile={setCollectionsCsv} 
        />
        <FileInput 
          label="Products CSV (Optional)" 
          onFile={setProductsCsv} 
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <label className="flex items-center space-x-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="sr-only"
            />
            <div className={`block w-10 h-6 rounded-full transition-colors ${
              dryRun ? 'bg-blue-500' : 'bg-gray-300'
            }`}></div>
            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
              dryRun ? 'transform translate-x-4' : ''
            }`}></div>
          </div>
          <span className="text-sm font-medium text-gray-700">Dry-run mode</span>
        </label>
        
        <button
          onClick={handleImport}
          disabled={loading || (!collectionsCsv && !productsCsv)}
          className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
            loading || (!collectionsCsv && !productsCsv)
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow"
          }`}
        >
          {loading ? (
            <span className="flex items-center space-x-2">
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <span>Importing...</span>
            </span>
          ) : (
            "Run Import"
          )}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center space-x-2 text-red-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Error</span>
          </div>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
          <div className="flex items-center space-x-2 text-green-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Import Summary</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-green-700">
            {"collections_created" in summary && (
              <div>Collections created: <span className="font-semibold">{summary.collections_created}</span></div>
            )}
            {"collections_updated" in summary && (
              <div>Collections updated: <span className="font-semibold">{summary.collections_updated}</span></div>
            )}
            {"products_created" in summary && (
              <div>Products created: <span className="font-semibold">{summary.products_created}</span></div>
            )}
            {"products_updated" in summary && (
              <div>Products updated: <span className="font-semibold">{summary.products_updated}</span></div>
            )}
            {"links_created" in summary && (
              <div>Links created: <span className="font-semibold">{summary.links_created}</span></div>
            )}
          </div>
        </div>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Import Logs</label>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {logs.length} entries
            </span>
          </div>
          <div className="bg-gray-900 text-gray-100 text-sm rounded-lg p-4 max-h-80 overflow-auto font-mono">
            {logs.map((log, index) => (
              <div key={index} className="border-b border-gray-700 last:border-b-0 py-1">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}