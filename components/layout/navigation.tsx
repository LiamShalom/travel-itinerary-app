"use client";

import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
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

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <Link href="/trips" className={styles.logo}>
          TravelPlan
        </Link>

        <div className={styles.userSection}>
          <div className={styles.userIcon}>
            <User size={16} />
          </div>
          <span className={styles.userText}>User</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className={styles.signOutButton}
          >
            <LogOut size={16} />
            Sign Out
          </Button>
        </div>
      </div>
    </nav>
  );
}
