import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import MainNavbar from "@/components/MainNavbar";
import { useRecaptcha } from "@/hooks/useRecaptcha";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { verifyRecaptcha, isReady: recaptchaReady } = useRecaptcha();

  useEffect(() => {
    // Redirect if already authenticated as admin
    if (!loading && user && isAdmin) {
      navigate("/admin");
    }
  }, [user, isAdmin, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      // Verify reCAPTCHA first
      if (recaptchaReady) {
        const recaptchaResult = await verifyRecaptcha("admin_login");
        if (!recaptchaResult.success) {
          toast.error("Güvenlik doğrulaması başarısız. Lütfen tekrar deneyin.");
          setIsLoading(false);
          return;
        }
      }

      const { error } = await signIn(email, password);

      if (error) {
        if (error.message === "Access denied. Admin privileges required.") {
          toast.error("Access denied. Only administrators can log in here.");
        } else if (error.message === "Invalid login credentials") {
          toast.error("Invalid email or password");
        } else {
          toast.error(error.message || "Login failed");
        }
      } else {
        toast.success("Login successful!");
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MainNavbar />
        <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 64px)" }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MainNavbar />
      <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 64px)" }}>
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <Lock className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Admin Login</CardTitle>
            <p className="text-sm text-center text-gray-600">Admin Panele giriş yapmak için bilgilerinizi giriniz.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Hesaplar yalnızca sistem yöneticisi tarafından manuel olarak oluşturulabilir.
                Erişim talep etmek için lütfen sistem yöneticinizle iletişime geçin..
              </p>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">Bu site reCAPTCHA ile korunmaktadır.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
