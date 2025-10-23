import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useMemo, useState } from "react";
import { Search, Download, Filter } from "lucide-react";
import { auditApi, type AuditLogRecord } from "@/api/api";

const PAGE_SIZE = 10;

export function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");

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
        typeof metadata["ip_address"] === "string" ? (metadata["ip_address"] as string) : null,
        typeof metadata["ipAddress"] === "string" ? (metadata["ipAddress"] as string) : null,
        log.data && typeof log.data["ip_address"] === "string" ? (log.data["ip_address"] as string) : null,
        log.data && typeof log.data["ipAddress"] === "string" ? (log.data["ipAddress"] as string) : null,
      ].filter(Boolean) as string[];

 const username =
      (log.user && (log.user.username || log.user.email)) || "System";

      return {
        id: log.id,
        type: log.type ?? "Unknown",
        collection,
        user:username,
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
      log.collection.toLowerCase().includes(normalizedSearch)
     // log.resourceId.toLowerCase().includes(normalizedSearch)
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
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Collection</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm">
                      Loading audit logs...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm">
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
                        <TableCell className="uppercase">{log.type || "Unknown"}</TableCell>
                        <TableCell>{log.collection}</TableCell>
                        {/* <TableCell className="font-mono text-sm">{log.resourceId}</TableCell> */}
                        <TableCell className="font-mono text-sm">
                          {log.ipAddress}
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
    </div>

  );
}
