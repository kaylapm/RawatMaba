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

    const subject = `[RAPOT RAWAT MABA] Hasil Evaluasi - ${to_name} (${displayNrp})`;

    // Clean Professional HTML Email Template — No emoji, no gradients, solid blue (#3852f6)
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapot Rawat Maba</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #1e3a5f; padding: 32px 40px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px;">
                HRD HMSI - Kabinet Pilaraksi
              </p>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px;">
                RAPOT RAWAT MABA
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 12px; color: #cbd5e1;">
                Lembar Hasil Evaluasi Karakter &amp; Akademik Mahasiswa
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              
              <p style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #0f172a;">
                Halo, ${to_name}
              </p>
              <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.7; color: #475569;">
                Berikut kami sampaikan hasil evaluasi resmi <strong>Rapot Rawat Maba</strong> untuk Anda. 
                Dokumen PDF resmi terlampir pada email ini.
              </p>

              <!-- Student Info Table -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px 16px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; width: 140px;">Nama</td>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${to_name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;">NRP</td>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0; font-family: 'Courier New', monospace;">${displayNrp}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px 16px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;">Program Studi</td>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${displayProdi}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;">Kelompok</td>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${kelompok}</td>
                </tr>
                <tr style="background-color: #f8fafc;">
                  <td style="padding: 10px 16px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;">Mentor</td>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${mentor}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Nilai Akhir</td>
                  <td style="padding: 10px 16px; font-size: 16px; font-weight: 800; color: #1e3a5f;">${displayScore} <span style="font-size: 12px; font-weight: 600; color: #64748b;">(Predikat ${displayPredicate})</span></td>
                </tr>
              </table>

              <!-- Status -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 10px 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 13px; color: #166534; font-weight: 600;">
                    Status: ${displayStatus}
                  </td>
                </tr>
              </table>

              <!-- Attachment Note -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; color: #475569; line-height: 1.6;">
                    <strong>Lampiran PDF Resmi:</strong> Dokumen Rapot PDF resmi Anda sudah terlampir pada email ini. Harap simpan dokumen tersebut sebagai bukti evaluasi resmi.
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.6; color: #475569;">
                Jika terdapat pertanyaan mengenai hasil evaluasi ini, silakan berkonsultasi langsung dengan mentor kelompok Anda.
              </p>

              <!-- Signature -->
              <p style="margin: 0; font-size: 13px; color: #0f172a; line-height: 1.6;">
                Salam hangat,<br>
                <strong>HRD HMSI Kabinet Pilaraksi</strong><br>
                <span style="font-size: 12px; color: #64748b;">Panitia Rawat Maba</span>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 40px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                Email ini dikirimkan secara otomatis oleh Sistem Evaluasi Rapot Rawat Maba.
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

    const textBody = `Halo ${to_name},

Berikut kami sampaikan hasil evaluasi Rapot Rawat Maba:
- Nama: ${to_name}
- NRP: ${displayNrp}
- Program Studi: ${displayProdi}
- Kelompok: ${kelompok}
- Mentor: ${mentor}
- Nilai Akhir: ${displayScore}
- Predikat: ${displayPredicate}
- Status: ${displayStatus}

Dokumen Rapot PDF resmi telah terlampir pada email ini.

Salam hangat,
HRD HMSI Kabinet Pilaraksi
Panitia Rawat Maba`;

    const mailOptions: any = {
      from: `"HRD HMSI Pilaraksi" <${GMAIL_USER}>`,
      to: to_email,
      subject: subject,
      text: textBody,
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
