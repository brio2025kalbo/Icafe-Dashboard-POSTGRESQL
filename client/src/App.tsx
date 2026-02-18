import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import { AuthGuard } from "./components/AuthGuard";
import Home from "./pages/Home";
import PcStatus from "./pages/PcStatus";
import Sessions from "./pages/Sessions";
import Members from "./pages/Members";
import Products from "./pages/Products";
import Reports from "./pages/Reports";
import Orders from "./pages/Orders";
import CafeSettings from "./pages/CafeSettings";
import { QuickBooksSettings } from "./pages/QuickBooksSettings";
import Users from "./pages/Users";
import Feedbacks from "./pages/Feedbacks";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" nest>
        <AuthGuard>
          <DashboardLayout>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/pcs" component={PcStatus} />
              <Route path="/sessions" component={Sessions} />
              <Route path="/members" component={Members} />
              <Route path="/products" component={Products} />
              <Route path="/reports" component={Reports} />
              <Route path="/orders" component={Orders} />
              <Route path="/users" component={Users} />
              <Route path="/feedbacks" component={Feedbacks} />
              <Route path="/settings" component={CafeSettings} />
              <Route path="/quickbooks" component={QuickBooksSettings} />
              <Route path="/404" component={NotFound} />
              <Route component={NotFound} />
            </Switch>
          </DashboardLayout>
        </AuthGuard>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
