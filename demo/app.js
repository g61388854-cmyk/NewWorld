// Демонстрационная версия NewWorld: работает без сервера, состояние хранится в localStorage.
// Правила доступа и статусы запросов повторяют src/lib/policy.ts и src/lib/request-flow.ts.
"use strict";

/* ---------- Справочники ---------- */

const LANGUAGES = {
  rus: "Русский", che: "Чеченский", inh: "Ингушский", ava: "Аварский", dar: "Даргинский", lez: "Лезгинский",
  kbd: "Кабардино-черкесский", oss: "Осетинский", tat: "Татарский", bak: "Башкирский", sah: "Якутский",
  kaz: "Казахский", uzb: "Узбекский", tgk: "Таджикский", kir: "Киргизский", aze: "Азербайджанский",
  hye: "Армянский", kat: "Грузинский", ukr: "Украинский", eng: "Английский", deu: "Немецкий",
  fra: "Французский", spa: "Испанский", tur: "Турецкий", ara: "Арабский", fas: "Персидский",
  zho: "Китайский", kor: "Корейский", vie: "Вьетнамский", rsl: "Русский жестовый",
};
const SPECIALIZATIONS = {
  criminal: "Уголовное судопроизводство", civil: "Гражданское судопроизводство",
  administrative: "Административное судопроизводство", legal: "Юридический перевод",
  medical: "Медицинский перевод", technical: "Технический перевод", personal_docs: "Перевод личных документов",
  business: "Деловые переговоры", simultaneous: "Синхронный перевод", sign: "Сурдоперевод",
};
const FORMATS = {
  written: "Письменный перевод", consecutive: "Устный последовательный перевод", simultaneous: "Синхронный перевод",
  remote: "Дистанционное участие", onsite: "Очное участие", layout: "Перевод документов с сохранением оформления",
};
const EVENT_TYPES = {
  interrogation: "Допрос", confrontation: "Очная ставка", identification: "Предъявление для опознания",
  on_site_check: "Проверка показаний на месте", other_investigative: "Иное следственное действие",
  court_hearing: "Судебное заседание", advocate_meeting: "Встреча адвоката с доверителем",
  documents: "Перевод документов", other: "Иное мероприятие",
};
const REGIONS = [
  "Республика Адыгея", "Республика Алтай", "Республика Башкортостан", "Республика Бурятия", "Республика Дагестан",
  "Донецкая Народная Республика", "Республика Ингушетия", "Кабардино-Балкарская Республика", "Республика Калмыкия",
  "Карачаево-Черкесская Республика", "Республика Карелия", "Республика Коми", "Республика Крым",
  "Луганская Народная Республика", "Республика Марий Эл", "Республика Мордовия", "Республика Саха (Якутия)",
  "Республика Северная Осетия — Алания", "Республика Татарстан", "Республика Тыва", "Удмуртская Республика",
  "Республика Хакасия", "Чеченская Республика", "Чувашская Республика", "Алтайский край", "Забайкальский край",
  "Камчатский край", "Краснодарский край", "Красноярский край", "Пермский край", "Приморский край",
  "Ставропольский край", "Хабаровский край", "Амурская область", "Архангельская область", "Астраханская область",
  "Белгородская область", "Брянская область", "Владимирская область", "Волгоградская область", "Вологодская область",
  "Воронежская область", "Запорожская область", "Ивановская область", "Иркутская область", "Калининградская область",
  "Калужская область", "Кемеровская область — Кузбасс", "Кировская область", "Костромская область",
  "Курганская область", "Курская область", "Ленинградская область", "Липецкая область", "Магаданская область",
  "Московская область", "Мурманская область", "Нижегородская область", "Новгородская область",
  "Новосибирская область", "Омская область", "Оренбургская область", "Орловская область", "Пензенская область",
  "Псковская область", "Ростовская область", "Рязанская область", "Самарская область", "Саратовская область",
  "Сахалинская область", "Свердловская область", "Смоленская область", "Тамбовская область", "Тверская область",
  "Томская область", "Тульская область", "Тюменская область", "Ульяновская область", "Херсонская область",
  "Челябинская область", "Ярославская область", "Москва", "Санкт-Петербург", "Севастополь",
  "Еврейская автономная область", "Ненецкий автономный округ", "Ханты-Мансийский автономный округ — Югра",
  "Чукотский автономный округ", "Ямало-Ненецкий автономный округ",
];
const VISIBILITY_LABELS = {
  PUBLIC: "Все пользователи",
  VERIFIED_CUSTOMERS: "Подтверждённые заказчики",
  STATE_ONLY: "Только государственные органы и суды",
  ENGAGEMENT: "Только после подтверждения участия",
  PRIVATE: "Только владелец профиля",
};
const CONFIGURABLE = {
  city: ["Город", "VERIFIED_CUSTOMERS"],
  summary: ["Профессиональная информация", "PUBLIC"],
  experienceYears: ["Опыт работы", "VERIFIED_CUSTOMERS"],
  qualifications: ["Квалификация", "VERIFIED_CUSTOMERS"],
  rateInfo: ["Стоимость услуг", "PRIVATE"],
  contactPhone: ["Телефон", "ENGAGEMENT"],
};
const STATUS_LABELS = {
  DRAFT: "Черновик", SENT: "Отправлен", AWAITING_RESPONSE: "Ожидает ответа",
  CLARIFICATION_REQUESTED: "Запрошены уточнения", CONFIRMED: "Специалист подтвердил возможность участия",
  DECLINED: "Отклонён", CANCELLED: "Отменён", COMPLETED: "Завершён",
};
const STATUS_TONE = {
  DRAFT: "", SENT: "accent", AWAITING_RESPONSE: "accent", CLARIFICATION_REQUESTED: "warn",
  CONFIRMED: "good", DECLINED: "bad", CANCELLED: "", COMPLETED: "good",
};
const TRANSITIONS = {
  send: ["customer", ["DRAFT"], "SENT"],
  open: ["translator", ["SENT"], "AWAITING_RESPONSE"],
  confirm: ["translator", ["SENT", "AWAITING_RESPONSE"], "CONFIRMED"],
  decline: ["translator", ["SENT", "AWAITING_RESPONSE", "CLARIFICATION_REQUESTED"], "DECLINED"],
  clarify: ["translator", ["SENT", "AWAITING_RESPONSE"], "CLARIFICATION_REQUESTED"],
  answer: ["customer", ["CLARIFICATION_REQUESTED"], "AWAITING_RESPONSE"],
  cancel: ["customer", ["DRAFT", "SENT", "AWAITING_RESPONSE", "CLARIFICATION_REQUESTED", "CONFIRMED"], "CANCELLED"],
  complete: ["customer", ["CONFIRMED"], "COMPLETED"],
};
const ACTION_LABELS = {
  send: "Отправить специалисту", confirm: "Подтвердить возможность участия", decline: "Отказать",
  clarify: "Запросить уточнения", answer: "Ответить на уточнение", cancel: "Отменить запрос",
  complete: "Отметить мероприятие проведённым",
};
const OPEN = ["SENT", "AWAITING_RESPONSE", "CLARIFICATION_REQUESTED"];

/* ---------- Демо-данные ---------- */

