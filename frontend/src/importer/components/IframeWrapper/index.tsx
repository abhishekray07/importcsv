import React, { useEffect, useRef } from 'react';
import Frame, { FrameContextConsumer } from 'react-frame-component';

/**
 * IframeWrapper Component
 * 
 * Provides complete CSS isolation for the importer by rendering content inside an iframe.
 * This follows industry best practices used by embedded SaaS tools like TableFlow, 
 * Intercom, Zendesk, and Stripe.
 * 
 * Key benefits:
 * - Complete CSS isolation from parent application
 * - Prevents parent styles (e.g., container max-width) from affecting the importer
 * - Automatically copies all styles from parent document into iframe
 * - Maintains React context and functionality through react-frame-component
 * - Observes and copies dynamically added styles
 * 
 * @param children - React components to render inside the iframe
 * @param className - Optional CSS class for the iframe element
 */

interface IframeWrapperProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * IframeContent Component
 * 
 * Separate component to handle iframe content with hooks properly.
 * This is required to follow React's rules of hooks - hooks cannot be
 * called conditionally or inside callbacks.
 */
function IframeContent({ 
  children, 
  document, 
  window: iframeWindow 
}: { 
  children: React.ReactNode;
  document?: Document;
  window?: Window;
}) {
  useEffect(() => {
    if (!document || !iframeWindow) return;
    
    // Get parent window reference safely
    const parentWindow = iframeWindow.parent || window;
    const parentDocument = parentWindow.document;
    
    // Copy all style tags
    const parentStyles = Array.from(parentDocument.querySelectorAll('style'));
    parentStyles.forEach((styleElement) => {
      const newStyle = document.createElement('style');
      newStyle.textContent = styleElement.textContent;
      document.head.appendChild(newStyle);
    });
    
    // Copy all linked stylesheets
    const parentLinks = Array.from(parentDocument.querySelectorAll('link[rel="stylesheet"]'));
    parentLinks.forEach((linkElement: any) => {
      const newLink = document.createElement('link');
      newLink.rel = 'stylesheet';
      newLink.href = linkElement.href;
      document.head.appendChild(newLink);
    });
    
    // Also observe for new styles added dynamically
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node: any) => {
          if (node.tagName === 'STYLE') {
            const newStyle = document.createElement('style');
            newStyle.textContent = node.textContent;
            document.head.appendChild(newStyle);
          } else if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
            const newLink = document.createElement('link');
            newLink.rel = 'stylesheet';
            newLink.href = node.href;
            document.head.appendChild(newLink);
          }
        });
      });
    });
    
    observer.observe(parentDocument.head, {
      childList: true,
      subtree: true
    });
    
    return () => observer.disconnect();
  }, [document, iframeWindow]);
  
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      {children}
    </div>
  );
}

export default function IframeWrapper({ children, className = '' }: IframeWrapperProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Initial HTML with all necessary styles including Tailwind
  const initialContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          /* CSS Variables for Tailwind colors */
          :root {
            --background: 0 0% 100%;
            --foreground: 222.2 84% 4.9%;
            --card: 0 0% 100%;
            --card-foreground: 222.2 84% 4.9%;
            --popover: 0 0% 100%;
            --popover-foreground: 222.2 84% 4.9%;
            --primary: 221.2 83.2% 53.3%;
            --primary-foreground: 210 40% 98%;
            --secondary: 210 40% 96.1%;
            --secondary-foreground: 222.2 47.4% 11.2%;
            --muted: 210 40% 96.1%;
            --muted-foreground: 215.4 16.3% 46.9%;
            --accent: 210 40% 96.1%;
            --accent-foreground: 222.2 47.4% 11.2%;
            --destructive: 0 84.2% 60.2%;
            --destructive-foreground: 210 40% 98%;
            --border: 214.3 31.8% 91.4%;
            --input: 214.3 31.8% 91.4%;
            --ring: 221.2 83.2% 53.3%;
            --radius: 0.5rem;
          }
          
          /* Reset styles to ensure clean slate */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          html, body {
            width: 100%;
            height: 100%;
            overflow: visible;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          
          /* Ensure the root div takes full space */
          body > div {
            width: 100%;
            min-height: 100%;
          }
          
          /* Ensure content can expand horizontally without iframe scrolling */
          #mountHere {
            width: 100%;
            min-width: 0;
            overflow: visible;
          }
        </style>
      </head>
      <body>
        <div id="mountHere"></div>
      </body>
    </html>
  `;

  return (
    <Frame
      ref={iframeRef}
      className={className}
      initialContent={initialContent}
      mountTarget="#mountHere"
      style={{
        width: '100%',
        height: '100%',
        minHeight: '600px',
        border: 'none',
        display: 'block'
      }}
    >
      <FrameContextConsumer>
        {({ document, window }) => (
          <IframeContent document={document} window={window}>
            {children}
          </IframeContent>
        )}
      </FrameContextConsumer>
    </Frame>
  );
}