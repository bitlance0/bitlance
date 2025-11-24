// src/components/trading-dashboard/SearchBar.tsx
"use client";

import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import useDebounce from "@/hooks/useDebounce";
import { useMarketStore } from "@/stores/useMarketStore";

const SearchBar = () => {
  const [input, setInput] = useState("");
  const debouncedInput = useDebounce(input, 400);

  const { filters, setFilters } = useMarketStore();

  // Sincroniza el término de búsqueda con debounce (store global)
  useEffect(() => {
    setFilters({ search: debouncedInput });
  }, [debouncedInput, setFilters]);

  // Si el valor del store cambia (por limpiar filtros globalmente, etc.), sincronizar input local
  useEffect(() => {
    if (filters.search === "" && input !== "") {
      setInput("");
    }
  }, [filters.search]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <svg
          width="20"
          height="20"
          viewBox="0 0 19 22"
          fill="none"
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        >
          <path
            d="M18 17.5L13.0001 12.5M14.6667 8.33333C14.6667 11.555 12.055 14.1667 8.83333 14.1667C5.61167 14.1667 3 11.555 3 8.33333C3 5.11167 5.61167 2.5 8.83333 2.5C12.055 2.5 14.6667 5.11167 14.6667 8.33333Z"
            stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>

        <Input
          type="search"
          placeholder="Buscar símbolo o mercado..."
          value={input}
          onChange={handleSearch}
          className="w-full pl-10 pr-4 py-2 border border-gray-50/80 bg-background text-yellow-300 placeholder:text-gray-500 focus-visible:ring-yellow-400"
        />
      </div>
    </div>
  );
};

export default SearchBar;
