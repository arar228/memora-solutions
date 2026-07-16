// Travel-service verticals for Radar 4.0. Each vertical lists its Travelpayouts
// partner brands. `url` = the affiliate link (carries our marker); `null` means
// the link still has to be generated in the Travelpayouts dashboard (app.travel
// payouts.com → Tools → «Ссылки») and pasted here — those render as "скоро".
//
// Known links reused from the radar's Partners block (tpx.gr short links carry
// marker 748397). Flights are handled by the search form, not a link list.

export const VERTICALS = [
    {
        key: 'hotels',
        icon: 'bed',
        title: { ru: 'Отели и жильё', en: 'Hotels & stays' },
        desc: { ru: 'Отели, апартаменты, посуточно', en: 'Hotels, apartments, short stays' },
        partners: [
            { name: 'Островок', url: 'https://ostrovok.tpx.gr/hNufxzWm' },
            { name: 'Яндекс Путешествия', url: 'https://yandex.tpx.gr/JT6O6DFZ' },
            { name: 'Суточно.ру', url: 'https://sutochno.tpx.gr/GpFGHGCz' },
            { name: 'Avito Путешествия', url: 'https://avito.tpx.gr/bNAvjcvf' },
        ],
    },
    {
        key: 'transfers',
        icon: 'car-front',
        title: { ru: 'Трансферы', en: 'Transfers' },
        desc: { ru: 'Из аэропорта и между городами', en: 'Airport & city transfers' },
        partners: [
            { name: 'Kiwitaxi', url: null },
            { name: 'GetTransfer', url: null },
            { name: 'intui.travel', url: null },
        ],
    },
    {
        key: 'cars',
        icon: 'car',
        title: { ru: 'Аренда авто', en: 'Car rental' },
        desc: { ru: 'Прокат машин по всему миру', en: 'Rent a car worldwide' },
        partners: [
            { name: 'DiscoverCars', url: null },
            { name: 'Localrent', url: null },
            { name: 'EconomyBookings', url: null },
        ],
    },
    {
        key: 'trains',
        icon: 'train',
        title: { ru: 'Ж/Д и автобусы', en: 'Trains & buses' },
        desc: { ru: 'Поезда и междугородние автобусы', en: 'Rail & intercity buses' },
        partners: [
            { name: 'Туту.ру', url: null },
            { name: 'Busfor', url: null },
            { name: 'Omio', url: null },
        ],
    },
    {
        key: 'tours',
        icon: 'palmtree',
        title: { ru: 'Туры', en: 'Package tours' },
        desc: { ru: 'Пакетные туры от туроператоров', en: 'Package tours from operators' },
        partners: [
            { name: 'Level.Travel', url: null },
            { name: 'Travelata', url: null },
            { name: 'OnlineTours', url: null },
            { name: 'Sletat.ru', url: null },
        ],
    },
    {
        key: 'excursions',
        icon: 'ticket',
        title: { ru: 'Экскурсии', en: 'Tours & activities' },
        desc: { ru: 'Экскурсии, гиды, активности', en: 'Excursions, guides, activities' },
        partners: [
            { name: 'Трипстер', url: 'https://tripster.tpx.gr/DWvu8aIU' },
            { name: 'Sputnik8', url: 'https://sputnik8.tpx.gr/v1gXh4nK' },
            { name: 'WeGoTrip', url: null },
        ],
    },
    {
        key: 'insurance',
        icon: 'shield',
        title: { ru: 'Страховка', en: 'Insurance' },
        desc: { ru: 'Страховка для путешествий', en: 'Travel insurance' },
        partners: [
            { name: 'Черехапа', url: null },
            { name: 'Tripinsurance', url: null },
            { name: 'EKTA', url: null },
        ],
    },
    {
        key: 'esim',
        icon: 'smartphone',
        title: { ru: 'eSIM и связь', en: 'eSIM & connectivity' },
        desc: { ru: 'Мобильный интернет за границей', en: 'Mobile data abroad' },
        partners: [
            { name: 'Airalo', url: null },
            { name: 'Drimsim', url: null },
            { name: 'Yesim', url: null },
        ],
    },
];
