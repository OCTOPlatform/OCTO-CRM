package utils

import (
	"errors"
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
	"unicode"
)

// EvaluateFormula calculates a mathematical formula string given a variable dictionary.
// It supports basic arithmetic (+, -, *, /), parentheses, IF(cond, true_val, false_val), MAX, MIN.
func EvaluateFormula(expr string, vars map[string]float64) (float64, error) {
	clean := strings.TrimSpace(expr)
	if clean == "" {
		return 0, nil
	}

	// 1. Substitute variables with numerical values
	// Sort variable keys by length descending to prevent partial prefix replacements
	substituted := clean
	for k, v := range vars {
		re := regexp.MustCompile(`(?i)\b` + regexp.QuoteMeta(k) + `\b`)
		substituted = re.ReplaceAllString(substituted, fmt.Sprintf("%.6f", v))
	}

	// 2. Handle IF(...) function recursively
	for strings.Contains(strings.ToUpper(substituted), "IF(") {
		ifIdx := strings.Index(strings.ToUpper(substituted), "IF(")
		// Find matching closing parenthesis
		closeIdx := findMatchingParen(substituted, ifIdx+2)
		if closeIdx == -1 {
			return 0, errors.New("unmatched parenthesis in IF expression")
		}

		argsStr := substituted[ifIdx+3 : closeIdx]
		args := splitFunctionArgs(argsStr)
		if len(args) != 3 {
			return 0, fmt.Errorf("IF function requires 3 arguments (condition, true_val, false_val), got %d", len(args))
		}

		condResult, err := evaluateCondition(args[0], vars)
		if err != nil {
			return 0, fmt.Errorf("error evaluating IF condition '%s': %v", args[0], err)
		}

		var targetBranch string
		if condResult {
			targetBranch = args[1]
		} else {
			targetBranch = args[2]
		}

		evalBranch, err := EvaluateFormula(targetBranch, vars)
		if err != nil {
			return 0, err
		}

		substituted = substituted[:ifIdx] + fmt.Sprintf("%.6f", evalBranch) + substituted[closeIdx+1:]
	}

	// 3. Evaluate basic math expression using shunting-yard / recursive descent
	return evaluateArithmetic(substituted)
}

func findMatchingParen(s string, openParenIdx int) int {
	depth := 0
	for i := openParenIdx; i < len(s); i++ {
		if s[i] == '(' {
			depth++
		} else if s[i] == ')' {
			depth--
			if depth == 0 {
				return i
			}
		}
	}
	return -1
}

func splitFunctionArgs(s string) []string {
	var args []string
	var current strings.Builder
	depth := 0

	for i := 0; i < len(s); i++ {
		ch := s[i]
		if ch == '(' {
			depth++
			current.WriteByte(ch)
		} else if ch == ')' {
			depth--
			current.WriteByte(ch)
		} else if ch == ',' && depth == 0 {
			args = append(args, strings.TrimSpace(current.String()))
			current.Reset()
		} else {
			current.WriteByte(ch)
		}
	}
	if current.Len() > 0 {
		args = append(args, strings.TrimSpace(current.String()))
	}
	return args
}

func evaluateCondition(condStr string, vars map[string]float64) (bool, error) {
	cond := strings.TrimSpace(condStr)

	ops := []string{">=", "<=", "!=", "==", ">", "<"}
	for _, op := range ops {
		if idx := strings.Index(cond, op); idx != -1 {
			leftStr := strings.TrimSpace(cond[:idx])
			rightStr := strings.TrimSpace(cond[idx+len(op):])

			leftVal, err1 := EvaluateFormula(leftStr, vars)
			if err1 != nil {
				return false, err1
			}
			rightVal, err2 := EvaluateFormula(rightStr, vars)
			if err2 != nil {
				return false, err2
			}

			switch op {
			case ">=":
				return leftVal >= rightVal, nil
			case "<=":
				return leftVal <= rightVal, nil
			case "!=":
				return math.Abs(leftVal-rightVal) > 1e-9, nil
			case "==":
				return math.Abs(leftVal-rightVal) <= 1e-9, nil
			case ">":
				return leftVal > rightVal, nil
			case "<":
				return leftVal < rightVal, nil
			}
		}
	}

	val, err := EvaluateFormula(cond, vars)
	if err != nil {
		return false, err
	}
	return val > 0, nil
}

