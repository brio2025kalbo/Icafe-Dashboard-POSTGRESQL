import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AdminOnly } from "@/components/AdminOnly";
// Toast utility
const toast = ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
  if (variant === "destructive") {
    alert(`Error: ${title}\n${description}`);
  } else {
    alert(`${title}\n${description}`);
  }
};
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function AutoSendSettings({ cafeDbId }: { cafeDbId: number }) {
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<"daily_time" | "business_day_end" | "last_shift">("daily_time");
  const [scheduleTime, setScheduleTime] = useState("08:00");
  const [isSaving, setIsSaving] = useState(false);

  const settingQuery = trpc.quickbooks.getAutoSendSetting.useQuery({ cafeDbId });
  const updateMutation = trpc.quickbooks.updateAutoSendSetting.useMutation();

  // Load existing settings
  useEffect(() => {
    if (settingQuery.data) {
      setEnabled(settingQuery.data.enabled === 1);
      setMode(settingQuery.data.mode);
      setScheduleTime(settingQuery.data.scheduleTime || "08:00");
    }
  }, [settingQuery.data]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({
        cafeDbId,
        enabled,
        mode,
        scheduleTime: mode === "daily_time" ? scheduleTime : undefined,
      });
      toast({
        title: "Settings saved",
        description: "Auto-send settings have been updated successfully.",
      });
      settingQuery.refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (settingQuery.isLoading) {
    return (
      <Card className="p-6">
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Automated Report Sending</h2>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-send-enabled" className="text-base">
              Enable Auto-Send
            </Label>
            <p className="text-sm text-muted-foreground">
              Automatically send reports to QuickBooks based on schedule
            </p>
          </div>
          <Switch
            id="auto-send-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {enabled && (
          <div className="space-y-4 border-t pt-4">
            <Label>Schedule Mode</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)}>
              <div className="flex items-start space-x-3 space-y-0">
                <RadioGroupItem value="daily_time" id="mode-daily" />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="mode-daily" className="font-normal cursor-pointer">
                    Daily at specific time
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Send yesterday's report every day at a set time
                  </p>
                  {mode === "daily_time" && (
                    <div className="mt-2">
                      <Input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-40"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start space-x-3 space-y-0">
                <RadioGroupItem value="business_day_end" id="mode-business-day" />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="mode-business-day" className="font-normal cursor-pointer">
                    After business day ends (6:00 AM)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Send yesterday's report automatically at 6:05 AM daily
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 space-y-0">
                <RadioGroupItem value="last_shift" id="mode-last-shift" />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="mode-last-shift" className="font-normal cursor-pointer">
                    After last shift closes
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Send report when the final shift of the day is completed
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Auto-Send Settings"
          )}
        </Button>
      </div>
    </Card>
  );
}

