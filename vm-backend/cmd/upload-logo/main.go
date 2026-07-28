package main

import (
	"context"
	"fmt"
	"os"

	"github.com/venturemate/vmbackend/internal/s3"
)

func main() {
	ctx := context.Background()
	s3Svc, err := s3.New(ctx)
	if err != nil {
		fmt.Println("S3 init error:", err)
		return
	}

	logoPath := "internal/email/assets/ventureMate-logo2.png"
	data, err := os.ReadFile(logoPath)
	if err != nil {
		fmt.Println("Read logo error:", err)
		return
	}

	key := "assets/ventureMate-logo2.png"
	url, err := s3Svc.Upload(ctx, key, data, "image/png")
	if err != nil {
		fmt.Println("Upload error:", err)
		return
	}

	fmt.Println("Logo uploaded successfully!")
	fmt.Println("Public URL:", url)
}
