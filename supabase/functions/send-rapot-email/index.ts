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
      logo_url,
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

    // Nilai akhir adalah sumber utama agar predikat dan status selalu konsisten.
    // Skor 0/kosong berarti evaluasi belum pernah diisi, bukan nilai kelulusan.
    const numericScore = Number(nilai_akhir);
    const hasEvaluation = Number.isFinite(numericScore) && numericScore > 0 && numericScore <= 100;
    const displayScore = hasEvaluation
      ? (Number.isInteger(numericScore) ? String(numericScore) : numericScore.toFixed(1).replace(/\.0$/, ''))
      : 'Belum Dinilai';
    const displayPredicate = !hasEvaluation
      ? '-'
      : numericScore >= 90
        ? 'Sangat Siap Oprec'
        : numericScore >= 75
          ? 'Siap Oprec'
          : numericScore >= 60
            ? 'Cukup Siap'
            : 'Perlu Pendampingan';
    const displayStatus = !hasEvaluation
      ? 'Belum Dinilai'
      : numericScore >= 75
        ? 'Lulus'
        : numericScore >= 60
          ? 'Perlu Latihan'
          : 'Perlu Pendampingan';
    const displayScoreHtml = hasEvaluation
      ? `${displayScore} <span style="font-size: 12px; font-weight: 500; color: #64748b;">dari 100 &middot; ${displayPredicate}</span>`
      : '<span style="font-size: 14px; color: #64748b;">Belum Dinilai</span>';
    const displayNrp = student_nim || '-';
    const displayProdi = student_prodi || '-';
    const safeLogoUrl = typeof logo_url === 'string' && /^https:\/\//i.test(logo_url)
      ? logo_url
      : '';

    const subject = `[RAPOT RAWAT MABA] ${hasEvaluation ? 'Hasil Evaluasi' : 'Status Evaluasi'} - ${to_name} (${displayNrp})`;
    const evaluationIntroHtml = hasEvaluation
      ? `Berikut kami sampaikan hasil evaluasi resmi <strong>Rapot Rawat Maba</strong> untuk Anda.
                Dokumen PDF resmi terlampir pada email ini.`
      : `Rapot Rawat Maba Anda saat ini <strong>belum dinilai</strong>. Belum ada nilai akhir,
                predikat, maupun status kelulusan yang ditetapkan.`;
    const evaluationIntroText = hasEvaluation
      ? 'Berikut kami sampaikan hasil evaluasi Rapot Rawat Maba:'
      : 'Rapot Rawat Maba Anda saat ini belum dinilai:';

    // Clean Professional HTML Email Template — No emoji, no gradients, solid blue (#3852f6)
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapot Rawat Maba</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6fb; font-family: 'Segoe UI', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f6fb; padding: 36px 12px;">
    <tr>
      <td align="center">
        
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #dfe5f2; border-top: 6px solid #003cec;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #ffffff; padding: 28px 40px; border-bottom: 1px solid #e2e8f0;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td width="72" valign="middle">
                    ${safeLogoUrl ? `<img src="${safeLogoUrl}" width="56" height="56" alt="Logo HRD HMSI" style="display: block; width: 56px; height: 56px; object-fit: contain;">` : ''}
                  </td>
                  <td valign="middle" style="text-align: left;">
                    <p style="margin: 0 0 5px 0; font-size: 11px; font-weight: 600; color: #003cec; text-transform: uppercase; letter-spacing: 1.2px;">
                      Departemen HRD HMSI
                    </p>
                    <h1 style="margin: 0; font-size: 21px; line-height: 1.35; font-weight: 700; color: #0f172a; letter-spacing: -0.35px;">
                      Rapot Rawat Maba
                    </h1>
                    <p style="margin: 5px 0 0 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                      Hasil evaluasi mentoring mahasiswa baru
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              
              <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #0f172a;">
                Halo, ${to_name}
              </p>
              <p style="margin: 0 0 28px 0; font-size: 13px; line-height: 1.8; color: #475569;">
                ${evaluationIntroHtml}
              </p>

              <!-- Student Info Table -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 22px; border: 1px solid #dfe5f2; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 10px 16px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; width: 140px;">Nama</td>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${to_name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;">NRP</td>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0; font-family: 'Courier New', monospace;">${displayNrp}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;">Program Studi</td>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${displayProdi}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;">Kelompok</td>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${kelompok}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;">Mentor</td>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${mentor}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Nilai Akhir</td>
                  <td style="padding: 12px 16px; font-size: 18px; font-weight: 700; color: #003cec;">${displayScoreHtml}</td>
                </tr>
              </table>

              <!-- Status -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 16px; background-color: #f4f6c0; border-left: 3px solid #003cec; font-size: 13px; color: #0f172a; font-weight: 600;">
                    Status evaluasi: ${displayStatus}
                  </td>
                </tr>
              </table>

              <!-- Attachment Note -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px 16px; background-color: #f8faff; border: 1px solid #dbe4ff; border-radius: 8px; font-size: 12px; color: #475569; line-height: 1.7;">
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
            <td style="background-color: #f8faff; border-top: 1px solid #e2e8f0; padding: 20px 40px; text-align: center;">
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

${evaluationIntroText}
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
