package main

import (
	"fmt"
	"math/rand"
	"strings"
	"time"
)

// PromptGenerator generates test prompts of specified token lengths
type PromptGenerator struct {
	wordPool []string
	rng      *rand.Rand
}

// NewPromptGenerator creates a new prompt generator
func NewPromptGenerator() *PromptGenerator {
	return &PromptGenerator{
		wordPool: generateWordPool(),
		rng:      rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// GeneratePrompt generates a prompt with approximately the specified number of tokens
func (pg *PromptGenerator) GeneratePrompt(targetTokens int, promptType string) string {
	switch promptType {
	case "fixed":
		return pg.generateFixedLengthPrompt(targetTokens)
	case "simple":
		return pg.generateSimplePrompt(targetTokens)
	case "complex":
		return pg.generateComplexPrompt(targetTokens)
	default:
		return pg.generateFixedLengthPrompt(targetTokens)
	}
}

// generateFixedLengthPrompt creates a prompt with approximately targetTokens tokens
func (pg *PromptGenerator) generateFixedLengthPrompt(targetTokens int) string {
	// Rough estimate: average English word is 1.3 tokens
	targetWords := int(float64(targetTokens) / 1.3)

	var words []string
	for i := 0; i < targetWords; i++ {
		words = append(words, pg.wordPool[pg.rng.Intn(len(pg.wordPool))])
	}

	// Add a task instruction at the end to ensure the model has something to do
	instruction := "Please continue this text with a coherent story or explanation."

	return strings.Join(words, " ") + " " + instruction
}

// generateSimplePrompt creates a simple prompt for basic testing
func (pg *PromptGenerator) generateSimplePrompt(targetTokens int) string {
	basePrompt := "Please write a detailed explanation about artificial intelligence and machine learning. "

	// Add filler words to reach target length
	remainingTokens := targetTokens - estimateTokens(basePrompt)
	if remainingTokens > 0 {
		fillerWords := pg.generateFillerWords(remainingTokens)
		basePrompt += fillerWords
	}

	return basePrompt
}

// generateComplexPrompt creates a more complex prompt for thorough testing
func (pg *PromptGenerator) generateComplexPrompt(targetTokens int) string {
	introduction := "In the rapidly evolving field of artificial intelligence and machine learning, researchers and engineers face numerous challenges and opportunities. "
	context := "Consider the implications of large language models, neural networks, deep learning architectures, and their applications in natural language processing, computer vision, and robotics. "
	task := "Analyze the technical, ethical, and societal impacts of these technologies, providing specific examples and detailed explanations. "

	basePrompt := introduction + context + task

	// Add filler content to reach target length
	remainingTokens := targetTokens - estimateTokens(basePrompt)
	if remainingTokens > 0 {
		fillerContent := pg.generateTechnicalFiller(remainingTokens)
		basePrompt += fillerContent
	}

	return basePrompt
}

// generateFillerWords creates filler words to reach target token count
func (pg *PromptGenerator) generateFillerWords(targetTokens int) string {
	var words []string
	currentTokens := 0

	for currentTokens < targetTokens {
		word := pg.wordPool[pg.rng.Intn(len(pg.wordPool))]
		words = append(words, word)
		currentTokens += estimateTokens(word)
	}

	return strings.Join(words, " ")
}

// generateTechnicalFiller creates technical filler content
func (pg *PromptGenerator) generateTechnicalFiller(targetTokens int) string {
	concepts := []string{
		"neural networks", "deep learning", "machine learning algorithms", "natural language processing",
		"computer vision", "reinforcement learning", "supervised learning", "unsupervised learning",
		"transformer architectures", "attention mechanisms", "gradient descent", "backpropagation",
		"convolutional neural networks", "recurrent neural networks", "LSTM networks", "GAN architectures",
		"transfer learning", "few-shot learning", "meta-learning", "automated machine learning",
		"model optimization", "hyperparameter tuning", "cross-validation", "ensemble methods",
	}

	var content []string
	currentTokens := 0

	for currentTokens < targetTokens {
		concept := concepts[pg.rng.Intn(len(concepts))]
		phrase := fmt.Sprintf("The application of %s in modern AI systems demonstrates significant potential for advancement. ", concept)
		content = append(content, phrase)
		currentTokens += estimateTokens(phrase)
	}

	return strings.Join(content, "")
}

// estimateTokens provides a rough estimate of token count for a string
func estimateTokens(text string) int {
	// Rough estimation: average 1.3 tokens per word in English
	words := strings.Fields(text)
	return int(float64(len(words)) * 1.3)
}

// generateWordPool creates a pool of common English words
func generateWordPool() []string {
	return []string{
		"the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
		"it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
		"this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
		"or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
		"so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
		"when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
		"people", "into", "year", "your", "good", "some", "could", "them", "see", "other",
		"than", "then", "now", "look", "only", "come", "its", "over", "think", "also",
		"back", "after", "use", "two", "how", "our", "work", "first", "well", "way",
		"even", "new", "want", "because", "any", "these", "give", "day", "most", "us",
		"technology", "computer", "system", "program", "software", "hardware", "network", "internet",
		"data", "information", "process", "analysis", "algorithm", "computation", "calculation",
		"model", "simulation", "prediction", "classification", "recognition", "detection", "optimization",
		"efficiency", "performance", "accuracy", "precision", "recall", "metric", "evaluation",
		"training", "testing", "validation", "dataset", "sample", "example", "instance",
		"feature", "attribute", "characteristic", "property", "parameter", "variable", "value",
		"result", "output", "outcome", "conclusion", "finding", "discovery", "insight",
		"method", "approach", "technique", "procedure", "strategy", "solution", "answer",
	}
}

// GetPromptTypes returns available prompt types
func GetPromptTypes() []string {
	return []string{"fixed", "simple", "complex"}
}

// GetDefaultPromptLengths returns recommended prompt lengths for testing
func GetDefaultPromptLengths() []int {
	return []int{128, 256, 512, 1024, 2048}
}

// ValidatePromptConfig validates prompt configuration
func ValidatePromptConfig(promptType string, promptLength int) error {
	if promptType != "fixed" && promptType != "simple" && promptType != "complex" && promptType != "custom" {
		return fmt.Errorf("invalid prompt type: %s", promptType)
	}

	if promptLength < 16 || promptLength > 8192 {
		return fmt.Errorf("prompt length must be between 16 and 8192 tokens, got: %d", promptLength)
	}

	return nil
}

// EstimateActualTokens returns a more accurate estimate of actual token count
func EstimateActualTokens(text string) int {
	// More sophisticated estimation considering common tokenization patterns
	words := strings.Fields(text)

	// Account for punctuation and special characters
	punctuationCount := strings.Count(text, ".") + strings.Count(text, ",") +
		strings.Count(text, "!") + strings.Count(text, "?") +
		strings.Count(text, ";") + strings.Count(text, ":")

	// Rough formula: words * 1.3 + punctuation * 0.2
	estimated := float64(len(words))*1.3 + float64(punctuationCount)*0.2

	return int(estimated)
}