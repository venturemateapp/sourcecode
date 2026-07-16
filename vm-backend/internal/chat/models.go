package chat

import "time"

type Conversation struct {
	ID         string    `json:"id"`
	BusinessID string    `json:"businessId"`
	UserID     string    `json:"userId"`
	Subject    string    `json:"subject"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type Message struct {
	ID             string    `json:"id"`
	ConversationID string    `json:"conversationId"`
	SenderID       string    `json:"senderId"`
	Content        string    `json:"content"`
	CreatedAt      time.Time `json:"createdAt"`
}

type MessagePayload struct {
	Type           string `json:"type"`
	ConversationID string `json:"conversationId,omitempty"`
	SenderID       string `json:"senderId,omitempty"`
	SenderName     string `json:"senderName,omitempty"`
	Content        string `json:"content,omitempty"`
	BusinessID     string `json:"businessId,omitempty"`
	Subject        string `json:"subject,omitempty"`
}

type ConversationWithMeta struct {
	Conversation
	SenderName  string `json:"senderName"`
	SenderEmail string `json:"senderEmail"`
	LastMessage string `json:"lastMessage"`
	Unread      int    `json:"unread"`
}
