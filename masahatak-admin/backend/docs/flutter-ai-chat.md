# Masahtak AI Chat API (Flutter Integration)

هذا الدليل يوضح رابط الشات وكيف تستخدمه داخل تطبيق Flutter.

## 1) رابط الـ API

### Local (أثناء التطوير)
- `http://localhost:5000/api/ai/chat`

### Production
- `https://<YOUR_BACKEND_DOMAIN>/api/ai/chat`

> إذا كان الـ backend منشور على Vercel بنفس إعدادات المشروع الحالية، استخدم دومين المشروع ثم أضف `/api/ai/chat`.

---

## 2) Method + Headers

- **Method:** `POST`
- **Content-Type:** `application/json`

---

## 3) Request Body

```json
{
  "message": "I need a quiet workspace under 30 ILS",
  "lang": "en"
}
```

- `message` (required): نص سؤال المستخدم.
- `lang` (required): `ar` أو `en`.

---

## 4) Response

```json
{
  "text": "Try Space A, quiet and affordable. [ACTION:space_123]"
}
```

- `text`: رد الذكاء الاصطناعي.
- إذا تم اقتراح مساحة، سيظهر تاغ الإجراء بهذا الشكل:
  - `[ACTION:SPACE_ID]`

---

## 5) Flutter Example (Dio)

```dart
import 'package:dio/dio.dart';

class AiChatApi {
  AiChatApi({required this.baseUrl})
      : _dio = Dio(BaseOptions(baseUrl: baseUrl));

  final Dio _dio;
  final String baseUrl; // مثال: https://your-backend.vercel.app

  Future<String> sendMessage({
    required String message,
    required String lang,
  }) async {
    final response = await _dio.post(
      '/api/ai/chat',
      data: {
        'message': message,
        'lang': lang, // 'ar' or 'en'
      },
      options: Options(
        headers: {
          'Content-Type': 'application/json',
        },
      ),
    );

    return (response.data['text'] ?? '').toString();
  }
}
```

---

## 6) استخراج SPACE_ID من ACTION tag

```dart
String? extractActionSpaceId(String text) {
  final regExp = RegExp(r'\[ACTION:([^\]]+)\]');
  final match = regExp.firstMatch(text);
  return match?.group(1);
}
```

مثال:
- Input: `"جرّب مساحة الهدوء [ACTION:space_123]"`
- Output: `space_123`

---

## 7) Quick Test (cURL)

```bash
curl -X POST "http://localhost:5000/api/ai/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "أريد مساحة هادئة بسعر مناسب",
    "lang": "ar"
  }'
```

---

## 8) ملاحظات مهمة

- الرابط النهائي داخل Flutter يكون:
  - `BASE_URL + /api/ai/chat`
- تأكد أن السيرفر فيه متغير البيئة:
  - `GEMINI_API_KEY`
- الردود محصورة في مجال حجز المساحات فقط ومبنية على بيانات Firestore (`spaces`).
