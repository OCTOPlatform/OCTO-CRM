package service

import (
	"octo-crm/backend/internal/domain"
	"octo-crm/backend/internal/repository"
)

type NotificationService struct {
	notificationRepo *repository.NotificationRepo
}

func NewNotificationService(notificationRepo *repository.NotificationRepo) *NotificationService {
	return &NotificationService{
		notificationRepo: notificationRepo,
	}
}

func (s *NotificationService) ListNotifications(workspaceID, userID string, limit int) (*domain.NotificationListResponse, error) {
	notifs, unreadCount, err := s.notificationRepo.ListNotifications(workspaceID, userID, limit)
	if err != nil {
		return nil, err
	}
	return &domain.NotificationListResponse{
		Notifications: notifs,
		UnreadCount:   unreadCount,
	}, nil
}

func (s *NotificationService) MarkAsRead(workspaceID, userID, notificationID string) error {
	return s.notificationRepo.MarkAsRead(workspaceID, userID, notificationID)
}

func (s *NotificationService) MarkAllAsRead(workspaceID, userID string) error {
	return s.notificationRepo.MarkAllAsRead(workspaceID, userID)
}

func (s *NotificationService) CreateNotification(n *domain.Notification) error {
	return s.notificationRepo.CreateNotification(n)
}
