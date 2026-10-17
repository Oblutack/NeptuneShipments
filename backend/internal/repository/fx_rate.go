package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

// FXRateService fetches a real USD->EUR exchange rate, used to compute
// the Currency Adjustment Factor (CAF) on freight rates - a real
// shipping-industry surcharge structure that compensates a carrier for
// exchange-rate risk between billing and settlement currencies.
type FXRateService struct {
	httpClient *http.Client

	mu       sync.Mutex
	cached   *FXRate
	cachedAt time.Time
	cacheTTL time.Duration
}

type FXRate struct {
	USDToEUR float64
	IsLive   bool
}

// Used only if the live fetch fails.
const fallbackUSDToEUR = 0.92

func NewFXRateService() *FXRateService {
	return &FXRateService{
		httpClient: &http.Client{Timeout: 5 * time.Second},
		cacheTTL:   1 * time.Hour,
	}
}

func (s *FXRateService) GetRate(ctx context.Context) FXRate {
	s.mu.Lock()
	if s.cached != nil && time.Since(s.cachedAt) < s.cacheTTL {
		rate := *s.cached
		s.mu.Unlock()
		return rate
	}
	s.mu.Unlock()

	rate, err := s.fetchLiveRate(ctx)
	if err != nil {
		return FXRate{USDToEUR: fallbackUSDToEUR, IsLive: false}
	}

	s.mu.Lock()
	s.cached = &rate
	s.cachedAt = time.Now()
	s.mu.Unlock()

	return rate
}

type frankfurterResponse struct {
	Rates map[string]float64 `json:"rates"`
}

func (s *FXRateService) fetchLiveRate(ctx context.Context) (FXRate, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		"https://api.frankfurter.dev/v1/latest?from=USD&to=EUR", nil)
	if err != nil {
		return FXRate{}, err
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return FXRate{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return FXRate{}, fmt.Errorf("fx rate fetch: unexpected status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return FXRate{}, err
	}

	var parsed frankfurterResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return FXRate{}, err
	}

	rate, ok := parsed.Rates["EUR"]
	if !ok || rate <= 0 {
		return FXRate{}, fmt.Errorf("fx rate fetch: missing EUR rate")
	}

	return FXRate{USDToEUR: rate, IsLive: true}, nil
}
