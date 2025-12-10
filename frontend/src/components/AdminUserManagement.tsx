import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { Search, UserPlus, Edit, Eye, Users } from "lucide-react";

import { AdminAddUserDialog } from "@/components/dialogs/AdminAddUserDialog";
import { OtpToggleModal } from "@/components/dialogs/OTP";
import { AdminEditUserDialog } from "@/components/dialogs/AdminEditUserDialog";
import { ViewUserDialog } from "@/components/dialogs/ViewUserDialog";
import { authApi, type UserRecord } from "@/api/api";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin" | "superadmin";
  status: "active" | "inactive";
  createdAt: string;
}

const PAGE_SIZE = 10;

export function AdminUserManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [otpEnabled, setOtpEnabled] = useState(true);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);

  const [sortField, setSortField] = useState<keyof User>('username');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await authApi.listUsers();
        const fetchedUsers = response.data.map((user: UserRecord): User => {
          const rawRole = (user.role ?? "").toString().toLowerCase();
          const normalizedRole: User["role"] = ["user", "admin", "superadmin"].includes(
            rawRole
          )
            ? (rawRole as User["role"])
            : "user";

          return {
            id: user.id,
            username: user.username,
            email: user.email,
            role: normalizedRole,
            status: user.is_active ? "active" : "inactive",
            createdAt: user.created_at ? user.created_at.split("T")[0] : "—",
          };
        });
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Failed to load users", error);
        const message =
          (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
            ? error.message
            : null) || "Failed to load users";
        setError(message);
        toast({
          title: "Unable to fetch users",
          description: "Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [toast]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.status.toLowerCase().includes(searchTerm.toLocaleLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLocaleLowerCase())
  );

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const vala = a[sortField];
    const valb = b[sortField];

    if (sortField === 'createdAt') {
      const dateA = new Date(vala);
      const dateB = new Date(valb);
      return sortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
    }
    return sortOrder === 'asc' ? String(vala).localeCompare(String(valb)) : String(valb).localeCompare(String(vala));
  });

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage((prev) => {
      const clamped = Math.min(Math.max(prev, 1), totalPages);
      return clamped;
    });
  }, [totalPages]);

  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const displayedUsers = sortedUsers.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );

  const getStatusBadge = (status: User["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
    }
  };

  const getRoleBadge = (role: User["role"]) => {
    switch (role) {
      case "superadmin":
        return <Badge className="bg-purple-100 text-purple-800">SuperAdmin</Badge>;
      case "admin":
        return <Badge className="bg-blue-100 text-blue-800">Admin</Badge>;
      case "user":
        return <Badge className="bg-gray-100 text-gray-800">User</Badge>;
    }
  };

  const handleSort = (field: keyof User) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleFirstPage = () => setCurrentPage(1);
  const handleLastPage = () => setCurrentPage(totalPages);
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    setPageInput(value);

    if (value === "") {
      return;
    }

    const numericValue = Number(value);
    if (!Number.isNaN(numericValue)) {
      const clamped = Math.min(Math.max(numericValue, 1), totalPages);
      setCurrentPage(clamped);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground">View and manage user accounts and roles</p>
          </div>
          <Button className="gap-2" onClick={() => setIsAddOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by username or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <div className="h-4 w-4 bg-green-500 rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter((u) => u.status === "active").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
              <div className="h-4 w-4 bg-blue-500 rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter((u) => u.role === "admin" || u.role === "superadmin").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-6">
              <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>
                  A list of all users in the system with their roles and status.
                </CardDescription>
              </div>
              <Button className="gap-2" onClick={() => setShowOtpModal(true)}>
                OTP : {otpEnabled ? "ON" : "OFF"}
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => handleSort("username")} className="cursor-pointer w-[180px]">
                    Username ↑↓ {sortField === "username" && (sortOrder === "asc")}
                  </TableHead>
                  <TableHead onClick={() => handleSort("email")} className="cursor-pointer w-[350px]">
                    Email ↑↓ {sortField === "email" && (sortOrder === "asc")}
                  </TableHead>
                  <TableHead onClick={() => handleSort("role")} className="cursor-pointer w-[150px]">
                    Role ↑↓ {sortField === "role" && (sortOrder === "asc")}
                  </TableHead>
                  <TableHead onClick={() => handleSort("status")} className="cursor-pointer w-[150px]">
                    Status ↑↓ {sortField === "status" && (sortOrder === "asc")}
                  </TableHead>
                  <TableHead onClick={() => handleSort("createdAt")} className="cursor-pointer w-[150px]">
                    Created ↑↓ {sortField === "createdAt" && (sortOrder === "asc")}
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : displayedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>{user.createdAt}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSelectedUser(user);
                          setIsViewOpen(true);
                        }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsEditOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && displayedUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {error && (
              <p className="mt-4 text-sm text-destructive">{error}</p>
            )}
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFirstPage}
                  disabled={safeCurrentPage === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={safeCurrentPage === 1}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={safeCurrentPage === totalPages}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLastPage}
                  disabled={safeCurrentPage === totalPages}
                >
                  Last
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Page {safeCurrentPage} of {totalPages}
                </span>
                <Input
                  type="text"
                  value={pageInput}
                  onChange={handlePageInputChange}
                  className="w-20"
                  placeholder="Go to"
                  inputMode="numeric"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add User Dialog */}
      <AdminAddUserDialog
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAddUser={(username, email, password, role) => {
          const normalizedRole: User["role"] = ["user", "admin", "superadmin"].includes(
            role.toLowerCase()
          )
            ? (role.toLowerCase() as User["role"])
            : "user";

          const newUser: User = {
            id: Date.now().toString(),
            username,
            email,
            role: normalizedRole,
            status: "active",
            createdAt: new Date().toISOString().split("T")[0],
          };
          setUsers((prev) => [...prev, newUser]);
        }}
      />

      {/* Edit User Dialog */}
      <AdminEditUserDialog
        open={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onUpdateUser={(id, username, email, role, status) => {
          const normalizedRole: User["role"] = ["user", "admin", "superadmin"].includes(
            role.toLowerCase()
          )
            ? (role.toLowerCase() as User["role"])
            : "user";
          const normalizedStatus: User["status"] = status === "inactive" ? "inactive" : "active";

          setUsers((prev) =>
            prev.map((u) =>
              u.id === id
                ? {
                  ...u,
                  username,
                  email,
                  role: normalizedRole,
                  status: normalizedStatus,
                }
                : u
            )
          );
        }}
      />

      {/* View User Dialog */}
      <ViewUserDialog
        open={isViewOpen}
        onClose={() => {
          setIsViewOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
      />

      <OtpToggleModal
        open={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        otpEnabled={otpEnabled}
        onToggleOtp={(enabled) => setOtpEnabled(enabled)}
      />
    </div>
  );
}