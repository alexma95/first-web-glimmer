import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { RESEND_API_URL, sendNotificationEmail } from "./index.ts";

const originalFetch = globalThis.fetch;

Deno.test("sendNotificationEmail returns success when provider responds with ok", async () => {
  globalThis.fetch = async (input, init) => {
    assertEquals(input, RESEND_API_URL);
    assertEquals(init?.method, "POST");
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
    assertEquals(body.to, ["user@example.com"]);
    return new Response("{\"id\":\"email_1\"}", { status: 200 });
  };

  try {
    const result = await sendNotificationEmail({
      apiKey: "test_key",
      from: "sender@example.com",
      to: "user@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });

    assertEquals(result.success, true);
    assertEquals(result.status, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("sendNotificationEmail surfaces provider error responses", async () => {
  globalThis.fetch = async () => {
    return new Response("{\"error\":\"invalid\"}", { status: 422 });
  };

  try {
    const result = await sendNotificationEmail({
      apiKey: "test_key",
      from: "sender@example.com",
      to: "user@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });

    assertEquals(result.success, false);
    assertEquals(result.status, 422);
    assertEquals(result.message, "Failed to send email via Resend");
    assertEquals(result.body, '{"error":"invalid"}');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("sendNotificationEmail returns 500 when fetch throws", async () => {
  globalThis.fetch = async () => {
    throw new Error("network down");
  };

  try {
    const result = await sendNotificationEmail({
      apiKey: "test_key",
      from: "sender@example.com",
      to: "user@example.com",
      subject: "Test",
      html: "<p>Hello</p>",
    });

    assertEquals(result.success, false);
    assertEquals(result.status, 500);
    assertEquals(result.message, "network down");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
