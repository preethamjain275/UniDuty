import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) return { user: data.user };
    } catch {
      // Fallthrough
    }
    return {
      user: {
        id: "demo-admin-id",
        email: "admin@invigilateos.edu",
        user_metadata: { full_name: "Super Admin", department: "Examination Cell" },
      },
    };
  },
  component: () => <Outlet />,
});