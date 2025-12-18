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
  const [showDummy, setShowDummy] = useState(false);
  const [dataSource, setDataSource] = useState<"labs" | "fallback" | "dummy" | "unknown">("unknown");
  const PAGE_SIZE = 10;

  const fetchAllUsersGrades = async () => {
    setLoading(true);
    try {
      console.log("Labs API baseURL:", (cedrikLabsApi as any).baseURL || import.meta.env.VITE_LABS_URL);
      let resp;
      try {
        resp = await cedrikLabsApi.getAllUsersGrades();
        console.log("cedrikLabsApi.getAllUsersGrades response:", resp?.status, resp?.data);
      } catch (apiErr) {
        console.error("cedrikLabsApi.getAllUsersGrades failed:", apiErr);
        // try a direct fetch to the expected URL for diagnostics
        try {
          const base = (import.meta.env.VITE_LABS_URL || "http://localhost:3000/api").replace(/\/$/, "");
          const diagnosticUrl = `${base}/grades/all`;
          console.log("Attempting direct fetch to:", diagnosticUrl);
          const direct = await fetch(diagnosticUrl, { method: "GET", headers: { Accept: "application/json" } });
          const text = await direct.text().catch(() => "");
          console.log("Direct fetch status:", direct.status, "body:", text);
        } catch (fetchErr) {
          console.error("Direct fetch to /grades/all failed:", fetchErr);
        }
        throw apiErr;
      }

      const rawLabsUsers = Array.isArray(resp?.data?.users) ? resp.data.users : [];
      // normalize fields from the admin `/grades/all` response
      const labsUsers = rawLabsUsers.map((u: any) => ({
        userId: String(u.userId || u.user_id || u.username || ""),
        username: u.username || String(u.userId || u.username || ""),
        overallAverage: typeof u.overallAverage === "number" ? u.overallAverage : (u.overallAverage ? Number(u.overallAverage) : 0),
        totalExercisesCompleted: typeof u.totalCompleted === "number" ? u.totalCompleted : (typeof u.totalExercisesCompleted === "number" ? u.totalExercisesCompleted : 0),
        totalExercisesAvailable: typeof u.totalAvailable === "number" ? u.totalAvailable : (typeof u.totalExercisesAvailable === "number" ? u.totalExercisesAvailable : 0),
        lastActivity: u.lastActivity || null,
        scenarios: u.scenarios || [],
      }));

      // Fetch main backend users
      const usersRes = await authApi.listUsers().catch((e) => {
        console.warn("Failed to fetch main backend users, proceeding with labs data only", e);
        return null;
      });

      const mainUsers = usersRes && Array.isArray((usersRes as any).data) ? (usersRes as any).data : [];

      const labsMap = new Map<string, any>();
      labsUsers.forEach((u: any) => labsMap.set(String(u.userId || u.user_id || u.username), u));

      const merged: UserAllGrades[] = [];

      mainUsers.forEach((mu: any) => {
        const id = String(mu.id || mu.userId || mu.username || mu.email || "");
        const lab = labsMap.get(id);
        merged.push({
          userId: lab?.userId || id,
          username: lab?.username || mu.username || mu.email || id,
          scenarios: lab?.scenarios || [],
          overallAverage: typeof lab?.overallAverage === "number" ? lab.overallAverage : (lab?.overallAverage ? Number(lab.overallAverage) : 0),
          totalExercisesCompleted: lab?.totalCompleted || lab?.totalExercisesCompleted || 0,
          totalExercisesAvailable: lab?.totalAvailable || lab?.totalExercisesAvailable || 0,
        });

        if (labsMap.has(id)) labsMap.delete(id);
      });

      for (const [, lu] of labsMap) {
        merged.push({
          userId: lu.userId || String(lu.userId ?? ""),
          username: lu.username || String(lu.userId ?? "Unknown"),
          scenarios: lu.scenarios || [],
          overallAverage: typeof lu.overallAverage === "number" ? lu.overallAverage : (lu.overallAverage ? Number(lu.overallAverage) : 0),
          totalExercisesCompleted: lu.totalCompleted || lu.totalExercisesCompleted || 0,
          totalExercisesAvailable: lu.totalAvailable || lu.totalExercisesAvailable || 0,
        });
      }

      setAllUsers(merged);
      setFilteredUsers(merged);
      if (merged.length === 0) {
        toast({ title: "No users found", description: "No users available in Labs or main backend.", variant: "default" });
      }
      setDataSource("labs");
      toast({ title: "Loaded from Labs API", description: "Grades loaded from the Labs API.", variant: "default" });
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
        setDataSource("fallback");
        toast({ title: "Fallback data", description: "Loaded users from main backend (no grades).", variant: "destructive" });
      } catch (fbErr) {
        console.error("Fallback failed:", fbErr);
        setAllUsers([]);
        setFilteredUsers([]);
        setDataSource("fallback");
        toast({ title: "Error", description: "Failed to fetch user grades. Make sure the Labs API is running on http://localhost:3000.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string, username: string) => {
    setLoading(true);
    try {
      console.log(`Fetching details for user: ${userId} (${username})`);

      // If dummy mode is enabled, try to find the user locally and show details
      if (showDummy) {
        const found = allUsers.find((u) => String(u.userId) === String(userId));
        if (found) {
          setSelectedUser(found);
          setDetailsOpen(true);
          return;
        }

        // If not found, generate a single dummy user matching the id/username
        const scenarios: ScenarioGrades[] = [
          {
            scenarioId: `${userId}-sc-1`,
            scenarioName: `Demo Scenario A`,
            exercises: [
              { exerciseId: 1, exerciseTitle: "Recon", challengesCompleted: 2, challengesRequired: 3, mitigationScore: 80, reflectionScore: 70, overallScore: 75, completed: true },
              { exerciseId: 2, exerciseTitle: "Exploit", challengesCompleted: 1, challengesRequired: 2, mitigationScore: 60, reflectionScore: 50, overallScore: 55, completed: false },
            ],
            averageScore: 75,
            completionRate: 60,
          },
          {
            scenarioId: `${userId}-sc-2`,
            scenarioName: `Demo Scenario B`,
            exercises: [
              { exerciseId: 3, exerciseTitle: "Defend", challengesCompleted: 3, challengesRequired: 3, mitigationScore: 90, reflectionScore: 85, overallScore: 88, completed: true },
            ],
            averageScore: 88,
            completionRate: 100,
          },
        ];

        const totalAvailable = scenarios.reduce((s, sc) => s + sc.exercises.length, 0);
        const totalCompleted = scenarios.reduce((s, sc) => s + sc.exercises.filter((e) => e.completed).length, 0);

        setSelectedUser({
          userId: userId,
          username: username || String(userId),
          scenarios,
          overallAverage: Math.round((scenarios.reduce((a, b) => a + (b.averageScore || 0), 0) / scenarios.length) || 0),
          totalExercisesCompleted: totalCompleted,
          totalExercisesAvailable: totalAvailable,
        });
        setDetailsOpen(true);
        return;
      }

      const resp = await cedrikLabsApi.getUserGrades(userId, username);
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

      const userData: UserAllGrades = {
        userId: data.userId || userId,
        username: data.username || username || String(data.userId || userId),
        scenarios: data.scenarios || [],
        overallAverage:
          typeof data.overallAverage === "number"
            ? data.overallAverage
            : data.overallAverage
            ? Number(data.overallAverage)
            : 0,
        totalExercisesCompleted: normalizedTotalCompleted,
        totalExercisesAvailable: normalizedTotalAvailable,
      };

      setSelectedUser(userData);
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

  // Dummy data generator (includes scenario metadata used by web-ui/index.html)
  const generateDummyUsers = (count = 12): UserAllGrades[] => {
    const users: UserAllGrades[] = [];
    for (let i = 1; i <= count; i++) {
      const scenarios: ScenarioGrades[] & any = [
        {
          scenarioId: `sc-${i}-1`,
          scenarioName: `Scenario ${i}A`,
          // Additional fields matching web-ui/index.html scenario card
          name: `Scenario ${i}A`,
          description: `Practice scenario ${i}A focusing on reconnaissance and enumeration.`,
          difficulty: i % 3 === 0 ? "advanced" : i % 2 === 0 ? "intermediate" : "beginner",
          estimated_time: `${20 + (i % 3) * 10} mins`,
          skills: ["recon", "enum"],
          exercise_count: 2,
          target: `10.0.0.${i}`,
          external_url: "",
          exercises: [
            { exerciseId: 1, exerciseTitle: "Recon", challengesCompleted: 2, challengesRequired: 3, mitigationScore: 80, reflectionScore: 70, overallScore: 75, completed: true },
            { exerciseId: 2, exerciseTitle: "Exploit", challengesCompleted: 1, challengesRequired: 2, mitigationScore: 60, reflectionScore: 50, overallScore: 55, completed: false },
          ],
          averageScore: Math.round(50 + Math.random() * 50),
          completionRate: Math.round(40 + Math.random() * 60),
        },
        {
          scenarioId: `sc-${i}-2`,
          scenarioName: `Scenario ${i}B`,
          name: `Scenario ${i}B`,
          description: `Hands-on defensive scenario ${i}B with incident response focus.`,
          difficulty: i % 2 === 0 ? "advanced" : "all-levels",
          estimated_time: `${30 + (i % 2) * 15} mins`,
          skills: ["defense", "response"],
          exercise_count: 1,
          target: `10.0.1.${i}`,
          external_url: "",
          exercises: [
            { exerciseId: 3, exerciseTitle: "Defend", challengesCompleted: 3, challengesRequired: 3, mitigationScore: 90, reflectionScore: 85, overallScore: 88, completed: true },
          ],
          averageScore: Math.round(60 + Math.random() * 40),
          completionRate: Math.round(50 + Math.random() * 50),
        },
      ];

      const totalExercisesAvailable = scenarios.reduce((s, sc) => s + sc.exercises.length, 0);
      const totalExercisesCompleted = scenarios.reduce((s, sc) => s + sc.exercises.filter((e) => e.completed).length, 0);

      users.push({
        userId: `dummy-${i}`,
        username: `demo_user_${i}`,
        scenarios,
        overallAverage: Math.round((scenarios.reduce((a, b) => a + (b.averageScore || 0), 0) / scenarios.length) || 0),
        totalExercisesCompleted,
        totalExercisesAvailable,
        // optional lastActivity for CSV/table compatibility
        lastActivity: new Date(Date.now() - i * 86400000).toISOString(),
      });
    }
    return users;
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      if (showDummy) {
        const dummy = generateDummyUsers(12);
        if (!mounted) return;
        setAllUsers(dummy);
        setFilteredUsers(dummy);
        setCurrentPage(1);
        // expose dummy dataset globally so other static pages (web-ui/index.html) can read it
        try {
          // @ts-ignore - attach for debugging/demo purposes
          window.__CEDRIK_DUMMY_DATA__ = { users: dummy };
        } catch (_) {}
        setDataSource("dummy");
        toast({ title: "Dummy data enabled", description: "Showing generated demo data.", variant: "default" });
        setLoading(false);
        return;
      }

      await fetchAllUsersGrades();
    };

    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDummy]);

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

  // Pagination calculations
  const totalFiltered = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const page = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (page - 1) * PAGE_SIZE;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + PAGE_SIZE);
  const showingFrom = totalFiltered === 0 ? 0 : startIndex + 1;
  const showingTo = Math.min(startIndex + PAGE_SIZE, totalFiltered);

  // Clamp current page if totalPages shrinks
  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  // Prepare data for overall performance chart
  const overallPerformanceData = filteredUsers.map((user) => ({
    username: user.username,
    average: parseFloat((user.overallAverage || 0).toFixed(2)),
    completed: user.totalExercisesCompleted,
  }));

  // Prepare completion rate pie chart
  const completionData = [
    {
      name: "Completed",
      value: allUsers.reduce((sum, u) => sum + u.totalExercisesCompleted, 0),
    },
    {
      name: "Remaining",
      value: Math.max(
        0,
        allUsers.reduce((sum, u) => sum + (u.totalExercisesAvailable - u.totalExercisesCompleted), 0)
      ),
    },
  ];

  const COLORS = ["#3b82f6", "#e5e7eb"];

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
          <p className="text-xs text-muted-foreground mt-2">Connecting to Labs API: /grades/all</p>
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
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showDummy}
                onChange={(e) => setShowDummy(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Show dummy data</span>
            </label>

            <Button onClick={exportGradesAsCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                Avg. Overall Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {allUsers.length > 0
                  ? (
                      allUsers.reduce((sum, u) => sum + (u.overallAverage || 0), 0) /
                      allUsers.length
                    ).toFixed(1)
                  : "0"}
                %
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all users
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
                  ? (
                      (allUsers.reduce((sum, u) => sum + u.totalExercisesCompleted, 0) /
                        Math.max(
                          1,
                          allUsers.reduce(
                            (sum, u) => sum + u.totalExercisesAvailable,
                            0
                          )
                        )) *
                      100
                    ).toFixed(1)
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
              <CardDescription>Average scores by user</CardDescription>
            </CardHeader>
            <CardContent>
              {overallPerformanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={overallPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="username" angle={-45} textAnchor="end" height={80} />
                    <YAxis label={{ value: "Score (%)", angle: -90, position: "insideLeft" }} />
                    <Tooltip formatter={(value: unknown) => `${(typeof value === 'number' ? value : 0).toFixed(1)}%`} />
                    <Bar dataKey="average" fill="#3b82f6" name="Average Score" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-300 flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Completion Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Exercise Completion Summary</CardTitle>
              <CardDescription>Overall completion status</CardDescription>
            </CardHeader>
            <CardContent>
              {completionData[0].value > 0 || completionData[1].value > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={completionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-300 flex items-center justify-center text-muted-foreground">
                  No completion data available
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
                    <th className="text-left py-3 px-4 font-medium">Username</th>
                    <th className="text-left py-3 px-4 font-medium">User ID</th>
                    <th className="text-right py-3 px-4 font-medium">
                      Overall Average
                    </th>
                    <th className="text-right py-3 px-4 font-medium">
                      Exercises Completed
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
                            onClick={() =>
                              fetchUserDetails(user.userId, user.username)
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
