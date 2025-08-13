import React, { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Checkbox } from '../../../components/ui/checkbox';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { useToast } from '../../../components/ui/use-toast';
import { PiSparkle, PiX, PiCheck, PiInfo } from 'react-icons/pi';
import { useTranslation } from '../../../../i18n/useTranslation';
import {
  generateTransformations,
  countSelectedChanges,
  toggleChangeSelection,
  setAllChangesSelection,
  TransformationChange,
  COMMON_PROMPTS
} from '../../../services/transformation';

interface TransformModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  columnMapping: Record<string, any>;
  backendUrl: string;
  importerKey: string;
  validationErrors?: Array<{
    rowIndex: number;
    columnKey: string;
    message: string;
    value?: any;
  }>;
  onApplyTransformations: (changes: TransformationChange[]) => void;
}

export default function TransformModal({
  isOpen,
  onClose,
  data,
  columnMapping,
  backendUrl,
  importerKey,
  validationErrors,
  onApplyTransformations
}: TransformModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const promptInputRef = useRef<HTMLInputElement>(null);

  // State
  const [prompt, setPrompt] = useState('');
  const [changes, setChanges] = useState<TransformationChange[]>([]);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  // Generate transformations
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please describe the transformation');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setChanges([]);
    setSummary('');

    try {
      const result = await generateTransformations(
        prompt,
        data,
        columnMapping,
        backendUrl,
        importerKey,
        undefined, // targetColumns
        validationErrors
      );

      if (result.success && result.changes.length > 0) {
        setChanges(result.changes);
        setSummary(result.summary);
      } else if (result.error) {
        setError(result.error);
      } else {
        setError('No transformations generated. Try a different description.');
      }
    } catch (err) {
      setError('Failed to generate transformations');
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, data, columnMapping, backendUrl, importerKey]);

  // Apply transformations
  const handleApply = useCallback((applyAll: boolean) => {
    const selectedChanges = applyAll 
      ? setAllChangesSelection(changes, true)
      : changes.filter(c => c.selected);
    
    // Pass the selected changes directly to the parent
    onApplyTransformations(selectedChanges);
    
    toast({
      title: 'Transformations applied',
      description: `${selectedChanges.length} changes applied successfully`,
    });
    
    onClose();
  }, [changes, onApplyTransformations, onClose, toast]);

  // Toggle change selection
  const handleToggleChange = useCallback((index: number) => {
    setChanges(prev => toggleChangeSelection(prev, index));
  }, []);

  // Select all/none
  const handleSelectAll = useCallback((selected: boolean) => {
    setChanges(prev => setAllChangesSelection(prev, selected));
  }, []);

  // Use example prompt
  const handleUseExample = useCallback((examplePrompt: string) => {
    setPrompt(examplePrompt);
    setShowExamples(false);
    promptInputRef.current?.focus();
  }, []);

  // Reset modal
  const handleClose = useCallback(() => {
    setPrompt('');
    setChanges([]);
    setSummary('');
    setError(null);
    setShowExamples(false);
    onClose();
  }, [onClose]);

  const selectedCount = countSelectedChanges(changes);
  const hasChanges = changes.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PiSparkle className="h-5 w-5" />
            {t('Transform data with AI')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
            {/* Show validation error context if available */}
            {validationErrors && validationErrors.length > 0 && (
              <Alert>
                <PiInfo className="h-4 w-4" />
                <AlertDescription>
                  {validationErrors.length} validation error{validationErrors.length > 1 ? 's' : ''} detected. 
                  Mention "fix errors" to focus on these rows.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Prompt Input */}
            <div>
              <div className="flex gap-2 mb-2">
                <Input
                  ref={promptInputRef}
                  placeholder={t("Describe the transformation (e.g., 'Convert dates to MM/DD/YYYY')")}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
                  disabled={isGenerating}
                  className="h-10"
                />
                <Button
                  onClick={handleGenerate}
                  isLoading={isGenerating}
                  disabled={isGenerating}
                >
                  <PiSparkle className="mr-2 h-4 w-4" />
                  {isGenerating ? t('Generating') : t('Generate')}
                </Button>
              </div>
              
              {/* Example prompts */}
              <button
                className="text-xs text-blue-600 hover:underline"
                onClick={() => setShowExamples(!showExamples)}
              >
                {showExamples ? t('Hide examples') : t('Show examples')}
              </button>
              
              {showExamples && (
                <div className="mt-2 p-2 bg-gray-50 rounded-md">
                  <p className="text-xs mb-1 font-bold">
                    {t('Click to use:')}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {COMMON_PROMPTS.slice(0, 5).map((example, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 text-xs bg-gray-200 rounded cursor-pointer hover:bg-blue-100"
                        onClick={() => handleUseExample(example)}
                      >
                        {example}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Loading State */}
            {isGenerating && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="mt-2 text-gray-600">
                  {t('Analyzing data and generating transformations...')}
                </p>
              </div>
            )}

            {/* Changes Preview */}
            {hasChanges && !isGenerating && (
              <>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold">
                      {summary || `${changes.length} transformations`}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSelectAll(true)}
                      >
                        {t('Select all')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSelectAll(false)}
                      >
                        {t('Deselect all')}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="max-h-[300px] overflow-y-auto border border-gray-200 rounded-md p-2">
                    <div className="space-y-1">
                      {changes.slice(0, 100).map((change, index) => (
                        <div
                          key={index}
                          className={`flex items-start gap-2 p-2 rounded-md border cursor-pointer ${
                            change.selected
                              ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                              : 'bg-white border-gray-100 hover:bg-gray-50'
                          }`}
                          onClick={() => handleToggleChange(index)}
                        >
                          <Checkbox
                            checked={change.selected}
                            onCheckedChange={() => handleToggleChange(index)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1 space-y-0">
                            <div className="text-sm text-gray-900 flex items-center gap-2">
                              <span className="line-through">
                                {String(change.oldValue || 'empty')}
                              </span>
                              <span>→</span>
                              <span className="text-green-600 font-bold">
                                {String(change.newValue)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">
                              Row {change.rowIndex + 1}, {change.columnKey}
                            </p>
                          </div>
                        </div>
                      ))}
                      
                      {changes.length > 100 && (
                        <p className="text-sm text-gray-500 text-center">
                          {t(`Showing first 100 of ${changes.length} changes`)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedCount} {t('selected')}
                  </p>
                </div>
              </>
            )}
        </div>

        <DialogFooter>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose}>
              {t('Cancel')}
            </Button>
            
            {hasChanges && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleApply(false)}
                  disabled={selectedCount === 0}
                >
                  {t(`Apply ${selectedCount} selected`)}
                </Button>
                <Button
                  onClick={() => handleApply(true)}
                >
                  <PiCheck className="mr-2 h-4 w-4" />
                  {t('Apply all')}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}