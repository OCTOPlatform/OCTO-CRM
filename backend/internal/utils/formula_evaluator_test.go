package utils

import (
	"math"
	"testing"
)

func TestEvaluateFormula(t *testing.T) {
	vars := map[string]float64{
		"GAJI_POKOK":      5000000,
		"HARI_HADIR":     20,
		"TOTAL_OMSET_WON": 100000000,
		"TOTAL_JAM_LEMBUR": 5,
		"JUMLAH_TERLAMBAT": 2,
		"JUMLAH_DEAL_WON":  6,
	}

	tests := []struct {
		name     string
		expr     string
		expected float64
	}{
		{
			name:     "Basic addition and multiplication",
			expr:     "HARI_HADIR * 35000",
			expected: 700000,
		},
		{
			name:     "Commission calculation",
			expr:     "TOTAL_OMSET_WON * 0.03",
			expected: 3000000,
		},
		{
			name:     "Combined formula with precedence",
			expr:     "GAJI_POKOK + (HARI_HADIR * 35000) + (TOTAL_OMSET_WON * 0.02) - (JUMLAH_TERLAMBAT * 25000)",
			expected: 5000000 + 700000 + 2000000 - 50000, // 7650000
		},
		{
			name:     "Conditional IF true branch",
			expr:     "IF(JUMLAH_DEAL_WON >= 5, 1000000, 250000)",
			expected: 1000000,
		},
		{
			name:     "Conditional IF false branch",
			expr:     "IF(JUMLAH_DEAL_WON > 10, 2000000, 500000)",
			expected: 500000,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			res, err := EvaluateFormula(tc.expr, vars)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if math.Abs(res-tc.expected) > 1e-4 {
				t.Errorf("expected %f, got %f", tc.expected, res)
			}
		})
	}
}