export function QuickBooksSettings() {
  const [selectedCafe, setSelectedCafe] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isSending, setIsSending] = useState(false);

  const statusQuery = trpc.quickbooks.status.useQuery();
  const cafesQuery = trpc.cafes.list.useQuery();
  const logsQuery = trpc.quickbooks.logs.useQuery();
  const disconnectMutation = trpc.quickbooks.disconnect.useMutation();
  const sendReportMutation = trpc.quickbooks.sendReport.useMutation();

  const handleConnect = () => {
    // Redirect to OAuth flow
    window.location.href = "/api/quickbooks/connect";
  };

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      toast({
        title: "Disconnected",
        description: "QuickBooks has been disconnected successfully.",
      });
      statusQuery.refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to disconnect QuickBooks",
        variant: "destructive",
      });
    }
  };

  const handleSendReport = async () => {
    if (!selectedCafe || !selectedDate) {
      toast({
        title: "Missing information",
        description: "Please select a cafe and date",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const result = await sendReportMutation.mutateAsync({
        cafeDbId: selectedCafe,
        businessDate: format(selectedDate, "yyyy-MM-dd"),
      });

      toast({
        title: "Report sent successfully",
        description: `Journal Entry ID: ${result.journalEntryId}. Total cash: ₱${result.totalCash.toLocaleString()} (${result.shiftCount} shifts)`,
      });

      logsQuery.refetch();
      setSelectedDate(undefined);
    } catch (error) {
      toast({
        title: "Error sending report",
        description: error instanceof Error ? error.message : "Failed to send report to QuickBooks",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (statusQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AdminOnly>
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">QuickBooks Integration</h1>
        <p className="text-muted-foreground mt-2">
          Send daily iCafe reports to QuickBooks Online as journal entries
        </p>
      </div>

      {/* Connection Status */}
      {/* Setup Instructions */}
      {!statusQuery.data?.connected && (
        <Card className="p-6 bg-blue-500/10 border-blue-500/20">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            QuickBooks Setup Required
          </h2>
          <div className="text-sm space-y-2 text-muted-foreground">
            <p>
              Before connecting, you must register the OAuth redirect URI in your QuickBooks app:
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Go to <a href="https://developer.intuit.com/app/developer/myapps" target="_blank" rel="noopener" className="text-blue-500 hover:underline">Intuit Developer Portal</a></li>
              <li>Select your app and go to "Keys & OAuth" section</li>
              <li>Add this redirect URI: <code className="bg-muted px-2 py-0.5 rounded text-xs">{window.location.origin}/api/quickbooks/callback</code></li>
              <li>Save changes and return here to connect</li>
            </ol>
          </div>
        </Card>
      )}

      {/* Connection Status */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
        {statusQuery.data?.connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Connected to QuickBooks</span>
            </div>
            {statusQuery.data.companyName && (
              <p className="text-sm text-muted-foreground">
                Company: {statusQuery.data.companyName}
              </p>
            )}
            {statusQuery.data.needsReconnect && (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">
                  Your QuickBooks connection has expired. Please reconnect.
                </span>
              </div>
            )}
            <Button
              onClick={handleDisconnect}
              variant="outline"
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <XCircle className="h-5 w-5" />
              <span>Not connected to QuickBooks</span>
            </div>
            <Button onClick={handleConnect}>Connect QuickBooks</Button>
          </div>
        )}
      </Card>

      {/* Send Report */}
      {statusQuery.data?.connected && !statusQuery.data.needsReconnect && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Send Daily Report</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Cafe</label>
              <Select
                value={selectedCafe?.toString() || ""}
                onValueChange={(value) => setSelectedCafe(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a cafe" />
                </SelectTrigger>
                <SelectContent>
                  {cafesQuery.data?.map((cafe) => (
                    <SelectItem key={cafe.id} value={cafe.id.toString()}>
                      {cafe.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Business Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button
              onClick={handleSendReport}
              disabled={!selectedCafe || !selectedDate || isSending}
              className="w-full"
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Report to QuickBooks"
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Auto-Send Settings */}
      {statusQuery.data?.connected && !statusQuery.data.needsReconnect && selectedCafe && (
        <AutoSendSettings cafeDbId={selectedCafe} />
      )}

      {/* Send History */}
      {statusQuery.data?.connected && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Send History</h2>
          {logsQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logsQuery.data && logsQuery.data.length > 0 ? (
            <div className="space-y-2">
              {logsQuery.data.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{log.cafeName}</p>
                    <p className="text-sm text-muted-foreground">
                      {log.businessDate} • {log.shiftCount} shifts • ₱
                      {log.totalCash?.toLocaleString() || 0}
                    </p>
                    {log.journalEntryId && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Journal Entry: {log.journalEntryId}
                      </p>
                    )}
                    {log.errorMessage && (
                      <p className="text-xs text-red-600 mt-1">{log.errorMessage}</p>
                    )}
                  </div>
                  <div>
                    {log.status === "success" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No reports sent yet
            </p>
          )}
        </Card>
      )}
    </div>
    </AdminOnly>
  );
}