const USERS = {
  investigator: { name: "Иван Демонстрационный", role: "Следователь", org: "Демонстрационный следственный отдел", state: true },
  pending: { name: "Пётр Ожидающий", role: "Дознаватель", org: "Демонстрационный отдел дознания", state: true },
  translator: { name: "Хеда Демонстрационная", role: "Переводчик", profileId: "t1" },
  admin: { name: "Администратор платформы", role: "Администратор платформы" },
};

function profile(id, name, region, city, pairs, specs, formats, opts = {}) {
  return {
    id, name, region, city, pairs, specs, formats,
    summary: opts.summary || "Демонстрационный профиль. Сведения вымышлены.",
    experienceYears: opts.exp ?? 6,
    qualifications: opts.quals || [{ kind: "Образование", title: "Диплом о высшем лингвистическом образовании (демо)", verified: !!opts.verified }],
    rateInfo: opts.rate || "По договорённости",
    contactPhone: "+7 000 000-00-0" + id.slice(1),
    check: opts.check || "none",
    urgent: !!opts.urgent, travel: opts.travel ?? true, remote: formats.includes("remote"),
    slots: opts.slots || [[0, 14]],
    visibility: {},
  };
}

const PROFILES = [
  profile("t1", "Хеда Демонстрационная", "Чеченская Республика", "Грозный", [["che", "rus", true, "Родной"]],
    ["criminal", "legal", "personal_docs"], ["written", "consecutive", "onsite", "remote"], { check: "documents", urgent: true, verified: true, exp: 9 }),
  profile("t2", "Магомед Примеров", "Республика Дагестан", "Махачкала", [["ava", "rus", true, "Родной"], ["che", "rus", true, "Свободный"]],
    ["criminal", "civil"], ["consecutive", "onsite"], { slots: [[2, 10]] }),
  profile("t3", "Елена Образцова", "Москва", "Москва", [["eng", "rus", true, "Профессиональный"], ["deu", "rus", false, "Профессиональный"]],
    ["legal", "business", "simultaneous"], ["written", "simultaneous", "remote", "layout"], { check: "qualification", verified: true, slots: [], exp: 15 }),
  profile("t4", "Зарема Условная", "Республика Ингушетия", "Магас", [["inh", "rus", true, "Родной"], ["che", "rus", true, "Свободный"]],
    ["criminal", "administrative", "personal_docs"], ["written", "consecutive", "onsite"], { check: "identity", urgent: true, slots: [[1, 20]] }),
  profile("t5", "Фарход Вымышленный", "Московская область", "Подольск", [["uzb", "rus", true, "Родной"], ["tgk", "rus", true, "Свободный"]],
    ["criminal", "civil", "personal_docs"], ["consecutive", "onsite", "remote"], { check: "documents", verified: true, urgent: true }),
  profile("t6", "Арсен Пробный", "Краснодарский край", "Краснодар", [["hye", "rus", true, "Родной"], ["kat", "rus", true, "Профессиональный"]],
    ["legal", "civil", "business"], ["written", "consecutive", "remote"], { slots: [[3, 6]] }),
  profile("t7", "Наталья Тестова", "Санкт-Петербург", "Санкт-Петербург", [["rsl", "rus", true, "Профессиональный"]],
    ["sign", "criminal", "civil"], ["consecutive", "onsite"], { check: "qualification", verified: true }),
  profile("t8", "Ирина Макетова", "Приморский край", "Владивосток", [["zho", "rus", true, "Профессиональный"], ["kor", "rus", false, "Свободный"]],
    ["business", "technical", "legal"], ["written", "consecutive", "remote", "layout"], { check: "identity" }),
];

const STORAGE_KEY = "newworld-demo-v1";

function freshState() {
  return {
    role: null,
    pendingStatus: "PENDING",
    visibility: {},
    requests: [],
    notifications: { investigator: [], pending: [], translator: [], admin: [] },
    audit: [],
    nextId: 1,
  };
}

let S = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return Object.assign(freshState(), JSON.parse(raw));
  } catch (e) { /* хранилище недоступно — работа без сохранения */ }
  return freshState();
})();

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); } catch (e) { /* без сохранения */ }
}

/* ---------- Утилиты ---------- */

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lang = (c) => LANGUAGES[c] || c;
const pairText = (p) => `${lang(p[0])} ${p[2] ? "↔" : "→"} ${lang(p[1])}`;
const opts = (dict, selected, placeholder) =>
  (placeholder !== undefined ? `<option value="">${esc(placeholder)}</option>` : "") +
  Object.entries(dict).map(([k, v]) => `<option value="${k}"${k === selected ? " selected" : ""}>${esc(v)}</option>`).join("");
const regionOpts = (selected, placeholder) =>
  (placeholder !== undefined ? `<option value="">${esc(placeholder)}</option>` : "") +
  REGIONS.map((r) => `<option${r === selected ? " selected" : ""}>${esc(r)}</option>`).join("");
const initials = (n) => n.split(/\s+/).slice(0, 2).map((p) => p[0]).join("");
const dayOffset = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d; };
const fmt = (iso) => new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
const fmtDay = (d) => d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
const getProfile = (id) => PROFILES.find((p) => p.id === id);
const me = () => USERS[S.role];
const isCustomer = () => S.role === "investigator" || S.role === "pending";
const canRequest = () => S.role === "investigator" || (S.role === "pending" && S.pendingStatus === "ACTIVE");

function notify(user, title, link) {
  S.notifications[user].unshift({ title, link, at: new Date().toISOString(), read: false });
}
function audit(action, object) {
  S.audit.unshift({ at: new Date().toISOString(), actor: me() ? me().name : "—", action, object });
}

/* ---------- Правила раскрытия (как в src/lib/policy.ts) ---------- */

function visibility(p, field) {
  const own = S.visibility[p.id] || {};
  return own[field] || CONFIGURABLE[field][1];
}
function hasEngagement(p) {
  return S.requests.some((r) => r.customer === S.role && r.profileId === p.id && (r.status === "CONFIRMED" || r.status === "COMPLETED"));
}
function levels(p) {
  const l = new Set(["PUBLIC"]);
  if (S.role === "admin") { l.add("VERIFIED_CUSTOMERS"); l.add("STATE_ONLY"); return l; }
  if (!canRequest()) return l;
  l.add("VERIFIED_CUSTOMERS");
  if (me().state) l.add("STATE_ONLY");
  if (hasEngagement(p)) l.add("ENGAGEMENT");
  return l;
}
function visible(p, field) {
  if (S.role === "translator" && me().profileId === p.id) return true;
  return levels(p).has(visibility(p, field));
}
const HIDDEN = '<span class="muted">Сведения не раскрываются для текущей категории пользователей</span>';

function checkLabel(p) {
  return {
    qualification: ["Квалификация подтверждена в установленном порядке", "good"],
    documents: ["Документы проверены", "good"],
    identity: ["Личность подтверждена", "good"],
    none: ["Профиль не проверен", ""],
  }[p.check];
}
function availability(p) {
  if (!p.slots.length) return "Доступность уточняется";
  const [from] = p.slots[0];
  if (from <= 0) return "Доступен сейчас";
  return "Ближайшая доступность: " + fmtDay(dayOffset(from));
}
function availableOn(p, dateStr) {
  const d = new Date(dateStr + "T12:00");
  return p.slots.some(([a, b]) => d >= dayOffset(a) && d < dayOffset(b + 1));
}

