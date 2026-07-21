// Travel Radar data — useful services / lifehacks.
// (Live tour deals come from /tours.json; the old static mockDeals was unused.)

// --- Travelpayouts affiliate links ---
// marker + trs are constant for our account (trs = our traffic source, same id as Drive).
// p (offer id) + campaign_id (program id) differ per brand — taken from the Travelpayouts
// deep-link generator ("Создать ссылку" / a program's "Ссылки"). Fill TP_PROGRAMS as we
// generate each brand's link; brands without a mapping keep their plain URL.
export const TP_MARKER = '748397';
const TP_TRS = '547927';

const TP_PROGRAMS = {
    // brand key → { p, campaign_id } from a generated deeplink for that program
    aviasales: { p: 4114, campaign_id: 100 },
    // travelata:   { p: ?, campaign_id: ? },
    // onlinetours: { p: ?, campaign_id: ? },
    // leveltravel: { p: ?, campaign_id: ? },
    // agoda:       { p: ?, campaign_id: ? },
};

// Build a tracked affiliate deep link to `target` for a mapped brand; falls back to the
// plain target URL if we don't have that brand's ids yet.
export function tpLink(brand, target) {
    const prog = TP_PROGRAMS[brand];
    if (!prog) return target;
    return `https://tp.media/r?marker=${TP_MARKER}&trs=${TP_TRS}&p=${prog.p}` +
        `&u=${encodeURIComponent(target)}&campaign_id=${prog.campaign_id}`;
}

