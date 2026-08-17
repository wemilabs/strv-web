import { seedDefaultUnitFormats } from "@/server/unit-formats";

export async function POST() {
  try {
    const result = await seedDefaultUnitFormats();

    if (!result.ok) {
      return Response.json(
        { error: result.error, count: result.count },
        { status: 500 },
      );
    }

    return Response.json({
      success: true,
      message: `Successfully seeded ${result.count} unit formats`,
      count: result.count,
    });
  } catch (error: unknown) {
    const e = error as Error;
    return Response.json(
      { error: e.message || "Failed to seed unit formats" },
      { status: 500 },
    );
  }
}
