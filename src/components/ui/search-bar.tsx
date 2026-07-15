import type { ChangeEventHandler } from 'react';

interface SearchBarProps {
  value: string;
  placeholder?: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
}

export function SearchBar({ value, placeholder = 'Search', onChange }: SearchBarProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <label className="sr-only">Search</label>
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />
    </div>
  );
}
