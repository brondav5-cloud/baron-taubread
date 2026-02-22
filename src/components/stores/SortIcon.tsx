"use client";

import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import type { SortDirection } from "@/hooks/useStoresPage";

interface SortIconProps {
  direction: SortDirection;
}

export function SortIcon({ direction }: SortIconProps) {
  if (direction === "asc") return <ChevronUp className="w-3 h-3 inline ml-1" />;
  if (direction === "desc")
    return <ChevronDown className="w-3 h-3 inline ml-1" />;
  return <ChevronsUpDown className="w-3 h-3 inline ml-1 opacity-40" />;
}
