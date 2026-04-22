# Notifications API (Admin)

This document explains notification shapes and endpoints used by the admin backend.

## Base URL

- Local: `http://localhost:5000/api`
- Production: `{YOUR_DOMAIN}/api`

## Authentication

All endpoints below require admin JWT in header:

`Authorization: Bearer <ADMIN_JWT_TOKEN>`

Get token from:

- `POST /api/auth/login`

---

## 1) Create in-app notification record

### Endpoint

- `POST /api/notifications/send`

### Purpose

Create a notification document in Firestore `notifications` collection.

### Request body

```json
{
  "userId": "USER_UID",
  "title": "Booking Confirmed",
  "message": "Your booking has been confirmed",
  "type": "booking_confirmed"
}
```

### Validation rules

- `userId` required
- `title` required
- `message` required
- `type` optional (`general` by default)

### Success response

```json
{
  "success": true,
  "notificationId": "FIRESTORE_DOC_ID",
  "message": "Notification sent successfully"
}
```

---

## 2) Send push notification (FCM)

### Endpoint

- `POST /api/notifications/push`

### Purpose

Send push notification to a specific user UID through FCM tokens.

### Request body

```json
{
  "uid": "USER_UID",
  "title": "Booking Updated",
  "body": "Your booking is now active.",
  "data": {
    "bookingId": "BOOKING_ID",
    "type": "booking_active"
  }
}
```

### Validation rules

- `uid` required
- `title` required
- `body` required
- `data` optional object

### Success response

```json
{
  "success": true,
  "result": {
    "success": true,
    "sentCount": 1,
    "failureCount": 0,
    "invalidTokensRemoved": 0
  }
}
```

---

## Suggested notification shape

Use the following standard fields:

```json
{
  "type": "booking_confirmed | booking_cancelled | booking_active | general",
  "title": "Short title",
  "message": "In-app text",
  "body": "Push text (FCM)",
  "data": {
    "bookingId": "optional",
    "workspaceId": "optional",
    "deepLink": "optional"
  }
}
```

---

## Postman quick test

### Step A - Login

1. `POST {{baseUrl}}/auth/login`
2. Body:

```json
{
  "email": "admin@example.com",
  "password": "your-password"
}
```

3. Copy `token` from response.

### Step B - Create in-app notification

1. `POST {{baseUrl}}/notifications/send`
2. Headers:
   - `Authorization: Bearer {{token}}`
   - `Content-Type: application/json`
3. Body: use payload from section (1).

### Step C - Send push notification

1. `POST {{baseUrl}}/notifications/push`
2. Headers:
   - `Authorization: Bearer {{token}}`
   - `Content-Type: application/json`
3. Body: use payload from section (2).

