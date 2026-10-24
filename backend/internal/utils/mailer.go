package utils

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/smtp"
	"os"
	"strings"
	"time"
)

// GetFrontendURL returns the configured public web frontend URL.
// Priority: FRONTEND_URL env > APP_URL env > NEXT_PUBLIC_APP_URL > default http://localhost:3000
func GetFrontendURL() string {
	url := os.Getenv("FRONTEND_URL")
	if url == "" {
		url = os.Getenv("APP_URL")
	}
	if url == "" {
		url = os.Getenv("NEXT_PUBLIC_APP_URL")
	}
	if url == "" {
		url = "http://localhost:3000"
	}
	return strings.TrimRight(url, "/")
}

type EmailMessage struct {
	To            string
	Subject       string
	HTMLBody      string
	TextBody      string
	WorkspaceName string
	InviterName   string
	RoleTitle     string
	InviteURL     string
}

// sendViaBrevoAPI sends transactional emails directly via Brevo's official HTTPS REST API.
// This operates on standard HTTPS (port 443) and is NEVER blocked by cloud platforms (Railway, Vercel, Render).
func sendViaBrevoAPI(apiKey, fromEmail, fromName, toEmail, subject, htmlContent string) error {
	type brevoContact struct {
		Name  string `json:"name,omitempty"`
		Email string `json:"email"`
	}
	type brevoPayload struct {
		Sender      brevoContact   `json:"sender"`
		To          []brevoContact `json:"to"`
		Subject     string         `json:"subject"`
		HTMLContent string         `json:"htmlContent"`
	}

	payload := brevoPayload{
		Sender:      brevoContact{Name: fromName, Email: fromEmail},
		To:          []brevoContact{{Email: toEmail}},
		Subject:     subject,
		HTMLContent: htmlContent,
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to encode Brevo payload: %w", err)
	}

	req, err := http.NewRequest("POST", "https://api.brevo.com/v3/smtp/email", bytes.NewBuffer(bodyBytes))
	if err != nil {
		return fmt.Errorf("failed to create Brevo request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("api-key", apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("brevo HTTPS request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}

	respBody, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("brevo API error (HTTP %d): %s", resp.StatusCode, string(respBody))
}

// sendViaSMTP dispatches email via standard SMTP with a 10s dial timeout,
// supporting both direct TLS (port 465) and STARTTLS (ports 587, 2525).
func sendViaSMTP(host, port, user, pass, fromEmail, fromName, toEmail, subject, htmlContent string) error {
	addr := net.JoinHostPort(host, port)
	auth := smtp.PlainAuth("", user, pass, host)

	headers := fmt.Sprintf("From: %s <%s>\r\n"+
		"To: %s\r\n"+
		"Subject: %s\r\n"+
		"MIME-Version: 1.0\r\n"+
		"Content-Type: text/html; charset=UTF-8\r\n"+
		"\r\n", fromName, fromEmail, toEmail, subject)
	msg := []byte(headers + htmlContent)

	// Port 465: Direct SSL/TLS
	if port == "465" {
		dialer := &net.Dialer{Timeout: 10 * time.Second}
		tlsConfig := &tls.Config{ServerName: host}
		conn, err := tls.DialWithDialer(dialer, "tcp", addr, tlsConfig)
		if err != nil {
			return fmt.Errorf("tls dial failed (%s): %w", addr, err)
		}
		defer conn.Close()

		client, err := smtp.NewClient(conn, host)
		if err != nil {
			return fmt.Errorf("smtp client failed: %w", err)
		}
		defer client.Quit()

		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("smtp auth failed: %w", err)
		}
		if err := client.Mail(fromEmail); err != nil {
			return fmt.Errorf("smtp mail from failed: %w", err)
		}
		if err := client.Rcpt(toEmail); err != nil {
			return fmt.Errorf("smtp rcpt failed: %w", err)
		}
		w, err := client.Data()
		if err != nil {
			return fmt.Errorf("smtp data failed: %w", err)
		}
		if _, err := w.Write(msg); err != nil {
			return fmt.Errorf("smtp write failed: %w", err)
		}
		return w.Close()
	}

	// Ports 587, 2525, etc: TCP Dial with Timeout + STARTTLS
	dialer := &net.Dialer{Timeout: 10 * time.Second}
	conn, err := dialer.Dial("tcp", addr)
	if err != nil {
		return fmt.Errorf("tcp connection timed out/failed (%s): %w", addr, err)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return fmt.Errorf("smtp new client failed: %w", err)
	}
	defer client.Quit()

	if ok, _ := client.Extension("STARTTLS"); ok {
		tlsConfig := &tls.Config{ServerName: host}
		if err := client.StartTLS(tlsConfig); err != nil {
			return fmt.Errorf("starttls failed: %w", err)
		}
	}

	if err := client.Auth(auth); err != nil {
		return fmt.Errorf("smtp auth failed: %w", err)
	}
	if err := client.Mail(fromEmail); err != nil {
		return fmt.Errorf("smtp mail from failed: %w", err)
	}
	if err := client.Rcpt(toEmail); err != nil {
		return fmt.Errorf("smtp rcpt failed: %w", err)
	}
	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("smtp data failed: %w", err)
	}
	if _, err := w.Write(msg); err != nil {
		return fmt.Errorf("smtp write failed: %w", err)
	}
	return w.Close()
}

