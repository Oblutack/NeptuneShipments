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

// A real metric ton of crude oil is ~7.33 barrels for typical API
// gravity (~33-34°) - a genuine industry conversion constant, not
// something invented for this app. Bunker fuel (what ships actually
// burn) isn't priced 1:1 with crude, so this is an honest proxy derived
// from a real market signal, not a claim to match the actual bunker
// index (e.g. Ship & Bunker's VLSFO index, which isn't freely available).
const barrelsPerMetricTon = 7.33

// Used only if the live fetch fails - keeps the app working offline,
// clearly marked as a fallback wherever it's surfaced.
const fallbackPricePerTon = 600.0

type OilPriceService struct {
	httpClient *http.Client

	mu       sync.Mutex
	cached   *OilPrice
	cachedAt time.Time
	cacheTTL time.Duration
}

type OilPrice struct {
	PricePerBarrelUSD float64
	PricePerTonUSD    float64
	IsLive            bool // false if this is the hardcoded fallback
}

func NewOilPriceService() *OilPriceService {
	return &OilPriceService{
		httpClient: &http.Client{Timeout: 5 * time.Second},
		cacheTTL:   1 * time.Hour,
	}
}

// GetPrice returns the current WTI crude oil price, real and live where
// possible. Cached for an hour so this doesn't make an outbound HTTP call
// on every single finance stats request; falls back to a fixed constant
// (IsLive: false) if the upstream fetch fails for any reason - a 3rd
// party quote API going down should never break the finance page.
func (s *OilPriceService) GetPrice(ctx context.Context) OilPrice {
	s.mu.Lock()
	if s.cached != nil && time.Since(s.cachedAt) < s.cacheTTL {
		price := *s.cached
		s.mu.Unlock()
		return price
	}
	s.mu.Unlock()

	price, err := s.fetchLivePrice(ctx)
	if err != nil {
		return OilPrice{
			PricePerBarrelUSD: 0,
			PricePerTonUSD:    fallbackPricePerTon,
			IsLive:            false,
		}
	}

	s.mu.Lock()
	s.cached = &price
	s.cachedAt = time.Now()
	s.mu.Unlock()

	return price
}

type yahooChartResponse struct {
	Chart struct {
		Result []struct {
			Meta struct {
				RegularMarketPrice float64 `json:"regularMarketPrice"`
			} `json:"meta"`
		} `json:"result"`
	} `json:"chart"`
}

func (s *OilPriceService) fetchLivePrice(ctx context.Context) (OilPrice, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		"https://query1.finance.yahoo.com/v8/finance/chart/CL=F?interval=1d&range=1d", nil)
	if err != nil {
		return OilPrice{}, err
	}
	// Yahoo's public chart endpoint rejects requests with no user agent.
	req.Header.Set("User-Agent", "Mozilla/5.0")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return OilPrice{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return OilPrice{}, fmt.Errorf("oil price fetch: unexpected status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return OilPrice{}, err
	}

	var parsed yahooChartResponse
	if err := json.Unmarshal(body, &parsed); err != nil {
		return OilPrice{}, err
	}
	if len(parsed.Chart.Result) == 0 {
		return OilPrice{}, fmt.Errorf("oil price fetch: empty result")
	}

	perBarrel := parsed.Chart.Result[0].Meta.RegularMarketPrice
	if perBarrel <= 0 {
		return OilPrice{}, fmt.Errorf("oil price fetch: non-positive price")
	}

	return OilPrice{
		PricePerBarrelUSD: perBarrel,
		PricePerTonUSD:    perBarrel * barrelsPerMetricTon,
		IsLive:            true,
	}, nil
}
