import { ChevronDown } from 'lucide-react';

export type SelectOption = string | { value: string; label?: string };

interface SelectProps {
 value: string;
 onChange: (value: string) => void;
 options: SelectOption[];
 placeholder?: string;
 className?: string;
}

export default function Select({
 value,
 onChange,
 options,
 placeholder = '—',
 className = '',
}: SelectProps) {
 return (
  <div className={`relative inline-flex ${className}`}>
   <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="appearance-none bg-zinc-800 border border-zinc-700 rounded-md pl-1.5 pr-5 py-1 text-[11px] text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 cursor-pointer"
   >
    <option value="">{placeholder}</option>
    {options.map((opt) => {
     const optValue = typeof opt === 'string' ? opt : opt.value;
     const optLabel = typeof opt === 'string' ? opt : (opt.label ?? opt.value);
     return (
      <option key={optValue} value={optValue}>
       {optLabel}
      </option>
     );
    })}
   </select>
   <ChevronDown
    size={11}
    className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-500"
   />
  </div>
 );
}
