package main

import "testing"

func TestGenerateFixedLengthPrompt(t *testing.T) {
	pg := NewPromptGenerator("gpt-3.5-turbo")
	prompt := pg.GeneratePrompt(512, "fixed")
	tokenCount := pg.countTokens(prompt)

	if tokenCount < 512 {
		t.Fatalf("expected at least 512 tokens, got %d", tokenCount)
	}

	if tokenCount > 620 {
		t.Fatalf("expected prompt tokens to stay reasonably close to target, got %d", tokenCount)
	}
}

func TestGenerateSimplePromptLength(t *testing.T) {
	pg := NewPromptGenerator("gpt-3.5-turbo")
	prompt := pg.GeneratePrompt(256, "simple")
	tokenCount := pg.countTokens(prompt)

	if tokenCount < 256 {
		t.Fatalf("expected at least 256 tokens, got %d", tokenCount)
	}
}

func TestGenerateComplexPromptLength(t *testing.T) {
	pg := NewPromptGenerator("gpt-3.5-turbo")
	prompt := pg.GeneratePrompt(256, "complex")
	tokenCount := pg.countTokens(prompt)

	if tokenCount < 256 {
		t.Fatalf("expected at least 256 tokens, got %d", tokenCount)
	}
}
