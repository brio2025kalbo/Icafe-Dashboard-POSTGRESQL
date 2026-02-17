import { useState, useCallback } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
} from "date-fns";
import type { DateRange } from "react-day-picker";

export interface DateTimeRange {
  dateStart: string; // yyyy-MM-dd
  dateEnd: string;   // yyyy-MM-dd
  timeStart: string; // HH:mm
  timeEnd: string;   // HH:mm
}

interface DateTimeRangePickerProps {
  value: DateTimeRange;
  onChange: (value: DateTimeRange) => void;
}

type PresetKey =
  | "today"
  | "yesterday"
  | "last2days"
  | "last7days"
  | "last30days"
  | "thisMonth"
  | "lastMonth"
  | "custom";

interface Preset {
  key: PresetKey;
  label: string;
  getRange: () => { from: Date; to: Date };
}

const presets: Preset[] = [
  {
    key: "today",
    label: "Today",
    getRange: () => {
      const now = new Date();
      return { from: startOfDay(now), to: endOfDay(now) };
    },
  },
  {
    key: "yesterday",
    label: "Yesterday",
    getRange: () => {
      const yesterday = subDays(new Date(), 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    },
  },
  {
    key: "last2days",
    label: "Last 2 Days",
    getRange: () => ({
      from: startOfDay(subDays(new Date(), 1)),
      to: endOfDay(new Date()),
    }),
  },
  {
    key: "last7days",
    label: "Last 7 Days",
    getRange: () => ({
      from: startOfDay(subDays(new Date(), 6)),
      to: endOfDay(new Date()),
    }),
  },
  {
    key: "last30days",
    label: "Last 30 Days",
    getRange: () => ({
      from: startOfDay(subDays(new Date(), 29)),
      to: endOfDay(new Date()),
    }),
  },
  {
    key: "thisMonth",
    label: "This Month",
    getRange: () => ({
      from: startOfMonth(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    key: "lastMonth",
    label: "Last Month",
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      };
    },
  },
];

export function DateTimeRangePicker({ value, onChange }: DateTimeRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<PresetKey>("last7days");

  // Internal draft state for the picker (only applied on "Apply")
  const [draftRange, setDraftRange] = useState<DateRange>({
    from: new Date(value.dateStart + "T00:00:00"),
    to: new Date(value.dateEnd + "T00:00:00"),
  });
  const [draftTimeStart, setDraftTimeStart] = useState(value.timeStart);
  const [draftTimeEnd, setDraftTimeEnd] = useState(value.timeEnd);
  const [draftMonth, setDraftMonth] = useState(new Date(value.dateStart + "T00:00:00"));

  const handlePresetClick = useCallback((preset: Preset) => {
    const range = preset.getRange();
    setDraftRange({ from: range.from, to: range.to });
    setDraftTimeStart(format(range.from, "HH:mm"));
    setDraftTimeEnd(format(range.to, "HH:mm"));
    setActivePreset(preset.key);
    setDraftMonth(range.from);
  }, []);

  const handleCalendarSelect = useCallback((range: DateRange | undefined) => {
    if (range) {
      setDraftRange(range);
      setActivePreset("custom");
    }
  }, []);

  const handleApply = useCallback(() => {
    if (draftRange.from && draftRange.to) {
      onChange({
        dateStart: format(draftRange.from, "yyyy-MM-dd"),
        dateEnd: format(draftRange.to, "yyyy-MM-dd"),
        timeStart: draftTimeStart,
        timeEnd: draftTimeEnd,
      });
      setOpen(false);
    }
  }, [draftRange, draftTimeStart, draftTimeEnd, onChange]);

  const handleCancel = useCallback(() => {
    // Reset draft to current value
    setDraftRange({
      from: new Date(value.dateStart + "T00:00:00"),
      to: new Date(value.dateEnd + "T00:00:00"),
    });
    setDraftTimeStart(value.timeStart);
    setDraftTimeEnd(value.timeEnd);
    setDraftMonth(new Date(value.dateStart + "T00:00:00"));
    setOpen(false);
  }, [value]);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        // Sync draft with current value when opening
        setDraftRange({
          from: new Date(value.dateStart + "T00:00:00"),
          to: new Date(value.dateEnd + "T00:00:00"),
        });
        setDraftTimeStart(value.timeStart);
        setDraftTimeEnd(value.timeEnd);
        setDraftMonth(new Date(value.dateStart + "T00:00:00"));
      }
      setOpen(isOpen);
    },
    [value]
  );

  const displayText = `${value.dateStart} ${value.timeStart} — ${value.dateEnd} ${value.timeEnd}`;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal h-9 px-3 gap-2 bg-secondary/50 border-border/50 hover:bg-secondary/70",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm truncate">{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end" side="bottom">
        <div className="flex">
          {/* Presets sidebar */}
          <div className="flex flex-col border-r border-border/50 py-2 w-[130px] shrink-0">
            {presets.map((preset) => (
              <button
                key={preset.key}
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  "text-left px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                  activePreset === preset.key &&
                    "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                )}
              >
                {preset.label}
              </button>
            ))}
            <button
              onClick={() => setActivePreset("custom")}
              className={cn(
                "text-left px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                activePreset === "custom" &&
                  "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              )}
            >
              Custom
            </button>
          </div>

          {/* Calendars + time */}
          <div className="flex flex-col">
            <div className="flex p-2 gap-0">
              <Calendar
                mode="range"
                selected={draftRange}
                onSelect={handleCalendarSelect}
                month={draftMonth}
                onMonthChange={setDraftMonth}
                numberOfMonths={2}
                showOutsideDays={true}
                className="[--cell-size:--spacing(8)]"
              />
            </div>

            <Separator />

            {/* Time inputs + summary + actions */}
            <div className="flex items-center justify-between px-4 py-3 gap-4">
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={draftTimeStart}
                  onChange={(e) => {
                    setDraftTimeStart(e.target.value);
                    setActivePreset("custom");
                  }}
                  className="w-[100px] h-8 text-xs bg-secondary/50 border-border/50"
                />
                <span className="text-xs text-muted-foreground">—</span>
                <Input
                  type="time"
                  value={draftTimeEnd}
                  onChange={(e) => {
                    setDraftTimeEnd(e.target.value);
                    setActivePreset("custom");
                  }}
                  className="w-[100px] h-8 text-xs bg-secondary/50 border-border/50"
                />
              </div>

              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                {draftRange.from && draftRange.to
                  ? `${format(draftRange.from, "yyyy-MM-dd")} ${draftTimeStart} - ${format(draftRange.to, "yyyy-MM-dd")} ${draftTimeEnd}`
                  : "Select a date range"}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" className="text-xs h-8" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="text-xs h-8"
                  onClick={handleApply}
                  disabled={!draftRange.from || !draftRange.to}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