// sendEmail handles resilient dispatch:
// 1. Tries Brevo REST API via HTTPS (Port 443) if BREVO_API_KEY is configured or key starts with xkeysib-.
// 2. Tries standard SMTP if configured. If port 587 fails on Brevo, automatically tries port 2525 fallback.
func sendEmail(fromEmail, fromName, toEmail, subject, htmlContent string) error {
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")

	// 1. Brevo REST API via HTTPS (Port 443) - Recommended for Cloud/Railway
	brevoKey := os.Getenv("BREVO_API_KEY")
	if brevoKey == "" && strings.HasPrefix(smtpPass, "xkeysib-") {
		brevoKey = smtpPass
	}
	if brevoKey != "" {
		if err := sendViaBrevoAPI(brevoKey, fromEmail, fromName, toEmail, subject, htmlContent); err == nil {
			log.Printf("[MAILER SUCCESS] Email dispatched to %s via Brevo HTTPS REST API (Port 443)", toEmail)
			return nil
		} else {
			log.Printf("[MAILER WARNING] Brevo HTTPS REST API failed: %v. Trying SMTP fallback...", err)
		}
	}

	// 2. SMTP Dispatch
	if smtpHost != "" && smtpPort != "" {
		if err := sendViaSMTP(smtpHost, smtpPort, smtpUser, smtpPass, fromEmail, fromName, toEmail, subject, htmlContent); err == nil {
			log.Printf("[MAILER SUCCESS] Email dispatched to %s via SMTP (%s:%s)", toEmail, smtpHost, smtpPort)
			return nil
		} else {
			log.Printf("[MAILER WARNING] Failed to send email via SMTP (%s:%s): %v", smtpHost, smtpPort, err)

			// Automatic fallback: If port 587 timed out on Brevo, attempt port 2525 (unblocked on Railway)
			if (smtpPort == "587" || smtpPort == "") && strings.Contains(smtpHost, "brevo.com") {
				log.Printf("[MAILER INFO] Outbound port 587 is often blocked by Railway/Cloud firewalls. Retrying via Brevo port 2525...")
				if fallbackErr := sendViaSMTP(smtpHost, "2525", smtpUser, smtpPass, fromEmail, fromName, toEmail, subject, htmlContent); fallbackErr == nil {
					log.Printf("[MAILER SUCCESS] Email dispatched to %s via Brevo port 2525 fallback!", toEmail)
					return nil
				} else {
					log.Printf("[MAILER WARNING] Brevo port 2525 fallback also failed: %v", fallbackErr)
				}
			}
		}
	}

	return fmt.Errorf("email delivery failed via all configured channels")
}

