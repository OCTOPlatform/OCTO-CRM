package middleware

import (
	"net/http"
	"strings"

	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := ""
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
				tokenString = parts[1]
			}
		}

		// Fallback to query parameter "token" (useful for <img>, downloads, etc.)
		if tokenString == "" {
			tokenString = c.Query("token")
		}

		if tokenString == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, domain.ErrorResponse("Authentication token is required"))
			return
		}

		claims, err := utils.ValidateJWT(jwtSecret, tokenString)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, domain.ErrorResponse("Invalid or expired authentication token"))
			return
		}

		// Set context values
		c.Set("userID", claims.UserID)
		c.Set("userEmail", claims.Email)
		c.Set("userFullName", claims.FullName)

		c.Next()
	}
}
