import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const GMAIL_USER = Deno.env.get('GMAIL_USER')
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD')
const NOTIFICATION_EMAILS = Deno.env.get('NOTIFICATION_EMAILS') || 'bryankarchensky@gmail.com'

interface PhotoPayload {
  type: 'INSERT'
  table: string
  record: {
    id: string
    file_url: string
    uploader_name: string
    caption: string
    created_at: string
  }
}

serve(async (req) => {
  try {
    const payload: PhotoPayload = await req.json()
    const { record } = payload
    
    const subject = `New Photo Shared by ${record.uploader_name}`
    
    const emailBody = `
      <h2>New Wedding Photo Uploaded</h2>
      
      <p><strong>Shared by:</strong> ${record.uploader_name}</p>
      
      ${record.caption ? `<p><strong>Caption:</strong> ${record.caption}</p>` : ''}
      
      <div style="margin: 20px 0;">
        <img src="${record.file_url}" alt="Shared photo" style="max-width: 400px; border-radius: 8px;">
      </div>
      
      <hr>
      <p style="color: #666; font-size: 12px;">
        Uploaded: ${new Date(record.created_at).toLocaleString()}
      </p>
    `
    
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: GMAIL_USER!,
          password: GMAIL_APP_PASSWORD!,
        },
      },
    })
    
    await client.send({
      from: GMAIL_USER!,
      to: NOTIFICATION_EMAILS.split(',').map(e => e.trim()),
      subject: subject,
      content: "Please view this email in HTML format.",
      html: emailBody,
    })
    
    await client.close()

    return new Response(JSON.stringify({ success: true, message: 'Email sent' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Email error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

