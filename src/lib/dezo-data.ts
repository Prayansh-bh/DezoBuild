import {
  Bell,
  Boxes,
  Building2,
  FileBarChart,
  FileText,
  LayoutDashboard,
  Settings,
  Truck,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: string;
};

export const navigation: NavItem[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Projects", to: "/projects", icon: Building2 },
  { label: "Materials", to: "/materials", icon: Boxes },
  { label: "Finance", to: "/finance", icon: WalletCards },
  { label: "People", to: "/people", icon: Users },
  { label: "Equipment", to: "/equipment", icon: Truck },
  { label: "Alerts", to: "/alerts", icon: Bell, badge: "7" },
  { label: "Reports", to: "/reports", icon: FileBarChart },
  { label: "Documents", to: "/documents", icon: FileText },
];

export const settingsNav: NavItem = { label: "Settings", to: "/settings", icon: Settings };

export const projects = [
  {
    name: "Orion Heights",
    location: "Bengaluru",
    progress: 65,
    status: "At risk",
    tone: "critical",
    variance: "+₹42L",
    budget: "₹32.6 Cr",
    spent: "₹22.1 Cr",
    manager: "R. Menon",
    completion: "Mar 2027",
  },
  {
    name: "Metro Depot",
    location: "Pune",
    progress: 42,
    status: "Attention",
    tone: "attention",
    variance: "+₹8.4L",
    budget: "₹18.4 Cr",
    spent: "₹7.9 Cr",
    manager: "S. Deshpande",
    completion: "Nov 2027",
  },
  {
    name: "Lakeview Residences",
    location: "Hyderabad",
    progress: 78,
    status: "On track",
    tone: "healthy",
    variance: "−₹12L",
    budget: "₹21.2 Cr",
    spent: "₹16.4 Cr",
    manager: "A. Reddy",
    completion: "Jun 2026",
  },
  {
    name: "Crescent Business Park",
    location: "Chennai",
    progress: 31,
    status: "On track",
    tone: "healthy",
    variance: "−₹6.8L",
    budget: "₹14.2 Cr",
    spent: "₹4.4 Cr",
    manager: "K. Iyer",
    completion: "Aug 2028",
  },
];

export const materials = [
  { item: "OPC 53 Cement", unit: "bags", stock: 450, reorder: 500, site: "Orion Heights", tone: "attention", rate: "₹392" },
  { item: "TMT Steel Fe500D", unit: "MT", stock: 62, reorder: 40, site: "Orion Heights", tone: "healthy", rate: "₹58,400" },
  { item: "River Sand", unit: "cft", stock: 1200, reorder: 2000, site: "Metro Depot", tone: "critical", rate: "₹64" },
  { item: "20mm Aggregate", unit: "cft", stock: 3400, reorder: 1500, site: "Lakeview", tone: "healthy", rate: "₹48" },
  { item: "AAC Blocks", unit: "nos", stock: 5600, reorder: 4000, site: "Crescent Park", tone: "healthy", rate: "₹58" },
  { item: "Binding Wire", unit: "kg", stock: 180, reorder: 250, site: "Metro Depot", tone: "attention", rate: "₹78" },
];

export const payments = [
  { party: "Shreeji Ready Mix", type: "Vendor bill", amount: "₹18.4L", due: "Overdue 6 days", tone: "critical" },
  { party: "Anand Steel Traders", type: "Purchase order", amount: "₹42.2L", due: "Due in 3 days", tone: "attention" },
  { party: "Labour contractor · Zone 2", type: "Wage settlement", amount: "₹6.8L", due: "Due in 8 days", tone: "healthy" },
  { party: "Vertex Formwork", type: "Vendor bill", amount: "₹11.5L", due: "Due in 12 days", tone: "healthy" },
];

export const people = [
  { name: "Rahul Menon", role: "Project manager", site: "Orion Heights", status: "On site", tone: "healthy" },
  { name: "Sunita Deshpande", role: "Site engineer", site: "Metro Depot", status: "On site", tone: "healthy" },
  { name: "Imran Shaikh", role: "Store keeper", site: "Lakeview", status: "On leave", tone: "attention" },
  { name: "Anita Reddy", role: "Quantity surveyor", site: "Lakeview", status: "On site", tone: "healthy" },
  { name: "Karthik Iyer", role: "Site engineer", site: "Crescent Park", status: "Travelling", tone: "attention" },
];

export const equipment = [
  { name: "Tower crane TC-01", site: "Orion Heights", status: "Running", tone: "healthy", hours: "1,240 hrs", service: "In 40 hrs" },
  { name: "Excavator EX-220", site: "Metro Depot", status: "Breakdown", tone: "critical", hours: "3,880 hrs", service: "Overdue" },
  { name: "Concrete pump CP-04", site: "Lakeview", status: "Idle", tone: "attention", hours: "780 hrs", service: "In 120 hrs" },
  { name: "Batching plant BP-02", site: "Crescent Park", status: "Running", tone: "healthy", hours: "2,410 hrs", service: "In 300 hrs" },
];

export const alerts = [
  { title: "Steel consumption above plan", project: "Orion Heights · Tower A", detail: "18% variance · Est. impact ₹4.2L", severity: "critical", age: "2 hrs ago" },
  { title: "Foundation piling delayed", project: "Metro Depot · Zone 2", detail: "6 days behind baseline", severity: "critical", age: "5 hrs ago" },
  { title: "Cement stock below threshold", project: "Lakeview Residences", detail: "450 bags · Reorder at 500", severity: "attention", age: "Today" },
  { title: "Excavator EX-220 breakdown", project: "Metro Depot", detail: "Idle 14 hrs · Service overdue", severity: "critical", age: "Yesterday" },
  { title: "3 DPRs not filed", project: "Portfolio", detail: "Orion, Metro, Crescent", severity: "attention", age: "Yesterday" },
  { title: "Vendor bill overdue", project: "Shreeji Ready Mix", detail: "₹18.4L pending 6 days", severity: "attention", age: "2 days ago" },
  { title: "Labour strength below plan", project: "Crescent Business Park", detail: "62 of 90 planned", severity: "attention", age: "2 days ago" },
];

export const reports = [
  { name: "Daily progress report", cadence: "Daily · 7 PM", owner: "Site engineers", format: "PDF" },
  { name: "Material consumption vs plan", cadence: "Weekly · Monday", owner: "Stores", format: "XLSX" },
  { name: "Cost to complete", cadence: "Monthly · 1st", owner: "Finance", format: "PDF" },
  { name: "Labour productivity", cadence: "Weekly · Friday", owner: "HR", format: "XLSX" },
  { name: "Equipment utilisation", cadence: "Monthly · 1st", owner: "Plant & machinery", format: "PDF" },
];

export const documents = [
  { name: "Orion Heights · Structural drawings R7", type: "Drawing", size: "24.8 MB", updated: "Today" },
  { name: "Metro Depot · Soil investigation report", type: "Report", size: "6.2 MB", updated: "Yesterday" },
  { name: "Anand Steel · Rate contract 2026", type: "Contract", size: "1.4 MB", updated: "3 days ago" },
  { name: "Lakeview · Occupancy approval", type: "Approval", size: "820 KB", updated: "1 week ago" },
  { name: "Safety induction register · Aug", type: "Compliance", size: "3.1 MB", updated: "2 weeks ago" },
];
