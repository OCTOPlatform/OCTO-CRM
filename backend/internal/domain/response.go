package domain

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Meta    interface{} `json:"meta,omitempty"`
}

type PaginationMeta struct {
	CurrentPage int `json:"current_page"`
	PerPage     int `json:"per_page"`
	TotalItems  int `json:"total_items"`
	TotalPages  int `json:"total_pages"`
}

func SuccessResponse(data interface{}, message ...string) APIResponse {
	msg := ""
	if len(message) > 0 {
		msg = message[0]
	}
	return APIResponse{
		Success: true,
		Message: msg,
		Data:    data,
	}
}

func PaginatedResponse(data interface{}, meta PaginationMeta, message ...string) APIResponse {
	msg := ""
	if len(message) > 0 {
		msg = message[0]
	}
	return APIResponse{
		Success: true,
		Message: msg,
		Data:    data,
		Meta:    meta,
	}
}

func ErrorResponse(err string) APIResponse {
	return APIResponse{
		Success: false,
		Error:   err,
	}
}
