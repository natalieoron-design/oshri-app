import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.EMAIL_FROM ?? 'אושרי הרץ - נטורופתית <noreply@oshrihertz.co.il>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://oshri-app.vercel.app'

export async function sendNewRecommendationEmail({
  patientEmail,
  patientName,
  recommendationCount,
}: {
  patientEmail: string
  patientName: string
  recommendationCount: number
}) {
  const subject = `יש לך המלצות חדשות מאושרי הרץ 🌿`
  const recWord = recommendationCount === 1 ? 'המלצה חדשה' : `${recommendationCount} המלצות חדשות`

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Arial,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#4a7c59;padding:32px 40px;text-align:center;">
              <p style="margin:0;color:#c8dece;font-size:14px;letter-spacing:1px;">אושרי הרץ — נטורופתית N.D</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:bold;">🌿 המלצות חדשות מחכות לך</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:16px;color:#374151;">שלום ${patientName} 👋</p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7;">
                אושרי הוסיפה עבורך <strong style="color:#4a7c59;">${recWord}</strong> באפליקציה.<br>
                ניתן לצפות בהן ולהתחיל ליישם בכל עת.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:#4a7c59;border-radius:10px;padding:14px 32px;">
                    <a href="${APP_URL}/recommendations"
                       style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;display:block;">
                      לצפייה בהמלצות ←
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                אם הקישור לא עובד, העתיקי את הכתובת הזו לדפדפן:<br>
                <span style="color:#4a7c59;">${APP_URL}/recommendations</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f5f0e8;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                מייל זה נשלח אוטומטית ממערכת ניהול המטופלים של אושרי הרץ
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return resend.emails.send({
    from: FROM,
    to: patientEmail,
    subject,
    html,
  })
}
