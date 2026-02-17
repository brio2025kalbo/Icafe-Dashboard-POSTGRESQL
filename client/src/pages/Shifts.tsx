import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCafe } from "@/contexts/CafeContext";

export default function Shifts() {
  const { selectedCafe } = useCafe();

  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [staff, setStaff] = useState("all");

  return (
    <div className="space-y-4">

      <h1 className="text-xl font-semibold">Shifts</h1>

      <div className="flex gap-2 flex-wrap">

        {/* Date range — copy same component used in Reports */}
        <input
          type="datetime-local"
          value={dateStart}
          onChange={(e) => setDateStart(e.target.value)}
          className="border rounded px-3 py-2"
        />

        <input
          type="datetime-local"
          value={dateEnd}
          onChange={(e) => setDateEnd(e.target.value)}
          className="border rounded px-3 py-2"
        />

        <select
          value={staff}
          onChange={(e) => setStaff(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All</option>
          {/* staff options loaded dynamically */}
        </select>

        <Button>Search</Button>

      </div>

      <div className="bg-card border rounded-lg p-4">
        Shift results will display here.
      </div>

    </div>
  );
}
