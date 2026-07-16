package chat

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin:     func(r *http.Request) bool { return true },
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type Client struct {
	UserID string
	IsAdmin bool
	Conn    *websocket.Conn
	Send    chan []byte
}

type Hub struct {
	mu      sync.RWMutex
	clients map[string]*Client // userID -> client
	repo    *Repository
}

func NewHub(repo *Repository) *Hub {
	return &Hub{
		clients: make(map[string]*Client),
		repo:    repo,
	}
}

func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("userId")
	isAdmin := r.URL.Query().Get("admin") == "true"
	if userID == "" {
		http.Error(w, "userId required", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		UserID:  userID,
		IsAdmin: isAdmin,
		Conn:    conn,
		Send:    make(chan []byte, 256),
	}

	h.mu.Lock()
	h.clients[userID] = client
	h.mu.Unlock()

	go client.writePump()
	go client.readPump(h)
}

func (h *Hub) SendToUser(userID string, msg []byte) {
	h.mu.RLock()
	client, ok := h.clients[userID]
	h.mu.RUnlock()
	if ok {
		select {
		case client.Send <- msg:
		default:
		}
	}
}

func (h *Hub) SendToAdmins(msg []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, client := range h.clients {
		if client.IsAdmin {
			select {
			case client.Send <- msg:
			default:
			}
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.Send:
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) readPump(hub *Hub) {
	defer func() {
		hub.mu.Lock()
		delete(hub.clients, c.UserID)
		hub.mu.Unlock()
		c.Conn.Close()
	}()

	for {
		_, msgBytes, err := c.Conn.ReadMessage()
		if err != nil {
			return
		}

		var payload MessagePayload
		if err := json.Unmarshal(msgBytes, &payload); err != nil {
			continue
		}

		switch payload.Type {
		case "new_message":
			if payload.ConversationID == "" || payload.Content == "" {
				continue
			}
			msg, err := hub.repo.AddMessage(nil, payload.ConversationID, c.UserID, payload.Content)
			if err != nil {
				log.Printf("chat save error: %v", err)
				continue
			}
			resp, _ := json.Marshal(MessagePayload{
				Type:           "new_message",
				ConversationID: payload.ConversationID,
				SenderID:       c.UserID,
				SenderName:     payload.SenderName,
				Content:        msg.Content,
			})

			notifyID := ""
			if cv, err := hub.repo.GetConversation(nil, payload.ConversationID); err == nil {
				if c.IsAdmin {
					notifyID = cv.UserID
				} else {
					hub.SendToAdmins(resp)
				}
			}
			if notifyID != "" {
				hub.SendToUser(notifyID, resp)
			}

		case "new_conversation":
			bizID := payload.BusinessID
			msg, err := hub.repo.CreateConversation(nil, bizID, c.UserID, payload.Subject)
			if err != nil {
				continue
			}
			if payload.Content != "" {
				hub.repo.AddMessage(nil, msg.ID, c.UserID, payload.Content)
			}
			resp, _ := json.Marshal(MessagePayload{
				Type:           "new_conversation",
				ConversationID: msg.ID,
				SenderID:       c.UserID,
				SenderName:     payload.SenderName,
				Content:        payload.Content,
				Subject:        payload.Subject,
			})
			hub.SendToAdmins(resp)
			c.Send <- resp

		case "typing":
			hub.mu.RLock()
			for _, cl := range hub.clients {
				if cl.IsAdmin != c.IsAdmin {
					select {
					case cl.Send <- msgBytes:
					default:
					}
				}
			}
			hub.mu.RUnlock()
		}
	}
}
