import { createClient } from "@/lib/supabase/server";

export async function checkDatabaseSetup() {
  const supabase = await createClient();
  
  try {
    // Check if tables exist
    const { error: tripsError } = await supabase
      .from("trips")
      .select("count")
      .limit(1);
    
    const { error: usersError } = await supabase
      .from("users")
      .select("count")
      .limit(1);
    
    const { error: itemsError } = await supabase
      .from("itinerary_items")
      .select("count")
      .limit(1);
    
    if (tripsError || usersError || itemsError) {
      return {
        success: false,
        message: "Database tables not found. Please run the SQL schema in Supabase.",
        errors: {
          trips: tripsError?.message,
          users: usersError?.message,
          items: itemsError?.message,
        }
      };
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: "Failed to connect to database",
      error: String(error)
    };
  }
}
