import { useCafe } from "@/contexts/CafeContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, Clock, User, Monitor, CheckCircle2, Circle, AlertTriangle, Settings as SettingsIcon, ExternalLink, CheckCheck } from "lucide-react";
import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { FeedbackLog, CafeFeedbacks } from "@shared/feedback-types";
import { DEFAULT_FEEDBACK_LIMIT } from "@shared/const";
import { useLocation } from "wouter";

// UI Configuration
const FEEDBACK_CARD_HEIGHT = "600px"; // Height of scrollable feedback area per cafe

export default function Feedbacks() {
  const { cafes, selectedCafeId } = useCafe();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  
  // Fetch all feedbacks from all cafes
  // Explicitly passes limit for clarity and future configurability
  const { data: allCafeFeedbacks, isLoading, refetch, error: queryError } = trpc.feedbacks.allCafes.useQuery(
    { limit: DEFAULT_FEEDBACK_LIMIT },
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );
  
  // Debug logging
  console.log('[Feedbacks.tsx] Query state:', { 
    isLoading, 
    hasData: !!allCafeFeedbacks, 
    dataLength: allCafeFeedbacks?.length,
    error: queryError?.message 
  });
  if (allCafeFeedbacks) {
    console.log('[Feedbacks.tsx] Data received:', allCafeFeedbacks);
  }

  // Fetch read statuses
  const { data: readStatuses = [] } = trpc.feedbacks.getReadStatuses.useQuery();

  // Mark as read/unread mutation
  const markAsReadMutation = trpc.feedbacks.markAsRead.useMutation({
    onSuccess: () => {
      // Invalidate queries to trigger refetch in all components
      utils.feedbacks.allCafes.invalidate();
      utils.feedbacks.getReadStatuses.invalidate();
    },
    onError: (error) => {
      const errorMessage = error.message || "Unknown error occurred";
      toast.error(`Failed to update feedback status: ${errorMessage}`);
      console.error("Error updating feedback:", error);
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = trpc.feedbacks.markAllAsRead.useMutation({
    onSuccess: (data) => {
      // Invalidate queries to trigger refetch in all components
      utils.feedbacks.allCafes.invalidate();
      utils.feedbacks.getReadStatuses.invalidate();
      toast.success(`Marked ${data.count} feedback(s) as read`);
    },
    onError: (error) => {
      const errorMessage = error.message || "Unknown error occurred";
      toast.error(`Failed to mark all as read: ${errorMessage}`);
      console.error("Error marking all as read:", error);
    },
  });

  const handleToggleRead = (cafeDbId: number, logId: number, currentIsRead: boolean) => {
    markAsReadMutation.mutate({
      cafeDbId,
      logId,
      isRead: !currentIsRead,
    });
  };

  const handleMarkAllAsRead = (cafeDbId: number, logIds: number[]) => {
    if (logIds.length === 0) return;
    
    markAllAsReadMutation.mutate({
      cafeDbId,
      logIds,
      isRead: true,
    });
  };

  // Create a map of read statuses for quick lookup
  const readStatusMap = useMemo(() => {
    const map = new Map<string, boolean>();
    readStatuses.forEach((status) => {
      const key = `${status.cafeId}-${status.logId}`;
      map.set(key, status.isRead);
    });
    return map;
  }, [readStatuses]);

  // Filter feedbacks based on selected cafe
  const filteredFeedbacks = useMemo(() => {
    if (!allCafeFeedbacks) return [];
    
    if (selectedCafeId && selectedCafeId !== 'all') {
      const filtered = allCafeFeedbacks.filter((cf) => cf.cafeDbId === selectedCafeId);
      console.log('[Feedbacks.tsx] Filtered by cafe:', { selectedCafeId, resultCount: filtered.length });
      return filtered;
    }
    
    console.log('[Feedbacks.tsx] No cafe filter, returning all:', allCafeFeedbacks.length);
    return allCafeFeedbacks;
  }, [allCafeFeedbacks, selectedCafeId]);

  // Calculate total feedback count
  const totalFeedbackCount = useMemo(() => {
    const count = filteredFeedbacks.reduce((acc, cf) => acc + cf.feedbacks.length, 0);
    console.log('[Feedbacks.tsx] Total feedback count:', count, 'from', filteredFeedbacks.length, 'cafe(s)');
    return count;
  }, [filteredFeedbacks]);

  // Calculate unread counts per cafe
  const unreadCounts = useMemo(() => {
    const counts = new Map<number, number>();
    
    filteredFeedbacks.forEach((cafeFeedback) => {
      let unreadCount = 0;
      cafeFeedback.feedbacks.forEach((feedback) => {
        const key = `${cafeFeedback.cafeDbId}-${feedback.log_id}`;
        const isRead = readStatusMap.get(key) || false;
        if (!isRead) {
          unreadCount++;
        }
      });
      counts.set(cafeFeedback.cafeDbId, unreadCount);
    });
    
    return counts;
  }, [filteredFeedbacks, readStatusMap]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Feedbacks</h1>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!filteredFeedbacks || totalFeedbackCount === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Feedbacks</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No feedbacks available
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Feedbacks</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Total: {totalFeedbackCount}
          </Badge>
          <Badge variant="destructive">
            Unread: {Array.from(unreadCounts.values()).reduce((a, b) => a + b, 0)}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6">
        {filteredFeedbacks.map((cafeFeedback) => {
          const unreadCount = unreadCounts.get(cafeFeedback.cafeDbId) || 0;
          
          // Get unread feedback IDs for this cafe
          const unreadLogIds = cafeFeedback.feedbacks
            .filter((feedback) => {
              const key = `${cafeFeedback.cafeDbId}-${feedback.log_id}`;
              const isRead = readStatusMap.get(key) || false;
              return !isRead;
            })
            .map((feedback) => feedback.log_id);
          
          // Debug logging for each cafe card
          console.log('[Feedbacks.tsx] Rendering cafe card:', {
            cafeName: cafeFeedback.cafeName,
            cafeDbId: cafeFeedback.cafeDbId,
            feedbacksLength: cafeFeedback.feedbacks.length,
            hasError: !!cafeFeedback.error,
            feedbacksType: Array.isArray(cafeFeedback.feedbacks) ? 'array' : typeof cafeFeedback.feedbacks,
          });
          
          return (
            <Card key={cafeFeedback.cafeDbId} className="overflow-hidden">
              <CardHeader className="bg-muted/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    {cafeFeedback.cafeName}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {cafeFeedback.feedbacks.length} total
                    </Badge>
                    {unreadCount > 0 && (
                      <>
                        <Badge variant="destructive">
                          {unreadCount} unread
                        </Badge>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleMarkAllAsRead(cafeFeedback.cafeDbId, unreadLogIds)}
                          disabled={markAllAsReadMutation.isPending}
                          className="gap-1"
                        >
                          <CheckCheck className="h-4 w-4" />
                          Mark All as Read
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea style={{ height: FEEDBACK_CARD_HEIGHT }}>
                  <div className="p-4 space-y-4">
                    {cafeFeedback.error ? (
                      <div className="text-center py-8 space-y-4">
                        <div className="flex justify-center">
                          <AlertTriangle className="h-12 w-12 text-destructive" />
                        </div>
                        <div>
                          <Badge variant="destructive" className="text-base px-4 py-2">
                            Authentication Error
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground">
                          {cafeFeedback.error}
                        </p>
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <p>Unable to retrieve feedbacks from iCafe Cloud API.</p>
                          <p className="font-medium">Common causes:</p>
                          <ul className="list-disc list-inside space-y-1 text-left max-w-md mx-auto">
                            <li>Feedback feature not enabled in iCafe Cloud</li>
                            <li>API key doesn't have feedback access permission</li>
                            <li>Invalid or expired API key</li>
                            <li>Network or connectivity issues</li>
                          </ul>
                          <p className="font-medium mt-3">To resolve:</p>
                          <ol className="list-decimal list-inside space-y-1 text-left max-w-md mx-auto">
                            <li>Go to <a href="https://manager.icafecloud.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">iCafe Cloud Manager <ExternalLink className="h-3 w-3" /></a></li>
                            <li>Check if Feedback feature is enabled for your cafe</li>
                            <li>Verify API key has "Feedback Logs" permission enabled</li>
                            <li>If needed, generate a new API key with correct permissions</li>
                            <li>Update the API key in cafe settings below</li>
                          </ol>
                          <p className="text-xs mt-3 p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded">
                            <strong>Note:</strong> The Feedback feature may require a premium subscription or specific plan in iCafe Cloud. Contact iCafe Cloud support if the feature is not available.
                          </p>
                        </div>
                        <Button
                          onClick={() => setLocation("/settings")}
                          className="mt-4"
                          variant="default"
                        >
                          <SettingsIcon className="h-4 w-4 mr-2" />
                          Go to Cafe Settings
                        </Button>
                      </div>
                    ) : cafeFeedback.feedbacks.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No feedbacks for this cafe
                      </div>
                    ) : (
                      cafeFeedback.feedbacks.map((feedback, index) => {
                        const key = `${cafeFeedback.cafeDbId}-${feedback.log_id}`;
                        const isRead = readStatusMap.get(key) || false;

                        return (
                          <div key={feedback.log_id}>
                            {index > 0 && <Separator className="my-4" />}
                            <div
                              className={`space-y-3 p-4 rounded-lg border transition-colors ${
                                isRead
                                  ? "bg-muted/30 border-muted"
                                  : "bg-background border-primary/20"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge
                                      variant={isRead ? "outline" : "default"}
                                      className="gap-1"
                                    >
                                      {isRead ? (
                                        <CheckCircle2 className="h-3 w-3" />
                                      ) : (
                                        <Circle className="h-3 w-3 fill-current" />
                                      )}
                                      {isRead ? "Read" : "Unread"}
                                    </Badge>
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                      <Monitor className="h-4 w-4" />
                                      <span className="font-medium">
                                        {feedback.log_pc_name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                      <User className="h-4 w-4" />
                                      <span>{feedback.log_member_account}</span>
                                    </div>
                                  </div>
                                  
                                  <h3 className="font-semibold text-lg">
                                    {feedback.subject}
                                  </h3>
                                  
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {feedback.message}
                                  </p>
                                  
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>{feedback.log_date_local}</span>
                                  </div>
                                </div>

                                <Button
                                  variant={isRead ? "outline" : "default"}
                                  size="sm"
                                  onClick={() =>
                                    handleToggleRead(
                                      cafeFeedback.cafeDbId,
                                      feedback.log_id,
                                      isRead
                                    )
                                  }
                                  disabled={markAsReadMutation.isPending}
                                >
                                  {isRead ? "Mark Unread" : "Mark Read"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
