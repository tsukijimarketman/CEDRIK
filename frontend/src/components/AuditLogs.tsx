import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { Search, Download, Filter, Eye } from "lucide-react";
import { ViewAuditLogDialog } from "@/components/dialogs/ViewAuditLogDialog";

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
  status: "success" | "failed" | "warning";
}

export function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [logs] = useState<AuditLog[]>([
    {
      id: "1",
      timestamp: "2024-01-20 14:30:25",
      user: "admin_user",
      action: "LOGIN",
      resource: "Authentication",
      details: "Successful login from web interface",
      ipAddress: "192.168.1.100",
      status: "success",
    },
    {
      id: "2",
      timestamp: "2024-01-20 14:25:10",
      user: "john_doe",
      action: "USER_UPDATE",
      resource: "User Profile",
      details: "Updated profile information",
      ipAddress: "192.168.1.101",
      status: "success",
    },
    {
      id: "3",
      timestamp: "2024-01-20 14:20:45",
      user: "system",
      action: "BACKUP",
      resource: "Database",
      details: "Automated daily backup completed",
      ipAddress: "127.0.0.1",
      status: "success",
    },
    {
      id: "4",
      timestamp: "2024-01-20 14:15:30",
      user: "unknown",
      action: "LOGIN_FAILED",
      resource: "Authentication",
      details: "Failed login attempt - invalid credentials",
      ipAddress: "203.0.113.1",
      status: "failed",
    },
    {
      id: "5",
      timestamp: "2024-01-20 14:10:15",
      user: "admin_user",
      action: "ROLE_CHANGE",
      resource: "User Management",
      details: "Changed user role from user to admin",
      ipAddress: "192.168.1.100",
      status: "warning",
    },
  ]);

  const filteredLogs = logs.filter(
    (log) =>
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const getStatusBadge = (status: AuditLog["status"]) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
    }



  };

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
            <p className="text-muted-foreground">Monitor system activities and security events</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            <Button className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs by user, action, resource, or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>


        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest system activities and security events in chronological order.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead className="text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {log.timestamp}
                    </TableCell>
                    <TableCell className="font-medium">{log.user}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.ipAddress}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => {
                        setSelectedLog(log);
                        setIsViewOpen(true);
                      }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <ViewAuditLogDialog
        open={isViewOpen}
        onClose={() => {
          setIsViewOpen(false);
          setSelectedLog(null);
        }}
        log={selectedLog}
      />


    </div>

  );
}
