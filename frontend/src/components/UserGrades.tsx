import { useEffect, useState } from "react";
import { cedrikLabsApi, UserAllGrades, ScenarioGrades } from "@/api/labsapi";
import { authApi } from "@/api/api";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { AlertCircle, Download, Search, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";

export function UserGrades() {
  const { toast } = useToast();
  const [allUsers, setAllUsers] = useState<UserAllGrades[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserAllGrades[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserAllGrades | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<"username" | "userId" | "overallAverage" | "totalExercisesCompleted">("username");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const PAGE_SIZE = 10;

  const calculateOverallAverage = (scenarios: any[] | undefined, fallbackOverall?: unknown) => {
    if (Array.isArray(scenarios) && scenarios.length > 0) {
      const sum = scenarios.reduce((acc: number, scenario: any) => acc + (scenario.averageScore || 0), 0);
      return Math.min(100, sum / scenarios.length);
    }
    if (typeof fallbackOverall === "number") return Math.min(100, fallbackOverall);
    const num = Number(fallbackOverall);
    return Math.min(100, Number.isFinite(num) ? num : 0);
  };

  const fetchAllUsersGrades = async () => {
    setLoading(true);
    try {
      const resp = await cedrikLabsApi.getAllUsersGrades();
      const labsUsers = Array.isArray(resp?.data?.users) ? resp.data.users : [];

      // Fetch main backend users
      const usersRes = await authApi.listUsers().catch((e) => {
        console.warn("Failed to fetch main backend users, proceeding with labs data only", e);
        return null;
      });

      const mainUsers = usersRes && Array.isArray((usersRes as any).data) ? (usersRes as any).data : [];

      const labsMap = new Map<string, any>();
      labsUsers.forEach((u: any) => labsMap.set(String(u.userId || u.username), u));

      const merged: UserAllGrades[] = [];

      mainUsers.forEach((mu: any) => {
        const id = String(mu.id);
        const lab = labsMap.get(id);
        const scenarios = lab?.scenarios || [];
        const calculatedAverage = calculateOverallAverage(scenarios, lab?.overallAverage);
        merged.push({
          userId: mu.id,
          username: mu.username || mu.email,
          scenarios: scenarios,
          overallAverage: calculatedAverage,
          totalExercisesCompleted: lab?.totalCompleted || lab?.totalExercisesCompleted || 0,
          totalExercisesAvailable: lab?.totalAvailable || lab?.totalExercisesAvailable || 0,
        });

        if (labsMap.has(id)) labsMap.delete(id);
      });

      for (const [, lu] of labsMap) {
        const scenarios = lu.scenarios || [];
        const calculatedAverage = calculateOverallAverage(scenarios, lu?.overallAverage);
        merged.push({
          userId: lu.userId || String(lu.userId ?? ""),
          username: lu.username || String(lu.userId ?? "Unknown"),
          scenarios: scenarios,
          overallAverage: calculatedAverage,
          totalExercisesCompleted: lu.totalCompleted || lu.totalExercisesCompleted || 0,
          totalExercisesAvailable: lu.totalAvailable || lu.totalExercisesAvailable || 0,
        });
      }

      setAllUsers(merged);
      setFilteredUsers(merged);
      // Enrich overall averages with per-user details in the background
      void Promise.all(
        merged.map(async (u) => {
          try {
            const detailResp = await cedrikLabsApi.getUserGrades(u.userId, u.username);
            const detail = detailResp?.data;
            if (!detail) return null;
            const scenarios = detail.scenarios || [];
            const updatedAverage = calculateOverallAverage(scenarios, detail.overallAverage);
            return {
              userId: u.userId,
              overallAverage: updatedAverage,
              scenarios,
            };
          } catch {
            return null;
          }
        })
      ).then((updates) => {
        const validUpdates = updates.filter(Boolean) as Array<{ userId: string; overallAverage: number; scenarios: any[] }>;
        if (validUpdates.length === 0) return;
        setAllUsers((prev) =>
          prev.map((u) => {
            const match = validUpdates.find((v) => v.userId === u.userId);
            return match ? { ...u, overallAverage: match.overallAverage, scenarios: match.scenarios } : u;
          })
        );
        setFilteredUsers((prev) =>
          prev.map((u) => {
            const match = validUpdates.find((v) => v.userId === u.userId);
            return match ? { ...u, overallAverage: match.overallAverage, scenarios: match.scenarios } : u;
          })
        );
      });
      if (merged.length === 0) {
        toast({ title: "No users found", description: "No users available in Labs or main backend.", variant: "default" });
      }
    } catch (err) {
      console.error("Failed to fetch user grades via labsApi:", err);
      // fallback to main backend users list (no grades)
      try {
        const usersRes = await authApi.listUsers();
        const mainUsers = Array.isArray((usersRes as any).data) ? (usersRes as any).data : [];
        const mapped = mainUsers.map((u: any) => ({
          userId: u.id || "",
          username: u.username || u.email || "Unknown",
          scenarios: [],
          overallAverage: 0,
          totalExercisesCompleted: 0,
          totalExercisesAvailable: 0,
        }));
        setAllUsers(mapped as UserAllGrades[]);
        setFilteredUsers(mapped as UserAllGrades[]);
        toast({ title: "Fallback data", description: "Loaded users from main backend (no grades).", variant: "default" });
      } catch (fbErr) {
        console.error("Fallback failed:", fbErr);
        setAllUsers([]);
        setFilteredUsers([]);
        toast({ title: "Error", description: "Failed to fetch user grades. Make sure the Labs API is running on http://localhost:3000.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (user: UserAllGrades) => {
    setLoading(true);
    try {
      console.log(`Fetching details for user: ${user.userId} (${user.username})`);

      const resp = await cedrikLabsApi.getUserGrades(user.userId, user.username);
      const data = resp?.data;

      if (!data) throw new Error("No data returned from Labs API");

      const normalizedTotalCompleted =
        typeof (data as any).totalExercisesCompleted === "number"
          ? (data as any).totalExercisesCompleted
          : typeof (data as any).totalCompleted === "number"
          ? (data as any).totalCompleted
          : 0;

      const normalizedTotalAvailable =
        typeof (data as any).totalExercisesAvailable === "number"
          ? (data as any).totalExercisesAvailable
          : typeof (data as any).totalAvailable === "number"
          ? (data as any).totalAvailable
          : 0;

      // Calculate overall average from scenario average scores - same logic as fetchAllUsersGrades
      const scenarios = data.scenarios || [];
      const calculatedOverallAverage = calculateOverallAverage(scenarios, data?.overallAverage);

      const userData: UserAllGrades = {
        userId: user.userId,
        username: user.username,
        scenarios: scenarios,
        overallAverage: calculatedOverallAverage,
        totalExercisesCompleted: normalizedTotalCompleted,
        totalExercisesAvailable: normalizedTotalAvailable,
      };

      setSelectedUser(userData);

      // Keep table in sync with latest calculated averages
      setAllUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.userId === user.userId ? { ...u, overallAverage: calculatedOverallAverage, scenarios: scenarios } : u
        )
      );
      setFilteredUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.userId === user.userId ? { ...u, overallAverage: calculatedOverallAverage, scenarios: scenarios } : u
        )
      );

      setDetailsOpen(true);
    } catch (error: unknown) {
      let errorMessage = "Failed to fetch user details";
      if (error instanceof Error) errorMessage = error.message;
      console.error("Error fetching user details:", error);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      await fetchAllUsersGrades();
    };

    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check backend URL for debugging
  useEffect(() => {
    const backendUrl = import.meta.env.VITE_LABS_URL || "http://localhost:3000/api";
    console.log("Labs API Base URL:", backendUrl);
  }, []);

  useEffect(() => {
    const filtered = allUsers.filter(
      (user) =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.userId.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, allUsers]);

  // Reset to first page when the filtered list or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, allUsers]);

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const vala = a[sortField] ?? "";
    const valb = b[sortField] ?? "";

    if (sortField === "overallAverage" || sortField === "totalExercisesCompleted") {
      const numA = typeof vala === "number" ? vala : Number(vala) || 0;
      const numB = typeof valb === "number" ? valb : Number(valb) || 0;
      return sortOrder === "asc" ? numA - numB : numB - numA;
    }

    return sortOrder === "asc"
      ? String(vala).localeCompare(String(valb))
      : String(valb).localeCompare(String(vala));
  });

  const handleSort = (field: "username" | "userId" | "overallAverage" | "totalExercisesCompleted") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Pagination calculations
  const totalFiltered = sortedUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const page = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (page - 1) * PAGE_SIZE;
  const paginatedUsers = sortedUsers.slice(startIndex, startIndex + PAGE_SIZE);
  const showingFrom = totalFiltered === 0 ? 0 : startIndex + 1;
  const showingTo = Math.min(startIndex + PAGE_SIZE, totalFiltered);

  // Clamp current page if totalPages shrinks
  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  // Prepare data for overall performance chart
  // Maps each user to their average score and exercises completed
  const overallPerformanceData = filteredUsers.map((user) => ({
    username: user.username,
    average: parseFloat((user.overallAverage || 0).toFixed(2)),
    completed: user.totalExercisesCompleted,
  }));

  // Calculate score distribution for pie chart
  // Groups users into score ranges: 0-25%, 25-50%, 50-75%, 75-100%
  const scoreDistribution = {
    "0-25%": allUsers.filter((u) => (u.overallAverage || 0) < 25).length,
    "25-50%": allUsers.filter((u) => (u.overallAverage || 0) >= 25 && (u.overallAverage || 0) < 50).length,
    "50-75%": allUsers.filter((u) => (u.overallAverage || 0) >= 50 && (u.overallAverage || 0) < 75).length,
    "75-100%": allUsers.filter((u) => (u.overallAverage || 0) >= 75 && (u.overallAverage || 0) <= 100).length,
  };

  const scoreDistributionData = [
    { name: "0-25%", value: scoreDistribution["0-25%"] },
    { name: "25-50%", value: scoreDistribution["25-50%"] },
    { name: "50-75%", value: scoreDistribution["50-75%"] },
    { name: "75-100%", value: scoreDistribution["75-100%"] },
  ];

  const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e"];

  const exportGradesAsCSV = () => {
    const headers = [
      "Username",
      "User ID",
      "Overall Average",
      "Exercises Completed",
    ];
    const rows = filteredUsers.map((user) => [
      user.username,
      user.userId,
      (user.overallAverage || 0).toFixed(2),
      user.totalExercisesCompleted,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-grades-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Grades exported as CSV file",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading user grades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">User Grades</h2>
            <p className="text-muted-foreground mt-2">
              Monitor and analyze student performance across all scenarios
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={exportGradesAsCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allUsers.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Active users with assessments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Total Exercises
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allUsers.reduce((sum, u) => sum + u.totalExercisesCompleted, 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Exercises completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allUsers.length > 0
                  ? Math.min(100, (
                      (allUsers.reduce((sum, u) => sum + u.totalExercisesCompleted, 0) /
                        Math.max(
                          1,
                          allUsers.reduce(
                            (sum, u) => sum + u.totalExercisesAvailable,
                            0
                          )
                        )) *
                      100
                    )).toFixed(1)
                  : "0"}
                %
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Overall progress
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>User Performance Overview</CardTitle>
              <CardDescription>Individual average scores by user (based on all scenarios)</CardDescription>
            </CardHeader>
            <CardContent>
              {overallPerformanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={overallPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="username" angle={-45} textAnchor="end" height={80} />
                    <YAxis 
                      domain={[0, 100]} 
                      label={{ value: "Score (%)", angle: -90, position: "insideLeft" }} 
                    />
                    <Tooltip 
                      formatter={(value: unknown) => `${(typeof value === 'number' ? value : 0).toFixed(1)}%`}
                      labelFormatter={(label: unknown) => `User: ${label}`}
                    />
                    <Bar dataKey="average" fill="#3b82f6" name="Average Score" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-300 flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Score Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Score Distribution Analysis</CardTitle>
              <CardDescription>Number of users grouped by performance level</CardDescription>
            </CardHeader>
            <CardContent>
              {scoreDistributionData.some((d) => d.value > 0) ? (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={scoreDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => {
                          const total = scoreDistributionData.reduce((sum, d) => sum + d.value, 0);
                          const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
                          return `${name}: ${value} (${percentage}%)`;
                        }}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: unknown) => {
                          const total = scoreDistributionData.reduce((sum, d) => sum + d.value, 0);
                          const percentage = total > 0 ? ((Number(value) / total) * 100).toFixed(1) : 0;
                          return `${value} users (${percentage}%)`;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 w-full grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {scoreDistributionData.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index] }}
                        ></div>
                        <span className="text-muted-foreground">
                          {item.name}: {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-300 flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Users Table Section */}
        <Card>
          <CardHeader>
            <CardTitle>User Grades Breakdown</CardTitle>
            <CardDescription>
              Click on a user to view detailed scenario grades
            </CardDescription>

            {/* Search Bar */}
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username or user ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th
                      onClick={() => handleSort("username")}
                      className="text-left py-3 px-4 font-medium cursor-pointer select-none"
                    >
                      Username ↑↓ {sortField === "username" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      onClick={() => handleSort("userId")}
                      className="text-left py-3 px-4 font-medium cursor-pointer select-none"
                    >
                      User ID ↑↓ {sortField === "userId" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      onClick={() => handleSort("overallAverage")}
                      className="text-right py-3 px-4 font-medium cursor-pointer select-none"
                    >
                      Overall Average ↑↓ {sortField === "overallAverage" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th
                      onClick={() => handleSort("totalExercisesCompleted")}
                      className="text-right py-3 px-4 font-medium cursor-pointer select-none"
                    >
                      Exercises Completed ↑↓ {sortField === "totalExercisesCompleted" && (sortOrder === "asc" ? "↑" : "↓")}
                    </th>
                    <th className="text-center py-3 px-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? (
                    paginatedUsers.map((user) => (
                      <tr
                        key={user.userId}
                        className="border-b border-border hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <span className="font-medium">{user.username}</span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {user.userId}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-semibold">
                            {(user.overallAverage || 0).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {user.totalExercisesCompleted}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                           className="border border-neutral-300 hover:border-neutral-900"
                            onClick={() =>
                              fetchUserDetails(user)
                            }
                          >
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : allUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                          <p>No users found in the system</p>
                          <p className="text-xs mt-2">The backend might not have completed any assessments yet.</p>
                          <p className="text-xs mt-1">Make sure the CEDRIK Labs API is running and users have started assessments.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                          <p>No users found matching your search: "{searchTerm}"</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {filteredUsers.length > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredUsers.length)}-
                  {Math.min(currentPage * PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    Prev
                  </Button>
                  <div className="text-sm text-muted-foreground">Page {currentPage} of {Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.min(Math.ceil(filteredUsers.length / PAGE_SIZE), p + 1))}
                    disabled={currentPage >= Math.ceil(filteredUsers.length / PAGE_SIZE)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Details Modal */}
      <UserDetailsDialog
        user={selectedUser}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}

interface UserDetailsDialogProps {
  user: UserAllGrades | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function UserDetailsDialog({
  user,
  open,
  onOpenChange,
}: UserDetailsDialogProps) {
  if (!user) return null;

  // Prepare scenario data for chart
  const scenarioData = user.scenarios.map((scenario) => ({
    name: scenario.scenarioName.substring(0, 10),
    average: scenario.averageScore || 0,
    completed: scenario.completionRate || 0,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Performance Details</DialogTitle>
          <DialogDescription>
            Detailed grades for {user.username}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* User Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {(user.overallAverage || 0).toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Overall Average
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-500">
                    {user.scenarios.length}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Scenarios Attempted
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-500">
                    {user.totalExercisesCompleted}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Exercises Completed
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scenario Performance Chart */}
          {scenarioData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Scenario Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={scenarioData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: unknown) => `${(typeof value === 'number' ? value : 0).toFixed(1)}%`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="average"
                      stroke="#3b82f6"
                      name="Average Score"
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke="#10b981"
                      name="Completion Rate"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Scenarios Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Scenario Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium">
                        Scenario
                      </th>
                      <th className="text-right py-3 px-4 font-medium">
                        Avg. Score
                      </th>
                      <th className="text-right py-3 px-4 font-medium">
                        Completion
                      </th>
                      <th className="text-right py-3 px-4 font-medium">
                        Exercises
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.scenarios.map((scenario) => (
                      <tr
                        key={scenario.scenarioId}
                        className="border-b border-border hover:bg-muted/50"
                      >
                        <td className="py-3 px-4 font-medium">
                          {scenario.scenarioName}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {(scenario.averageScore || 0).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-right">
                          {(scenario.completionRate || 0).toFixed(1)}%
                        </td>
                        <td className="py-3 px-4 text-right">
                          {
                            scenario.exercises.filter((ex) => ex.completed)
                              .length
                          }
                          /{scenario.exercises.length}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
