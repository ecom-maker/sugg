"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/types";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  Building2,
  BookOpen,
  FileText,
  DollarSign,
  Bell,
  Settings,
  BarChart3,
  MessageSquare,
  Phone,
  Calendar,
  ClipboardList,
  UserCheck,
  Briefcase,
  ChevronRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  user: AuthUser;
  isOpen: boolean;
  onClose: () => void;
}

interface NavSection {
  title?: string;
  items: {
    title: string;
    href: string;
    icon: React.ElementType;
    badge?: number;
  }[];
}

function getNavSections(role: AuthUser["role"]): NavSection[] {
  const base = {
    SUPER_ADMIN: [
      {
        items: [
          { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
        ],
      },
      {
        title: "Operations",
        items: [
          { title: "Students & Leads", href: "/admin/leads", icon: Users },
          { title: "Counselors", href: "/admin/counselors", icon: UserCheck },
          { title: "Applications", href: "/admin/applications", icon: FileText },
        ],
      },
      {
        title: "Partners",
        items: [
          { title: "Universities", href: "/admin/universities", icon: GraduationCap },
          { title: "Colleges", href: "/admin/colleges", icon: Building2 },
          { title: "Courses", href: "/admin/courses", icon: BookOpen },
          { title: "Agencies", href: "/admin/agencies", icon: Briefcase },
        ],
      },
      {
        title: "Finance",
        items: [
          { title: "Commissions", href: "/admin/commissions", icon: DollarSign },
          { title: "Payouts", href: "/admin/payouts", icon: DollarSign },
        ],
      },
      {
        title: "Platform",
        items: [
          { title: "Analytics", href: "/admin/analytics", icon: BarChart3 },
          { title: "Commission Report", href: "/admin/commission-report", icon: DollarSign },
          { title: "Notifications", href: "/admin/notifications", icon: Bell },
          { title: "Audit Logs", href: "/admin/audit-logs", icon: ClipboardList },
          { title: "Settings", href: "/admin/settings", icon: Settings },
        ],
      },
    ] as NavSection[],

    SUGG_COUNSELOR: [
      {
        items: [
          { title: "Dashboard", href: "/counselor", icon: LayoutDashboard },
        ],
      },
      {
        title: "Lead CRM",
        items: [
          { title: "My Leads", href: "/counselor/leads", icon: Users },
          { title: "Follow-ups", href: "/counselor/followups", icon: Calendar },
          { title: "Tasks", href: "/counselor/tasks", icon: ClipboardList },
        ],
      },
      {
        title: "Communication",
        items: [
          { title: "WhatsApp", href: "/counselor/whatsapp", icon: MessageSquare },
          { title: "Calls", href: "/counselor/calls", icon: Phone },
        ],
      },
      {
        title: "Applications",
        items: [
          { title: "Applications", href: "/counselor/applications", icon: FileText },
        ],
      },
      {
        title: "Analytics",
        items: [
          { title: "Performance", href: "/counselor/performance", icon: BarChart3 },
        ],
      },
    ] as NavSection[],

    COLLEGE_ADMIN: [
      {
        items: [
          { title: "Dashboard", href: "/college", icon: LayoutDashboard },
        ],
      },
      {
        title: "My College",
        items: [
          { title: "Profile", href: "/college/profile", icon: Building2 },
          { title: "Universities", href: "/admin/universities", icon: GraduationCap },
          { title: "Courses", href: "/college/courses", icon: BookOpen },
          { title: "Gallery", href: "/college/gallery", icon: Building2 },
        ],
      },
      {
        title: "Admissions",
        items: [
          { title: "Applications", href: "/college/applications", icon: FileText },
        ],
      },
      {
        title: "Finance",
        items: [
          { title: "Commissions", href: "/college/commissions", icon: DollarSign },
        ],
      },
      {
        title: "Reports",
        items: [
          { title: "Analytics", href: "/college/analytics", icon: BarChart3 },
          { title: "Commission Report", href: "/college/commission-report", icon: DollarSign },
        ],
      },
    ] as NavSection[],

    AGENCY_OWNER: [
      {
        items: [
          { title: "Dashboard", href: "/agency/owner", icon: LayoutDashboard },
        ],
      },
      {
        title: "Management",
        items: [
          { title: "Branches", href: "/agency/branches", icon: Building2 },
          { title: "All Staff", href: "/agency/staff", icon: UserCheck },
          { title: "Students", href: "/agency/students", icon: Users },
        ],
      },
      {
        title: "Opportunities",
        items: [
          { title: "Available Courses", href: "/agency/courses", icon: BookOpen },
        ],
      },
      {
        title: "Finance",
        items: [
          { title: "Commissions", href: "/agency/commissions", icon: DollarSign },
          { title: "Payouts", href: "/agency/payouts", icon: DollarSign },
        ],
      },
      {
        title: "Reports",
        items: [
          { title: "Analytics", href: "/agency/analytics", icon: BarChart3 },
          { title: "Branch Reports", href: "/agency/reports", icon: ClipboardList },
        ],
      },
      {
        title: "Settings",
        items: [
          { title: "Agency Profile", href: "/agency/profile", icon: Briefcase },
        ],
      },
    ] as NavSection[],

    AGENCY_ADMIN: [
      {
        items: [
          { title: "Dashboard", href: "/agency/admin", icon: LayoutDashboard },
        ],
      },
      {
        title: "Management",
        items: [
          { title: "Branches", href: "/agency/branches", icon: Building2 },
          { title: "Counselors", href: "/agency/counselors", icon: UserCheck },
          { title: "Students", href: "/agency/students", icon: Users },
        ],
      },
      {
        title: "Opportunities",
        items: [
          { title: "Available Courses", href: "/agency/courses", icon: BookOpen },
        ],
      },
      {
        title: "Finance",
        items: [
          { title: "Commissions", href: "/agency/commissions", icon: DollarSign },
        ],
      },
      {
        title: "Reports",
        items: [
          { title: "Analytics", href: "/agency/analytics", icon: BarChart3 },
        ],
      },
    ] as NavSection[],

    BRANCH_MANAGER: [
      {
        items: [
          { title: "Dashboard", href: "/branch", icon: LayoutDashboard },
        ],
      },
      {
        title: "My Branch",
        items: [
          { title: "Counselors", href: "/branch/counselors", icon: UserCheck },
          { title: "Students", href: "/branch/students", icon: Users },
          { title: "Leads", href: "/branch/leads", icon: Users },
        ],
      },
      {
        title: "Work",
        items: [
          { title: "Applications", href: "/branch/applications", icon: FileText },
          { title: "Follow-ups", href: "/branch/followups", icon: Calendar },
          { title: "Tasks", href: "/branch/tasks", icon: ClipboardList },
        ],
      },
      {
        title: "Opportunities",
        items: [
          { title: "Available Courses", href: "/agency/courses", icon: BookOpen },
        ],
      },
      {
        title: "Finance",
        items: [
          { title: "Commissions", href: "/branch/commissions", icon: DollarSign },
        ],
      },
      {
        title: "Reports",
        items: [
          { title: "Performance", href: "/branch/reports", icon: BarChart3 },
        ],
      },
    ] as NavSection[],

    AGENCY_COUNSELOR: [
      {
        items: [
          { title: "Dashboard", href: "/counselor", icon: LayoutDashboard },
        ],
      },
      {
        title: "My Work",
        items: [
          { title: "My Leads", href: "/counselor/leads", icon: Users },
          { title: "Follow-ups", href: "/counselor/followups", icon: Calendar },
          { title: "Tasks", href: "/counselor/tasks", icon: ClipboardList },
        ],
      },
      {
        title: "Referrals",
        items: [
          { title: "Available Courses", href: "/agency/courses", icon: BookOpen },
          { title: "My Referrals", href: "/agency/my-referrals", icon: Users },
          { title: "Add Referral", href: "/agency/add-referral", icon: Users },
        ],
      },
      {
        title: "Finance",
        items: [
          { title: "My Commissions", href: "/counselor/commissions", icon: DollarSign },
        ],
      },
    ] as NavSection[],
  };

  return base[role] || [];
}

export function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const navSections = getNavSections(user.role);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300",
          "lg:relative lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <span className="text-sidebar-foreground font-bold text-lg">Sugg</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-6 px-3">
            {navSections.map((section, i) => (
              <div key={i}>
                {section.title && (
                  <p className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-2 mb-1">
                    {section.title}
                  </p>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/admin" &&
                        item.href !== "/counselor" &&
                        item.href !== "/college" &&
                        item.href !== "/agency" &&
                        pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1">{item.title}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <Badge variant="secondary" className="text-xs h-4 min-w-4 px-1">
                            {item.badge > 99 ? "99+" : item.badge}
                          </Badge>
                        )}
                        {isActive && (
                          <ChevronRight className="w-3 h-3 text-sidebar-primary" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* User Info */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs font-semibold shrink-0">
              {user.fullName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user.fullName}
              </p>
              <p className="text-xs text-sidebar-foreground/50 truncate">
                {user.role.replace(/_/g, " ")}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
