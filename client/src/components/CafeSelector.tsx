import { useCafe } from "@/contexts/CafeContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

export function CafeSelector() {
  const { cafes, selectedCafeId, setSelectedCafeId } = useCafe();

  if (cafes.length === 0) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4" />
        <span>No cafes configured</span>
      </div>
    );
  }

  return (
    <Select
      value={selectedCafeId?.toString() || ""}
      onValueChange={(val) => {
        setSelectedCafeId(val === "all" ? "all" : Number(val));
      }}
    >
      <SelectTrigger className="w-full bg-secondary/50 border-border/50 h-9">
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
          <SelectValue placeholder="Select cafe" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {cafes.length > 1 && (
          <SelectItem value="all">All Cafes (Combined)</SelectItem>
        )}
        {cafes.map((cafe) => (
          <SelectItem key={cafe.id} value={cafe.id.toString()}>
            {cafe.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
