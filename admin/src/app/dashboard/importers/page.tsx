'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useUser, useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import apiClient, { importersApi } from '@/utils/apiClient';

// Define Field structure to match backend ImporterField
interface ImporterField {
  name: string;                      // Column name as in CSV
  display_name: string;              // Display name for users
  type: string;                      // text, number, date, email, phone, boolean, select, custom_regex
  required?: boolean;                // Whether field is required
  description?: string;              // Description for users
  must_match?: boolean;              // Require that users must match this column
  not_blank?: boolean;               // Value cannot be blank
  example?: string;                  // Example value for the field
  validation_error_message?: string; // Custom validation error message
  validation_format?: string;        // For date format, regex pattern, or select options
}

// Updated Importer structure to match backend
interface Importer {
  id: string;
  name: string;
  description?: string;
  fields: ImporterField[];
}

// Supported data types for columns
const COLUMN_TYPES = [
  { value: 'text', label: 'Text (any value)', description: 'Any string of characters' },
  { value: 'number', label: 'Number', description: 'Numbers with , and . characters allowed' },
  { value: 'date', label: 'Date', description: 'Matches selected format' },
  { value: 'email', label: 'Email', description: 'Valid email address' },
  { value: 'phone', label: 'Phone Number', description: 'Matches phone numbers with symbols: ()[]-+' },
  { value: 'boolean', label: 'Boolean', description: 'Act as a boolean value' },
  { value: 'select', label: 'Select', description: 'One of a list of options' },
  { value: 'custom_regex', label: 'Custom Regular Expression', description: 'Custom pattern matching' }
];

