package ai

import (
	"sync"
	"time"
)

type GenerationStep string

const (
	StepThinking    GenerationStep = "thinking"
	StepProposing  GenerationStep = "proposing"
	StepCritiquing GenerationStep = "critiquing"
	StepRevising   GenerationStep = "revising"
	StepVariations GenerationStep = "generating_variations"
	StepMockups    GenerationStep = "generating_mockups"
	StepDone       GenerationStep = "done"
	StepError      GenerationStep = "error"
)

type GenerationStatus struct {
	Step      GenerationStep `json:"step"`
	Message   string         `json:"message"`
	Progress  int            `json:"progress"` // 0-100
	Error     string         `json:"error,omitempty"`
	UpdatedAt time.Time      `json:"updatedAt"`
	Done      bool           `json:"done"`
}

type GenerationTracker struct {
	mu   sync.RWMutex
	jobs map[string]*GenerationStatus
}

var globalTracker = &GenerationTracker{jobs: make(map[string]*GenerationStatus)}

func TrackGeneration(businessID string) *GenerationStatus {
	globalTracker.mu.Lock()
	defer globalTracker.mu.Unlock()
	status := &GenerationStatus{
		Step:      StepThinking,
		Message:   "Starting generation...",
		UpdatedAt: time.Now(),
	}
	globalTracker.jobs[businessID] = status
	return status
}

func UpdateGeneration(businessID string, step GenerationStep, message string, progress int) {
	globalTracker.mu.Lock()
	defer globalTracker.mu.Unlock()
	if s, ok := globalTracker.jobs[businessID]; ok {
		s.Step = step
		s.Message = message
		s.Progress = progress
		s.UpdatedAt = time.Now()
		if step == StepDone {
			s.Done = true
		}
	}
}

func FailGeneration(businessID string, err string) {
	globalTracker.mu.Lock()
	defer globalTracker.mu.Unlock()
	if s, ok := globalTracker.jobs[businessID]; ok {
		s.Step = StepError
		s.Message = "Generation failed"
		s.Error = err
		s.Done = true
		s.UpdatedAt = time.Now()
	}
}

func GetGenerationStatus(businessID string) *GenerationStatus {
	globalTracker.mu.RLock()
	defer globalTracker.mu.RUnlock()
	if s, ok := globalTracker.jobs[businessID]; ok {
		cp := *s
		return &cp
	}
	return nil
}
