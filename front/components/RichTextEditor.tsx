'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Underline } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

type FormatState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  h1: boolean;
  h2: boolean;
  ul: boolean;
  ol: boolean;
};

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Escribe la descripción de la vacante...',
  minHeight = '260px',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [formatState, setFormatState] = useState<FormatState>({
    bold: false,
    italic: false,
    underline: false,
    h1: false,
    h2: false,
    ul: false,
    ol: false,
  });

  useEffect(() => {
    const node = editorRef.current;
    if (!node) return;
    if (node.innerHTML !== value && document.activeElement !== node) {
      node.innerHTML = value || '';
    }
  }, [value]);

  const updateFormatState = useCallback(() => {
    if (!editorRef.current) return;

    try {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const newState: FormatState = {
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        h1: false,
        h2: false,
        ul: document.queryCommandState('insertUnorderedList'),
        ol: document.queryCommandState('insertOrderedList'),
      };

      // Check for headings by looking at the parent element
      const parentElement = selection.anchorNode?.parentElement;
      if (parentElement) {
        const tagName = parentElement.tagName?.toLowerCase();
        newState.h1 = tagName === 'h1';
        newState.h2 = tagName === 'h2';
      }

      setFormatState(newState);
    } catch (error) {
      // Silently fail if browser doesn't support queryCommandState
      console.warn('Error updating format state:', error);
    }
  }, []);

  const run = (command: string, commandValue?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    
    try {
      document.execCommand(command, false, commandValue);
      
      // Update content and format state
      onChange(editorRef.current.innerHTML);
      
      // Small delay to allow DOM to update before checking state
      setTimeout(() => updateFormatState(), 10);
    } catch (error) {
      console.error('Error executing command:', error);
    }
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
    updateFormatState();
  };

  const handleSelectionChange = useCallback(() => {
    if (document.activeElement === editorRef.current) {
      updateFormatState();
    }
  }, [updateFormatState]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  return (
    <div className="rounded-lg border bg-background">
      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          position: absolute;
          opacity: 0.5;
        }
      `}</style>
      
      <div className="flex flex-wrap items-center gap-1 border-b p-2 bg-muted/30">
        <Button
          type="button"
          size="sm"
          variant={formatState.bold ? 'default' : 'ghost'}
          onClick={() => run('bold')}
          className={cn(
            'h-8 w-8 p-0',
            formatState.bold && 'bg-primary text-primary-foreground'
          )}
          title="Negrita (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          size="sm"
          variant={formatState.italic ? 'default' : 'ghost'}
          onClick={() => run('italic')}
          className={cn(
            'h-8 w-8 p-0',
            formatState.italic && 'bg-primary text-primary-foreground'
          )}
          title="Cursiva (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          size="sm"
          variant={formatState.underline ? 'default' : 'ghost'}
          onClick={() => run('underline')}
          className={cn(
            'h-8 w-8 p-0',
            formatState.underline && 'bg-primary text-primary-foreground'
          )}
          title="Subrayado (Ctrl+U)"
        >
          <Underline className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          type="button"
          size="sm"
          variant={formatState.h1 ? 'default' : 'ghost'}
          onClick={() => run('formatBlock', '<h1>')}
          className={cn(
            'h-8 w-8 p-0',
            formatState.h1 && 'bg-primary text-primary-foreground'
          )}
          title="Título 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          size="sm"
          variant={formatState.h2 ? 'default' : 'ghost'}
          onClick={() => run('formatBlock', '<h2>')}
          className={cn(
            'h-8 w-8 p-0',
            formatState.h2 && 'bg-primary text-primary-foreground'
          )}
          title="Título 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          type="button"
          size="sm"
          variant={formatState.ul ? 'default' : 'ghost'}
          onClick={() => run('insertUnorderedList')}
          className={cn(
            'h-8 w-8 p-0',
            formatState.ul && 'bg-primary text-primary-foreground'
          )}
          title="Lista con viñetas"
        >
          <List className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          size="sm"
          variant={formatState.ol ? 'default' : 'ghost'}
          onClick={() => run('insertOrderedList')}
          className={cn(
            'h-8 w-8 p-0',
            formatState.ol && 'bg-primary text-primary-foreground'
          )}
          title="Lista numerada"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="prose prose-sm max-w-none p-4 outline-none focus:outline-none"
        style={{ minHeight }}
        data-placeholder={placeholder}
        onInput={handleInput}
        onMouseUp={updateFormatState}
        onKeyUp={updateFormatState}
      />
      
      <style jsx global>{`
        .prose h1 {
          font-size: 1.875rem;
          font-weight: 800;
          line-height: 2.25rem;
          margin-top: 1rem;
          margin-bottom: 0.75rem;
          color: hsl(var(--foreground));
        }
        
        .prose h2 {
          font-size: 1.5rem;
          font-weight: 700;
          line-height: 2rem;
          margin-top: 0.875rem;
          margin-bottom: 0.625rem;
          color: hsl(var(--foreground));
        }
        
        .prose h3 {
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.75rem;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
          color: hsl(var(--foreground));
        }
        
        .prose p {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          line-height: 1.625;
        }
        
        .prose ul,
        .prose ol {
          margin-top: 0.75rem;
          margin-bottom: 0.75rem;
          padding-left: 1.625rem;
        }
        
        .prose ul {
          list-style-type: disc;
        }
        
        .prose ol {
          list-style-type: decimal;
        }
        
        .prose li {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
          line-height: 1.625;
        }
        
        .prose strong {
          font-weight: 600;
          color: hsl(var(--foreground));
        }
        
        .prose em {
          font-style: italic;
        }
        
        .prose u {
          text-decoration: underline;
        }
        
        .prose ul ul,
        .prose ul ol,
        .prose ol ul,
        .prose ol ol {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
        }
        
        .prose > *:first-child {
          margin-top: 0 !important;
        }
        
        .prose > *:last-child {
          margin-bottom: 0 !important;
        }
      `}</style>
    </div>
  );
}
