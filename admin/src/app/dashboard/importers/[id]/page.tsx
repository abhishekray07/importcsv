"use client";

import React, { useState, useEffect } from "react";
import { ImporterField as AddColumnImporterField } from "@/components/AddColumnForm";
import ImporterColumnsManager from "@/components/ImporterColumnsManager";
import apiClient, { importersApi } from "@/utils/apiClient";
import { useToast } from "@/components/ui/use-toast";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  Copy,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  Trash2,
} from "lucide-react";

// Use the ImporterField type from the AddColumnForm component
type ImporterField = AddColumnImporterField;

interface Importer {
  id: string;
  key: string;
  name: string;
  description?: string;
  fields: ImporterField[];
  webhook_url?: string;
  webhook_enabled: boolean;
  include_unmatched_columns: boolean;
  filter_invalid_rows: boolean;
  disable_on_invalid_rows: boolean;
  created_at: string;
  updated_at?: string;
}

export default function ImporterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token, refreshToken, logout } = useAuth();
  const [importer, setImporter] = useState<Importer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [importerName, setImporterName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEnabled, setWebhookEnabled] = useState(true);
  const [includeUnmatchedColumns, setIncludeUnmatchedColumns] = useState(false);
  const [filterInvalidRows, setFilterInvalidRows] = useState(false);
  const [disableOnInvalidRows, setDisableOnInvalidRows] = useState(false);

  // Dialog States
  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  const importerId = params.id as string;

  const [isCopied, setIsCopied] = React.useState(false);

  const embedCode = `import { CSVImporter } from '@importcsv/react';\n\nexport default function YourComponent() {\n  return (\n    <CSVImporter\n      importerKey=\"${importer?.key ?? ""}\"\n      onComplete={(data) => {}}\n      user={{ userId: \"YOUR_USER_ID\" }}\n      metadata={{ source: \"YOUR_APP\" }}\n    />\n  );\n}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setIsCopied(true);
    toast({
      title: "Copied!",
      description: "Embed code copied to clipboard.",
      variant: "default",
    });
    setTimeout(() => setIsCopied(false), 1500);
  };

  // Fetch importer details
  useEffect(() => {
    const fetchImporterDetails = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Use the API client to get importer details
        const data = await importersApi.getImporter(importerId);
        setImporter(data);
        initializeFormState(data);
      } catch (err: any) {
        console.error("Error fetching importer:", err);

        // Extract error message from API response if available
        let errorMessage = "Failed to load importer. Please try again later.";
        if (err.response && err.response.data && err.response.data.detail) {
          errorMessage = err.response.data.detail;
        } else if (err.message) {
          errorMessage = err.message;
        }

        setError(errorMessage);

        // If the error is authentication-related and not handled by the client,
        // redirect to login
        if (err.response && err.response.status === 401) {
          router.push("/login");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchImporterDetails();
  }, [importerId, router]);

  // Initialize form state with importer data
  const initializeFormState = (data: Importer) => {
    setImporterName(data.name);
    setWebhookUrl(data.webhook_url || "");
    setWebhookEnabled(data.webhook_enabled);
    setIncludeUnmatchedColumns(data.include_unmatched_columns);
    setFilterInvalidRows(data.filter_invalid_rows);
    setDisableOnInvalidRows(data.disable_on_invalid_rows);
  };

  // Save importer settings
  const saveImporterSettings = async () => {
    setIsSaving(true);
    setError(null);

    try {
      if (!importer) {
        throw new Error("Importer data is not available");
      }

      // Use the API client to update the importer
      // Include fields from the current importer state to ensure they are preserved
      await importersApi.updateImporter(importerId, {
        name: importerName,
        webhook_url: webhookUrl,
        webhook_enabled: webhookEnabled,
        include_unmatched_columns: includeUnmatchedColumns,
        filter_invalid_rows: filterInvalidRows,
        disable_on_invalid_rows: disableOnInvalidRows,
        fields: importer.fields, // Include the current fields
      });

      toast({
        title: "Success",
        description: "Your importer settings have been updated successfully.",
        variant: "default",
      });
    } catch (err: any) {
      console.error("Error updating importer:", err);

      // Extract error message from API response if available
      let errorMessage = "Failed to update importer. Please try again.";
      if (err.response && err.response.data && err.response.data.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Copy importer ID to clipboard
  const copyImporterId = () => {
    if (importer) {
      navigator.clipboard.writeText(importer.id);
      toast({
        title: "Success",
        description: "Importer ID has been copied to clipboard.",
        variant: "default",
      });
    }
  };

  // Copy importer key to clipboard
  const copyImporterKey = () => {
    if (importer) {
      navigator.clipboard.writeText(importer.key);
      toast({
        title: "Success",
        description: "Importer Key has been copied to clipboard.",
        variant: "default",
      });
    }
  };

  // Delete importer
  const handleDeleteImporter = async () => {
    if (!importer) return;

    setIsDeleting(true);
    setError(null);

    try {
      // Use the API client to delete the importer
      await importersApi.deleteImporter(importerId);

      // Redirect to importers list
      router.push("/dashboard/importers");
    } catch (err: any) {
      console.error("Error deleting importer:", err);

      // Extract error message from API response if available
      let errorMessage = "Failed to delete importer. Please try again.";
      if (err.response && err.response.data && err.response.data.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Link
            href="/dashboard/importers"
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to list
          </Link>
        </div>
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Loading importer details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Link
            href="/dashboard/importers"
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to list
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!importer) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Link
            href="/dashboard/importers"
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to list
          </Link>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          <p>Importer not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header with back button */}
      <div className="flex items-center space-x-2 mb-6">
        <Link
          href="/dashboard/importers"
          className="text-blue-600 hover:text-blue-800 flex items-center"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to list
        </Link>
      </div>

      {/* Importer title and actions */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{importerName}</h1>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/dashboard/importers/${importerId}/preview`)
            }
          >
            Preview <ExternalLink className="ml-2 h-4 w-4" />
          </Button>

          {/* Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                Actions <MoreVertical className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <AlertDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
              >
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e: Event) => e.preventDefault()}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Importer
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      the importer and all associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteImporter}
                      className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Toast notifications are now handled by the Toaster component */}

      {/* Save button removed from here and moved to bottom right */}

      {/* Importer details in tabs */}
      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="columns">Columns</TabsTrigger>
          <TabsTrigger value="embed">Embed</TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          {/* Key */}
          <Card>
            <CardHeader>
              <CardTitle>Key</CardTitle>
              <CardDescription>
                The unique key used to identify this Importer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Input
                  value={importer.key}
                  readOnly
                  className="font-mono bg-gray-50"
                />
                <Button variant="outline" size="icon" onClick={copyImporterKey}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2">
                <Link
                  href="#"
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                >
                  How to embed the importer into your app{" "}
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Name */}
          <Card>
            <CardHeader>
              <CardTitle>Name</CardTitle>
              <CardDescription>
                Give your importer a useful name
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                value={importerName}
                onChange={(e) => setImporterName(e.target.value)}
                placeholder="Enter a name for your importer"
              />
            </CardContent>
          </Card>

          {/* Webhook Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Where to Send Uploaded Data</CardTitle>
              <CardDescription>
                Choose how we send uploaded data to your app. Choose Webhook to
                have us send uploads to the Webhook URL you enter below.
                Alternatively, choose onData callback to have data received
                directly in your app frontend.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="webhook-enabled">Webhook</Label>
                <Switch
                  id="webhook-enabled"
                  checked={webhookEnabled}
                  onCheckedChange={setWebhookEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input
                  id="webhook-url"
                  placeholder="E.g. https://api.myapp.com/myendpoint"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
                <p className="text-sm text-gray-500">
                  Uploaded data will be sent to our servers, and we will send
                  you a webhook with the data.
                  <Link
                    href="#"
                    className="text-blue-600 hover:text-blue-800 ml-1"
                  >
                    Webhook docs <ExternalLink className="inline h-3 w-3" />
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Import Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Import Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Include Unmatched Columns */}
              <div className="flex items-start justify-between">
                <div>
                  <Label className="text-base">
                    Include All Unmatched Columns in Import
                  </Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Enable this to import all columns uploaded by users, even if
                    they are unmatched. This is useful if users have a variable
                    number of additional columns they want to import.
                  </p>
                  <Link
                    href="#"
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center mt-1"
                  >
                    Importer docs <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                </div>
                <Switch
                  checked={includeUnmatchedColumns}
                  onCheckedChange={setIncludeUnmatchedColumns}
                />
              </div>

              {/* Filter Invalid Rows */}
              <div className="flex items-start justify-between pt-4 border-t">
                <div>
                  <Label className="text-base">Filter Invalid Rows</Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Enable to prevent rows that fail any column validation
                    criteria being imported. If disabled, users will be warned
                    about invalid rows, but they will still be imported.
                  </p>
                  <Link
                    href="#"
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center mt-1"
                  >
                    Importer docs <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                </div>
                <Switch
                  checked={filterInvalidRows}
                  onCheckedChange={setFilterInvalidRows}
                />
              </div>

              {/* Disable Importing All Data */}
              <div className="flex items-start justify-between pt-4 border-t">
                <div>
                  <Label className="text-base">
                    Disable importing all data if there are invalid rows
                  </Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Enable to prevent importing all data if there are any
                    invalid rows. If disabled, users will be warned about errors
                    and invalid rows, but data will still be imported.
                  </p>
                </div>
                <Switch
                  checked={disableOnInvalidRows}
                  onCheckedChange={setDisableOnInvalidRows}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification moved to top level */}
        </TabsContent>

        {/* Columns Tab */}
        <TabsContent value="columns">
          <ImporterColumnsManager
            initialColumns={importer.fields}
            onColumnsChange={(updatedColumns) => {
              setImporter({
                ...importer,
                fields: updatedColumns,
              });

              // Show success notification with clearer instructions
              toast({
                title: "Success",
                description: "Column changes applied. Click the green 'Save Changes' button to persist your changes.",
                variant: "default",
              });
            }}
          />
        </TabsContent>

        {/* Embed Tab */}
        <TabsContent value="embed">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Importer Key</CardTitle>
              <CardDescription>
                The unique key used to identify this Importer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 p-2 bg-gray-50 border rounded-md">
                <code className="flex-1 font-mono text-sm break-all">
                  {importer?.key}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyImporterKey}
                  className="flex items-center"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy Key
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Embed Code</CardTitle>
              <CardDescription>
                Use this code to embed the importer in your application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>React Example</Label>
                  <div className="relative mt-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopy}
                      className="absolute top-2 right-2 z-10"
                      aria-label="Copy embed code"
                    >
                      <Copy className={`h-4 w-4 ${isCopied ? "text-green-400" : ""}`} />
                    </Button>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-md font-mono text-sm overflow-x-auto whitespace-pre">
                      <code>{embedCode}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save button at bottom right, within the container */}
      <div className="flex justify-end pb-8 mt-4">
        <Button
          onClick={saveImporterSettings}
          disabled={isSaving}
          className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded-md shadow-md"
          size="lg"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
