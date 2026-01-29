import React, { type InputHTMLAttributes, type ReactNode } from 'react';
import type { Pluggable, PluggableList } from 'unified';
import { ChartRenderer } from './ChartRenderer';
import { MapRenderer } from './MapRenderer';

type ChildrenProps = {
  children?: ReactNode;
};

type CodeProps = ChildrenProps & {
  inline?: boolean;
  className?: string;
};

type AnchorProps = ChildrenProps & {
  href?: string;
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRendererComponent: React.FC<MarkdownRendererProps> = ({
  content,
  className = ''
}) => {
  // Import dinamico per evitare problemi di build
  const [ReactMarkdown, setReactMarkdown] = React.useState<typeof import('react-markdown')['default'] | null>(null);
  const [remarkGfm, setRemarkGfm] = React.useState<typeof import('remark-gfm')['default'] | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadMarkdown = async () => {
      try {
        const [markdownModule, gfmModule] = await Promise.all([
          import('react-markdown'),
          import('remark-gfm')
        ]);
        
        setReactMarkdown(() => markdownModule.default);
        setRemarkGfm(() => gfmModule.default);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading markdown modules:', err);
        setError(err instanceof Error ? err.message : 'Failed to load markdown');
        setIsLoading(false);
      }
    };

    loadMarkdown();
  }, []);

  const remarkPluginList = React.useMemo<PluggableList | undefined>(
    () => (remarkGfm ? [remarkGfm as Pluggable] : undefined),
    [remarkGfm]
  );

  if (isLoading) {
    return (
      <div className={`markdown-content ${className}`} style={{ fontFamily: 'system-ui, sans-serif' }}>
        <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-100">
          {content}
        </div>
      </div>
    );
  }

  if (error || !ReactMarkdown) {
    return (
      <div className={`markdown-content ${className}`} style={{ fontFamily: 'system-ui, sans-serif' }}>
        <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-100">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`markdown-content ${className} text-gray-700 dark:text-gray-100`}
      style={{ 
        fontFamily: 'system-ui, -apple-system, sans-serif',
        lineHeight: '1.6'
      }}
    >
      <ReactMarkdown
        remarkPlugins={remarkPluginList}
        components={{
          // Code blocks
          code({ inline, className, children }: CodeProps) {
            const inlineClassName = [
              'bg-gray-100 text-gray-800 px-1 py-0 rounded text-sm font-mono border',
              className
            ]
              .filter(Boolean)
              .join(' ');
            if (inline) {
              return (
                <code 
                  className={`${inlineClassName} dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600`}
                  style={{ 
                    padding: '0.05rem 0.3rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.8125rem',
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                    verticalAlign: 'middle',
                    lineHeight: '1'
                  }}
                >
                  {children}
                </code>
              );
            }
            
            // Check if this is a map block (e.g., language-map)
            const mapMatch = /language-map/.exec(className || '');
            if (mapMatch) {
              const jsonStr = String(children).replace(/\n$/, '').trim();
              // Check if JSON looks complete (starts with { and ends with })
              const looksComplete = jsonStr.startsWith('{') && jsonStr.endsWith('}');
              
              if (!looksComplete) {
                // JSON is still being typed - show loading placeholder
                return (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-500 dark:text-gray-400 animate-pulse">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm">Loading map...</span>
                    </div>
                  </div>
                );
              }
              
              try {
                const mapData = JSON.parse(jsonStr);
                return <MapRenderer mapData={mapData} />;
              } catch (error) {
                // JSON might still be incomplete even if it looks complete
                // Show loading state instead of error during potential typing
                return (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-500 dark:text-gray-400 animate-pulse">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm">Loading map...</span>
                    </div>
                  </div>
                );
              }
            }
            
            // Check if this is a chart block (e.g., language-chart:line)
            const chartMatch = /language-chart:(\w+)/.exec(className || '');
            if (chartMatch) {
              const chartType = chartMatch[1]; // line, bar, pie, area
              const jsonStr = String(children).replace(/\n$/, '').trim();
              // Check if JSON looks complete (starts with { and ends with })
              const looksComplete = jsonStr.startsWith('{') && jsonStr.endsWith('}');
              
              if (!looksComplete) {
                // JSON is still being typed - show loading placeholder
                return (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-500 dark:text-gray-400 animate-pulse">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm">Loading chart...</span>
                    </div>
                  </div>
                );
              }
              
              try {
                const chartData = JSON.parse(jsonStr);
                return (
                  <ChartRenderer 
                    chartData={{ 
                      ...chartData, 
                      type: chartType as 'line' | 'bar' | 'pie' | 'area'
                    }} 
                  />
                );
              } catch (error) {
                // JSON might still be incomplete - show loading state
                return (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-500 dark:text-gray-400 animate-pulse">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-sm">Loading chart...</span>
                    </div>
                  </div>
                );
              }
            }
            
            // Code block multi-linea con sfondo chiaro e dimensioni ridotte
            const blockClassName = ['text-xs font-mono', className]
              .filter(Boolean)
              .join(' ');
            return (
              <pre 
                className="bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-1 rounded overflow-x-auto my-1 border border-gray-200 dark:border-gray-700"
                style={{
                  padding: '0.25rem 0.4rem',
                  borderRadius: '0.375rem',
                  overflowX: 'auto',
                  margin: '0.25rem 0',
                  display: 'inline-block',
                  maxWidth: '100%',
                  width: 'fit-content',
                  verticalAlign: 'middle'
                }}
              >
                <code 
                  className={`${blockClassName} text-gray-800 dark:text-gray-200`}
                  style={{
                    fontSize: '0.8125rem',
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                    lineHeight: '1'
                  }}
                >
                  {children}
                </code>
              </pre>
            );
          },
          
          // Tables
          table({ children }: ChildrenProps) {
            return (
              <div 
                className="overflow-x-auto my-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/50"
                style={{
                  overflowX: 'auto',
                  margin: '1rem 0',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
              >
                <table 
                  className="min-w-full border-collapse markdown-table"
                  style={{
                    minWidth: '100%',
                    borderCollapse: 'collapse'
                  }}
                >
                  {children}
                </table>
              </div>
            );
          },
          
          // Table head
          thead({ children }: ChildrenProps) {
            return (
              <thead className="bg-gray-50 dark:bg-gray-800">
                {children}
              </thead>
            );
          },
          
          // Table header cells
          th({ children }: ChildrenProps) {
            return (
              <th 
                className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b-2 border-gray-200 dark:border-gray-700 border-r border-gray-200 dark:border-gray-700 last:border-r-0 bg-gray-50 dark:bg-gray-800"
                style={{
                  padding: '0.75rem 1.5rem',
                  textAlign: 'left',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  borderBottom: '2px solid #e5e7eb',
                  borderRight: '1px solid #e5e7eb'
                }}
              >
                {children}
              </th>
            );
          },
          
          // Table body
          tbody({ children }: ChildrenProps) {
            return (
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {children}
              </tbody>
            );
          },
          
          // Table data cells
          td({ children }: ChildrenProps) {
            return (
              <td 
                className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700 last:border-r-0"
                style={{
                  padding: '1rem 1.5rem',
                  whiteSpace: 'normal',
                  fontSize: '0.875rem',
                  borderRight: '1px solid #f3f4f6'
                }}
              >
                {children}
              </td>
            );
          },
          
          // Table rows
          tr({ children }: ChildrenProps) {
            return (
              <tr 
                className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                style={{
                  transition: 'background-color 0.15s ease-in-out'
                }}
              >
                {children}
              </tr>
            );
          },
          
          // Headers
          h1({ children }: ChildrenProps) {
            return (
              <h1 
                className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-6 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700"
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  marginTop: '1.5rem',
                  marginBottom: '1rem',
                  paddingBottom: '0.5rem',
                  borderBottom: '1px solid #e5e7eb'
                }}
              >
                {children}
              </h1>
            );
          },
          
          h2({ children }: ChildrenProps) {
            return (
              <h2 
                className="text-xl font-semibold text-gray-800 dark:text-gray-100 mt-5 mb-3"
                style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  marginTop: '1.25rem',
                  marginBottom: '0.75rem'
                }}
              >
                {children}
              </h2>
            );
          },
          
          h3({ children }: ChildrenProps) {
            return (
              <h3 
                className="text-lg font-semibold text-gray-800 dark:text-gray-100 mt-4 mb-2"
                style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  marginTop: '1rem',
                  marginBottom: '0.5rem'
                }}
              >
                {children}
              </h3>
            );
          },
          
          h4({ children }: ChildrenProps) {
            return (
              <h4 
                className="text-base font-semibold text-gray-800 dark:text-gray-100 mt-3 mb-2"
                style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  marginTop: '0.75rem',
                  marginBottom: '0.5rem'
                }}
              >
                {children}
              </h4>
            );
          },
          
          h5({ children }: ChildrenProps) {
            return (
              <h5 
                className="text-sm font-semibold text-gray-800 dark:text-gray-100 mt-3 mb-1"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  marginTop: '0.75rem',
                  marginBottom: '0.25rem'
                }}
              >
                {children}
              </h5>
            );
          },
          
          h6({ children }: ChildrenProps) {
            return (
              <h6 
                className="text-xs font-semibold text-gray-800 dark:text-gray-100 mt-3 mb-1"
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  marginTop: '0.75rem',
                  marginBottom: '0.25rem'
                }}
              >
                {children}
              </h6>
            );
          },
          
          // Paragraphs
          p({ children }: ChildrenProps) {
            return (
              <p 
                className="mb-3 text-gray-700 dark:text-gray-100"
                style={{
                  marginBottom: '0.75rem'
                }}
              >
                {children}
              </p>
            );
          },
          
          // Lists
          ul({ children }: ChildrenProps) {
            return (
              <ul 
                className="list-disc list-inside mb-4 space-y-1"
                style={{
                  listStyleType: 'disc',
                  listStylePosition: 'inside',
                  marginBottom: '1rem',
                  paddingLeft: '1rem'
                }}
              >
                {children}
              </ul>
            );
          },
          
          ol({ children }: ChildrenProps) {
            return (
              <ol 
                className="list-decimal list-inside mb-4 space-y-1"
                style={{
                  listStyleType: 'decimal',
                  listStylePosition: 'inside',
                  marginBottom: '1rem',
                  paddingLeft: '1rem'
                }}
              >
                {children}
              </ol>
            );
          },
          
          li({ children }: ChildrenProps) {
            return (
              <li 
                className="text-gray-700 dark:text-gray-100"
                style={{
                  marginBottom: '0.25rem'
                }}
              >
                {children}
              </li>
            );
          },
          
          // Blockquotes
          blockquote({ children }: ChildrenProps) {
            return (
              <blockquote 
                className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 my-4 italic text-gray-600 dark:text-gray-200 bg-blue-50 dark:bg-blue-900/30 py-2 rounded-r"
                style={{
                  borderLeft: '4px solid #3b82f6',
                  paddingLeft: '1rem',
                  margin: '1rem 0',
                  fontStyle: 'italic',
                  color: '#4b5563',
                  backgroundColor: '#eff6ff',
                  padding: '0.5rem 0',
                  borderRadius: '0 0.25rem 0.25rem 0'
                }}
              >
                {children}
              </blockquote>
            );
          },
          
          // Links
          a({ href, children }: AnchorProps) {
            return (
              <a 
                href={href} 
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline decoration-blue-300 dark:decoration-blue-600 hover:decoration-blue-500 dark:hover:decoration-blue-400 transition-colors"
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  color: '#2563eb',
                  textDecoration: 'underline',
                  textDecorationColor: '#93c5fd'
                }}
              >
                {children}
              </a>
            );
          },
          
          // Horizontal rules
          hr() {
            return (
              <hr 
                className="my-4 border-gray-300 dark:border-gray-700"
                style={{
                  margin: '1rem 0',
                  border: 'none',
                  borderTop: '1px solid #d1d5db'
                }}
              />
            );
          },
          
          // Strong/Bold
          strong({ children }: ChildrenProps) {
            return (
              <strong 
                className="font-bold text-gray-900 dark:text-gray-100"
                style={{
                  fontWeight: '700'
                }}
              >
                {children}
              </strong>
            );
          },
          
          // Emphasis/Italic
          em({ children }: ChildrenProps) {
            return (
              <em 
                className="italic text-gray-700 dark:text-gray-100"
                style={{
                  fontStyle: 'italic'
                }}
              >
                {children}
              </em>
            );
          },
          
          // Strikethrough (GFM)
          del({ children }: ChildrenProps) {
            return (
              <del 
                className="line-through text-gray-500 dark:text-gray-400"
                style={{
                  textDecoration: 'line-through'
                }}
              >
                {children}
              </del>
            );
          },
          
          // Task lists (GFM)
          input({ type, checked, ...props }: InputHTMLAttributes<HTMLInputElement>) {
            if (type === 'checkbox') {
              return (
                <input 
                  type="checkbox" 
                  checked={checked} 
                  readOnly 
                  className="mr-2"
                  style={{ marginRight: '0.5rem' }}
                  {...props}
                />
              );
            }
            return <input type={type} {...props} />;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

// Memoize MarkdownRenderer to prevent re-renders when content and className haven't changed
export const MarkdownRenderer = React.memo(MarkdownRendererComponent, (prevProps, nextProps) => {
  // Only re-render if content or className changes
  return prevProps.content === nextProps.content && 
         prevProps.className === nextProps.className;
});