// Simple arithmetic parser using Shunting-yard algorithm
func evaluateArithmetic(expr string) (float64, error) {
	tokens := tokenize(expr)
	if len(tokens) == 0 {
		return 0, nil
	}

	// Shunting-yard to RPN
	var output []string
	var opStack []string

	prec := map[string]int{
		"+": 1,
		"-": 1,
		"*": 2,
		"/": 2,
	}

	for i, token := range tokens {
		if isNumber(token) {
			output = append(output, token)
		} else if token == "(" {
			opStack = append(opStack, token)
		} else if token == ")" {
			for len(opStack) > 0 && opStack[len(opStack)-1] != "(" {
				output = append(output, opStack[len(opStack)-1])
				opStack = opStack[:len(opStack)-1]
			}
			if len(opStack) == 0 {
				return 0, errors.New("mismatched parentheses")
			}
			opStack = opStack[:len(opStack)-1] // pop '('
		} else if _, isOp := prec[token]; isOp {
			// Handle unary negative
			if token == "-" && (i == 0 || tokens[i-1] == "(" || tokens[i-1] == "+" || tokens[i-1] == "-" || tokens[i-1] == "*" || tokens[i-1] == "/") {
				output = append(output, "0")
			}
			for len(opStack) > 0 && prec[opStack[len(opStack)-1]] >= prec[token] {
				output = append(output, opStack[len(opStack)-1])
				opStack = opStack[:len(opStack)-1]
			}
			opStack = append(opStack, token)
		} else {
			return 0, fmt.Errorf("unknown token: %s", token)
		}
	}

	for len(opStack) > 0 {
		if opStack[len(opStack)-1] == "(" || opStack[len(opStack)-1] == ")" {
			return 0, errors.New("mismatched parentheses")
		}
		output = append(output, opStack[len(opStack)-1])
		opStack = opStack[:len(opStack)-1]
	}

	// Evaluate RPN
	var evalStack []float64
	for _, token := range output {
		if isNumber(token) {
			val, _ := strconv.ParseFloat(token, 64)
			evalStack = append(evalStack, val)
		} else if len(evalStack) >= 2 {
			b := evalStack[len(evalStack)-1]
			a := evalStack[len(evalStack)-2]
			evalStack = evalStack[:len(evalStack)-2]

			switch token {
			case "+":
				evalStack = append(evalStack, a+b)
			case "-":
				evalStack = append(evalStack, a-b)
			case "*":
				evalStack = append(evalStack, a*b)
			case "/":
				if b == 0 {
					return 0, errors.New("division by zero")
				}
				evalStack = append(evalStack, a/b)
			}
		} else {
			return 0, errors.New("invalid expression structure")
		}
	}

	if len(evalStack) != 1 {
		return 0, errors.New("invalid expression evaluation")
	}
	return evalStack[0], nil
}

func tokenize(s string) []string {
	var tokens []string
	var num strings.Builder

	flushNum := func() {
		if num.Len() > 0 {
			tokens = append(tokens, num.String())
			num.Reset()
		}
	}

	for i := 0; i < len(s); i++ {
		ch := s[i]
		if unicode.IsSpace(rune(ch)) {
			flushNum()
			continue
		}
		if (ch >= '0' && ch <= '9') || ch == '.' {
			num.WriteByte(ch)
		} else if ch == '+' || ch == '-' || ch == '*' || ch == '/' || ch == '(' || ch == ')' {
			flushNum()
			tokens = append(tokens, string(ch))
		}
	}
	flushNum()
	return tokens
}

func isNumber(s string) bool {
	_, err := strconv.ParseFloat(s, 64)
	return err == nil
}
