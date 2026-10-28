# 6. Исходная модель данных

Модель описывает сущности MVP. Типы и индексы уточняются после выбора стека.

## 6.1. Пользователи и организации

| Сущность | Ключевые поля | Примечание |
|---|---|---|
| `User` | id, email, phone, mfa_enabled, status | Учётная запись, без привязки к роли |
| `Organization` | id, type (`state_body`, `court`, `bar_formation`, `agency`, `other`), name, verified_at | Ведомство, суд, адвокатское образование, бюро |
| `Membership` | user_id, organization_id, role, verified_by, verified_at, expires_at | Роль всегда в контексте организации; переводчик-фрилансер — в личном пространстве |
| `RoleClaim` | user_id, requested_role, method, evidence_ref, status | Заявка на роль до подтверждения |

## 6.2. Реестр

| Сущность | Ключевые поля | Примечание |
|---|---|---|
| `TranslatorProfile` | user_id, display_name, photo, region_id, city_id, remote, travel_ready, urgent_ready, summary | Публичная часть профиля |
| `FieldVisibility` | profile_id, field, level | Уровень раскрытия каждого поля (см. 2.5) |
| `LanguagePair` | profile_id, source_lang, target_lang, bidirectional, proficiency, verified | Коды ISO 639-3 |
| `Specialization` | profile_id, code | Справочник специализаций |
| `ServiceFormat` | profile_id, code | Письменный, устный, синхронный и т. д. |
| `Qualification` | profile_id, kind, title, issuer, year, verification_status | Образование, сертификаты, подготовка |
| `VerificationRecord` | profile_id, kind (`identity`, `documents`, `qualification`), status, reviewed_by, reviewed_at, valid_until | Независимые проверки |
| `AvailabilitySlot` | profile_id, starts_at, ends_at, kind (`available`, `busy`) | Занятость из подтверждённых привлечений не раскрывает содержания мероприятия |
| `Rate` | profile_id, service, amount, currency, visibility | Стоимость, если её показ разрешён |

## 6.3. Привлечение

| Сущность | Ключевые поля | Примечание |
|---|---|---|
| `EngagementRequest` | id, customer_user_id, customer_org_id, translator_profile_id, event_type, lang_pair, format, specialization, starts_at, duration, location (зашифровано), remote, urgency, requirements, internal_ref, status | Запрос заказчика |
| `RequestMessage` | request_id, author_id, body, created_at | Уточнения в рамках запроса |
| `Engagement` | id, request_id, confirmed_at, appointment_noted_at, outcome | Карточка привлечения |
| `Order` | id, translator_user_id, engagement_id (nullable), title, status, amount | Заказ в кабинете переводчика; может существовать без запроса из реестра |
| `CalendarEvent` | owner_user_id, engagement_id / order_id, starts_at, ends_at | У каждой стороны свой экземпляр |

## 6.4. Служебные сущности

| Сущность | Ключевые поля |
|---|---|
| `Notification` | user_id, kind, payload_ref, read_at |
| `AuditLog` | actor_id, organization_id, action, object_type, object_id, ip, at — только добавление записей |
| `Document` | owner_id, kind, storage_ref, sensitivity, retention_until |