export const usefulServices = [
    {
        category: 'A',
        categoryName: { ru: 'Агрегаторы пакетных туров', en: 'Package Tour Aggregators' },
        services: [
            {
                name: 'sletat.ru',
                desc: { ru: 'Крупнейший агрегатор туров РФ. Поиск от 130+ туроператоров. Гибкие фильтры по звёздам, питанию, датам. Именно этим сервисом пользуются профессиональные турагенты.', en: 'Largest tour aggregator in Russia. Search from 130+ tour operators. Flexible filters by stars, meals, dates. Used by professional travel agents.' },
                url: 'https://sletat.ru',
                steps: {
                    ru: ['Откройте sletat.ru', 'Выберите направление, даты и параметры', 'Сравните цены от 130+ туроператоров', 'Забронируйте через выбранного оператора'],
                    en: ['Open sletat.ru', 'Choose destination, dates and parameters', 'Compare prices from 130+ operators', 'Book through selected operator'],
                },
            },
            {
                name: 'Level.Travel',
                desc: { ru: 'Умный агрегатор с разделом горящих туров и push-уведомлениями. Удобен для отслеживания цены на конкретное направление. Есть мобильное приложение.', en: 'Smart aggregator with last-minute deals section and push notifications. Great for price tracking. Has mobile app.' },
                url: 'https://level.travel',
                steps: {
                    ru: ['Выберите направление и даты', 'Включите push-уведомления о снижении цены', 'Сравните цены от разных операторов', 'Забронируйте и оплатите онлайн'],
                    en: ['Choose destination and dates', 'Enable push notifications for price drops', 'Compare prices from different operators', 'Book and pay online'],
                },
            },
            {
                name: 'Travelata',
                desc: { ru: 'Агрегатор с фокусом на горящие туры. Мобильное приложение с push-оповещениями — настраиваете фильтры и получаете уведомления при снижении цены.', en: 'Aggregator focused on hot deals. Mobile app with push alerts — set filters and get notified when prices drop.' },
                url: 'https://travelata.ru',
                steps: {
                    ru: ['Скачайте мобильное приложение', 'Настройте фильтры по направлению и бюджету', 'Включите push-уведомления', 'Оформите бронирование при снижении цены'],
                    en: ['Download the mobile app', 'Set filters by destination and budget', 'Enable push notifications', 'Book when prices drop'],
                },
            },
            {
                name: 'OnlineTours',
                desc: { ru: 'Ещё один агрегатор с хорошими фильтрами горящих предложений. Рекомендуется использовать параллельно с другими — цены могут отличаться.', en: 'Another aggregator with good hot deal filters. Recommended to use alongside others — prices may differ.' },
                url: 'https://onlinetours.ru',
                steps: {
                    ru: ['Введите параметры поиска', 'Сравните цены с другими агрегаторами', 'Используйте фильтры горящих предложений', 'Бронируйте лучшее предложение'],
                    en: ['Enter search parameters', 'Compare prices with other aggregators', 'Use hot deal filters', 'Book the best offer'],
                },
            },
        ],
    },
    {
        category: 'B',
        categoryName: { ru: 'Авиабилеты и ошибочные тарифы', en: 'Flights & Error Fares' },
        services: [
            {
                name: 'Aviasales',
                desc: { ru: 'Метапоисковик авиабилетов. Обязателен для направлений без чартеров (Бали, нестандартные маршруты). Календарь цен показывает самые дешёвые даты.', en: 'Meta search engine for flights. Essential for routes without charters (Bali, unusual routes). Price calendar shows cheapest dates.' },
                url: tpLink('aviasales', 'https://aviasales.ru'),
                steps: {
                    ru: ['Введите маршрут и даты', 'Используйте календарь цен для поиска дешёвых дат', 'Подпишитесь на уведомления о снижении цены', 'Бронируйте у партнёров'],
                    en: ['Enter route and dates', 'Use price calendar to find cheap dates', 'Subscribe to price drop notifications', 'Book with partners'],
                },
            },
            {
                name: 'Google Flights',
                desc: { ru: 'Мощный инструмент Google: полный календарь цен на 6 месяцев, отслеживание тарифов, Flight Deals с AI-подбором. Карта "Куда дешевле" — идеально для гибких дат.', en: 'Powerful Google tool: 6-month price calendar, fare tracking, AI-powered Flight Deals. "Explore" map — perfect for flexible dates.' },
                url: 'https://flights.google.com',
                steps: {
                    ru: ['Откройте Google Flights', 'Используйте карту «Куда дешевле»', 'Включите отслеживание тарифов', 'Бронируйте при получении уведомления о снижении'],
                    en: ['Open Google Flights', 'Use the "Explore" map', 'Enable fare tracking', 'Book when notified of price drops'],
                },
            },
            {
                name: 'Kiwi.com',
                desc: { ru: 'Строит нестандартные маршруты через разных перевозчиков (self-transfer). Иногда находит варианты на 30-40% дешевле прямых рейсов.', en: 'Builds unusual routes via different carriers (self-transfer). Sometimes finds options 30-40% cheaper than direct flights.' },
                url: 'https://kiwi.com',
                steps: {
                    ru: ['Введите маршрут', 'Включите опцию self-transfer', 'Сравните с прямыми рейсами', 'Учитывайте время на пересадку'],
                    en: ['Enter route', 'Enable self-transfer option', 'Compare with direct flights', 'Account for transfer time'],
                },
            },
            {
                name: 'Skiplagged',
                desc: { ru: 'Специализируется на hidden city ticketing — покупка билета с пересадкой в нужном городе дешевле прямого. Экономия до 40%.', en: 'Specializes in hidden city ticketing — buying a ticket with a layover in your destination city cheaper than direct. Savings up to 40%.' },
                url: 'https://skiplagged.com',
                steps: {
                    ru: ['Введите пункт назначения', 'Сервис найдёт скрытые маршруты', 'Не сдавайте багаж в багажное отделение', 'Используйте только для одностороних перелётов'],
                    en: ['Enter destination', 'Service will find hidden routes', 'Do not check luggage', 'Use only for one-way flights'],
                },
            },
            {
                name: 'Secret Flying',
                desc: { ru: 'Мониторинг error fares — ошибочных тарифов авиакомпаний. Билеты по цене в 3-5 раз ниже нормальной. Живут часы — нужна быстрая реакция.', en: 'Monitoring error fares — airline pricing mistakes. Tickets 3-5x cheaper than normal. Last hours — quick reaction needed.' },
                url: 'https://secretflying.com',
                steps: {
                    ru: ['Подпишитесь на email-уведомления', 'Проверяйте раздел ошибочных тарифов', 'Бронируйте сразу — тарифы живут часы', 'Используйте VPN для лучших цен'],
                    en: ['Subscribe to email alerts', 'Check error fares section', 'Book immediately — fares last hours', 'Use VPN for better prices'],
                },
            },
            {
                name: 'Airfarewatchdog',
                desc: { ru: 'Автоматический поиск аномально дешёвых билетов и ошибочных тарифов. Email-оповещения о находках.', en: 'Automatic search for anomalously cheap tickets and error fares. Email alerts for discoveries.' },
                url: 'https://airfarewatchdog.com',
                steps: {
                    ru: ['Зарегистрируйтесь на сайте', 'Укажите интересующие направления', 'Получайте email-уведомления о находках', 'Бронируйте быстро — предложения ограничены'],
                    en: ['Register on the website', 'Specify destinations of interest', 'Receive email alerts about finds', 'Book quickly — offers are limited'],
                },
            },
        ],
    },
    {
        category: 'C',
        categoryName: { ru: 'Отели и проживание', en: 'Hotels & Accommodation' },
        services: [
            {
                name: 'Booking.com',
                desc: { ru: 'Крупнейшая платформа бронирования. Last-minute скидки 10–25%. При длительном пребывании (28+ дней) — скидки до 40–60%.', en: 'Largest booking platform. Last-minute discounts 10-25%. For long stays (28+ days) — discounts up to 40-60%.' },
                url: 'https://booking.com',
                steps: {
                    ru: ['Выберите город и даты', 'Используйте фильтр «Горящие предложения»', 'Для длительного пребывания бронируйте на 28+ дней', 'Читайте реальные отзывы перед бронированием'],
                    en: ['Choose city and dates', 'Use "Deals" filter', 'For long stays book 28+ days', 'Read real reviews before booking'],
                },
            },
            {
                name: 'Agoda',
                desc: { ru: 'Лучшие цены на отели в Юго-Восточной Азии (Таиланд, Вьетнам, Бали). Часто дешевле Booking для азиатских направлений.', en: 'Best prices for hotels in Southeast Asia (Thailand, Vietnam, Bali). Often cheaper than Booking for Asian destinations.' },
                url: 'https://agoda.com',
                steps: {
                    ru: ['Откройте Agoda для азиатских направлений', 'Сравните цены с Booking.com', 'Используйте фильтры по звёздам и цене', 'Бронируйте с бесплатной отменой'],
                    en: ['Open Agoda for Asian destinations', 'Compare prices with Booking.com', 'Use filters by stars and price', 'Book with free cancellation'],
                },
            },
            {
                name: 'Airbnb',
                desc: { ru: 'Аренда жилья. Ключевой лайфхак: при бронировании на 28+ дней скидки 40–60%. Идеально для длительных поездок (Бали, Хайнань).', en: 'Accommodation rental. Key hack: 28+ day bookings get 40-60% discounts. Perfect for long stays (Bali, Hainan).' },
                url: 'https://airbnb.com',
                steps: {
                    ru: ['Ищите жильё на срок 28+ дней для максимальной скидки', 'Фильтруйте по суперхозяевам', 'Читайте отзывы о реальном опыте', 'Договаривайтесь с хозяином о долгосрочной скидке'],
                    en: ['Search for 28+ day stays for maximum discount', 'Filter by Superhosts', 'Read reviews about real experience', 'Negotiate long-term discount with host'],
                },
            },
            {
                name: 'TrustedHousesitters',
                desc: { ru: 'House sitting — бесплатное проживание в обмен на присмотр за домом/питомцем. Пентхаусы в дорогих городах за $0. Годовая подписка ~$129.', en: 'House sitting — free accommodation in exchange for watching a home/pet. Penthouses in expensive cities for $0. Annual subscription ~$129.' },
                url: 'https://trustedhousesitters.com',
                steps: {
                    ru: ['Оформите годовую подписку (~$129)', 'Создайте привлекательный профиль с отзывами', 'Подавайте заявки на интересные домашние сидения', 'Получите бесплатное проживание в обмен на уход за питомцем'],
                    en: ['Get annual subscription (~$129)', 'Create attractive profile with reviews', 'Apply for interesting house sits', 'Get free accommodation in exchange for pet care'],
                },
            },
        ],
    },
    {
        category: 'D',
        categoryName: { ru: 'Бонусные мили и кэшбэк', en: 'Bonus Miles & Cashback' },
        services: [
            {
                name: 'Аэрофлот Бонус',
                desc: { ru: 'Программа лояльности Аэрофлота. Накопление миль при перелётах и через партнёрские карты (Тинькофф, Сбер). Бесплатные билеты за мили.', en: 'Aeroflot loyalty program. Earn miles from flights and partner cards (Tinkoff, Sber). Free tickets for miles.' },
                url: 'https://aeroflot.ru/bonus',
                steps: {
                    ru: ['Зарегистрируйтесь в Аэрофлот Бонус', 'Оформите ко-бренд карту (Тинькофф/Сбер)', 'Копите мили за повседневные покупки', 'Обменивайте мили на бесплатные билеты'],
                    en: ['Register in Aeroflot Bonus', 'Get a co-brand card (Tinkoff/Sber)', 'Earn miles from everyday purchases', 'Exchange miles for free tickets'],
                },
            },
            {
                name: 'S7 Priority',
                desc: { ru: 'Программа лояльности S7. Мили конвертируются в билеты. Карта S7-Тинькофф — начисление миль за повседневные покупки.', en: 'S7 loyalty program. Miles convert to tickets. S7-Tinkoff card — earn miles from everyday purchases.' },
                url: 'https://s7.ru/priority',
                steps: {
                    ru: ['Вступите в S7 Priority', 'Оформите карту S7-Тинькофф', 'Оплачивайте покупки картой для начисления миль', 'Используйте мили для бронирования билетов'],
                    en: ['Join S7 Priority', 'Get S7-Tinkoff card', 'Pay with card to earn miles', 'Use miles to book tickets'],
                },
            },
            {
                name: 'Тинькофф Travel',
                desc: { ru: 'Кэшбэк до 10% на путешествия. Бронирование отелей и билетов с начислением бонусов. Конвертация в мили авиакомпаний.', en: 'Up to 10% cashback on travel. Hotel and ticket booking with bonus accrual. Conversion to airline miles.' },
                url: 'https://tinkoff.ru/travel',
                steps: {
                    ru: ['Откройте карту Тинькофф All Airlines', 'Бронируйте через Тинькофф Travel', 'Получайте до 10% милями', 'Конвертируйте в мили авиакомпаний'],
                    en: ['Open Tinkoff All Airlines card', 'Book through Tinkoff Travel', 'Get up to 10% in miles', 'Convert to airline miles'],
                },
            },
            {
                name: 'seats.aero',
                desc: { ru: 'Поиск award-билетов за мили по всем авиакомпаниям. Находит бизнес-класс за минимум миль. Платный сервис.', en: 'Search for award tickets with miles across all airlines. Finds business class for minimum miles. Paid service.' },
                url: 'https://seats.aero',
                steps: {
                    ru: ['Зарегистрируйтесь на seats.aero', 'Введите маршрут и количество миль', 'Сервис найдёт лучшие award-билеты', 'Бронируйте через программу лояльности'],
                    en: ['Register at seats.aero', 'Enter route and miles balance', 'Service will find best award tickets', 'Book through loyalty program'],
                },
            },
        ],
    },
    {
        category: 'E',
        categoryName: { ru: 'AI-планировщики и инструменты', en: 'AI Planners & Tools' },
        services: [
            {
                name: 'Google Flight Deals',
                desc: { ru: 'AI-подбор направлений: описываете, что хотите, обычным языком — система находит лучшие предложения. Работает в 200+ странах.', en: 'AI-powered destination matching: describe what you want in plain language — system finds best deals. Works in 200+ countries.' },
                url: 'https://flights.google.com',
                steps: {
                    ru: ['Откройте Google Flights', 'Опишите что вы ищете обычным языком', 'AI подберёт лучшие направления', 'Сравните предложения и бронируйте'],
                    en: ['Open Google Flights', 'Describe what you are looking for', 'AI will match best destinations', 'Compare offers and book'],
                },
            },
            {
                name: 'Mindtrip.ai',
                desc: { ru: 'AI-планировщик путешествий: строит маршрут, подбирает отели на карте, формирует итинерарий с бронированием.', en: 'AI travel planner: builds routes, selects hotels on map, creates itinerary with booking.' },
                url: 'https://mindtrip.ai',
                steps: {
                    ru: ['Зарегистрируйтесь на mindtrip.ai', 'Введите направление и даты', 'AI составит маршрут по дням', 'Забронируйте отели и активности прямо в сервисе'],
                    en: ['Register at mindtrip.ai', 'Enter destination and dates', 'AI creates daily itinerary', 'Book hotels and activities directly'],
                },
            },
            {
                name: 'iMean AI',
                desc: { ru: 'AI-агент: сканирует цены в реальном времени, оптимизирует маршрут, синхронизирует прилёты из разных городов.', en: 'AI agent: scans prices in real-time, optimizes routes, synchronizes arrivals from different cities.' },
                url: 'https://imean.ai',
                steps: {
                    ru: ['Опишите AI-агенту ваши требования', 'Агент просканирует цены в реальном времени', 'Получите оптимизированный маршрут', 'Забронируйте по лучшим ценам'],
                    en: ['Describe requirements to AI agent', 'Agent scans prices in real-time', 'Get optimized route', 'Book at best prices'],
                },
            },
            {
                name: 'Hopper',
                desc: { ru: 'Предсказывает оптимальный момент покупки билетов с помощью AI. Подсказывает: покупать сейчас или ждать.', en: 'Predicts optimal ticket purchase timing with AI. Tells you: buy now or wait.' },
                url: 'https://hopper.com',
                steps: {
                    ru: ['Скачайте приложение Hopper', 'Введите маршрут и даты', 'AI покажет прогноз цены', 'Покупайте когда AI скажет «сейчас»'],
                    en: ['Download Hopper app', 'Enter route and dates', 'AI shows price forecast', 'Buy when AI says "now"'],
                },
            },
        ],
    },
    {
        category: 'F',
        categoryName: { ru: 'Лайфхаки и арбитраж', en: 'Lifehacks & Arbitrage' },
        services: [
            {
                name: 'VPN-арбитраж',
                desc: { ru: 'Переключение VPN на страну с низкими ценами (Турция, Бразилия, Индия) при бронировании. Экономия ~7% на дальних рейсах.', en: 'Switching VPN to low-price countries (Turkey, Brazil, India) when booking. ~7% savings on long-haul flights.' },
                url: '#',
                steps: {
                    ru: ['Установите VPN-сервис', 'Переключитесь на Турцию, Бразилию или Индию', 'Откройте сайт авиакомпании или бронирования', 'Сравните цены — экономия до 7% на дальних рейсах'],
                    en: ['Install a VPN service', 'Switch to Turkey, Brazil or India', 'Open airline or booking website', 'Compare prices — up to 7% savings on long-haul'],
                },
            },
            {
                name: 'Stacking скидок',
                desc: { ru: 'Наслоение нескольких скидок: распродажа + кэшбэк карты + промокод + бонусные мили. Каждая 5–15%, вместе — 30–50%.', en: 'Stacking multiple discounts: sale + card cashback + promo code + bonus miles. Each 5-15%, together — 30-50%.' },
                url: '#',
                steps: {
                    ru: ['Дождитесь распродажи авиакомпании', 'Используйте карту с кэшбэком на путешествия', 'Добавьте промокод если есть', 'Суммарная экономия 30–50%'],
                    en: ['Wait for airline sale', 'Use card with travel cashback', 'Add promo code if available', 'Total savings 30-50%'],
                },
            },
            {
                name: 'Вторник-среда',
                desc: { ru: 'Бронирование и перелёт во вторник-среду статистически дешевле на 15–20%. Ночные тарифы (1:00–4:00) часто ниже дневных.', en: 'Booking and flying on Tuesday-Wednesday is statistically 15-20% cheaper. Night fares (1-4 AM) are often lower.' },
                url: '#',
                steps: {
                    ru: ['Планируйте перелёт на вторник или среду', 'Бронируйте билеты поздно ночью (1:00–4:00)', 'Избегайте пятниц и воскресений', 'Экономия 15–20% от стандартной цены'],
                    en: ['Plan flights for Tuesday or Wednesday', 'Book tickets late at night (1-4 AM)', 'Avoid Fridays and Sundays', 'Save 15-20% from standard price'],
                },
            },
            {
                name: 'Slow travel',
                desc: { ru: 'Длительное пребывание (28+ дней) в одном месте: скидки Airbnb 40–60%, лучшее погружение в культуру, меньше транспортных расходов.', en: 'Long stays (28+ days) in one place: Airbnb discounts 40-60%, better cultural immersion, less transport costs.' },
                url: '#',
                steps: {
                    ru: ['Планируйте пребывание на 28+ дней', 'Бронируйте Airbnb с месячной скидкой (40–60%)', 'Погрузитесь в местную культуру', 'Сэкономьте на транспорте между городами'],
                    en: ['Plan 28+ day stays', 'Book Airbnb with monthly discount (40-60%)', 'Immerse in local culture', 'Save on inter-city transport'],
                },
            },
        ],
    },
];

