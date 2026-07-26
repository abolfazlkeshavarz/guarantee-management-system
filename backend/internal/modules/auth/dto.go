package auth

type LoginRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginResponse struct {
	Token     string   `json:"token"`
	TokenType string   `json:"token_type"`
	ExpiresIn int64    `json:"expires_in"`
	Admin     AdminDTO `json:"admin"`
}

type AdminDTO struct {
	ID        uint   `json:"id"`
	Username  string `json:"username"`
	FullName  string `json:"full_name"`
	Email     string `json:"email"`
	IsActive  bool   `json:"is_active"`
	CreatedAt string `json:"created_at"`
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

type AdminCreateRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Password string `json:"password" binding:"required,min=6"`
	FullName string `json:"full_name" binding:"required,max=100"`
	Email    string `json:"email" binding:"required,email"`
}

type AdminUpdateRequest struct {
	FullName string `json:"full_name" binding:"omitempty,max=100"`
	Email    string `json:"email" binding:"omitempty,email"`
	IsActive *bool  `json:"is_active"`
}