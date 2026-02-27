// Type declarations for external packages without types

declare module "lucide-react" {
  import { FC, SVGProps } from "react";

  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
  }

  export type Icon = FC<IconProps>;

  // Export all icons as Icon type
  export const AlertCircle: Icon;
  export const AlertTriangle: Icon;
  export const ArrowDown: Icon;
  export const ArrowLeft: Icon;
  export const ArrowRight: Icon;
  export const ArrowUp: Icon;
  export const ArrowUpDown: Icon;
  export const BarChart3: Icon;
  export const Bell: Icon;
  export const Building: Icon;
  export const Bug: Icon;
  export const Building2: Icon;
  export const Calculator: Icon;
  export const Calendar: Icon;
  export const Camera: Icon;
  export const Check: Icon;
  export const CheckCircle: Icon;
  export const ChevronDown: Icon;
  export const ChevronLeft: Icon;
  export const ChevronRight: Icon;
  export const ChevronUp: Icon;
  export const CircleDot: Icon;
  export const ClipboardCheck: Icon;
  export const ClipboardList: Icon;
  export const Clock: Icon;
  export const Coins: Icon;
  export const Copy: Icon;
  export const Database: Icon;
  export const DollarSign: Icon;
  export const Download: Icon;
  export const Edit: Icon;
  export const ExternalLink: Icon;
  export const Eye: Icon;
  export const EyeOff: Icon;
  export const File: Icon;
  export const FileQuestion: Icon;
  export const FileSpreadsheet: Icon;
  export const FileText: Icon;
  export const Filter: Icon;
  export const GitCompare: Icon;
  export const Globe: Icon;
  export const GripVertical: Icon;
  export const Home: Icon;
  export const Info: Icon;
  export const LayoutDashboard: Icon;
  export const LayoutGrid: Icon;
  export const Link: Icon;
  export const List: Icon;
  export const ListTodo: Icon;
  export const Loader2: Icon;
  export const LogOut: Icon;
  export const MapPin: Icon;
  export const Menu: Icon;
  export const Minus: Icon;
  export const MoreHorizontal: Icon;
  export const MoreVertical: Icon;
  export const Network: Icon;
  export const Package: Icon;
  export const Palette: Icon;
  export const Pencil: Icon;
  export const Percent: Icon;
  export const Phone: Icon;
  export const Plus: Icon;
  export const Receipt: Icon;
  export const RefreshCw: Icon;
  export const RotateCcw: Icon;
  export const Save: Icon;
  export const Scale: Icon;
  export const Search: Icon;
  export const Settings: Icon;
  export const Shield: Icon;
  export const ShoppingBag: Icon;
  export const Star: Icon;
  export const Store: Icon;
  export const Table: Icon;
  export const Table2: Icon;
  export const Tag: Icon;
  export const Target: Icon;
  export const Trash: Icon;
  export const Trash2: Icon;
  export const TrendingDown: Icon;
  export const TrendingUp: Icon;
  export const Truck: Icon;
  export const Upload: Icon;
  export const User: Icon;
  export const Users: Icon;
  export const Wallet: Icon;
  export const Wrench: Icon;
  export const X: Icon;
  export const XCircle: Icon;

  // Additional icons
  export const ChevronsUpDown: Icon;
  export const Edit2: Icon;
  export const FileX: Icon;
  export const Flag: Icon;
  export const FolderOpen: Icon;
  export const Image: Icon;
  export const Inbox: Icon;

  // Store detail icons
  export const Trophy: Icon;
  export const Zap: Icon;
  export const PackageX: Icon;
  export const Award: Icon;
  export const Bolt: Icon;
  export const Medal: Icon;
  export const PackageOpen: Icon;
  export const PackageMinus: Icon;
  export const PackageCheck: Icon;
  export const PackagePlus: Icon;
}