// Kanban data — per TZ: Feedback / Potential Tasks / In Progress
export const kanbanData = {
    feedback: [
        { id: 1, title: 'Фильтр направлений по типу отдыха', titleEn: 'Filter destinations by holiday type', desc: 'Разбить безвизовые направления на пляж / экскурсии / горы, чтобы быстрее выбрать', descEn: 'Split visa-free destinations into beach / sightseeing / mountains for faster choice', priority: 'medium' },
        { id: 2, title: 'Уведомления о падении цены', titleEn: 'Price-drop alerts', desc: 'Подписка на маршрут и письмо/пуш, когда цена заметно упала', descEn: 'Subscribe to a route and get an email/push when the price drops noticeably', priority: 'medium' },
        { id: 3, title: 'Графики динамики цен', titleEn: 'Price dynamics charts', desc: 'Показывать, как менялась цена на направление за последние месяцы', descEn: 'Show how a destination price changed over recent months', priority: 'low' },
    ],
    potential: [
        { id: 4, title: 'Туры в безвизовые страны', titleEn: 'Package tours to visa-free countries', desc: 'Вторая фаза радара: подбор туров (не только авиабилетов) по тем же безвизовым направлениям', descEn: 'Radar phase 2: surface package tours (not only flights) for the same visa-free destinations', priority: 'high' },
        { id: 5, title: 'Больше горящих билетов', titleEn: 'Surface more hot deals', desc: 'Скорить все безвизовые маршруты + /v2/prices/latest, чтобы всплывали скидки на Турцию/Египет/Таиланд, а не только дешёвые СНГ-рейсы', descEn: 'Score all visa-free routes + /v2/prices/latest so discounts to Turkey/Egypt/Thailand surface, not only cheap CIS hops', priority: 'high' },
        { id: 6, title: 'Консьерж «под ключ»', titleEn: 'Concierge (done-for-you)', desc: 'Заявка → расчёт оператора → оплата в ₽ → бронь. Требует бэкенда (ЮKassa/СБП)', descEn: 'Request → operator quote → pay in ₽ → booking. Needs a backend (YooKassa/SBP)', priority: 'medium' },
        { id: 7, title: 'Парсинг Telegram-каналов с горящими турами', titleEn: 'Parse Telegram hot-deal channels', desc: 'Telethon/Pyrogram для агрегации предложений из каналов', descEn: 'Telethon/Pyrogram to aggregate deals from channels', priority: 'low' },
    ],
    inProgress: [
        { id: 8, title: 'Memora Pomodoro — десктоп-приложение', titleEn: 'Memora Pomodoro — desktop app', desc: 'Electron-таймер: режим секундомера с «чистым временем», недельный график, редизайн главного экрана', descEn: 'Electron timer: stopwatch mode with focused-time, weekly chart, hero redesign', priority: 'high' },
    ],
    done: [
        { id: 9, title: 'Радар Путешествий — живые цены и безвизовый фокус', titleEn: 'Travel Radar — live prices, visa-free focus', desc: 'Горящие авиабилеты из России в безвизовые страны', descEn: 'Hot flights from Russia to visa-free countries', priority: 'high', report: 'Радар переориентирован на поиск горящих авиабилетов из России в безвизовые страны. Живые цены Travelpayouts (Aviasales Data API), обновление кроном каждые ~3 часа. Курируемый каталог ~100 аэропортов в 37 странах с визовыми метками (без визы / виза по прилёту / e-виза). 50 городов вылета, раздел «Куда без визы», календарь цен (до 60 дней и 120 маршрутов). Фильтр отсекает внутренние и визовые направления и на фиде, и на фронте.' },
        { id: 10, title: 'Монетизация Travelpayouts', titleEn: 'Travelpayouts monetization', desc: 'Партнёрские ссылки Aviasales (маркер 748397), домен .ru', descEn: 'Aviasales affiliate links (marker 748397), .ru domain', priority: 'high', report: 'Подключена партнёрская программа Travelpayouts (маркер 748397). Все ссылки «Купить» ведут на aviasales.ru с сохранением атрибуции. Живой фид цен обновляется через GitHub Actions; добавлены виджет подборки отелей Яндекса и секция «Забронировать» с проверенными сервисами.' },
        { id: 11, title: 'Чистка: убраны старые версии радара и концьерж-бэкенд', titleEn: 'Cleanup: removed old radar versions + concierge backend', desc: 'На сайте остался один «Радар Путешествий»', descEn: 'Only one Travel Radar remains on the site', priority: 'medium', report: 'Удалены устаревшие Радар v1 и v2 (Concierge) вместе с осиротевшим бэкендом server/. Старые URL редиректят на актуальный радар; навигация и карточка на главной ведут на единственный «Радар Путешествий». Сборка и роутинг очищены.' },
        { id: 12, title: 'Дизайн-система', titleEn: 'Design System', desc: 'Цветовая палитра, типографика, компоненты', descEn: 'Color palette, typography, components', priority: 'high', report: 'Создана полная дизайн-система: CSS custom properties, шрифты Cormorant Garamond + Manrope, light/dark темы, компоненты карточек и кнопок.' },
        { id: 13, title: 'Локализация RU/EN', titleEn: 'Localization RU/EN', desc: 'Поддержка русского и английского языков', descEn: 'Russian and English language support', priority: 'medium', report: 'Подключен i18next с полными переводами для всех страниц на русском и английском языках.' },
        { id: 14, title: '3D-сцена «Мощные компьютеры»', titleEn: '3D Workstations Scene', desc: 'Детализированная модель ПК: GPU RTX 5090, материнская плата, сборка', descEn: 'Detailed PC model: GPU RTX 5090, motherboard, assembly', priority: 'high', report: 'Создана ультра-детализированная 3D-модель ПК (150+ мешей): GPU RTX 5090 (3.5-slot, vapor chamber, 12 GDDR7 VRAM, 7 heatpipes, 30 рядов рёбер, 3 вентилятора, 12VHPWR коннектор, DisplayPort/HDMI), расширенная материнская плата (M.2 SSD с радиатором, USB-C header, RGB/ARGB header, Debug LED, WiFi модуль, 6 SATA, PCB art). Два этапа: сборка с анимацией → зум на 1200 инстансов.' },
        { id: 15, title: 'Платформа DOMATRIX — 23 системы', titleEn: 'DOMATRIX Platform — 23 Systems', desc: 'Полная визуализация инженерных систем умного здания', descEn: 'Full visualization of smart building engineering systems', priority: 'high', report: 'Реализована 3D-сцена умного здания с 23-мя инженерными системами (СВН, СКУД, ЛВС, РТ, СДС, СС, МГН, СКС, СОС, АПС, СОУЭ, СКЗ, СУД, АУГПТ и др.). Стеклянный фасад, 6 этажей, оборудование на крыше. Интерактивность: hover-подсветка, click-панель, спрайт-лейблы. Оптимизация: удалены 23 PointLight, merge геометрий, throttle raycaster — лаги устранены. Профессиональное 3-point освещение (key + fill + rim). OrbitControls с зумом и свободным вращением.' },
        { id: 16, title: 'Редизайн сцены «Команда»', titleEn: 'Team Scene Redesign', desc: 'Орбитальная раскладка, 25 уникальных должностей, CTA-нода', descEn: 'Orbital layout, 25 unique roles, CTA node', priority: 'high', report: 'Полная переработка SceneTeam: заменена d3-force симуляция на орбитальную раскладку (2 кольца R=55/R=90). 7 групп с уникальными цветами: Управление, Инженерия, IT/Dev, Проектирование, Логистика, Монтаж, Безопасность. 25 конкретных должностей вместо 7 обобщённых. Центр: Memora Solutions (вместо «Сергей Маклаков»). CTA-нода с пульсирующими кольцами и PointLight. Анимации: вход из центра, дыхание, hover-подсветка.' },
        { id: 17, title: 'Архитектурная реструктуризация', titleEn: 'Architecture Restructure', desc: 'API-бэкенд, i18n разделение, lazy loading, папки страниц', descEn: 'API backend, i18n split, lazy loading, page folders', priority: 'medium', report: 'Проведена enterprise-реструктуризация проекта: выделен API-бэкенд (api/), разделение i18n на отдельные файлы по языкам (locales/ru, locales/en), lazy loading компонентов, организация страниц по папкам, оптимизация бандла.' },
    ],
};
