import React from 'react';

export const markdownComponents = {
  a: ({ node, ...props }: any) => (
    <a 
      {...props} 
      className="text-primary hover:underline font-medium" 
      target="_blank" 
      rel="noopener noreferrer" 
    />
  ),
  p: ({ node, ...props }: any) => (
    <p className="mb-3 last:mb-0" {...props} />
  ),
  ul: ({ node, ...props }: any) => (
    <ul className="mb-3 space-y-1 list-disc ml-4" {...props} />
  ),
  ol: ({ node, ...props }: any) => (
    <ol className="mb-3 space-y-1 list-decimal ml-4" {...props} />
  ),
  li: ({ node, ...props }: any) => (
    <li className="mb-1" {...props} />
  ),
  strong: ({ node, ...props }: any) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  em: ({ node, ...props }: any) => (
    <em className="italic" {...props} />
  ),
  h1: ({ node, ...props }: any) => (
    <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0" {...props} />
  ),
  h2: ({ node, ...props }: any) => (
    <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0" {...props} />
  ),
  h3: ({ node, ...props }: any) => (
    <h3 className="text-lg font-semibold mb-2 mt-4 first:mt-0" {...props} />
  ),
  h4: ({ node, ...props }: any) => (
    <h4 className="text-base font-semibold mb-2 mt-3 first:mt-0" {...props} />
  ),
  blockquote: ({ node, ...props }: any) => (
    <blockquote 
      className="border-l-4 border-primary/30 pl-4 italic my-4 text-muted-foreground" 
      {...props} 
    />
  ),
  code: ({ node, inline, ...props }: any) => (
    inline 
      ? <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
      : <code className="block bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto my-4" {...props} />
  ),
  pre: ({ node, ...props }: any) => (
    <pre className="bg-muted p-4 rounded-lg overflow-x-auto my-4" {...props} />
  ),
  hr: ({ node, ...props }: any) => (
    <hr className="my-6 border-border" {...props} />
  ),
  table: ({ node, ...props }: any) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border-collapse border border-border" {...props} />
    </div>
  ),
  th: ({ node, ...props }: any) => (
    <th className="border border-border bg-muted px-4 py-2 text-left font-semibold" {...props} />
  ),
  td: ({ node, ...props }: any) => (
    <td className="border border-border px-4 py-2" {...props} />
  ),
};
