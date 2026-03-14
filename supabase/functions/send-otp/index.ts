import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
<<<<<<< HEAD
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
=======
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getEmailTemplate(otp: string, email: string): string {
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
<<<<<<< HEAD
</head>
<body style="margin:0; padding:20px; font-family:Arial, sans-serif; background:#f5f5f5;">
  <table style="max-width:500px; margin:0 auto; background:#fff; border-radius:8px; padding:30px; border:1px solid #ddd;">
    <tr>
      <td style="text-align:center; padding-bottom:20px; border-bottom:1px solid #eee;">
        <h2 style="margin:0; color:#333;">BONZ STORE</h2>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 0;">
        <p style="margin:0 0 10px; color:#333;">Xin chào <b>${email}</b>,</p>
        <p style="margin:0 0 20px; color:#555;">Mã xác thực của bạn:</p>
        <div style="text-align:center; margin:20px 0;">
          <span style="font-size:32px; font-weight:bold; letter-spacing:8px; color:#000; background:#f0f0f0; padding:12px 24px; border-radius:8px; border:2px dashed #ccc;">${otp}</span>
        </div>
        <p style="margin:20px 0 0; color:#888; font-size:13px; text-align:center;">⏱️ Mã có hiệu lực trong <b>5 phút</b>. Không chia sẻ mã này với ai.</p>
      </td>
    </tr>
    <tr>
      <td style="padding-top:20px; border-top:1px solid #eee; text-align:center;">
        <p style="margin:0 0 8px; color:#555; font-size:13px;"><b>Liên hệ hỗ trợ:</b></p>
        <p style="margin:0 0 4px; color:#555; font-size:13px;">📧 Gmail: bonzshopvn@gmail.com</p>
        <p style="margin:0 0 4px; color:#555; font-size:13px;">📱 SĐT/Zalo: 0762694589</p>
        <p style="margin:0 0 4px; color:#555; font-size:13px;">💬 Facebook: fb.com/bonzshop</p>
        <p style="margin:10px 0 0; color:#aaa; font-size:11px;">© 2024 BONZ STORE</p>
=======
  <title>Mã xác thực</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <div style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%); border-radius: 8px; margin-bottom: 20px;">
                <span style="color: #000; font-size: 24px; font-weight: bold; letter-spacing: 2px;">BONZ STORE</span>
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Xác thực tài khoản</h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #b0b0b0; font-size: 16px; line-height: 1.6;">
                Xin chào <strong style="color: #00d4ff;">${email}</strong>,
              </p>
              <p style="margin: 0 0 30px; color: #b0b0b0; font-size: 16px; line-height: 1.6;">
                Chúng tôi nhận được yêu cầu xác thực tài khoản của bạn. Vui lòng sử dụng mã OTP bên dưới để hoàn tất quá trình:
              </p>
              
              <!-- OTP Box -->
              <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; padding: 20px 40px; background: linear-gradient(135deg, #1e3a5f 0%, #0d2137 100%); border: 2px solid #00d4ff; border-radius: 12px; box-shadow: 0 0 30px rgba(0,212,255,0.3);">
                  <span style="font-size: 42px; font-weight: bold; color: #00d4ff; letter-spacing: 12px; font-family: 'Courier New', monospace;">${otp}</span>
                </div>
              </div>
              
              <p style="margin: 30px 0 0; color: #888; font-size: 14px; text-align: center;">
                ⏱️ Mã có hiệu lực trong <strong style="color: #ff6b6b;">5 phút</strong>
              </p>
              
              <!-- Warning -->
              <div style="margin-top: 30px; padding: 20px; background: rgba(255,107,107,0.1); border-left: 4px solid #ff6b6b; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #ff6b6b; font-size: 14px;">
                  ⚠️ <strong>Cảnh báo bảo mật:</strong> Không chia sẻ mã này với bất kỳ ai. Nhân viên BONZ STORE sẽ không bao giờ yêu cầu mã OTP của bạn.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background: rgba(0,0,0,0.3); border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0 0 10px; color: #666; font-size: 12px; text-align: center;">
                Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email hoặc liên hệ hỗ trợ.
              </p>
              <p style="margin: 0; color: #444; font-size: 12px; text-align: center;">
                © 2024 BONZ STORE. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

async function sendEmailWithGmail(to: string, subject: string, html: string): Promise<void> {
  const gmailUser = Deno.env.get("GMAIL_USER");
  const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

  if (!gmailUser || !gmailPassword) {
    throw new Error("Gmail credentials not configured");
  }

  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: {
        username: gmailUser,
        password: gmailPassword,
      },
    },
  });

  try {
    await client.send({
      from: `BONZ STORE <${gmailUser}>`,
      to: to,
      subject: subject,
      content: "Vui lòng xem email này bằng trình duyệt hỗ trợ HTML",
      html: html,
    });
    console.log("Email sent successfully via Gmail SMTP");
  } finally {
    await client.close();
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
<<<<<<< HEAD
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
=======
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          error: "Server misconfigured",
          details: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: any;
    try {
      body = await req.json();
    } catch (_e) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
    const { email, action, otp: userOtp, checkEmailExists } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

<<<<<<< HEAD
=======
    // Check if email exists in system (for password reset)
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
    if (checkEmailExists) {
      const { data: users, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error("Error checking users:", listError);
        return new Response(
          JSON.stringify({ error: "Không thể kiểm tra email" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const emailExists = users?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (!emailExists) {
        return new Response(
          JSON.stringify({ error: "Email này chưa được đăng ký trong hệ thống", emailNotFound: true }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
<<<<<<< HEAD

      if (!action) {
        return new Response(
          JSON.stringify({ success: true, emailExists: true }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    if (action === "send") {
=======
    }

    if (action === "send") {
      // Check if already sent recently (rate limiting)
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
      const { data: existing } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('email', email)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        const createdAt = new Date(existing.created_at).getTime();
        const timeSinceSend = Date.now() - createdAt;
        
<<<<<<< HEAD
=======
        // Rate limit: 60 seconds between sends
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
        if (timeSinceSend < 60000) {
          const waitTime = Math.ceil((60000 - timeSinceSend) / 1000);
          return new Response(
            JSON.stringify({ error: `Vui lòng đợi ${waitTime} giây trước khi gửi lại` }),
            { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }

<<<<<<< HEAD
=======
      // Delete old OTPs for this email
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
      await supabase
        .from('otp_codes')
        .delete()
        .eq('email', email);

<<<<<<< HEAD
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

=======
      // Generate new OTP
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

      // Store OTP in database
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
      const { error: insertError } = await supabase
        .from('otp_codes')
        .insert({
          email,
          code: otp,
          expires_at: expiresAt,
          attempts: 0
        });

      if (insertError) {
        console.error("Failed to store OTP:", insertError);
        throw new Error("Failed to store OTP");
      }

<<<<<<< HEAD
      const subject = `Mã xác thực BONZ STORE: ${otp}`;
      await sendEmailWithGmail(email, subject, getEmailTemplate(otp, email));
=======
      // Send email via Gmail
      const subject = `🔐 Mã xác thực BONZ STORE - ${otp.substring(0, 2)}****`;
      try {
        await sendEmailWithGmail(email, subject, getEmailTemplate(otp, email));
      } catch (e) {
        console.error("Failed to send OTP email:", e);
        return new Response(
          JSON.stringify({
            error: "Không thể gửi OTP. Vui lòng thử lại sau.",
            details: e instanceof Error ? e.message : String(e),
          }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af

      console.log("OTP email sent to:", email);

      return new Response(
        JSON.stringify({ success: true, message: "OTP đã được gửi đến email của bạn" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );

    } else if (action === "verify") {
<<<<<<< HEAD
=======
      // Get stored OTP from database
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
      const { data: stored, error: fetchError } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !stored) {
        return new Response(
          JSON.stringify({ error: "Không tìm thấy mã OTP. Vui lòng yêu cầu mã mới." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const expiresAt = new Date(stored.expires_at).getTime();
      if (expiresAt < Date.now()) {
<<<<<<< HEAD
=======
        // Delete expired OTP
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
        await supabase.from('otp_codes').delete().eq('id', stored.id);
        return new Response(
          JSON.stringify({ error: "Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (stored.code !== userOtp) {
        const newAttempts = stored.attempts + 1;
        
        if (newAttempts >= 5) {
<<<<<<< HEAD
=======
          // Delete OTP after too many attempts
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
          await supabase.from('otp_codes').delete().eq('id', stored.id);
          return new Response(
            JSON.stringify({ error: "Nhập sai quá nhiều lần. Vui lòng yêu cầu mã OTP mới." }),
            { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

<<<<<<< HEAD
=======
        // Update attempts count
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
        await supabase
          .from('otp_codes')
          .update({ attempts: newAttempts })
          .eq('id', stored.id);

        return new Response(
          JSON.stringify({ error: `Mã OTP không đúng. Còn ${5 - newAttempts} lần thử.`, attemptsLeft: 5 - newAttempts }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

<<<<<<< HEAD
=======
      // Success - delete OTP
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
      await supabase.from('otp_codes').delete().eq('id', stored.id);

      return new Response(
        JSON.stringify({ success: true, verified: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

<<<<<<< HEAD
  } catch (error: any) {
    console.error("Error in send-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
=======
  } catch (error) {
    console.error("Error in send-otp function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
>>>>>>> 9cd903c3ca04fa175ffba717c8f15f218c9091af
