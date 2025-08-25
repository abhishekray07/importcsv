'use client';

import { useState } from 'react';
import type { PlaygroundConfig } from './ImporterPlayground';

interface CodeGeneratorProps {
  config: PlaygroundConfig;
}

export default function CodeGenerator({ config }: CodeGeneratorProps) {
  const [showTypeScript, setShowTypeScript] = useState(true);
  const [copied, setCopied] = useState(false);

  const generateCode = () => {
    const imports = showTypeScript
      ? `import { CSVImporter } from '@importcsv/react';
import type { Column } from '@importcsv/react';
import { useState } from 'react';`
      : `import { CSVImporter } from '@importcsv/react';
import { useState } from 'react';`;

    const columnsCode = showTypeScript
      ? `const columns: Column[] = ${JSON.stringify(config.columns, null, 2)};`
      : `const columns = ${JSON.stringify(config.columns, null, 2)};`;

    const componentCode = `function MyImporter() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Import CSV
      </button>
      
      <CSVImporter${config.isModal ? `
        modalIsOpen={isOpen}
        modalOnCloseTriggered={() => setIsOpen(false)}` : `
        isModal={false}`}
        columns={columns}
        darkMode={${config.darkMode}}
        primaryColor="${config.primaryColor}"
        showDownloadTemplateButton={${config.showDownloadTemplateButton}}
        skipHeaderRowSelection={${config.skipHeaderRowSelection}}
        onComplete={(data) => {
          console.log('Import complete:', data);
          setIsOpen(false);
        }}
      />
    </>
  );
}`;

    return `${imports}\n\n${columnsCode}\n\n${componentCode}`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setShowTypeScript(!showTypeScript)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              showTypeScript 
                ? 'bg-fd-primary text-fd-primary-foreground' 
                : 'bg-fd-muted text-fd-muted-foreground hover:bg-fd-muted/80'
            }`}
          >
            TypeScript
          </button>
          <button
            onClick={() => setShowTypeScript(!showTypeScript)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              !showTypeScript 
                ? 'bg-fd-primary text-fd-primary-foreground' 
                : 'bg-fd-muted text-fd-muted-foreground hover:bg-fd-muted/80'
            }`}
          >
            JavaScript
          </button>
        </div>
        <button
          onClick={copyToClipboard}
          className="px-3 py-1 text-sm bg-fd-primary text-white rounded-md hover:bg-fd-primary/90 transition-colors font-medium"
        >
          {copied ? '✓ Copied' : 'Copy Code'}
        </button>
      </div>

      <div className="relative rounded-lg border border-fd-border bg-fd-code overflow-hidden">
        <div className="bg-fd-muted/50 px-4 py-2 border-b border-fd-border flex justify-between items-center">
          <span className="text-xs text-fd-muted-foreground font-mono">
            {showTypeScript ? 'TypeScript' : 'JavaScript'}
          </span>
        </div>
        <pre className="overflow-x-auto p-4 bg-fd-background/50">
          <code className="text-sm font-mono text-fd-foreground" style={{ whiteSpace: 'pre' }}>
            {generateCode()}
          </code>
        </pre>
      </div>

      <div className="rounded-lg border p-4 bg-fd-muted/30">
        <h4 className="font-medium text-sm mb-2">Quick Start</h4>
        <ol className="text-sm text-fd-muted-foreground space-y-1">
          <li>1. Install: <code className="px-1 py-0.5 bg-fd-muted rounded text-xs">npm install @importcsv/react</code></li>
          <li>2. Copy the code above</li>
          <li>3. Import in your React app</li>
          <li>4. Customize as needed</li>
        </ol>
      </div>
    </div>
  );
}