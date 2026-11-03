import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase environment variables");
    }

    // 1. Authenticate user from the Authorization header JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header provided" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const userClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized request" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Create admin client with service role key
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 2. Cascade delete dependent data
    // Delete read_books and reading_goals for all user's children
    const { data: childrenData } = await adminClient
      .from("children")
      .select("id")
      .eq("parent_id", userId);

    if (childrenData && childrenData.length > 0) {
      const childIds = childrenData.map((c) => c.id);
      
      // Delete child read books & reading goals
      await adminClient.from("read_books").delete().in("child_id", childIds);
      await adminClient.from("reading_goals").delete().in("child_id", childIds);
    }

    // Delete any remaining read_books by user_id directly
    await adminClient.from("read_books").delete().eq("user_id", userId);

    // Delete bookmarks / scraps
    await adminClient.from("book_scraps").delete().eq("user_id", userId);

    // Delete reviews
    await adminClient.from("reviews").delete().eq("user_id", userId);

    // Delete comments & posts
    try {
      await adminClient.from("comments").delete().or(`author_id.eq.${userId},user_id.eq.${userId}`);
      await adminClient.from("posts").delete().or(`author_id.eq.${userId},user_id.eq.${userId}`);
    } catch {
      // ignore if column doesn't match
    }

    // Delete reports & assessments
    try {
      await adminClient.from("literacy_assessments").delete().eq("user_id", userId);
      await adminClient.from("reports").delete().eq("user_id", userId);
    } catch {
      // ignore
    }

    // Delete children profiles
    await adminClient.from("children").delete().eq("parent_id", userId);

    // Delete deep report requests
    await adminClient.from("deep_report_requests").delete().eq("user_id", userId);

    // Delete user profile
    await adminClient.from("profiles").delete().eq("id", userId);

    // 3. Delete Auth user account
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error("Auth deleteUser failed:", deleteAuthError);
      throw new Error("Failed to delete user account: " + deleteAuthError.message);
    }

    return new Response(
      JSON.stringify({ message: "Account successfully deleted." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Delete account error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
