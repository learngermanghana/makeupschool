'use client';

import { useMemo, useState } from 'react';

type ExpandableTextProps = {
  text: string;
  maxLength?: number;
  className?: string;
};

export function ExpandableText({ text, maxLength = 180, className }: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);

  const isLong = text.length > maxLength;
  const preview = useMemo(() => {
    if (!isLong) return text;
    return `${text.slice(0, maxLength).trimEnd()}...`;
  }, [isLong, maxLength, text]);

  return (
    <div>
      <p className={className}>{expanded || !isLong ? text : preview}</p>
      {isLong ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 text-sm font-medium text-gold underline-offset-4 hover:underline"
        >
          {expanded ? 'View less' : 'View more'}
        </button>
      ) : null}
    </div>
  );
}
