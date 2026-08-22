package utils

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	AdminID      uint   `json:"admin_id,omitempty"`
	TechnicianID uint   `json:"technician_id,omitempty"`
	Username     string `json:"username"`
	// "admin", "technical" (staff, no delete) or "technician".
	Role         string `json:"role"`
	jwt.RegisteredClaims
}

// GenerateToken issues a staff token. role is "admin" or "technical".
func GenerateToken(adminID uint, username, role, secret string, expiration time.Duration) (string, int64, error) {
	if role == "" {
		role = "admin"
	}
	return generate(Claims{AdminID: adminID, Username: username, Role: role}, secret, expiration)
}

func GenerateTechnicianToken(techID uint, username, secret string, expiration time.Duration) (string, int64, error) {
	return generate(Claims{
		TechnicianID: techID,
		Username:     username,
		Role:         "technician",
	}, secret, expiration)
}

func generate(claims Claims, secret string, expiration time.Duration) (string, int64, error) {
	expiresAt := time.Now().Add(expiration)
	claims.RegisteredClaims = jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(expiresAt),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		NotBefore: jwt.NewNumericDate(time.Now()),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, &claims)
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", 0, err
	}
	return tokenString, int64(expiration.Seconds()), nil
}

func ValidateToken(tokenString, secret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}