import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  Monitor,
  Users,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  PanelLeft,
  Zap,
  Package,
  Receipt,
  UserCog,
  UserPen,
  MessageSquare,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "./ui/button";
import { CafeSelector } from "./CafeSelector";
import { CafeProvider } from "@/contexts/CafeContext";
import { Separator } from "./ui/separator";
import { EditProfileDialog } from "./EditProfileDialog";
import { trpc } from "@/lib/trpc";
import type { FeedbackLog } from "@shared/feedback-types";
import { DEFAULT_FEEDBACK_LIMIT } from "@shared/const";

const menuItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/", adminOnly: false },
  { icon: Monitor, label: "PC Status", path: "/pcs", adminOnly: true },
  { icon: Zap, label: "Sessions", path: "/sessions", adminOnly: true },
  { icon: Users, label: "Members", path: "/members", adminOnly: true },
  { icon: Package, label: "Products", path: "/products", adminOnly: true },
  { icon: BarChart3, label: "Reports", path: "/reports", adminOnly: false },
  { icon: ShoppingCart, label: "Orders", path: "/orders", adminOnly: true },
  { icon: MessageSquare, label: "Feedbacks", path: "/feedbacks", adminOnly: false },
  { icon: UserCog, label: "Users", path: "/users", adminOnly: true },
  { icon: Receipt, label: "QuickBooks", path: "/quickbooks", adminOnly: true },
  { icon: Settings, label: "Cafe Settings", path: "/settings", adminOnly: true },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  return (
    <CafeProvider>
      <SidebarProvider
        style={
          {
            "--sidebar-width": `${sidebarWidth}px`,
          } as CSSProperties
        }
      >
        <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
          {children}
        </DashboardLayoutContent>
      </SidebarProvider>
    </CafeProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [signoutDialogOpen, setSignoutDialogOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find((item) => item.path === location);
  const isMobile = useIsMobile();

  // Fetch feedbacks and read statuses to calculate unread count
  // Only fetch when user is on the feedbacks page
  const isOnFeedbacksPage = location === "/feedbacks";
  const { data: allCafeFeedbacks } = trpc.feedbacks.allCafes.useQuery(
    { limit: DEFAULT_FEEDBACK_LIMIT },
    {
      refetchInterval: 60000, // Refetch every minute
      enabled: !!user && isOnFeedbacksPage, // Only fetch if user is logged in and on feedbacks page
    }
  );

  const { data: readStatuses = [] } = trpc.feedbacks.getReadStatuses.useQuery(
    undefined,
    {
      refetchInterval: 60000,
      enabled: !!user && isOnFeedbacksPage, // Only fetch if user is logged in and on feedbacks page
    }
  );

  // Calculate total unread feedback count
  const unreadFeedbackCount = useMemo(() => {
    if (!allCafeFeedbacks || !readStatuses) return 0;

    const readStatusMap = new Map<string, boolean>();
    readStatuses.forEach((status) => {
      const key = `${status.cafeId}-${status.logId}`;
      readStatusMap.set(key, status.isRead);
    });

    let unreadCount = 0;
    allCafeFeedbacks.forEach((cafeFeedback) => {
      // Defensive check: ensure feedbacks is an array
      const feedbacks = Array.isArray(cafeFeedback.feedbacks) ? cafeFeedback.feedbacks : [];
      feedbacks.forEach((feedback: FeedbackLog) => {
        const key = `${cafeFeedback.cafeDbId}-${feedback.log_id}`;
        const isRead = readStatusMap.get(key) || false;
        if (!isRead) {
          unreadCount++;
        }
      });
    });

    return unreadCount;
  }, [allCafeFeedbacks, readStatuses]);

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft =
        sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="justify-center gap-0">
            <div className="flex items-center gap-3 px-2 py-3 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tracking-tight truncate text-foreground">
                    iCafe Dashboard
                  </span>
                </div>
              ) : null}
            </div>
            {!isCollapsed && (
              <div className="px-2 pb-2">
                <CafeSelector />
              </div>
            )}
            <Separator className="opacity-50" />
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-2">
              {menuItems
                .filter((item) => !item.adminOnly || user?.role === "admin")
                .map((item) => {
                const isActive = location === item.path;
                const showBadge = item.path === "/feedbacks" && unreadFeedbackCount > 0;
                
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-9 transition-all font-normal"
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {showBadge && (
                      <SidebarMenuBadge className="bg-destructive text-destructive-foreground">
                        {unreadFeedbackCount}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-8 w-8 border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate leading-none text-foreground">
                        {user?.name || "-"}
                      </p>
                      {user?.role === "admin" && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setEditProfileOpen(true)}
                  className="cursor-pointer"
                >
                  <UserPen className="mr-2 h-4 w-4" />
                  <span>Edit Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSignoutDialogOpen(true)}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <EditProfileDialog
              open={editProfileOpen}
              onOpenChange={setEditProfileOpen}
              currentName={user?.name || ""}
              currentEmail={user?.email || ""}
            />
          </SidebarFooter>
        </Sidebar>
        <AlertDialog open={signoutDialogOpen} onOpenChange={setSignoutDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to sign out?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={logout}>Sign out</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <span className="tracking-tight text-foreground">
                  {activeMenuItem?.label ?? "Menu"}
                </span>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