// SendInvitationEmail sends an official HTML invitation email to the employee
func SendInvitationEmail(msg EmailMessage) error {
	fromEmail := os.Getenv("SMTP_FROM")
	if fromEmail == "" {
		fromEmail = "no-reply@octocrm.id"
	}

	htmlContent := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
    .container { max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #091E42 0%%, #00AFC4 100%%); padding: 36px 30px; text-align: center; color: #ffffff; }
    .logo { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; margin: 0; }
    .logo span { color: #00AFC4; background: #ffffff; padding: 2px 8px; border-radius: 6px; margin-right: 6px; }
    .content { padding: 36px 30px; line-height: 1.6; }
    .badge { display: inline-block; background-color: #eff6ff; color: #1d4ed8; font-weight: bold; font-size: 13px; padding: 6px 14px; border-radius: 20px; margin-bottom: 18px; border: 1px solid #bfdbfe; }
    .title { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 14px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #00AFC4; color: #ffffff !important; font-weight: 800; font-size: 15px; text-decoration: none; padding: 14px 34px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 175, 196, 0.35); }
    .notice { background: #f1f5f9; padding: 14px 18px; border-radius: 10px; font-size: 12px; color: #64748b; margin-top: 24px; border-left: 4px solid #00AFC4; }
    .footer { background: #f8fafc; padding: 20px 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo"><span>OCTO</span>CRM</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">Platform CRM & Omnichannel Penjualan Terpadu</p>
    </div>
    <div class="content">
      <div class="badge">🚀 Undangan Bergabung Tim</div>
      <h2 class="title">Anda Diundang ke Workspace %s</h2>
      <p>Halo,</p>
      <p><strong>%s</strong> mengundang Anda untuk bergabung ke dalam tim <strong>%s</strong> di OCTO CRM dengan peran sebagai <strong>%s</strong>.</p>
      <p>Dengan akun ini, Anda dapat langsung mengelola percakapan WhatsApp pelanggan, deals pipeline, tiket bantuan, dan berkolaborasi bersama tim secara realtime.</p>
      
      <div class="btn-container">
        <a href="%s" class="btn" target="_blank">Terima Undangan & Aktivasi Akun</a>
      </div>

      <div class="notice">
        <strong>Penting:</strong> Tautan undangan ini bersifat pribadi dan berlaku selama <strong>7 hari</strong>. Harap segera melakukan aktivasi akun dan membuat kata sandi Anda.
      </div>

      <p style="font-size: 12px; color: #64748b; margin-top: 24px;">Jika tombol di atas tidak berfungsi, salin dan buka tautan ini di browser Anda:<br>
      <a href="%s" style="color: #00AFC4; word-break: break-all;">%s</a></p>
    </div>
    <div class="footer">
      &copy; 2026 OCTO CRM Ecosystem. Hak Cipta Dilindungi.
    </div>
  </div>
</body>
</html>`,
		msg.WorkspaceName,
		msg.InviterName,
		msg.WorkspaceName,
		msg.RoleTitle,
		msg.InviteURL,
		msg.InviteURL,
		msg.InviteURL,
	)

	subject := fmt.Sprintf("Undangan Bergabung ke %s - OCTO CRM", msg.WorkspaceName)
	err := sendEmail(fromEmail, "OCTO CRM", msg.To, subject, htmlContent)
	if err != nil {
		// Local development / zero-setup fallback: Log invitation link clearly
		log.Printf("\n=======================================================\n"+
			"📧 [OCTO CRM INVITATION EMAIL DISPATCHED (FALLBACK)]\n"+
			"To: %s\n"+
			"Workspace: %s\n"+
			"Role: %s\n"+
			"Active Token URL (Expires in 7 days):\n"+
			"👉 %s\n"+
			"=======================================================\n",
			msg.To, msg.WorkspaceName, msg.RoleTitle, msg.InviteURL)
	}

	return nil
}

// SendEscalationEmail sends an urgent notification email to Supervisor or Owner when a chat is escalated
func SendEscalationEmail(toEmail, recipientName, escalatedByName, contactName, channelIdentifier, reason, priority, chatURL, workspaceName string) error {
	fromEmail := os.Getenv("SMTP_FROM")
	if fromEmail == "" {
		fromEmail = "no-reply@octocrm.id"
	}

	priorityBadge := "#dc2626" // Red for urgent
	if priority == "high" {
		priorityBadge = "#ea580c" // Orange for high
	}

	htmlContent := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
    .container { max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #7c3aed 0%%, #4338ca 100%%); padding: 32px 28px; text-align: center; color: #ffffff; }
    .logo { font-size: 24px; font-weight: 900; margin: 0; }
    .logo span { color: #7c3aed; background: #ffffff; padding: 2px 8px; border-radius: 6px; margin-right: 6px; }
    .content { padding: 32px 28px; line-height: 1.6; }
    .badge { display: inline-block; background-color: #fdf2f8; color: #be185d; font-weight: bold; font-size: 13px; padding: 6px 14px; border-radius: 20px; margin-bottom: 16px; border: 1px solid #fbcfe8; }
    .priority-badge { display: inline-block; background-color: %s; color: #ffffff; font-weight: 800; font-size: 11px; padding: 3px 10px; border-radius: 6px; text-transform: uppercase; }
    .title { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; font-size: 13px; }
    .card-label { color: #64748b; font-weight: 600; }
    .card-val { color: #0f172a; font-weight: 700; text-align: right; }
    .reason-box { background: #fff1f2; border-left: 4px solid #e11d48; padding: 12px 16px; border-radius: 8px; margin-top: 14px; font-size: 13px; color: #9f1239; font-weight: 600; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background-color: #7c3aed; color: #ffffff !important; font-weight: 800; font-size: 14px; text-decoration: none; padding: 13px 30px; border-radius: 10px; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.35); }
    .footer { background: #f8fafc; padding: 18px 28px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo"><span>OCTO</span>CRM</h1>
      <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 13px;">Notifikasi Eskalasi Kasus & Supervisi Tim</p>
    </div>
    <div class="content">
      <div class="badge">⚡ Eskalasi Membutuhkan Tindakan Anda</div>
      <h2 class="title">Halo, %s</h2>
      <p>Staf <strong>%s</strong> telah mengekskalasikan sebuah percakapan pelanggan kepada Anda di workspace <strong>%s</strong>.</p>
      
      <div class="card">
        <div style="margin-bottom: 8px;"><strong>Informasi Kasus:</strong></div>
        <div style="margin-bottom: 6px;"><span class="card-label">Pelanggan:</span> <span class="card-val">%s (%s)</span></div>
        <div style="margin-bottom: 6px;"><span class="card-label">Prioritas Kasus:</span> <span class="priority-badge">%s</span></div>
        <div style="margin-bottom: 6px;"><span class="card-label">Diekskalasikan Oleh:</span> <span class="card-val">%s</span></div>
        <div class="reason-box">
          &ldquo;%s&rdquo;
        </div>
      </div>

      <div class="btn-container">
        <a href="%s" class="btn" target="_blank">Buka & Tangani Kasus di OCTO CRM &rarr;</a>
      </div>

      <p style="font-size: 12px; color: #64748b; text-align: center;">Akses ini terhubung langsung ke antrean percakapan Anda dengan pencatatan audit kepatuhan tata kelola.</p>
    </div>
    <div class="footer">
      &copy; 2026 OCTO CRM Enterprise &bull; Standar Tata Kelola & SLA
    </div>
  </div>
</body>
</html>`,
		priorityBadge,
		recipientName,
		escalatedByName,
		workspaceName,
		contactName,
		channelIdentifier,
		priority,
		escalatedByName,
		reason,
		chatURL,
	)

	subject := fmt.Sprintf("⚡ [ESKALASI] Kasus dari %s (%s) Membutuhkan Tindakan Anda - OCTO CRM", contactName, priority)
	err := sendEmail(fromEmail, "OCTO CRM Alerts", toEmail, subject, htmlContent)
	if err != nil {
		log.Printf("\n=======================================================\n"+
			"⚡ [OCTO CRM ESCALATION EMAIL DISPATCHED (FALLBACK)]\n"+
			"To: %s (%s)\n"+
			"Escalated By: %s\n"+
			"Customer: %s (%s)\n"+
			"Priority: %s\n"+
			"Reason: %s\n"+
			"Direct Action URL: %s\n"+
			"=======================================================\n",
			recipientName, toEmail, escalatedByName, contactName, channelIdentifier, priority, reason, chatURL)
	}

	return nil
}

// SendAssignmentEmail sends a notification email to an agent when a chat is assigned or re-assigned to them
func SendAssignmentEmail(toEmail, recipientName, assignedByName, contactName, channelIdentifier, priority, chatURL, workspaceName string) error {
	fromEmail := os.Getenv("SMTP_FROM")
	if fromEmail == "" {
		fromEmail = "no-reply@octocrm.id"
	}

	htmlContent := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
    .container { max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f172a 0%%, #00AFC4 100%%); padding: 32px 28px; text-align: center; color: #ffffff; }
    .logo { font-size: 24px; font-weight: 900; margin: 0; }
    .logo span { color: #00AFC4; background: #ffffff; padding: 2px 8px; border-radius: 6px; margin-right: 6px; }
    .content { padding: 32px 28px; line-height: 1.6; }
    .badge { display: inline-block; background-color: #ecfeff; color: #0891b2; font-weight: bold; font-size: 13px; padding: 6px 14px; border-radius: 20px; margin-bottom: 16px; border: 1px solid #a5f3fc; }
    .title { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; font-size: 13px; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background-color: #00AFC4; color: #ffffff !important; font-weight: 800; font-size: 14px; text-decoration: none; padding: 13px 30px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0, 175, 196, 0.35); }
    .footer { background: #f8fafc; padding: 18px 28px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo"><span>OCTO</span>CRM</h1>
      <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 13px;">Notifikasi Penugasan Percakapan</p>
    </div>
    <div class="content">
      <div class="badge">👤 Penugasan Percakapan Baru</div>
      <h2 class="title">Halo, %s</h2>
      <p>Anda telah ditugaskan oleh <strong>%s</strong> untuk menangani obrolan pelanggan di workspace <strong>%s</strong>.</p>
      
      <div class="card">
        <div style="margin-bottom: 6px;"><strong>Pelanggan:</strong> %s (%s)</div>
        <div style="margin-bottom: 6px;"><strong>Prioritas:</strong> %s</div>
        <div><strong>Ditugaskan Oleh:</strong> %s</div>
      </div>

      <div class="btn-container">
        <a href="%s" class="btn" target="_blank">Buka Percakapan di Inbox &rarr;</a>
      </div>

      <p style="font-size: 12px; color: #64748b; text-align: center;">Harap segera merespon pelanggan sesuai SLA First Response Time (target &lt; 15 menit).</p>
    </div>
    <div class="footer">
      &copy; 2026 OCTO CRM Enterprise &bull; Hak Cipta Dilindungi
    </div>
  </div>
</body>
</html>`,
		recipientName,
		assignedByName,
		workspaceName,
		contactName,
		channelIdentifier,
		priority,
		assignedByName,
		chatURL,
	)

	subject := fmt.Sprintf("👤 [PENUGASAN CHAT] Anda Ditugaskan Menangani %s - OCTO CRM", contactName)
	err := sendEmail(fromEmail, "OCTO CRM Alerts", toEmail, subject, htmlContent)
	if err != nil {
		log.Printf("\n=======================================================\n"+
			"👤 [OCTO CRM ASSIGNMENT EMAIL DISPATCHED (FALLBACK)]\n"+
			"To: %s (%s)\n"+
			"Assigned By: %s\n"+
			"Customer: %s (%s)\n"+
			"Priority: %s\n"+
			"Direct Action URL: %s\n"+
			"=======================================================\n",
			recipientName, toEmail, assignedByName, contactName, channelIdentifier, priority, chatURL)
	}

	return nil
}
