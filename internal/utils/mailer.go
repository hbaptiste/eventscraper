package utils

import (
	"bytes"
	"crypto/tls"
	"dpatrov/scraper/internal/gendb"
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/smtp"
	"os"
	"path/filepath"
	"time"

	"golang.org/x/text/language" // Import language

	"golang.org/x/text/cases"
)

type EmailTask struct {
	To      string
	Subject string
	Body    string
}

type TemplateData struct {
	ID        string
	EditURL   string
	CancelURL string
	CreatedAt time.Time
	FormData  map[string]interface{}
}

type Mailer struct {
	smtpHost     string
	smtpPort     string
	smtpUser     string
	smtpPassword string
	fromMail     string
	baseUrl      string
	emailQueue   chan EmailTask
}

// Option pattern
type MailerConf struct {
	SmtpHost     string
	SmtpPort     string
	SmtpUser     string
	SmtpPassword string
	BaseUrl      string
	FromEmail    string
}

func NewMailer(conf MailerConf /* opts...Options**/) *Mailer {
	service := &Mailer{
		smtpHost:     conf.SmtpHost,
		smtpPort:     conf.SmtpPort,
		smtpUser:     conf.SmtpUser,
		smtpPassword: conf.SmtpPassword,
		baseUrl:      conf.BaseUrl,
		fromMail:     conf.FromEmail,
		emailQueue:   make(chan EmailTask, 100),
	}
	// Start email worker
	go service.startWorker()

	return service
}

func (m *Mailer) startWorker() {
	for task := range m.emailQueue {
		err := m.sendEmail(task)
		if err != nil {
			log.Printf("%v", err)
		} else {
			log.Printf("Email sent successfully to %s", task.To)
		}
	}
}

func (m *Mailer) _sendEmail(task EmailTask) error {

	auth := smtp.PlainAuth("", m.smtpUser, m.smtpPassword, m.smtpHost)

	msg := fmt.Sprintf("To: %s\r\nSubject: %s\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n%s",
		task.To, task.Subject, task.Body)

	return smtp.SendMail(
		m.smtpHost+":"+m.smtpPort,
		auth,
		m.fromMail,
		[]string{task.To},
		[]byte(msg),
	)
}
func (m *Mailer) sendEmail(task EmailTask) error {
	// IMPORTANT: Do NOT log passwords in production
	// fmt.Printf("password %s, user :%s", m.smtpPassword, m.smtpUser)
	log.Printf("Attempting to send email to %s from %s using host %s:%s",
		task.To, m.fromMail, m.smtpHost, m.smtpPort)

	// Authentication (PlainAuth is generally fine)
	auth := smtp.PlainAuth("", m.smtpUser, m.smtpPassword, m.smtpHost)

	// Address to connect to
	addr := m.smtpHost + ":" + m.smtpPort

	tlsConfig := &tls.Config{
		ServerName: m.smtpHost, // Very important for certificate verification
		// InsecureSkipVerify: true, // Uncomment ONLY if you have certificate issues in dev. NOT FOR PRODUCTION.
	}

	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		return fmt.Errorf("failed to dial TLS connection to %s: %w", addr, err)
	}

	// 2. Create an SMTP client from the TLS connection
	client, err := smtp.NewClient(conn, m.smtpHost)
	if err != nil {
		return fmt.Errorf("failed to create SMTP client: %w", err)
	}
	defer client.Quit() // Ensure the client connection is closed

	// 3. Authenticate
	if err = client.Auth(auth); err != nil {
		return fmt.Errorf("SMTP authentication failed: %w", err)
	}

	// 4. Set the sender
	if err = client.Mail(m.fromMail); err != nil {
		return fmt.Errorf("failed to set sender (%s): %w", m.fromMail, err)
	}

	// 5. Add recipient(s)
	if err = client.Rcpt(task.To); err != nil {
		return fmt.Errorf("failed to add recipient (%s): %w", task.To, err)
	}

	// 6. Get a writer for the email data
	wc, err := client.Data()
	if err != nil {
		return fmt.Errorf("failed to get data writer: %w", err)
	}
	defer wc.Close() // Ensure the writer is closed

	// Construct the full email message including headers
	msgHeaders := fmt.Sprintf("To: %s\r\nSubject: %s\r\nContent-Type: text/html; charset=UTF-8\r\nMIME-Version: 1.0\r\n\r\n",
		task.To, task.Subject)

	fullMessage := []byte(msgHeaders + task.Body)

	// 7. Write the message body
	if _, err = wc.Write(fullMessage); err != nil {
		return fmt.Errorf("failed to write email body: %w", err)
	}
	// 8. Quit the SMTP s
	return nil
}

func (m *Mailer) SendConfirmationMail(submission *gendb.FormSubmission) error {
	dir, _ := os.Getwd()
	templatePath := filepath.Join(dir, "internal", "templates", "confirmation_email.html")
	if _, err := os.Stat(templatePath); err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("Template doesn't exist...")
		}
	}

	// parse the template
	titleCaser := cases.Title(language.English)
	tmpl, err := template.New("confirmation_email.html").Funcs(template.FuncMap{"title": titleCaser.String}).ParseFiles(templatePath)
	if err != nil {
		return fmt.Errorf("Error parsing email template: %w", err)
	}
	editURL := fmt.Sprintf("%s/edit?token=%s", m.baseUrl, submission.EditToken)
	cancelURL := fmt.Sprint("%s/cancel?token=%s", m.baseUrl, submission.CancelToken)

	var formData map[string]interface{}

	json.Unmarshal([]byte(submission.Data), &formData)

	templateData := TemplateData{
		ID:        submission.ID,
		EditURL:   editURL,
		CancelURL: cancelURL,
		CreatedAt: submission.CreatedAt,
		FormData:  formData,
	}

	// template buffer
	var body bytes.Buffer
	err = tmpl.Execute(&body, templateData)
	if err != nil {
		log.Printf("Error executing email template for %s: %v", submission.Email, err)
		return err
	}
	task := EmailTask{
		To:      submission.Email,
		Subject: "Form Submission Confirmation - Manage Your Submission",
		Body:    body.String(),
	}
	select {
	case m.emailQueue <- task:
		log.Printf("Sending mail...\n%v", task)
	default:
		log.Println("Email queue is full, dropping email")
	}
	return nil
}

type Record map[string]any

func (m *Mailer) SendMail(templateName string, email string, subject string, templateData Record) error {
	dir, _ := os.Getwd()
	templatePath := filepath.Join(dir, "internal", "templates", fmt.Sprintf("%s.html", templateName))
	if _, err := os.Stat(templatePath); err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("Template doesn't exist...")
		}
	}

	// parse the template
	titleCaser := cases.Title(language.English)
	tmpl, err := template.New(fmt.Sprintf("%s.html", templateName)).Funcs(template.FuncMap{"title": titleCaser.String}).ParseFiles(templatePath)
	if err != nil {
		return fmt.Errorf("Error parsing email template: %w", err)
	}
	// Deal with template
	var body bytes.Buffer
	err = tmpl.Execute(&body, templateData)
	if err != nil {
		log.Printf("Error executing email template for %s: %v", email, err)
		return err
	}
	task := EmailTask{
		To:      email,
		Subject: subject,
		Body:    body.String(),
	}
	select {
	case m.emailQueue <- task:
		log.Printf("Sending [%s] mail to...%s\n", templateName, email)
	default:
		log.Println("Email queue is full, dropping email")
	}
	return nil

}
