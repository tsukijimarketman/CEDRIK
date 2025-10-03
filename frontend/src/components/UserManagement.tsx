import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { Search, UserPlus, Edit, Trash2, Eye, Users } from "lucide-react";

import { AddUserDialog } from "@/components/dialogs/AddUserDialog";
import { EditUserDialog } from "@/components/dialogs/EditUserDialog";
import { DeleteUserDialog } from "@/components/dialogs/DeleteUserDialog";
import { ViewUserDialog } from "@/components/dialogs/ViewUserDialog";

interface User {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin" | "superadmin";
  status: "active" | "inactive" | "suspended";
  createdAt: string;
}

export function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<User[]>([
    {
      id: "1",
      username: "john_doe",
      email: "john@example.com",
      role: "user",
      status: "active",
      createdAt: "2024-01-15",
    },
    {
      id: "2",
      username: "admin_user",
      email: "admin@system.com",
      role: "admin",
      status: "active",
      createdAt: "2024-01-10",
    },
    {
      id: "3",
      username: "superadmin",
      email: "superadmin@system.com",
      role: "superadmin",
      status: "active",
      createdAt: "2024-01-01",
    },
  ]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: User["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case "suspended":
        return <Badge className="bg-red-100 text-red-800">Suspended</Badge>;
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

  // 🔹 Delete handler
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setDeleteLoading(true);

    try {
      // simulate delete api call
      await new Promise((res) => setTimeout(res, 1000));

      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setIsDeleteOpen(false);
      setSelectedUser(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground">Manage user accounts, roles, and permissions</p>
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
            onChange={(e) => setSearchTerm(e.target.value)}
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
            <CardTitle>Users</CardTitle>
            <CardDescription>
              A list of all users in the system with their roles and status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add User Dialog */}
      <AddUserDialog
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAddUser={(username, email, password, role) => {
          const newUser: User = {
            id: Date.now().toString(),
            username,
            email,
            role,
            status: "active",
            createdAt: new Date().toISOString().split("T")[0],
          };
          setUsers((prev) => [...prev, newUser]);
        }}
      />

      {/* Edit User Dialog */}
      <EditUserDialog
        open={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onUpdateUser={(id, username, email, role) => {
          setUsers((prev) =>
            prev.map((u) =>
              u.id === id ? { ...u, username, email, role } : u
            )
          );
        }}
      />

      {/* Delete User Dialog */}
      <DeleteUserDialog
        open={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteUser}
        isLoading={deleteLoading}
      />
      {/* ✅ View User Dialog */}
      <ViewUserDialog
        open={isViewOpen}
        onClose={() => {
          setIsViewOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
      />
    </div>
  );
}
//