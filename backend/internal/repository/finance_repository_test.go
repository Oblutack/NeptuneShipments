package repository

import "testing"

func TestClampPercent(t *testing.T) {
	cases := []struct {
		name              string
		v, min, max, want float64
	}{
		{"within range passes through", 5, -10, 10, 5},
		{"below min clamps to min", -20, -10, 10, -10},
		{"above max clamps to max", 50, -10, 10, 10},
		{"exactly at min boundary", -10, -10, 10, -10},
		{"exactly at max boundary", 10, -10, 10, 10},
		{"BAF band real-world case", 20.99, -20, 40, 20.99},
		{"CAF band real-world case", -1.7, -5, 10, -1.7},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := clampPercent(tc.v, tc.min, tc.max)
			if got != tc.want {
				t.Errorf("clampPercent(%v, %v, %v) = %v, want %v", tc.v, tc.min, tc.max, got, tc.want)
			}
		})
	}
}