export default function ImportersPage() {
  const [importers, setImporters] = useState<Importer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [importerToEdit, setImporterToEdit] = useState<Importer | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [importerToDelete, setImporterToDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

  useEffect(() => {
    console.log('Importers page auth state:', { isSignedIn, authLoaded, user: user?.id });

    if (isSignedIn && authLoaded) {
      console.log('User is authenticated, fetching importers...');
      fetchImporters();
    } else if (authLoaded && !isSignedIn) {
      console.warn('User is not authenticated and auth loading is complete');
      // Redirect to sign-in if not signed in
      router.push('/sign-in');
    }
  }, [isSignedIn, authLoaded, user?.id]);

  // Fetch importers logic
  const fetchImporters = async () => {
    console.log('Starting to fetch importers...');
    setIsLoading(true);
    setError(null);

    try {
      // Use the API client to get importers
      // The token handling and refresh is done automatically by the client
      console.log('Calling importersApi.getImporters()...');
      const data = await importersApi.getImporters();
      console.log('Received importers data:', data);
      setImporters(data);
    } catch (err: any) {
      console.error('Error fetching importers:', err);

      if (err.response) {
        console.error('API response error:', {
          status: err.response.status,
          data: err.response.data,
          headers: err.response.headers
        });
      }

      setError(err.message || 'An error occurred while fetching importers');

      // If the error is authentication-related and not handled by the client,
      // redirect to login
      if (err.response && err.response.status === 401) {
        console.warn('Unauthorized (401) response, redirecting to login page');
        router.push('/sign-in');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- Field Management (Shared for Create/Edit) ---
  const handleAddField = (field: ImporterField, fields: ImporterField[], setFields: React.Dispatch<React.SetStateAction<ImporterField[]>>, setFormError: React.Dispatch<React.SetStateAction<string | null>>) => {
    // Validate field has required properties
    if (!field.name) {
      setFormError('Field name is required.');
      return false;
    }

    if (!field.type) {
      setFormError('Field type is required.');
      return false;
    }

    // Check for duplicate field names
    if (fields.some(f => f.name === field.name)) {
      setFormError(`Field name '${field.name}' already exists.`);
      return false;
    }

    // Clear any previous errors
    setFormError(null);

    // Add the new field to local state
    setFields(prev => [...prev, { ...field }]);
    return true;
  };

  const handleRemoveField = (nameToRemove: string, fields: ImporterField[], setFields: React.Dispatch<React.SetStateAction<ImporterField[]>>) => {
    setFields(prev => prev.filter(field => field.name !== nameToRemove));
  };

  // --- Reset Dialog Form State (Shared) ---
  const resetFormState = () => {
    setSaveError(null);
    setDeleteError(null);
  };

  // --- Create Importer Logic ---
  const handleCreateDialogOpenChange = (open: boolean) => {
    setIsCreateDialogOpen(open);
    if (!open) {
      resetFormState();
    }
  };

  const handleSaveImporter = async (importerName: string, fields: ImporterField[]) => {
    setSaveError(null);

    try {
      // Use the API client to create an importer
      await importersApi.createImporter({
        name: importerName,
        fields: fields,
      });

      // Close dialog and refresh importers list
      setIsCreateDialogOpen(false);
      fetchImporters();
    } catch (err: any) {
      console.error('Error creating importer:', err);

      // Extract error message from API response if available
      let errorMessage = 'An error occurred while creating the importer';
      if (err.response && err.response.data && err.response.data.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setSaveError(errorMessage);
    }
  };

  // --- Edit Importer Logic ---
  const handleEditDialogOpenChange = (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      setImporterToEdit(null);
      resetFormState();
    }
  };

  const handleEditClick = (importer: Importer) => {
    setImporterToEdit(importer);
    setIsEditDialogOpen(true);
  };

  const handleUpdateImporter = async (importerName: string, fields: ImporterField[]) => {
    if (!importerToEdit) return;
    setSaveError(null);

    try {
      // Use the API client to update an importer
      await importersApi.updateImporter(importerToEdit.id, {
        name: importerName,
        fields: fields,
      });

      // Close dialog and refresh importers list
      setIsEditDialogOpen(false);
      setImporterToEdit(null);
      fetchImporters();
    } catch (err: any) {
      console.error('Error updating importer:', err);

      // Extract error message from API response if available
      let errorMessage = 'An error occurred while updating the importer';
      if (err.response && err.response.data && err.response.data.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setSaveError(errorMessage);
    }
  };

  // --- Delete Importer Logic ---
  const handleDeleteImporter = async () => {
    if (!importerToDelete) return;
    setDeleteError(null);

    try {
      // Use the API client to delete an importer
      await importersApi.deleteImporter(importerToDelete);

      // Reset state and refresh importers list
      setImporterToDelete(null);
      fetchImporters();
    } catch (err: any) {
      console.error('Error deleting importer:', err);

      // Extract error message from API response if available
      let errorMessage = 'An error occurred while deleting the importer';
      if (err.response && err.response.data && err.response.data.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setDeleteError(errorMessage);
    }
  };

  // --- Importer Form Component (Internal) ---
  const ImporterForm = ({ onSubmit, mode, initialName, initialFields }: {
    onSubmit: (name: string, fields: ImporterField[]) => void,
    mode: 'create' | 'edit',
    initialName: string,
    initialFields: ImporterField[]
  }) => {
    const [importerName, setImporterName] = useState(initialName);
    const [fields, setFields] = useState<ImporterField[]>(initialFields);
    const [showAddFieldDialog, setShowAddFieldDialog] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // New field state with default values
    const [newField, setNewField] = useState<ImporterField>({
      name: '',
      display_name: '',
      type: '',
      required: false,
      description: '',
      must_match: false,
      not_blank: false,
      example: '',
      validation_error_message: '',
      validation_format: ''
    });

    // Handle importer name change
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setImporterName(e.target.value);
    };

    // Handle field input changes
    const handleFieldInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setNewField(prev => ({
        ...prev,
        [name]: name === 'name' ? value.replace(/\s/g, '') : value
      }));
    };

    // Handle field type change
    const handleTypeChange = (value: string) => {
      setNewField(prev => ({
        ...prev,
        type: value,
        // Reset validation format when type changes
        validation_format: ''
      }));
    };

    // Add field handler
    const addFieldHandler = () => {
      // Basic validation
      if (!newField.name) {
        setFormError('Column name is required');
        return;
      }
      if (!newField.type) {
        setFormError('Column type is required');
        return;
      }

      // Check for duplicate field names
      if (fields.some(f => f.name === newField.name)) {
        setFormError(`Column name '${newField.name}' already exists`);
        return;
      }

      // Add the field to the list
      setFields(prev => [...prev, { ...newField }]);

      // Reset the new field form
      setNewField({
        name: '',
        display_name: '',
        type: '',
        required: false,
        description: '',
        must_match: false,
        not_blank: false,
        example: '',
        validation_error_message: '',
        validation_format: ''
      });

      // Clear any errors and close the dialog
      setFormError(null);
      setShowAddFieldDialog(false);
    };

    // Remove field handler
    const removeFieldHandler = (nameToRemove: string) => {
      handleRemoveField(nameToRemove, fields, setFields);
    };

    // Handle form submission
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();

      // Validate form before submission
      if (!importerName) {
        setFormError('Importer name is required.');
        return;
      }

      if (fields.length === 0) {
        setFormError('At least one field is required.');
        return;
      }

      // Clear any previous errors
      setFormError(null);

      // Call the parent's onSubmit with the form data
      onSubmit(importerName, fields);
    };

    return (
      <form onSubmit={handleSubmit}>
        {/* Importer Name Input */}
        <div className="grid gap-2 mb-4">
          <Label htmlFor="importerName">Importer Name</Label>
          <Input
            id="importerName"
            value={importerName}
            onChange={handleNameChange}
            placeholder="e.g., Customer Data"
            required
          />
        </div>

        {/* Fields Section */}
        <div className="mb-4">
          <Label className="font-semibold text-base">Columns</Label>
          {/* Display existing fields */}
          <div className="space-y-2 mt-3 mb-4">
            {fields.length > 0 ? (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-base font-medium">Column Name</th>
                      <th className="px-4 py-3 text-base font-medium">Format</th>
                      <th className="px-4 py-3 text-base font-medium">Required</th>
                      <th className="px-4 py-3 text-base font-medium">Description</th>
                      <th className="px-4 py-3 text-right text-base font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {fields.map((field) => (
                      <tr key={field.name} className="bg-white">
                        <td className="px-4 py-3 text-base font-medium">
                          {field.display_name || field.name}
                          <div className="text-sm text-gray-500">{field.name}</div>
                        </td>
                        <td className="px-4 py-3 text-base">{field.type}</td>
                        <td className="px-4 py-3 text-base">
                          {field.required ? (
                            <span className="text-red-600 font-medium">Yes</span>
                          ) : (
                            <span className="text-gray-500">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-base">{field.description || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFieldHandler(field.name)}
                            className="text-gray-500 hover:text-red-600"
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-md border border-dashed">
                <p className="text-base">No columns defined yet</p>
                <p className="text-sm mt-1">Add columns to define your importer structure</p>
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setShowAddFieldDialog(true);
              setFormError(null);
            }}
            className="w-full text-base font-medium py-5"
          >
            Add Column
          </Button>

          {/* Add Field Dialog */}
          <Dialog
            open={showAddFieldDialog}
            onOpenChange={(open) => {
              setShowAddFieldDialog(open);
              if (!open) setFormError(null);
            }}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl">Add Column</DialogTitle>
                <DialogDescription className="text-base">
                  Define a new column for your CSV imports.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md">
                    {formError}
                  </div>
                )}

                {/* Column Name */}
                <div className="space-y-2">
                  <Label htmlFor="fieldName" className="text-base font-medium">Column Name</Label>
                  <Input
                    id="fieldName"
                    name="name"
                    value={newField.name}
                    onChange={handleFieldInputChange}
                    placeholder="e.g. email, first_name"
                    required
                    className="text-base py-5"
                  />
                  <p className="text-sm text-gray-500">Input the column name exactly as in your CSV or Excel file.</p>
                </div>

                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="fieldDisplayName">Display Name</Label>
                  <Input
                    id="fieldDisplayName"
                    placeholder="E.g. Full Name"
                    name="display_name"
                    value={newField.display_name}
                    onChange={handleFieldInputChange}
                  />
                  <p className="text-sm text-gray-500">Optional display name. Users will see this name when using the Importer. If you leave this blank, we will use the column name.</p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="fieldDescription">Description</Label>
                  <Input
                    id="fieldDescription"
                    placeholder="E.g. Full Name"
                    name="description"
                    value={newField.description || ''}
                    onChange={handleFieldInputChange}
                  />
                  <p className="text-sm text-gray-500">Users will see this description when using the Importer.</p>
                </div>

                {/* Example */}
                <div className="space-y-2">
                  <Label htmlFor="fieldExample">Example</Label>
                  <Input
                    id="fieldExample"
                    placeholder="E.g. Jane Smith"
                    name="example"
                    value={newField.example || ''}
                    onChange={handleFieldInputChange}
                  />
                  <p className="text-sm text-gray-500">An example of content for this column.</p>
                </div>

                {/* Validation Type */}
                <div className="space-y-2">
                  <Label htmlFor="fieldType">Validation Format</Label>
                  <Select
                    value={newField.type}
                    onValueChange={handleTypeChange}
                  >
                    <SelectTrigger id="fieldType">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {COLUMN_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center">
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">
                    {COLUMN_TYPES.find(t => t.value === newField.type)?.description || 'Select a validation format'}
                  </p>
                </div>

                {/* Validation Format - Conditional based on type */}
                {newField.type === 'date' && (
                  <div className="space-y-2">
                    <Label htmlFor="validationFormat">Date Format</Label>
                    <Select
                      value={newField.validation_format || ''}
                      onValueChange={(value) => setNewField(prev => ({ ...prev, validation_format: value }))}
                    >
                      <SelectTrigger id="validationFormat">
                        <SelectValue placeholder="Choose format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        <SelectItem value="MM-DD-YYYY">MM-DD-YYYY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {newField.type === 'select' && (
                  <div className="space-y-2">
                    <Label htmlFor="validationFormat">Options (comma separated)</Label>
                    <Input
                      id="validationFormat"
                      placeholder="blue,red,yellow,white"
                      name="validation_format"
                      value={newField.validation_format || ''}
                      onChange={handleFieldInputChange}
                    />
                    <p className="text-sm text-gray-500">Comma separated list of options</p>
                  </div>
                )}

                {newField.type === 'custom_regex' && (
                  <div className="space-y-2">
                    <Label htmlFor="validationFormat">Regular Expression</Label>
                    <Input
                      id="validationFormat"
                      placeholder="^[a-zA-Z ]*$"
                      name="validation_format"
                      value={newField.validation_format || ''}
                      onChange={handleFieldInputChange}
                    />
                    <p className="text-sm text-gray-500">Enter a valid regular expression pattern</p>
                  </div>
                )}

                {/* Custom Validation Error Message */}
                <div className="space-y-2">
                  <Label htmlFor="validationErrorMessage">Custom Validation Error Message</Label>
                  <Input
                    id="validationErrorMessage"
                    placeholder="E.g. Age must be above 18"
                    name="validation_error_message"
                    value={newField.validation_error_message || ''}
                    onChange={handleFieldInputChange}
                  />
                  <p className="text-sm text-gray-500">Enter a custom error to show users when their data doesn't meet the validation format. If you leave this blank, we will show a standard error message such as 'Not a valid number'.</p>
                </div>

                {/* Toggle Options */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="must_match"
                      checked={newField.must_match || false}
                      onCheckedChange={(checked) => setNewField(prev => ({ ...prev, must_match: checked }))}
                    />
                    <Label htmlFor="must_match">Must be matched</Label>
                  </div>
                  <p className="text-sm text-gray-500 pl-7">Require that users must match this column to a column in their imported data.</p>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="not_blank"
                      checked={newField.not_blank || false}
                      onCheckedChange={(checked) => setNewField(prev => ({ ...prev, not_blank: checked }))}
                    />
                    <Label htmlFor="not_blank">Value cannot be blank</Label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => {
                  setShowAddFieldDialog(false);
                  setFormError(null);
                }}>Cancel</Button>
                <Button
                  type="button"
                  onClick={addFieldHandler}
                  disabled={!newField.name || !newField.type}
                  className="font-medium"
                >
                  Add Column
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Display form errors */}
        {formError && <p className="text-red-500 text-sm pb-2">Error: {formError}</p>}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            type="submit"
            disabled={!importerName || fields.length === 0}
            className="font-medium"
          >
            {mode === 'create' ? 'Save Importer' : 'Update Importer'}
          </Button>
        </DialogFooter>
      </form>
    );
  };

  // --- Main Render ---
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Importers</h1>

        {/* Create Importer Button */}
        <Button
          className="font-medium"
          onClick={() => router.push('/dashboard/importers/new')}
        >
          Create Importer
        </Button>
      </div>

      {/* Loading and Error States */}
      {isLoading && <p className="text-gray-500">Loading importers...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {/* Importers Table */}
      {!isLoading && !error && (
        <AlertDialog>
          <AlertDialogTrigger className="hidden" />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-base">Name</TableHead>
                <TableHead className="text-right text-base">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importers.map((importer) => (
                <TableRow key={importer.id}>
                  <TableCell className="py-4">
                    <a
                      href={`/dashboard/importers/${importer.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        router.push(`/dashboard/importers/${importer.id}`);
                      }}
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-lg"
                    >
                      {importer.name}
                    </a>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-3">

                    {/* Delete Button Trigger */}
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className='border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-medium'
                        onClick={() => setImporterToDelete(importer.id)}
                      >
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Delete Confirmation Dialog Content */}
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the importer
                and any associated import configurations.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteError && <p className='text-sm text-red-500'>{deleteError}</p>}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setImporterToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteImporter} className='bg-red-600 hover:bg-red-700'>Delete Importer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