/* ---------- Каркас ---------- */

const root = document.getElementById("root");

function nav() {
  const unread = S.notifications[S.role].filter((n) => !n.read).length;
  let items;
  if (S.role === "translator") {
    const incoming = S.requests.filter((r) => r.profileId === "t1" && (r.status === "SENT" || r.status === "AWAITING_RESPONSE")).length;
    items = [["/app", "Рабочий стол"], ["/app/requests", "Запросы", incoming], ["/app/orders", "Заказы"], ["/app/calendar", "Календарь"],
      ["/app/profile", "Мой профиль"], ["/app/notifications", "Уведомления", unread]];
  } else if (S.role === "admin") {
    items = [["/app", "Рабочий стол"], ["/app/admin/memberships", "Заявки на роль", S.pendingStatus === "PENDING" ? 1 : 0],
      ["/app/search", "Реестр"], ["/app/admin/audit", "Журнал действий"], ["/app/notifications", "Уведомления", unread]];
  } else {
    items = [["/app", "Рабочий стол"], ["/app/search", "Найти переводчика"], ["/app/requests", "Мои запросы"],
      ["/app/calendar", "Мероприятия"], ["/app/notifications", "Уведомления", unread]];
  }
  const path = route().path;
  return items.map(([href, label, count]) => {
    const active = href === "/app" ? path === "/app" : path === href || path.startsWith(href + "/");
    return `<a href="#${href}" class="${active ? "active" : ""}"><span>${label}</span>${count ? `<span class="count">${count}</span>` : ""}</a>`;
  }).join("");
}

function shell(content) {
  return `<div class="shell">
    <aside class="sidebar">
      <a href="#/app" class="brand">NewWorld</a>
      <nav class="nav">${nav()}<a href="#/login" class="mobile-only"><span>Сменить роль</span></a></nav>
      <div class="sidebar-foot">
        <div style="font-weight:600">${esc(me().name)}</div>
        <div class="muted">${esc(me().role)}</div>
        <a href="#/login" style="display:inline-block;margin-top:8px">Сменить роль</a>
      </div>
    </aside>
    <main class="main">${content}</main>
  </div>`;
}

function head(title, subtitle, right = "") {
  return `<div class="page-head row between"><div><h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</div>${right}</div>`;
}
const badge = (status) => `<span class="badge ${STATUS_TONE[status]}">${STATUS_LABELS[status]}</span>`;

let flash = null;
function flashHtml() {
  if (!flash) return "";
  const html = `<div class="flash ${flash[1]}">${esc(flash[0])}</div>`;
  flash = null;
  return html;
}

