import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { trpc } from "@/lib/trpc";

interface CafeInfo {
  id: number;
  name: string;
  cafeId: string;
  location: string | null;
  timezone: string | null;
  isActive: number;
}

interface CafeContextType {
  cafes: CafeInfo[];
  selectedCafeId: number | "all" | null;
  selectedCafe: CafeInfo | null;
  setSelectedCafeId: (id: number | "all" | null) => void;
  isLoading: boolean;
  refetchCafes: () => void;
}

const CafeContext = createContext<CafeContextType>({
  cafes: [],
  selectedCafeId: null,
  selectedCafe: null,
  setSelectedCafeId: () => {},
  isLoading: true,
  refetchCafes: () => {},
});

export function CafeProvider({ children }: { children: ReactNode }) {
  const { data: cafes, isLoading, refetch } = trpc.cafes.list.useQuery();
  const [selectedCafeId, setSelectedCafeId] = useState<number | "all" | null>(null);

  useEffect(() => {
    if (cafes && cafes.length > 0 && selectedCafeId === null) {
      // Filter to only active cafes for auto-selection
      const activeCafes = cafes.filter((c) => c.isActive);
      if (activeCafes.length > 0) {
        setSelectedCafeId(activeCafes.length > 1 ? "all" : activeCafes[0].id);
      }
    }
  }, [cafes, selectedCafeId]);

  const selectedCafe = cafes?.find((c) => c.id === selectedCafeId) || null;

  return (
    <CafeContext.Provider
      value={{
        cafes: cafes || [],
        selectedCafeId,
        selectedCafe,
        setSelectedCafeId,
        isLoading,
        refetchCafes: refetch,
      }}
    >
      {children}
    </CafeContext.Provider>
  );
}

export function useCafe() {
  return useContext(CafeContext);
}
