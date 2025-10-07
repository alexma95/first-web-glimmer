import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  assignmentId: string;
  campaignName: string;
  userEmail?: string;
}

interface SendEmailParams {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}

interface SendEmailResult {
  success: boolean;
  status: number;
  message?: string;
  body?: string;
}

export const RESEND_API_URL = "https://api.resend.com/emails";

export const sendNotificationEmail = async (
  params: SendEmailParams,
): Promise<SendEmailResult> => {
  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        from: params.from,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    const responseBody = await response.text();

    if (!response.ok) {
      return {
        success: false,
        status: response.status,
        message: "Failed to send email via Resend",
        body: responseBody,
      };
    }

    return { success: true, status: response.status, body: responseBody };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error while sending email";

    return {
      success: false,
      status: 500,
      message,
    };
  }
};

export const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { assignmentId, campaignName, userEmail }: NotificationRequest =
      await req.json();

    console.log("Processing notification for assignment:", assignmentId);
    if (userEmail) {
      console.log("Assignment completed by:", userEmail);
    }

    // Get assignment details with texts
    const { data: assignmentTexts, error: textsError } = await supabase
      .from("assignment_texts")
      .select(`
        *,
        products(name),
        texts(content, option_number)
      `)
      .eq("assignment_id", assignmentId);

    if (textsError) {
      console.error("Error fetching assignment texts:", textsError);
      throw textsError;
    }

    // Format the email content
    let emailContent = `
      <h2>Assignment Completed</h2>
      <p><strong>User Email:</strong> ${userEmail ?? "Not provided"}</p>
      <p><strong>Campaign:</strong> ${campaignName}</p>
      <h3>Assigned Texts:</h3>
      <ul>
    `;

    for (const item of assignmentTexts || []) {
      emailContent += `
        <li>
          <strong>${item.products?.name} (Option #${item.texts?.option_number}):</strong><br/>
          ${item.texts?.content}<br/>
          <em>Copied: ${item.copied_at ? new Date(item.copied_at).toLocaleString() : 'Not copied'}</em>
        </li>
      `;
    }

    emailContent += `</ul>`;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      const errorMessage = "RESEND_API_KEY not set, cannot send notification email";
      console.error(errorMessage);
      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const resendFromEmail =
      Deno.env.get("RESEND_FROM_EMAIL") ?? "notifications@example.com";

    const resendToEmail =
      Deno.env.get("RESEND_TO_EMAIL") ?? resendFromEmail;

    console.log("Sending notification email to:", resendToEmail);

    const sendResult = await sendNotificationEmail({
      apiKey: resendApiKey,
      from: resendFromEmail,
      to: resendToEmail,
      subject: `Assignment Completed: ${campaignName}`,
      html: emailContent,
    });

    if (!sendResult.success) {
      console.error("Failed to send email via Resend", sendResult);
      return new Response(
        JSON.stringify({
          error: sendResult.message ?? "Failed to send notification email",
          details: sendResult.body,
        }),
        {
          status: sendResult.status,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    await supabase
      .from("notifications")
      .update({ sent: true })
      .eq("assignment_id", assignmentId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification processed",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

if (import.meta.main) {
  serve(handler);
}
