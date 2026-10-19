import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { buildPresencaWorkbook, exportFileName } from "@/lib/exportar";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ok = await isAuthenticated();
  if (!ok) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const buffer = await buildPresencaWorkbook();
    const filename = exportFileName();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível gerar o Excel." },
      { status: 500 },
    );
  }
}
