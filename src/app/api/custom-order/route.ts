import { NextRequest, NextResponse } from "next/server"
import { corsHeaders } from "@/lib/cors"
import { Resend } from "resend"
import { rateLimit } from "@/lib/rate-limit"

const resend = new Resend(process.env.RESEND_API_KEY)

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Sanitize string input (remove HTML/scripts)
function sanitizeInput(input: string): string {
    return input
        .replace(/[<>]/g, "") // Remove < and >
        .replace(/javascript:/gi, "") // Remove javascript:
        .replace(/on\w+=/gi, "") // Remove event handlers
        .trim()
        .slice(0, 500) // Max length
}

interface CustomOrderData {
    name: string
    email: string
    productType: string
    colors: string[]
    orientation: string
    stitchType: string
    designImage?: string // base64 encoded image
}

export async function POST(request: NextRequest) {
    // Handle preflight
    if (request.method === "OPTIONS") {
        return new NextResponse(null, { status: 200, headers: corsHeaders })
    }

    try {
        // SECURITY: Rate limiting (5 requests per minute per IP)
        const ip = request.headers.get("x-forwarded-for") || "unknown"
        const rateLimitResult = rateLimit(ip, { requests: 5, window: 60000 })

        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                {
                    error: "Too many requests. Please try again later.",
                    resetAt: new Date(rateLimitResult.resetAt).toISOString(),
                },
                { status: 429, headers: corsHeaders }
            )
        }

        const data: CustomOrderData = await request.json()

        // SECURITY: Validate required fields
        if (!data.name || !data.email || !data.productType) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400, headers: corsHeaders }
            )
        }

        // SECURITY: Validate email format
        if (!EMAIL_REGEX.test(data.email)) {
            return NextResponse.json(
                { error: "Invalid email format" },
                { status: 400, headers: corsHeaders }
            )
        }

        // SECURITY: Validate field lengths
        if (
            data.name.length < 2 ||
            data.name.length > 100 ||
            data.email.length > 254
        ) {
            return NextResponse.json(
                { error: "Invalid field length" },
                { status: 400, headers: corsHeaders }
            )
        }

        // SECURITY: Validate colors array
        if (
            !Array.isArray(data.colors) ||
            data.colors.length === 0 ||
            data.colors.length > 10
        ) {
            return NextResponse.json(
                { error: "Invalid colors selection (1-10 colors required)" },
                { status: 400, headers: corsHeaders }
            )
        }

        // SECURITY: Sanitize inputs
        const sanitizedData = {
            name: sanitizeInput(data.name),
            email: sanitizeInput(data.email),
            productType: sanitizeInput(data.productType),
            colors: data.colors.map((c) => sanitizeInput(c)),
            orientation: sanitizeInput(data.orientation),
            stitchType: sanitizeInput(data.stitchType),
            designImage: data.designImage,
        }

        // Email configuration (use sanitized data)
        const emailContent = `
New Custom Order Request

Customer Details:
- Name: ${sanitizedData.name}
- Email: ${sanitizedData.email}

Product Configuration:
- Product Type: ${sanitizedData.productType}
- Colors: ${sanitizedData.colors.join(", ")}
- Orientation: ${sanitizedData.orientation}
- Stitch Type: ${sanitizedData.stitchType}
${sanitizedData.designImage ? "- Custom Design: Attached" : ""}

---
Received: ${new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })}
IP Address: ${ip}
        `.trim()

        // Send email using Resend
        const orderEmail = process.env.ORDER_EMAIL || "your-email@example.com"

        await resend.emails.send({
            from: "StitchWyse Orders <onboarding@resend.dev>", // Change after domain verification
            to: orderEmail,
            subject: `New Custom Order - ${data.productType}`,
            text: emailContent,
        })

        console.log(`Custom order email sent to ${orderEmail}`)

        return NextResponse.json(
            {
                success: true,
                message: "Order received! We'll contact you within 24 hours.",
            },
            { status: 200, headers: corsHeaders }
        )
    } catch (error) {
        console.error("Custom order error:", error)
        return NextResponse.json(
            { error: "Failed to process order. Please try again." },
            { status: 500, headers: corsHeaders }
        )
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 200, headers: corsHeaders })
}
