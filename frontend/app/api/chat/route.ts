import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/chat";
        const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;

        if (!backendUrl) {
            console.error("[Proxy] Error: BACKEND_URL or NEXT_PUBLIC_API_URL is not set.");
            return NextResponse.json({ detail: "Configuration Error: Backend URL missing" }, { status: 500 });
        }

        console.log(`[Proxy] Forwarding request to: ${backendUrl}`);
        console.log(`[Proxy] Request body snippet: ${JSON.stringify(body).slice(0, 100)}`);

        const response = await fetch(backendUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            // Try to parse error details from backend
            let errorDetail = "Backend request failed";
            try {
                const errJson = await response.json();
                errorDetail = errJson.detail || JSON.stringify(errJson);
            } catch (e) {
                errorDetail = `Status ${response.status} (Could not parse JSON)`;
            }
            console.error(`[Proxy] Backend error: ${errorDetail}`);
            return NextResponse.json({ detail: errorDetail }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error("[Proxy] Internal Error:", error);
        return NextResponse.json(
            { detail: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
