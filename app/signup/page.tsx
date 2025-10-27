"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
    } else {
      // Create user profile
      if (data.user) {
        await supabase.from("users").insert([
          {
            id: data.user.id,
            email: data.user.email,
          },
        ]);
      }
      router.push("/");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md modern-card">
        <CardHeader className="text-center space-y-3">
          <CardTitle className="text-3xl font-bold tracking-tight">
            TravelTrack
          </CardTitle>
          <CardDescription className="text-base">
            Create your account to start planning.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="modern-input w-full px-4 py-2.5"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="modern-input w-full px-4 py-2.5"
                placeholder="••••••••"
                minLength={6}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Password must be at least 6 characters
              </p>
            </div>

            <Button type="submit" className="modern-btn w-full py-2.5" disabled={loading}>
              {loading ? "Creating account..." : "Sign Up"}
            </Button>

            <div className="text-center text-sm pt-2">
              <span className="text-muted-foreground">Already have an account?</span>{" "}
              <Link href="/login" className="font-medium hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
