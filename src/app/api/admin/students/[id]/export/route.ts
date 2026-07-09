import { NextResponse } from "next/server";
import { exportStudentData } from "@/actions/student-profile";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await exportStudentData(id);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return new NextResponse(JSON.stringify(result.data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="student-${id}-export.json"`,
    },
  });
}
