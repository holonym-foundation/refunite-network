import { NextRequest, NextResponse } from "next/server";
import { validateApiToken } from "@/lib/utils/api-auth";
import { DB } from "@/lib/database/service";

export async function POST(request: NextRequest) {
  try {
    // Check bearer token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    if (!validateApiToken(token)) {
      console.error("Unauthorized token used in call to /api/system/cleanup");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Clean up expired reservations using database service
    const cleanedCount = await DB.cleanupExpiredReservations();

    // Log audit event for cleanup
    if (cleanedCount > 0) {
      await DB.logAudit({
        entity_type: "reservation",
        entity_id: 0, // System action, no specific entity
        action: "expire",
        actor_address: null,
        metadata: { cleaned_count: cleanedCount, cleanup_type: "automatic" },
      });
    }

    console.log(`Cleaned up ${cleanedCount} expired reservations`);

    return NextResponse.json({
      success: true,
      cleanedCount,
      cleanupTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in /api/system/cleanup:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
