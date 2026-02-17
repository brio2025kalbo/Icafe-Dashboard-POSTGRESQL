import { useCafe } from "@/contexts/CafeContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Settings,
  Plus,
  Pencil,
  Trash2,
  Wifi,
  WifiOff,
  Building2,
  Loader2,
  Users,
  UserPlus,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminOnly } from "@/components/AdminOnly";

interface CafeForm {
  name: string;
  cafeId: string;
  apiKey: string;
  location: string;
  timezone: string;
}

const emptyForm: CafeForm = {
  name: "",
  cafeId: "",
  apiKey: "",
  location: "",
  timezone: "",
};

export default function CafeSettings() {
  const { cafes, refetchCafes } = useCafe();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [manageUsersId, setManageUsersId] = useState<number | null>(null);
  const [form, setForm] = useState<CafeForm>(emptyForm);

  const utils = trpc.useUtils();

  const addMut = trpc.cafes.add.useMutation({
    onSuccess: () => {
      toast.success("Cafe added successfully");
      setShowAdd(false);
      setForm(emptyForm);
      utils.cafes.list.invalidate();
      refetchCafes();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMut = trpc.cafes.update.useMutation({
    onSuccess: () => {
      toast.success("Cafe updated successfully");
      setEditId(null);
      setForm(emptyForm);
      utils.cafes.list.invalidate();
      refetchCafes();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMut = trpc.cafes.delete.useMutation({
    onSuccess: () => {
      toast.success("Cafe removed");
      setDeleteId(null);
      utils.cafes.list.invalidate();
      refetchCafes();
    },
    onError: (err) => toast.error(err.message),
  });

  const testMut = trpc.cafes.testConnection.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Connection successful!");
      } else {
        toast.error(result.message, { duration: 8000 });
      }
    },
    onError: () => toast.error("Connection test failed"),
  });

  const testDirectMut = trpc.cafes.testConnectionDirect.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Connection successful! Credentials are valid.");
      } else {
        toast.error(result.message, { duration: 8000 });
      }
    },
    onError: () => toast.error("Connection test failed"),
  });

  // User management queries and mutations
  const cafeUsersQuery = trpc.cafes.getUsers.useQuery(
    { cafeId: manageUsersId! },
    { enabled: !!manageUsersId }
  );

  const allUsersQuery = trpc.users.list.useQuery();

  const assignUserMut = trpc.cafes.assignUser.useMutation({
    onSuccess: () => {
      toast.success("User assigned successfully");
      cafeUsersQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const removeUserMut = trpc.cafes.removeUser.useMutation({
    onSuccess: () => {
      toast.success("User removed from cafe");
      cafeUsersQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleActiveMut = trpc.cafes.update.useMutation({
    onSuccess: () => {
      toast.success("Cafe status updated");
      utils.cafes.list.invalidate();
      refetchCafes();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleTestDirect = () => {
    if (!form.cafeId || !form.apiKey) {
      toast.error("Cafe ID and API Key are required to test");
      return;
    }
    testDirectMut.mutate({ cafeId: form.cafeId, apiKey: form.apiKey });
  };

  const handleAdd = () => {
    if (!form.name || !form.cafeId || !form.apiKey) {
      toast.error("Name, Cafe ID, and API Key are required");
      return;
    }
    addMut.mutate(form);
  };

  const handleUpdate = () => {
    if (!editId) return;
    const data: any = { id: editId };
    if (form.name) data.name = form.name;
    if (form.cafeId) data.cafeId = form.cafeId;
    if (form.apiKey) data.apiKey = form.apiKey;
    if (form.location) data.location = form.location;
    if (form.timezone) data.timezone = form.timezone;
    updateMut.mutate(data);
  };

  const openEdit = (cafe: any) => {
    setForm({
      name: cafe.name,
      cafeId: cafe.cafeId,
      apiKey: "",
      location: cafe.location || "",
      timezone: cafe.timezone || "",
    });
    setEditId(cafe.id);
  };

  const handleToggleActive = (cafeId: number, isActive: boolean) => {
    toggleActiveMut.mutate({
      id: cafeId,
      isActive: isActive ? 1 : 0,
    });
  };

  return (
    <AdminOnly>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Cafe Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your internet cafe locations and API credentials
          </p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setShowAdd(true); }} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Cafe
        </Button>
      </div>

      {cafes.length === 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No Cafes Configured</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Add your first internet cafe by providing its iCafeCloud Cafe ID and API Key.
              You can find these in your iCafeCloud admin panel.
            </p>
            <Button onClick={() => { setForm(emptyForm); setShowAdd(true); }}>
              <Plus className="h-4 w-4 mr-1" />
              Add Your First Cafe
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cafes.map((cafe) => (
            <Card key={cafe.id} className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    {cafe.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={cafe.isActive ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {cafe.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Switch
                      checked={cafe.isActive}
                      onCheckedChange={(checked) => handleToggleActive(cafe.id, checked)}
                      disabled={toggleActiveMut.isPending}
                      aria-label={cafe.isActive ? "Deactivate cafe" : "Activate cafe"}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Cafe ID</p>
                    <p className="font-mono text-foreground">{cafe.cafeId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">API Key</p>
                    <p className="font-mono text-foreground">••••••••</p>
                  </div>
                  {cafe.location && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-foreground">{cafe.location}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => testMut.mutate({ id: cafe.id })}
                    disabled={testMut.isPending}
                  >
                    {testMut.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <Wifi className="h-3.5 w-3.5 mr-1" />
                    )}
                    Test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setManageUsersId(cafe.id)}
                  >
                    <Users className="h-3.5 w-3.5 mr-1" />
                    Users
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => openEdit(cafe)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(cafe.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Cafe Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Cafe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Cafe Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="My Internet Cafe"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">iCafeCloud Cafe ID *</Label>
              <Input
                value={form.cafeId}
                onChange={(e) => setForm({ ...form, cafeId: e.target.value })}
                placeholder="e.g. 12345"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">API Key *</Label>
              <Input
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder="Your iCafeCloud API key"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Location (optional)</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="123 Main St, City"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Timezone (optional)</Label>
              <Input
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                placeholder="e.g. Asia/Manila"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleTestDirect}
              disabled={testDirectMut.isPending || !form.cafeId || !form.apiKey}
              className="sm:mr-auto"
            >
              {testDirectMut.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Wifi className="h-4 w-4 mr-1" />
              )}
              Test Connection
            </Button>
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={addMut.isPending}>
              {addMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Add Cafe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Cafe Dialog */}
      <Dialog open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Cafe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Cafe Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">iCafeCloud Cafe ID</Label>
              <Input
                value={form.cafeId}
                onChange={(e) => setForm({ ...form, cafeId: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">API Key (leave blank to keep current)</Label>
              <Input
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder="Leave blank to keep current key"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Location</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Timezone</Label>
              <Input
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMut.isPending}>
              {updateMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Cafe</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this cafe? This will delete all stored credentials.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMut.mutate({ id: deleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Manage Users Dialog */}
      <Dialog open={!!manageUsersId} onOpenChange={(open) => !open && setManageUsersId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Cafe Users</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Add User Section */}
            <div className="space-y-2">
              <Label className="text-xs">Assign User to Cafe</Label>
              <div className="flex gap-2">
                <Select
                  onValueChange={(value) => {
                    if (manageUsersId) {
                      assignUserMut.mutate({
                        cafeId: manageUsersId,
                        userId: parseInt(value),
                        role: "viewer",
                      });
                    }
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsersQuery.data?.filter(
                      (user) => !cafeUsersQuery.data?.some((cu) => cu.userId === user.id)
                    ).map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name || user.username || user.email || `User ${user.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Current Users List */}
            <div className="space-y-2">
              <Label className="text-xs">Assigned Users</Label>
              {cafeUsersQuery.isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : cafeUsersQuery.data && cafeUsersQuery.data.length > 0 ? (
                <div className="space-y-2">
                  {cafeUsersQuery.data.map((user) => (
                    <div
                      key={user.userId}
                      className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {user.name || user.username || user.email || `User ${user.userId}`}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {user.role}
                          </p>
                        </div>
                      </div>
                      {user.role !== "owner" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (manageUsersId) {
                              removeUserMut.mutate({
                                cafeId: manageUsersId,
                                userId: user.userId,
                              });
                            }
                          }}
                          disabled={removeUserMut.isPending}
                          aria-label="Remove user"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No users assigned yet
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageUsersId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminOnly>
  );
}
