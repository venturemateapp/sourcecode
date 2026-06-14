package main

import (
	"fmt"
	"log"

	"github.com/joho/godotenv"
	"github.com/venturemate/vmbackend/internal/email"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: could not load .env")
	}

	svc, err := email.New()
	if err != nil {
		log.Fatal("Failed to create email service:", err)
	}

	// Plain inner content only — the template will wrap it once
	cleanBody := `
		<h2>Welcome to VentureMate</h2>
		<p>This is a clean test using the new email-optimized logo (280px).</p>
		<p>The logo should now appear crisp and clear in most email clients.</p>
		<p>Design is modern with better shadows and larger logo in header.</p>
		<br>
		<p>If you see only <strong>one</strong> clean card, the double-wrap bug is fixed.</p>
	`

	err = svc.SendTemplatedEmail(
		[]string{"hayfordafriyie@protonmail.ch"},
		"✅ VentureMate - Email Test (Single Clean Card)",
		cleanBody,
	)
	if err != nil {
		fmt.Println("❌ Failed to send:", err)
	} else {
		fmt.Println("✅ Clean single-card test email sent successfully!")
		fmt.Println("Check your inbox — should be one modern card with large logo and strong shadow.")
	}
}
