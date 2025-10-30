import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useMemo, useState } from "react";
import { Search, Download, Filter, Eye } from "lucide-react";
import { auditApi, type AuditLogRecord } from "@/api/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";


const PAGE_SIZE = 10;

export function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const loadLogs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await auditApi.list();
        if (!active) {
          return;
        }
        setLogs(response.data.items);
        setCurrentPage(1);
      } catch (err) {
        if (!active) {
          return;
        }
        const message =
          (typeof err === "object" && err !== null && "message" in err && typeof err.message === "string"
            ? err.message
            : null) || "Failed to load audit logs";
        setError(message);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };
    loadLogs();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  type NormalizedAuditLog = {
    id: string;
    type: string;
    collection: string;
    user: string;
    createdAt: string | null;
    ipAddress: string;
  };


  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case "login":
        return <Badge className="bg-orange-100 text-orange-800">Login</Badge>;
      case "add":
        return <Badge className="bg-green-200 text-green-900">Add</Badge>;
      case "message":
        return <Badge className="bg-blue-100 text-blue-800">Message</Badge>;
      case "edit":
        return <Badge className="bg-yellow-200 text-yellow-900">Edit</Badge>;
      case "register":
        return <Badge className="bg-teal-100 text-teal-800">Register</Badge>;
      default:
        return <Badge className="bg-gray-200 text-gray-800">Unknown</Badge>;
    }
  };


  const normalizedLogs = useMemo<NormalizedAuditLog[]>(() => {
    return logs.map((log) => {
      const collection =
        log.data && typeof log.data["collection"] === "string"
          ? (log.data["collection"] as string)
          : "Unknown";
      const resourceId =
        log.data && log.data["id"] !== undefined
          ? String(log.data["id"])
          : "N/A";
      const metadata = (log.metadata as Record<string, unknown> | null) ?? {};
      const ipCandidates = [
        typeof log.data["ip"] === "string" ? (log.data["ip"] as string) : null,
        log.data && typeof log.data["ip"] === "string" ? (log.data["ip"] as string) : null,
      ].filter(Boolean) as string[];

      const username =
        (log.user && (log.user.username || log.user.email)) || "System";

      return {
        id: log.id,
        type: log.type ?? "Unknown",
        collection,
        user: username,
        createdAt: log.created_at,
        ipAddress: ipCandidates[0] ?? "Not available",
      };
    });
  }, [logs]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredLogs = normalizedLogs.filter((log) => {
    if (!normalizedSearch) {
      return true;
    }
    return (
      log.type.toLowerCase().includes(normalizedSearch) ||
      log.collection.toLowerCase().includes(normalizedSearch) ||
      log.user.toLowerCase().includes(normalizedSearch)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage((prev) => {
      const clamped = Math.min(Math.max(prev, 1), totalPages);
      return clamped;
    });
  }, [totalPages]);

  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const displayedLogs = filteredLogs.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );

  const handleFirstPage = () => setCurrentPage(1);
  const handleLastPage = () => setCurrentPage(totalPages);
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

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
            <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
            <p className="text-muted-foreground">Monitor system activities and security events</p>
          </div>
          {/* <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            <Button className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div> */}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs by action, collection, or resource id..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>

        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

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
                  <TableHead className="cursor-pointer w-[250px]">Timestamp ↑↓</TableHead>
                  <TableHead className="cursor-pointer w-[160px]">Action ↑↓</TableHead>
                  <TableHead className="cursor-pointer w-[160px]">Collection ↑↓</TableHead>
                  <TableHead className="cursor-pointer w-[170px]">User ↑↓</TableHead>
                  <TableHead className="cursor-pointer w-[150px]">IP Address ↑↓</TableHead>
                  <TableHead className="text-right w-[150px] pr-[65px]">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm">
                      Loading audit logs...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm">
                      No audit logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedLogs.map((log) => {
                    const createdAt = log.createdAt ? new Date(log.createdAt).toLocaleString() : "N/A";
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">
                          {createdAt}
                        </TableCell>
                        <TableCell className="uppercase">{getActionBadge(log.type || "Unknown")}</TableCell>
                        {/* <TableCell className="uppercase">{log.type || "Unknown"}</TableCell> */}
                        <TableCell>{log.collection}</TableCell>
                        <TableCell className="font-mono text-sm">{log.user}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {log.ipAddress}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const original = logs.find((l) => l.id === log.id) || null;
                              setSelectedLog(original);
                              setIsViewOpen(true);
                            }}
                            className=" mr-[50px]"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
      </div>
      <Dialog
        open={isViewOpen && !!selectedLog}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setIsViewOpen(false);
            setSelectedLog(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 max-h-[70vh] overflow-auto">
              <div className="space-y-1">
                <Label>ID</Label>
                <p className="text-sm text-muted-foreground font-mono">{selectedLog.id}</p>
              </div>
              <div className="space-y-1">
                <Label>Action</Label>
                <p className="text-sm text-muted-foreground uppercase">{selectedLog.type}</p>
              </div>
              <div className="space-y-1">
                <Label>User</Label>
                <p className="text-sm text-muted-foreground">
                  {(selectedLog.user && (selectedLog.user.username || selectedLog.user.email)) || "System"}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Created At</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedLog.created_at ? new Date(selectedLog.created_at).toLocaleString() : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Updated At</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedLog.updated_at ? new Date(selectedLog.updated_at).toLocaleString() : "—"}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Data</Label>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                  {JSON.stringify(selectedLog.data, null, 2)}
                </pre>
              </div>
              <div className="space-y-1">
                <Label>Metadata</Label>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
              <div className="space-y-1">
                <Label>Raw Record</Label>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>
          )}
          <div className="pt-4 flex justify-end">
            <Button variant="outline" onClick={() => { setIsViewOpen(false); setSelectedLog(null); }}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div >

  );
}
