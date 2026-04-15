# Flutter AI Chat Integration (Masahtak)

هذا الملف مخصص لربط شات الذكاء الاصطناعي من الباك إند داخل تطبيق Flutter.

## Endpoint

- **Base URL (Local):** `http://localhost:5000`
- **Route:** `POST /api/ai/chat`
- **Full URL:** `http://localhost:5000/api/ai/chat`

> في الإنتاج استبدل `localhost` بدومين الباك إند: `https://<your-domain>/api/ai/chat`.

---

## Request

### Headers

```http
Content-Type: application/json
```

### Body

```json
{
  "message": "I need a quiet space under 30 ILS",
  "lang": "en"
}
```

- `message`: مطلوب (string)
- `lang`: مطلوب (`ar` أو `en`)

---

## Response

```json
{
  "text": "Try Space A, quiet and affordable. [ACTION:space_123]"
}
```

- `text`: رد الذكاء الاصطناعي.
- عند ترشيح مساحة، يتم إرجاع `[ACTION:SPACE_ID]` داخل النص.

---

## Flutter (Dio) Service جاهز

```dart
import 'package:dio/dio.dart';

class FlutterAiService {
  FlutterAiService({required String baseUrl})
      : _dio = Dio(BaseOptions(
          baseUrl: baseUrl,
          headers: {'Content-Type': 'application/json'},
        ));

  final Dio _dio;

  Future<String> chat({
    required String message,
    required String lang, // ar | en
  }) async {
    final res = await _dio.post(
      '/api/ai/chat',
      data: {
        'message': message,
        'lang': lang,
      },
    );

    return (res.data['text'] ?? '').toString();
  }
}
```

---

## استخراج ACTION من الرد

```dart
String? extractSpaceActionId(String text) {
  final match = RegExp(r'\[ACTION:([^\]]+)\]').firstMatch(text);
  return match?.group(1);
}
```

مثال:
- Input: `"جرّب مساحة الهدوء [ACTION:space_123]"`
- Output: `space_123`

---

## مثال استخدام سريع داخل Flutter

```dart
final ai = FlutterAiService(baseUrl: 'http://localhost:5000');

final text = await ai.chat(
  message: 'أريد مساحة هادئة بسعر مناسب',
  lang: 'ar',
);

final actionId = extractSpaceActionId(text);
if (actionId != null) {
  // افتح صفحة تفاصيل المساحة أو نفّذ حجز مباشر
}
```

---

## ملاحظات مهمة

- الباك إند الحالي مبني بهيكل `Route -> Controller -> Service` بالفعل.
- الخدمة تقرأ بيانات المساحات من Firestore collection اسمها `spaces`.
- مفتاح Gemini يجب يكون في متغير بيئة:

```env
GEMINI_API_KEY=YOUR_KEY
```

- لا تضع المفتاح داخل Flutter إطلاقًا.
