'use client';

import { Tag } from '@/lib/hooks/useIncomes';

interface TagSelectorProps {
  tags: Tag[] | undefined;
  selectedTags: string[];
  onToggleTag: (tagId: string) => void;
}

export default function TagSelector({ tags, selectedTags, onToggleTag }: TagSelectorProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div>
      <label className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mb-2 block">
        Tags (opcional)
      </label>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => onToggleTag(tag.id)}
            className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full border-2 transition-all ${
              selectedTags.includes(tag.id)
                ? 'border-current shadow-md scale-105'
                : 'border-transparent opacity-70 hover:opacity-100'
            }`}
            style={{
              backgroundColor: tag.color,
              color: '#fff',
            }}
          >
            {tag.name}
          </button>
        ))}
      </div>
    </div>
  );
}
