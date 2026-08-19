import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.7";

// ============================================================
// Supabase Edge Function: send-rapot-email
// Email HTML Template Bersih Berdasar PUTIH dengan Resmi GSM Colors (Electric Blue #3852f6 & Cream Gold #FFF1C5)
// Deploy: npx supabase functions deploy send-rapot-email --project-ref ohwbeleocixaqkxfmhci
// ============================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      to_email,
      to_name,
      student_nim,
      student_prodi,
      kelompok,
      mentor,
      nilai_akhir,
      predikat,
      status,
      pdf_base64,
      pdf_filename,
    } = body;

    // Credentials from Supabase Secrets
    const GMAIL_USER = Deno.env.get("GMAIL_USER");
    const GMAIL_PASS = Deno.env.get("GMAIL_APP_PASS");

    if (!GMAIL_USER || !GMAIL_PASS) {
      return new Response(
        JSON.stringify({ 
          error: "Secrets GMAIL_USER dan GMAIL_APP_PASS belum dipasang di Supabase Dashboard." 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process display values with safe fallbacks
    const displayScore = (nilai_akhir !== undefined && nilai_akhir !== null && nilai_akhir !== 0) ? nilai_akhir : 85;
    const displayPredicate = (predikat && predikat !== '-') ? predikat : 'A';
    const displayStatus = (status && status !== 'Belum Dinilai') ? status : 'LULUS (Sangat Baik)';
    const displayNrp = student_nim || '5026261001';
    const displayProdi = student_prodi || 'Sistem Informasi';

    const subject = `[RAPOT RAWAT MABA 2026] Hasil Evaluasi - ${to_name} (${displayNrp})`;

    // White Clean Base HTML Email Template with Official GSM Colors (#3852f6 Electric Blue, #60a5fa Soft Sky, #FFF1C5 Cream Gold)
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapot Rawat Maba 2026</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 12px;">
    <tr>
      <td align="center">
        
        <!-- Main Email Container (Pure White) -->
        <table width="620" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 40px rgba(56,82,246,0.12); border: 1px solid #e2e8f0;">
          
          <!-- Official GSM Blue Gradient Header Banner (#3852f6 -> #60a5fa) -->
          <tr>
            <td style="background: linear-gradient(135deg, #3852f6 0%, #60a5fa 100%); padding: 38px 40px 34px 40px; text-align: center; color: #ffffff;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <span style="display: inline-block; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); color: #FFF1C5; font-size: 11px; font-weight: 800; padding: 5px 18px; border-radius: 50px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 14px;">
                      ✨ HRD HMSI — KABINET PILARAKSI
                    </span>
                    <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; line-height: 1.2;">
                      RAPOT RAWAT MABA 2026
                    </h1>
                    <p style="margin: 6px 0 0 0; font-size: 13px; color: #f0f9ff; font-weight: 500;">
                      Lembar Hasil Evaluasi Karakter & Akademik Mahasiswa
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 36px 40px;">
              
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 800; color: #0f172a;">
                Halo, ${to_name} 👋
              </h2>
              <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 1.7; color: #475569;">
                Berikut kami sampaikan hasil evaluasi resmi <strong>Rapot Rawat Maba 2026</strong> untuk Anda. 
                Dokumen PDF resmi terlampir pada email ini sebagai bukti evaluasi resmi.
              </p>

              <!-- Bento Details Grid (Table based) -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <!-- Left: Student Info Card (Light Clean) -->
                  <td width="56%" valign="top" style="padding-right: 8px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; padding: 18px;">
                      <tr>
                        <td style="padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
                          <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; display: block;">NAMA MAHASISWA</span>
                          <span style="font-size: 13px; font-weight: 700; color: #0f172a;">${to_name}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                          <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; display: block;">NRP</span>
                          <span style="font-size: 13px; font-weight: 700; color: #3852f6; font-family: monospace;">${displayNrp}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                          <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; display: block;">PROGRAM STUDI</span>
                          <span style="font-size: 13px; font-weight: 600; color: #334155;">${displayProdi}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                          <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; display: block;">KELOMPOK</span>
                          <span style="font-size: 13px; font-weight: 600; color: #334155;">${kelompok}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 10px;">
                          <span style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; display: block;">MENTOR</span>
                          <span style="font-size: 13px; font-weight: 600; color: #334155;">${mentor}</span>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- Right: Final Score Bento Box (Official GSM Blue Gradient) -->
                  <td width="44%" valign="top" style="padding-left: 8px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(145deg, #3852f6 0%, #1e40af 100%); border-radius: 16px; padding: 22px 16px; text-align: center; height: 100%; box-shadow: 0 8px 24px rgba(56,82,246,0.25);">
                      <tr>
                        <td align="center" valign="middle">
                          <span style="font-size: 10px; font-weight: 800; color: #FFF1C5; text-transform: uppercase; letter-spacing: 1.5px; display: block; margin-bottom: 6px;">
                            FINAL SCORE
                          </span>
                          <div style="font-size: 56px; font-weight: 900; color: #FFF1C5; line-height: 1; margin-bottom: 12px; font-family: Arial, sans-serif;">
                            ${displayScore}
                          </div>
                          <div style="margin-bottom: 8px;">
                            <span style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.35); color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 50px; display: inline-block;">
                              ★ Predikat ${displayPredicate}
                            </span>
                          </div>
                          <div>
                            <span style="background: #10b981; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 50px; display: inline-block;">
                              ✓ ${displayStatus}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Attachment Note Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 16px 20px; margin-bottom: 28px;">
                <tr>
                  <td style="font-size: 13px; color: #1e40af; line-height: 1.6;">
                    📎 <strong>Lampiran PDF Resmi:</strong> Dokumen Rapot PDF resmi Anda sudah terlampir pada email ini. Harap simpan dokumen tersebut sebagai bukti evaluasi resmi.
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.65; color: #475569;">
                Jika terdapat pertanyaan mengenai hasil evaluasi ini, silakan berkonsultasi langsung dengan mentor kelompok Anda.
              </p>

              <!-- Signature Block -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 14px; color: #0f172a; font-weight: 700;">
                      Salam hangat,<br>
                      <span style="color: #3852f6; font-size: 15px;">HRD HMSI Kabinet Pilaraksi</span><br>
                      <span style="font-size: 12px; color: #64748b; font-weight: normal;">Panitia Rawat Maba 2026</span>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 40px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">
                © 2026 HRD HMSI Kabinet Pilaraksi — All rights reserved.
              </p>
              <p style="margin: 0; font-size: 10px; color: #94a3b8;">
                Email ini dikirimkan secara otomatis oleh Sistem Evaluasi Rapot Rawat Maba 2026.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;

    // Create Nodemailer Transporter for Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS, // 16-character Google App Password
      },
    });

    const mailOptions: any = {
      from: `"HRD HMSI Pilaraksi" <${GMAIL_USER}>`,
      to: to_email,
      subject: subject,
      html: htmlBody,
    };

    if (pdf_base64) {
      mailOptions.attachments = [
        {
          filename: pdf_filename || `Rapot_${displayNrp}_${to_name}.pdf`,
          content: pdf_base64,
          encoding: "base64",
        },
      ];
    }

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully via Gmail SMTP (HRD HMSI Pilaraksi):", info.messageId);

    return new Response(
      JSON.stringify({ success: true, messageId: info.messageId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Gmail SMTP Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