function route() {
  const raw = location.hash.replace(/^#/, "") || "/";
  const [path, query = ""] = raw.split("?");
  return { path, params: Object.fromEntries(new URLSearchParams(query)) };
}
function go(path, message, kind = "ok") {
  if (message) flash = [message, kind];
  if (location.hash === "#" + path) render(); else location.hash = path;
}

/* ---------- Страницы ---------- */

function landing() {
  return `<header class="public-top"><a href="#/" class="brand">NewWorld</a>
      <div class="row">${S.role ? '<a href="#/app" class="btn">Открыть кабинет</a>' : '<a href="#/login" class="btn">Вход в демо</a>'}</div></header>
    <section class="hero">
      <h1>Реестр переводчиков для юридической сферы</h1>
      <p>Поиск специалистов по языку, квалификации, региону и доступности. Согласование участия переводчика в следственных действиях, судебных заседаниях и встречах с доверителем.</p>
      <div class="row" style="justify-content:center"><a href="#/login" class="btn large">Попробовать демо</a></div>
    </section>
    <section class="features">
      <div class="grid-3">
        <div class="card"><h3>Профессиональный реестр</h3><p class="muted">Языковые пары, специализация, подтверждённая квалификация и доступность каждого специалиста.</p></div>
        <div class="card"><h3>Запрос на привлечение</h3><p class="muted">Для подбора достаточно языковой пары, даты, формата и типа мероприятия. Материалы дела не передаются.</p></div>
        <div class="card"><h3>Разграничение доступа</h3><p class="muted">Полномочия заказчиков проверяются, сведения профиля раскрываются в объёме, выбранном переводчиком, действия фиксируются в журнале.</p></div>
      </div>
      <div class="card" style="margin-top:16px"><h3>Правовой статус взаимодействия</h3>
        <p class="muted">Подтверждение переводчиком возможности участия не заменяет процессуального решения о назначении переводчика (ст. 59 УПК РФ, ст. 162 ГПК РФ, ст. 57 АПК РФ, ст. 52 КАС РФ, ст. 25.10 КоАП РФ). Статус проверки профиля на платформе не означает допуска к участию в конкретном процессуальном действии.</p></div>
    </section>
    <footer class="footer">NewWorld · демонстрационная версия</footer>`;
}

function login() {
  const card = (role, text) => `<button class="card role-card" data-action="login" data-role="${role}">
      <h3>${esc(USERS[role].role)}</h3><div>${esc(USERS[role].name)}</div><p class="muted small" style="margin-top:8px">${text}</p></button>`;
  return `<div class="auth-wrap" style="max-width:760px">
    <a href="#/" class="brand" style="padding:0 0 20px">NewWorld</a>
    <h1>Вход в демонстрационную версию</h1>
    <p class="muted">Выбор роли заменяет вход. В рабочей версии для государственных органов и администратора дополнительно требуется код из приложения-аутентификатора.</p>
    <div class="role-grid">
      ${card("investigator", "Полномочия подтверждены: поиск переводчиков и направление запросов.")}
      ${card("translator", "Профиль в реестре, входящие запросы, заказы и календарь.")}
      ${card("pending", S.pendingStatus === "ACTIVE" ? "Полномочия подтверждены администратором." : "Заявка на рассмотрении: доступна только публичная часть реестра.")}
      ${card("admin", "Рассмотрение заявок на роль, реестр и журнал действий.")}
    </div>
    <p class="muted small" style="margin-top:16px">Сценарий для проверки: следователь находит переводчика чеченского языка и направляет запрос, затем переводчик подтверждает участие.</p>
  </div>`;
}

function dashboard() {
  if (S.role === "translator") {
    const incoming = S.requests.filter((r) => r.profileId === "t1" && OPEN.includes(r.status));
    return head(`Здравствуйте, ${me().name.split(" ")[0]}`, "Рабочий стол переводчика") + flashHtml() +
      `<div class="grid-3">
        <div class="card"><div class="muted small">Новые запросы</div><div class="stat">${incoming.length}</div></div>
        <div class="card"><div class="muted small">Статус профиля</div><div style="margin-top:8px"><span class="badge good">Документы проверены</span></div></div>
        <div class="card"><div class="muted small">Подтверждённые мероприятия</div><div class="stat">${events().length}</div></div>
      </div>
      <div class="grid-2" style="margin-top:16px">
        <div class="card"><h2>Запросы, ожидающие ответа</h2>${requestList(incoming, "Новых запросов нет. Войдите как следователь и направьте запрос.")}</div>
        ${eventsCard()}
      </div>`;
  }
  if (S.role === "admin") {
    return head("Панель администратора", "Проверка профилей, полномочий и журнал действий") + flashHtml() +
      `<div class="grid-3">
        <a href="#/app/admin/memberships" class="card"><div class="muted small">Заявки на роль</div><div class="stat">${S.pendingStatus === "PENDING" ? 1 : 0}</div></a>
        <a href="#/app/search" class="card"><div class="muted small">Профили в реестре</div><div class="stat">${PROFILES.length}</div></a>
        <a href="#/app/admin/audit" class="card"><div class="muted small">Записей в журнале</div><div class="stat">${S.audit.length}</div></a>
      </div>`;
  }
  const mine = S.requests.filter((r) => r.customer === S.role);
  const assigned = mine.filter((r) => r.status === "CONFIRMED");
  return head("Добро пожаловать", me().org, '<a href="#/app/search" class="btn large">Найти переводчика</a>') + flashHtml() +
    (S.role === "pending" && S.pendingStatus !== "ACTIVE"
      ? '<div class="notice">Заявка на подтверждение полномочий находится на рассмотрении. До её одобрения доступен просмотр публичной части реестра, направление запросов недоступно. Одобрить заявку можно в роли администратора.</div>' : "") +
    `<div class="grid-2">
      <div class="card"><div class="muted small">Ожидают ответа</div><div class="stat">${mine.filter((r) => OPEN.includes(r.status)).length}</div></div>
      <div class="card"><div class="muted small">Назначенные специалисты</div>${assigned.length ? requestList(assigned) : '<div class="stat">0</div>'}</div>
    </div>
    <div class="grid-2" style="margin-top:16px">${eventsCard()}<div class="card"><h2>Последние запросы</h2>${requestList(mine.slice(0, 5), "Запросов пока нет.")}</div></div>`;
}

function requestList(list, empty = "Нет.") {
  if (!list.length) return `<p class="muted">${empty}</p>`;
  return `<ul class="list">${list.map((r) => `<li><div class="row between"><a href="#/app/requests/${r.id}">${esc(S.role === "translator" ? EVENT_TYPES[r.eventType] : getProfile(r.profileId).name)}</a>${badge(r.status)}</div>
    <div class="muted small">${esc(EVENT_TYPES[r.eventType])} · ${lang(r.src)} → ${lang(r.tgt)} · ${fmt(r.startsAt)}</div></li>`).join("")}</ul>`;
}

function events() {
  return S.requests
    .filter((r) => r.status === "CONFIRMED" && (S.role === "translator" ? r.profileId === "t1" : r.customer === S.role))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}
function eventsCard() {
  const list = events();
  return `<div class="card"><h2>Ближайшие мероприятия</h2>${list.length ? `<ul class="list">${list.map((r) => `<li><a href="#/app/requests/${r.id}">${esc(EVENT_TYPES[r.eventType])} — перевод${S.role === "translator" ? "" : ": " + esc(getProfile(r.profileId).name)}</a><div class="muted small">${fmt(r.startsAt)}</div></li>`).join("")}</ul>` : '<p class="muted">Запланированных мероприятий нет.</p>'}</div>`;
}

function search(params) {
  if (S.role === "translator") return go("/app/profile");
  const f = params;
  const results = PROFILES.filter((p) => {
    if (f.source || f.target) {
      const match = p.pairs.some(([s, t, bi]) =>
        (!f.source || s === f.source || (bi && t === f.source)) &&
        (!f.target || t === f.target || (bi && s === f.target)) &&
        (!(f.source && f.target) || (s === f.source && t === f.target) || (bi && s === f.target && t === f.source)));
      if (!match) return false;
    }
    if (f.region && p.region !== f.region) return false;
    if (f.specialization && !p.specs.includes(f.specialization)) return false;
    if (f.format && !p.formats.includes(f.format)) return false;
    if (f.date && !availableOn(p, f.date)) return false;
    if (f.urgent && !p.urgent) return false;
    if (f.travel && !p.travel) return false;
    if (f.verified && p.check === "none") return false;
    if (f.now && !(p.slots.length && p.slots[0][0] <= 0)) return false;
    return true;
  });
  const rank = { qualification: 3, documents: 2, identity: 1, none: 0 };
  results.sort((a, b) => rank[b.check] - rank[a.check] || a.name.localeCompare(b.name, "ru"));
  const more = f.urgent || f.travel || f.verified || f.now;
  return head("Найти переводчика", "Поиск специалистов по языку, квалификации и региону") + flashHtml() +
    (isCustomer() && !canRequest() ? '<div class="notice">Полномочия ещё не подтверждены: доступна публичная часть реестра, направление запросов недоступно.</div>' : "") +
    `<form class="card" data-form="search">
      <div class="filters">
        <div><label>Исходный язык</label><select name="source">${opts(LANGUAGES, f.source, "Любой")}</select></div>
        <div><label>Целевой язык</label><select name="target">${opts(LANGUAGES, f.target, "Любой")}</select></div>
        <div><label>Регион</label><select name="region">${regionOpts(f.region, "Любой")}</select></div>
        <div><label>Специализация</label><select name="specialization">${opts(SPECIALIZATIONS, f.specialization, "Любая")}</select></div>
        <div><label>Формат работы</label><select name="format">${opts(FORMATS, f.format, "Любой")}</select></div>
        <div><label>Дата</label><input type="date" name="date" value="${esc(f.date || "")}"></div>
      </div>
      <details class="more"${more ? " open" : ""}><summary>Дополнительные фильтры</summary>
        <div class="grid-2" style="margin-top:8px">
          <div>
            <label class="check"><input type="checkbox" name="now"${f.now ? " checked" : ""}> Доступен сейчас</label>
            <label class="check"><input type="checkbox" name="urgent"${f.urgent ? " checked" : ""}> Возможность срочного привлечения</label>
          </div>
          <div>
            <label class="check"><input type="checkbox" name="travel"${f.travel ? " checked" : ""}> Готовность к выезду</label>
            <label class="check"><input type="checkbox" name="verified"${f.verified ? " checked" : ""}> Только проверенные профили</label>
          </div>
        </div>
      </details>
      <div class="row between" style="margin-top:8px"><a href="#/app/search" class="small">Сбросить</a><button class="btn" type="submit">Найти</button></div>
    </form>
    <p class="muted" style="margin:20px 0 12px">Найдено специалистов: ${results.length}</p>
    <div class="stack">${results.map((p) => {
      const [label, tone] = checkLabel(p);
      return `<div class="card result">
        <div class="avatar">${esc(initials(p.name))}</div>
        <div class="meta">
          <div class="row"><h3 style="margin:0">${esc(p.name)}</h3><span class="badge ${tone}">${label}</span></div>
          <div>${p.pairs.map(pairText).join(", ")}</div>
          <div class="muted">${p.formats.map((x) => FORMATS[x]).join(", ")}</div>
          <div class="muted">${p.specs.map((x) => SPECIALIZATIONS[x]).join(", ")}</div>
          <div class="muted">Регион: ${esc(p.region)}${visible(p, "city") ? ", " + esc(p.city) : ""}</div>
          <div class="muted">${availability(p)}</div>
        </div>
        <div class="actions">
          <a href="#/app/t/${p.id}" class="btn secondary">Профиль</a>
          ${canRequest() ? `<a href="#/app/t/${p.id}/request" class="btn">Запросить переводчика</a>` : ""}
        </div>
      </div>`;
    }).join("")}</div>`;
}

function profilePage(id, params) {
  const p = getProfile(id);
  if (!p) return notFound();
  const own = S.role === "translator" && me().profileId === p.id;
  if (S.role === "translator" && !own) return notFound();
  if (!own) { audit("Просмотр профиля переводчика", p.name); save(); }
  const tabs = [["overview", "Обзор"], ["languages", "Языки"], ["qualification", "Квалификация"], ["services", "Услуги"], ["availability", "Доступность"], ["documents", "Документы"]];
  const tab = tabs.some(([k]) => k === params.tab) ? params.tab : "overview";
  const [label, tone] = checkLabel(p);
  const show = (field, value) => (visible(p, field) ? value : HIDDEN);
  let body = "";
  if (tab === "overview") body = `<dl class="props">
      <dt>О специалисте</dt><dd>${show("summary", esc(p.summary))}</dd>
      <dt>Опыт работы</dt><dd>${show("experienceYears", p.experienceYears + " лет")}</dd>
      <dt>Формат оказания услуг</dt><dd>${p.formats.map((x) => FORMATS[x]).join(", ")}</dd>
      <dt>Телефон</dt><dd>${show("contactPhone", esc(p.contactPhone))}</dd></dl>`;
  if (tab === "languages") body = `<div class="table-wrap"><table><thead><tr><th>Исходный язык</th><th>Целевой язык</th><th>Направление</th><th>Уровень</th></tr></thead><tbody>
      ${p.pairs.map(([s, t, bi, lvl]) => `<tr><td>${lang(s)}</td><td>${lang(t)}</td><td>${bi ? "Двустороннее" : "Одностороннее"}</td><td>${lvl}</td></tr>`).join("")}</tbody></table></div>`;
  if (tab === "qualification") body = visible(p, "qualifications")
    ? `<ul class="list">${p.qualifications.map((q) => `<li class="row between"><span><strong>${esc(q.title)}</strong><span class="muted small"> · ${esc(q.kind)}</span></span><span class="badge ${q.verified ? "good" : ""}">${q.verified ? "Проверено" : "На проверке"}</span></li>`).join("")}</ul>`
    : HIDDEN;
  if (tab === "services") body = `<dl class="props">
      <dt>Услуги</dt><dd>${p.formats.map((x) => FORMATS[x]).join(", ")}</dd>
      <dt>Специализация</dt><dd>${p.specs.map((x) => SPECIALIZATIONS[x]).join(", ")}</dd>
      <dt>Стоимость услуг</dt><dd>${show("rateInfo", esc(p.rateInfo))}</dd></dl>`;
  if (tab === "availability") body = `<dl class="props" style="margin-bottom:16px">
      <dt>Срочное привлечение</dt><dd>${p.urgent ? "Возможно" : "Нет"}</dd>
      <dt>Выезд</dt><dd>${p.travel ? "Возможен" : "Нет"}</dd>
      <dt>Дистанционная работа</dt><dd>${p.remote ? "Возможна" : "Нет"}</dd></dl>
      ${p.slots.length ? `<ul class="list">${p.slots.map(([a, b]) => `<li class="row between"><span>${fmtDay(dayOffset(Math.max(a, 0)))} — ${fmtDay(dayOffset(b))}</span><span class="badge good">Доступен</span></li>`).join("")}</ul>` : '<p class="muted">Периоды доступности не указаны.</p>'}`;
  if (tab === "documents") body = `<dl class="props">
      <dt>Подтверждение личности</dt><dd>${p.check !== "none" ? "Проверено" : "Не проводилось"}</dd>
      <dt>Проверка документов</dt><dd>${p.check === "documents" || p.check === "qualification" ? "Проверено" : "На проверке"}</dd>
      <dt>Подтверждение квалификации</dt><dd>${p.check === "qualification" ? "Проверено" : "Не проводилось"}</dd>
      <dt>Примечание</dt><dd class="muted">Документы с паспортными данными, адресами и иными чувствительными сведениями в профиле не публикуются.</dd></dl>`;

  return flashHtml() + `<div class="card"><div class="row" style="align-items:flex-start;gap:20px">
      <div class="avatar large">${esc(initials(p.name))}</div>
      <div style="flex:1;min-width:220px">
        <h1 style="margin-bottom:4px">${esc(p.name)}</h1>
        <div class="row" style="margin-bottom:8px"><span class="badge ${tone}">${label}</span></div>
        <div>${p.pairs.map(pairText).join(", ")}</div>
        <div class="muted">${p.specs.map((x) => SPECIALIZATIONS[x]).join(", ")}</div>
        <div class="muted">Регион: ${esc(p.region)}${visible(p, "city") ? ", " + esc(p.city) : ""}</div>
        <div class="muted">${availability(p)}</div>
      </div>
      <div class="actions">
        ${canRequest() ? `<a href="#/app/t/${p.id}/request" class="btn">Запросить переводчика</a>` : ""}
        ${own ? '<a href="#/app/profile" class="btn secondary">Настройки раскрытия</a>' : ""}
      </div></div>
      <p class="muted small" style="margin:16px 0 0">Статус проверки на платформе не заменяет решения уполномоченного лица о назначении переводчика.</p>
    </div>
    <nav class="tabs">${tabs.map(([k, n]) => `<a href="#/app/t/${p.id}?tab=${k}" class="${tab === k ? "active" : ""}">${n}</a>`).join("")}</nav>
    <div class="card">${body}</div>`;
}

function requestForm(id) {
  const p = getProfile(id);
  if (!p) return notFound();
  if (!canRequest()) return go("/app/search", "Направление запросов доступно после подтверждения полномочий", "error");
  const pairs = p.pairs.flatMap(([s, t, bi]) => (bi ? [[s, t], [t, s]] : [[s, t]]));
  const tomorrow = dayOffset(2);
  const def = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}T10:00`;
  return head("Запрос переводчика", "Специалист: " + p.name) + flashHtml() +
    `<form class="card steps" data-form="request" data-profile="${p.id}">
      <fieldset><legend>Задача</legend><div class="grid-2">
        <div class="field"><label>Тип мероприятия</label><select name="eventType" required>${opts(EVENT_TYPES, "", "Выберите")}</select></div>
        <div class="field"><label>Языковая пара</label><select name="pair">${pairs.map(([s, t]) => `<option value="${s}:${t}">${lang(s)} → ${lang(t)}</option>`).join("")}</select></div>
        <div class="field"><label>Формат участия</label><select name="format" required>${opts(FORMATS, "", "Выберите")}</select></div>
        <div class="field"><label>Требуемая специализация</label><select name="specialization">${opts(SPECIALIZATIONS, "", "Не требуется")}</select></div>
      </div></fieldset>
      <fieldset><legend>Время и место</legend><div class="grid-2">
        <div class="field"><label>Дата и время начала</label><input type="datetime-local" name="startsAt" value="${def}" required></div>
        <div class="field"><label>Предполагаемая продолжительность, часов</label><input type="number" name="duration" min="0.5" max="24" step="0.5" value="2" required></div>
        <div class="field"><label>Регион</label><select name="region">${regionOpts(p.region)}</select></div>
        <div class="field"><label>Адрес</label><input type="text" name="location" maxlength="300"><div class="hint">Раскрывается переводчику только после подтверждения участия.</div></div>
      </div><label class="check"><input type="checkbox" name="remote"> Дистанционный формат</label></fieldset>
      <fieldset><legend>Организация</legend><div class="grid-2">
        <div class="field"><label>Ведомство или учреждение</label><input type="text" value="${esc(me().org)}" disabled></div>
        <div class="field"><label>Подразделение</label><input type="text" name="department" maxlength="200"></div>
        <div class="field"><label>Служебный контакт</label><input type="text" name="contact" required minlength="5" maxlength="200" placeholder="Служебный телефон или адрес"><div class="hint">Раскрывается переводчику после подтверждения участия.</div></div>
        <div class="field"><label>Идентификатор запроса внутри организации</label><input type="text" name="internalRef" maxlength="60"><div class="hint">Не указывайте номер дела и сведения об участниках производства. Переводчику не показывается.</div></div>
      </div></fieldset>
      <fieldset><legend>Дополнительные условия</legend>
        <label class="check"><input type="checkbox" name="urgent"> Срочное привлечение</label>
        <label class="check"><input type="checkbox" name="preparation"> Требуется предварительная подготовка</label>
        <div class="field" style="margin-top:8px"><label>Требования к квалификации</label><textarea name="requirements" maxlength="1000"></textarea></div>
      </fieldset>
      <fieldset><legend>Подтверждение</legend>
        <p class="muted">Запрос сохраняется как черновик. На следующем шаге открывается сводка для проверки и отправки. Материалы дела к запросу не прикладываются.</p>
        <button class="btn" type="submit">Перейти к проверке</button>
      </fieldset>
    </form>`;
}

function requestsPage(params) {
  if (S.role === "admin") return go("/app");
  const isT = S.role === "translator";
  let list = S.requests.filter((r) => (isT ? r.profileId === "t1" && r.status !== "DRAFT" : r.customer === S.role));
  if (params.status) list = list.filter((r) => r.status === params.status);
  list.sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const statuses = Object.keys(STATUS_LABELS).filter((s) => !(isT && s === "DRAFT"));
  return head(isT ? "Запросы на привлечение" : "Мои запросы") + flashHtml() +
    `<nav class="tabs"><a href="#/app/requests" class="${!params.status ? "active" : ""}">Все</a>${statuses.map((s) => `<a href="#/app/requests?status=${s}" class="${params.status === s ? "active" : ""}">${STATUS_LABELS[s]}</a>`).join("")}</nav>
    <div class="card">${list.length ? `<div class="table-wrap"><table><thead><tr><th>Мероприятие</th><th>${isT ? "Организация" : "Специалист"}</th><th>Языки</th><th>Дата</th><th>Статус</th></tr></thead><tbody>
      ${list.map((r) => `<tr><td><a href="#/app/requests/${r.id}">${EVENT_TYPES[r.eventType]}</a>${r.urgent ? ' <span class="badge warn">Срочно</span>' : ""}</td>
        <td>${esc(isT ? USERS[r.customer].org : getProfile(r.profileId).name)}</td><td>${lang(r.src)} → ${lang(r.tgt)}</td><td>${fmt(r.startsAt)}</td><td>${badge(r.status)}</td></tr>`).join("")}
      </tbody></table></div>` : '<p class="muted">Запросов нет.</p>'}</div>`;
}

function sideOf(r) {
  if (r.customer === S.role) return "customer";
  if (S.role === "translator" && r.profileId === "t1" && r.status !== "DRAFT") return "translator";
  return null;
}

function requestPage(id) {
  const r = S.requests.find((x) => x.id === id);
  if (!r) return notFound();
  const side = sideOf(r);
  if (!side) return notFound();
  if (side === "translator" && r.status === "SENT") {
    r.status = "AWAITING_RESPONSE";
    audit("Изменён статус запроса: «Ожидает ответа»", "Запрос " + r.id);
    save();
  }
  const p = getProfile(r.profileId);
  const details = side === "customer" || r.status === "CONFIRMED" || r.status === "COMPLETED";
  const hiddenUntil = '<span class="muted">Раскрывается после подтверждения участия</span>';
  const actions = Object.entries(TRANSITIONS).filter(([a, [s, from]]) => a !== "open" && s === side && from.includes(r.status)).map(([a]) => a);
  const withText = (a) => ["clarify", "answer", "decline", "cancel"].includes(a);
  return head(EVENT_TYPES[r.eventType], fmt(r.startsAt), badge(r.status)) + flashHtml() +
    (r.status === "DRAFT" ? '<div class="notice">Черновик. Проверьте сведения и отправьте запрос специалисту.</div>' : "") +
    `<div class="grid-2">
      <div class="card"><h2>Задача</h2><dl class="props">
        <dt>Языковая пара</dt><dd>${lang(r.src)} → ${lang(r.tgt)}</dd>
        <dt>Формат участия</dt><dd>${FORMATS[r.format]}</dd>
        <dt>Специализация</dt><dd>${r.specialization ? SPECIALIZATIONS[r.specialization] : "—"}</dd>
        <dt>Продолжительность</dt><dd>${String(r.duration).replace(".", ",")} ч</dd>
        <dt>Регион</dt><dd>${esc(r.region)}${r.remote ? " · дистанционно" : ""}</dd>
        <dt>Адрес</dt><dd>${r.location ? (details ? esc(r.location) : hiddenUntil) : "—"}</dd>
        <dt>Срочность</dt><dd>${r.urgent ? "Срочное привлечение" : "Обычная"}</dd>
        <dt>Подготовка</dt><dd>${r.preparation ? "Требуется" : "Не требуется"}</dd>
        ${r.requirements ? `<dt>Требования к квалификации</dt><dd>${esc(r.requirements)}</dd>` : ""}
      </dl></div>
      <div class="card"><h2>Стороны</h2><dl class="props">
        <dt>Специалист</dt><dd>${side === "customer" ? `<a href="#/app/t/${p.id}">${esc(p.name)}</a>` : esc(p.name)}</dd>
        <dt>Организация</dt><dd>${esc(USERS[r.customer].org)}</dd>
        <dt>Заказчик</dt><dd>${esc(USERS[r.customer].name)}</dd>
        ${side === "customer" && r.department ? `<dt>Подразделение</dt><dd>${esc(r.department)}</dd>` : ""}
        <dt>Служебный контакт</dt><dd>${details ? esc(r.contact) : hiddenUntil}</dd>
        ${side === "customer" && r.internalRef ? `<dt>Внутренний идентификатор</dt><dd>${esc(r.internalRef)}</dd>` : ""}
        ${r.closeReason ? `<dt>Причина</dt><dd>${esc(r.closeReason)}</dd>` : ""}
      </dl></div>
    </div>
    ${r.status === "CONFIRMED" || r.status === "COMPLETED" ? `<div class="card" style="margin-top:16px"><h2>Процессуальное оформление</h2>
      <p class="muted">Подтверждение специалистом возможности участия не заменяет процессуального решения о назначении переводчика (ч. 2 ст. 59 УПК РФ). Переводчик предупреждается об ответственности за заведомо неправильный перевод (ст. 307 УК РФ) в установленном процессуальном порядке.</p>
      ${r.appointment ? '<span class="badge good">Решение о назначении оформлено</span>'
        : side === "customer" && r.status === "CONFIRMED" ? `<button class="btn secondary" data-action="appointment" data-id="${r.id}">Отметить оформление решения о назначении</button>`
        : '<span class="badge">Решение о назначении не отмечено</span>'}</div>` : ""}
    ${actions.length ? `<div class="card" style="margin-top:16px"><h2>Действия</h2><div class="stack">${actions.map((a) => `<form data-form="transition" data-id="${r.id}" data-transition="${a}" class="${withText(a) ? "stack" : "row"}">
        ${withText(a) ? `<textarea name="message" ${a === "clarify" || a === "answer" ? "required" : ""} placeholder="${a === "clarify" || a === "answer" ? "Текст сообщения" : "Причина (необязательно)"}" style="min-height:60px"></textarea>` : ""}
        <div><button class="btn ${a === "decline" || a === "cancel" ? "danger" : a === "clarify" ? "secondary" : ""}" type="submit">${ACTION_LABELS[a]}</button></div></form>`).join("")}</div></div>` : ""}
    <div class="card" style="margin-top:16px"><h2>Переписка</h2>
      ${r.messages.length ? `<ul class="list">${r.messages.map((m) => `<li><div class="small muted">${esc(m.author)} · ${fmt(m.at)}</div><div style="white-space:pre-wrap">${esc(m.text)}</div></li>`).join("")}</ul>` : '<p class="muted">Сообщений нет.</p>'}
      <p class="hint" style="margin-top:12px">Переписка предназначена для организационных вопросов. Сведения из материалов дела в сообщениях не указываются.</p>
    </div>`;
}

function calendarPage() {
  if (S.role === "admin") return go("/app");
  return head(S.role === "translator" ? "Календарь" : "Мероприятия", "Подтверждённые мероприятия") + flashHtml() +
    (S.role === "translator"
      ? `<div class="grid-2">${eventsCard()}<div class="card"><h2>Периоды доступности</h2><ul class="list"><li>${fmtDay(dayOffset(0))} — ${fmtDay(dayOffset(14))} <span class="badge good">Доступен</span></li></ul><p class="hint">В рабочей версии периоды добавляются и удаляются в этом разделе.</p></div></div>`
      : eventsCard());
}

function ordersPage() {
  if (S.role !== "translator") return go("/app");
  const fromRequests = S.requests.filter((r) => r.profileId === "t1" && ["CONFIRMED", "COMPLETED", "CANCELLED"].includes(r.status) && r.confirmedAt);
  const rows = [
    ...fromRequests.map((r) => ({ title: EVENT_TYPES[r.eventType] + " — перевод", client: USERS[r.customer].name, at: fmt(r.startsAt), amount: "—",
      status: r.status === "COMPLETED" ? ["Выполнен", "good"] : r.status === "CANCELLED" ? ["Отменён", ""] : ["В работе", "accent"], link: r.id })),
    { title: "Перевод свидетельства о рождении (демо)", client: "Частный заказчик", at: "—", amount: "1 500", status: ["Выполнен", "good"] },
    { title: "Перевод доверенности (демо)", client: "Частный заказчик", at: "—", amount: "2 000", status: ["В работе", "accent"] },
  ];
  return head("Заказы", "Заказы из реестра и собственные заказы") +
    `<div class="card"><div class="table-wrap"><table><thead><tr><th>Заказ</th><th>Заказчик</th><th>Дата</th><th>Сумма, ₽</th><th>Статус</th></tr></thead><tbody>
      ${rows.map((o) => `<tr><td>${o.link ? `<a href="#/app/requests/${o.link}">${esc(o.title)}</a>` : esc(o.title)}</td><td>${esc(o.client)}</td><td>${o.at}</td><td>${o.amount}</td><td><span class="badge ${o.status[1]}">${o.status[0]}</span></td></tr>`).join("")}
    </tbody></table></div><p class="hint" style="margin-top:12px">Подтверждённый запрос автоматически становится заказом.</p></div>`;
}

function myProfile() {
  if (S.role !== "translator") return go("/app");
  const p = getProfile("t1");
  return head("Мой профиль", "Кому показываются сведения", `<a href="#/app/t/t1" class="btn secondary">Просмотр карточки</a>`) + flashHtml() +
    `<form class="card" data-form="visibility">
      <p class="muted">Имя, языковые пары, специализация, регион, формат работы и статус проверки отображаются в реестре всегда. Остальные сведения раскрываются выбранной категории пользователей.</p>
      ${Object.entries(CONFIGURABLE).map(([field, [label]]) => `<div class="field row between"><span>${label}</span>
        <select name="${field}" style="max-width:360px">${Object.entries(VISIBILITY_LABELS).map(([k, v]) => `<option value="${k}"${visibility(p, field) === k ? " selected" : ""}>${v}</option>`).join("")}</select></div>`).join("")}
      <button class="btn" type="submit">Сохранить</button>
      <p class="hint" style="margin-top:12px">Проверка: скрыть город и посмотреть карточку в роли следователя.</p>
    </form>`;
}

function notificationsPage() {
  const list = S.notifications[S.role];
  const html = head("Уведомления") + `<div class="card">${list.length ? `<ul class="list">${list.map((n) => `<li><div class="row between"><strong>${n.link ? `<a href="#${n.link}">${esc(n.title)}</a>` : esc(n.title)}</strong>${n.read ? "" : '<span class="badge accent">Новое</span>'}</div><div class="muted small">${fmt(n.at)}</div></li>`).join("")}</ul>` : '<p class="muted">Уведомлений нет.</p>'}</div>`;
  list.forEach((n) => (n.read = true));
  save();
  return html;
}

function membershipsPage() {
  if (S.role !== "admin") return go("/app");
  const u = USERS.pending;
  return head("Заявки на роль", "Подтверждение принадлежности пользователей к организациям") + flashHtml() +
    `<div class="notice">Принадлежность к органу или учреждению подтверждается по сведениям заявки: обратный звонок по служебному телефону, сверка с реестром адвокатов субъекта РФ, письмо организации. Выбор роли пользователем основанием для подтверждения не является.</div>
    <div class="card"><div class="row between"><h3 style="margin:0">${esc(u.name)}</h3>
      <span class="badge ${S.pendingStatus === "ACTIVE" ? "good" : S.pendingStatus === "REJECTED" ? "bad" : "warn"}">${{ PENDING: "На рассмотрении", ACTIVE: "Подтверждены", REJECTED: "Отклонены" }[S.pendingStatus]}</span></div>
      <dl class="props" style="margin:12px 0">
        <dt>Роль</dt><dd>${u.role}</dd><dt>Заявленная организация</dt><dd>${esc(u.org)}</dd>
        <dt>Сведения для проверки</dt><dd>Служебный телефон для обратного звонка (демо)</dd>
      </dl>
      ${S.pendingStatus === "PENDING" ? `<div class="row"><button class="btn" data-action="approve">Подтвердить на 1 год</button><button class="btn danger" data-action="reject">Отклонить</button></div>`
        : `<button class="btn secondary" data-action="reopen">Вернуть на рассмотрение</button>`}
    </div>`;
}

function auditPage() {
  if (S.role !== "admin") return go("/app");
  return head("Журнал действий", "В рабочей версии записи журнала защищены от изменения и удаления") +
    `<div class="card">${S.audit.length ? `<div class="table-wrap"><table><thead><tr><th>Время</th><th>Действие</th><th>Пользователь</th><th>Объект</th></tr></thead><tbody>
      ${S.audit.map((a) => `<tr><td>${fmt(a.at)}</td><td>${esc(a.action)}</td><td>${esc(a.actor)}</td><td>${esc(a.object || "—")}</td></tr>`).join("")}</tbody></table></div>` : '<p class="muted">Записей нет.</p>'}</div>`;
}

function notFound() {
  return head("Страница не найдена", "Раздел отсутствует или недоступен для текущей роли") + '<a href="#/app" class="btn secondary">На рабочий стол</a>';
}

/* ---------- Маршрутизация ---------- */

function render() {
  const { path, params } = route();
  if (path === "/" || path === "") { root.innerHTML = landing(); return; }
  if (path === "/login" || !S.role) { root.innerHTML = login(); return; }
  let m, content;
  if (path === "/app") content = dashboard();
  else if (path === "/app/search") content = search(params);
  else if ((m = path.match(/^\/app\/t\/(\w+)\/request$/))) content = requestForm(m[1]);
  else if ((m = path.match(/^\/app\/t\/(\w+)$/))) content = profilePage(m[1], params);
  else if (path === "/app/requests") content = requestsPage(params);
  else if ((m = path.match(/^\/app\/requests\/(\w+)$/))) content = requestPage(m[1]);
  else if (path === "/app/calendar") content = calendarPage();
  else if (path === "/app/orders") content = ordersPage();
  else if (path === "/app/profile") content = myProfile();
  else if (path === "/app/notifications") content = notificationsPage();
  else if (path === "/app/admin/memberships") content = membershipsPage();
  else if (path === "/app/admin/audit") content = auditPage();
  else content = notFound();
  if (content === undefined) return; // выполнено перенаправление
  root.innerHTML = shell(content);
  window.scrollTo(0, 0);
}

/* ---------- Действия ---------- */

function transition(r, action, side, message) {
  const [s, from, to] = TRANSITIONS[action];
  if (s !== side || !from.includes(r.status)) return go(`/app/requests/${r.id}`, "Действие недоступно в текущем статусе запроса", "error");
  if ((action === "clarify" || action === "answer") && !message) return go(`/app/requests/${r.id}`, "Введите текст сообщения", "error");
  if (action === "confirm") {
    const end = (x) => new Date(x.startsAt).getTime() + x.duration * 3600_000;
    const clash = S.requests.some((x) => x.id !== r.id && x.profileId === r.profileId && x.status === "CONFIRMED" &&
      new Date(x.startsAt).getTime() < end(r) && end(x) > new Date(r.startsAt).getTime());
    if (clash) return go(`/app/requests/${r.id}`, "На это время уже подтверждено другое мероприятие", "error");
    r.confirmedAt = new Date().toISOString();
  }
  const prev = r.status;
  r.status = to;
  if (message) {
    r.messages.push({ author: me().name, text: message, at: new Date().toISOString() });
    if (action === "decline" || action === "cancel") r.closeReason = message;
  }
  audit(`Изменён статус запроса: «${STATUS_LABELS[to]}»`, `Запрос ${r.id} (было: ${STATUS_LABELS[prev]})`);
  const recipient = side === "customer" ? "translator" : r.customer;
  if (recipient !== "translator" || r.profileId === "t1") notify(recipient, `Запрос: ${STATUS_LABELS[to]}`, `/app/requests/${r.id}`);
  save();
  go(`/app/requests/${r.id}`, "Статус запроса обновлён");
}

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const a = el.dataset.action;
  if (a === "reset") {
    if (!confirm("Сбросить все действия в демонстрационной версии?")) return;
    S = freshState(); save(); location.hash = "/"; render();
  } else if (a === "login") {
    S.role = el.dataset.role; audit("Вход", null); save(); go("/app");
  } else if (a === "approve" || a === "reject") {
    S.pendingStatus = a === "approve" ? "ACTIVE" : "REJECTED";
    audit("Рассмотрена заявка на роль: " + (a === "approve" ? "подтверждена" : "отклонена"), USERS.pending.name);
    notify("pending", a === "approve" ? "Полномочия подтверждены" : "Полномочия не подтверждены", a === "approve" ? "/app/search" : null);
    save(); go("/app/admin/memberships", "Решение сохранено");
  } else if (a === "reopen") {
    S.pendingStatus = "PENDING"; save(); go("/app/admin/memberships");
  } else if (a === "appointment") {
    const r = S.requests.find((x) => x.id === el.dataset.id);
    if (r && sideOf(r) === "customer" && r.status === "CONFIRMED") {
      r.appointment = true;
      audit("Отмечено процессуальное решение о назначении", "Запрос " + r.id);
      notify("translator", "Оформлено решение о назначении", `/app/requests/${r.id}`);
      save(); go(`/app/requests/${r.id}`, "Отметка сохранена");
    }
  }
});

document.addEventListener("submit", (e) => {
  const form = e.target.closest("form[data-form]");
  if (!form) return;
  e.preventDefault();
  const data = new FormData(form);
  const get = (k) => String(data.get(k) ?? "").trim();
  const type = form.dataset.form;

  if (type === "search") {
    const q = new URLSearchParams();
    for (const [k, v] of data.entries()) if (v) q.set(k, v === "on" ? "1" : v);
    go("/app/search" + (q.toString() ? "?" + q : ""));
  } else if (type === "request") {
    if (!canRequest()) return go("/app/search", "Направление запросов доступно после подтверждения полномочий", "error");
    const profileId = form.dataset.profile;
    const startsAt = get("startsAt");
    if (!startsAt || new Date(startsAt).getTime() < Date.now()) return go(`/app/t/${profileId}/request`, "Укажите дату и время в будущем", "error");
    const [src, tgt] = get("pair").split(":");
    const id = "r" + S.nextId++;
    S.requests.push({
      id, customer: S.role, profileId, eventType: get("eventType"), src, tgt, format: get("format"),
      specialization: get("specialization") || null, startsAt, duration: Number(get("duration")) || 2,
      region: get("region"), location: get("location"), remote: data.has("remote"), department: get("department"),
      contact: get("contact"), internalRef: get("internalRef"), urgent: data.has("urgent"), preparation: data.has("preparation"),
      requirements: get("requirements"), status: "DRAFT", messages: [], appointment: false,
    });
    audit("Создан запрос", "Запрос " + id);
    save();
    go(`/app/requests/${id}`);
  } else if (type === "transition") {
    const r = S.requests.find((x) => x.id === form.dataset.id);
    if (!r) return;
    const side = sideOf(r);
    if (!side) return;
    transition(r, form.dataset.transition, side, get("message").slice(0, 2000));
  } else if (type === "visibility") {
    S.visibility.t1 = Object.fromEntries(Object.keys(CONFIGURABLE).map((f) => [f, get(f)]));
    audit("Изменён профиль: настройки раскрытия", "Хеда Демонстрационная");
    save();
    go("/app/profile", "Настройки раскрытия сохранены");
  }
});

window.addEventListener("hashchange", render);
render();
