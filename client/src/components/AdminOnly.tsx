import { useAuth } from "@/_core/hooks/useAuth";
import { AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { useLocation } from "wouter";

interface AdminOnlyProps {
  children: React.ReactNode;
}

export function AdminOnly({ children }: AdminOnlyProps) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-6 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-xl bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-center text-foreground">
              Access Restricted
            </h2>
            <p className="text-sm text-muted-foreground text-center">
              You do not have permission to access this page. This page is restricted to administrators only.
            </p>
          </div>
          <Button
            onClick={() => setLocation("/")}
            variant="outline"
            className="w-full"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
