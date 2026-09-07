"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Mic,
  Settings,
  Monitor,
  Activity,
  LogOut,
  CheckSquare,
  Rocket,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { AuthGuard } from "@/components/auth-guard";
import { toast } from "sonner";

const NAV_ITEMS = [
  { href: "/autopilot", label: "Autopilot", icon: Rocket },
  { href: "/dashboard", label: "Control Center", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/voice-ui", label: "Voice", icon: Mic },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-56 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Monitor className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold">ORBIT</span>
              <span className="block text-[10px] text-muted-foreground -mt-0.5">
                AI Agent
              </span>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-2 flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "text-foreground bg-muted"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-2">
          {session?.user && (
            <div className="flex items-center gap-2 px-2">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                {session.user.name?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="text-xs text-muted-foreground truncate">
                {session.user.name || session.user.email}
              </span>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <LogOut className="w-3 h-3" />
            Sign out
          </button>
          <div className="flex items-center gap-2 px-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">Agent Online</span>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DashboardContent>{children}</DashboardContent>
    </AuthGuard>
  );
}
