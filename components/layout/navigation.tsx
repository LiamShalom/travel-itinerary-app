"use client";

import { Button } from "@/components/ui/button";
import { LogOut, User, Plane } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "@/styles/components/layout/navigation.module.css";

export default function Navigation({ user }: { user: any }) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Get user email or fallback
  const userEmail = user?.email || "User";

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <div className={styles.content}>
          <Link href="/" className={styles.logo}>
            <Plane className={styles.logoIcon} />
            <span className={styles.logoText}>TravelPlan</span>
          </Link>

          <div className={styles.userSection}>
            <div className={styles.userInfo}>
              <div className={styles.userIcon}>
                <User size={16} />
              </div>
              <span className={styles.userText}>{userEmail}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className={styles.signOutButton}
            >
              <LogOut className={styles.signOutIcon} />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
