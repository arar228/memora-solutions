import { VISA_DESTINATIONS } from '../src/pages/TravelRadar3/visaDestinations.js';

const COUNTRY_GROUPS = [
  [{ ru: 'Россия', en: 'Russia' }, 'MOW LED AER SVX KZN OVB KJA UFA KUF CEK PEE GOJ KGD VVO TJM IKT KRR ROV MRV MCX OMS VOG REN GSV ULV BAX TOF KEJ NOZ KHV YKS SGC MMK ARH PES ASF STW GRV OGZ NAL VOZ HTA BQS UUS PKC GDX RGK СМЧ ЯГО СНГ'],
  [{ ru: 'Новая Зеландия', en: 'New Zealand' }, 'AKL CHC ZQN'],
  [{ ru: 'Австралия', en: 'Australia' }, 'SYD MEL BNE PER'],
  [{ ru: 'Франция', en: 'France' }, 'PAR NCE'],
  [{ ru: 'Словакия', en: 'Slovakia' }, 'BTS'],
  [{ ru: 'Испания', en: 'Spain' }, 'BIO BCN MAD AGP'],
  [{ ru: 'Италия', en: 'Italy' }, 'ROM MIL VCE NAP'],
  [{ ru: 'Германия', en: 'Germany' }, 'BER MUC FRA'],
  [{ ru: 'Греция', en: 'Greece' }, 'ATH SKG HER RHO'],
  [{ ru: 'Кипр', en: 'Cyprus' }, 'LCA PFO'],
  [{ ru: 'Португалия', en: 'Portugal' }, 'LIS OPO'],
  [{ ru: 'Нидерланды', en: 'Netherlands' }, 'AMS'],
  [{ ru: 'Австрия', en: 'Austria' }, 'VIE'],
  [{ ru: 'Швейцария', en: 'Switzerland' }, 'ZRH GVA'],
  [{ ru: 'Чехия', en: 'Czechia' }, 'PRG'],
  [{ ru: 'Венгрия', en: 'Hungary' }, 'BUD'],
  [{ ru: 'Хорватия', en: 'Croatia' }, 'ZAG SPU DBV'],
  [{ ru: 'Словения', en: 'Slovenia' }, 'LJU'],
  [{ ru: 'Польша', en: 'Poland' }, 'WAW KRK GDN'],
  [{ ru: 'Финляндия', en: 'Finland' }, 'HEL'],
  [{ ru: 'Швеция', en: 'Sweden' }, 'STO'],
  [{ ru: 'Норвегия', en: 'Norway' }, 'OSL'],
  [{ ru: 'Дания', en: 'Denmark' }, 'CPH'],
  [{ ru: 'Исландия', en: 'Iceland' }, 'KEF'],
  [{ ru: 'Мальта', en: 'Malta' }, 'MLA'],
  [{ ru: 'Бельгия', en: 'Belgium' }, 'BRU'],
  [{ ru: 'Болгария', en: 'Bulgaria' }, 'SOF VAR BOJ'],
  [{ ru: 'Румыния', en: 'Romania' }, 'BUH'],
  [{ ru: 'Албания', en: 'Albania' }, 'TIA'],
  [{ ru: 'Босния и Герцеговина', en: 'Bosnia and Herzegovina' }, 'SJJ'],
  [{ ru: 'Северная Македония', en: 'North Macedonia' }, 'SKP'],
  [{ ru: 'Великобритания', en: 'United Kingdom' }, 'LON EDI'],
  [{ ru: 'Ирландия', en: 'Ireland' }, 'DUB'],
  [{ ru: 'Кувейт', en: 'Kuwait' }, 'KWI'],
  [{ ru: 'Абхазия', en: 'Abkhazia' }, 'SUI'],
  [{ ru: 'Япония', en: 'Japan' }, 'TYO OSA'],
  [{ ru: 'Южная Корея', en: 'South Korea' }, 'SEL'],
  [{ ru: 'Индия', en: 'India' }, 'DEL GOI BOM'],
  [{ ru: 'Малайзия', en: 'Malaysia' }, 'KUL'],
  [{ ru: 'Сингапур', en: 'Singapore' }, 'SIN'],
  [{ ru: 'Филиппины', en: 'Philippines' }, 'MNL CEB'],
  [{ ru: 'Тайвань', en: 'Taiwan' }, 'TPE'],
  [{ ru: 'Гонконг', en: 'Hong Kong' }, 'HKG'],
  [{ ru: 'Макао', en: 'Macao' }, 'MFM'],
  [{ ru: 'Бангладеш', en: 'Bangladesh' }, 'DAC'],
  [{ ru: 'Пакистан', en: 'Pakistan' }, 'ISB'],
  [{ ru: 'США', en: 'United States' }, 'NYC WAS LAX MIA SFO'],
  [{ ru: 'Канада', en: 'Canada' }, 'YTO YVR'],
  [{ ru: 'Мексика', en: 'Mexico' }, 'CUN MEX'],
  [{ ru: 'Бразилия', en: 'Brazil' }, 'RIO SAO FLN'],
  [{ ru: 'Аргентина', en: 'Argentina' }, 'BUE'],
  [{ ru: 'Чили', en: 'Chile' }, 'SCL'],
  [{ ru: 'Перу', en: 'Peru' }, 'LIM'],
  [{ ru: 'Колумбия', en: 'Colombia' }, 'BOG CTG'],
  [{ ru: 'Кабо-Верде', en: 'Cape Verde' }, 'RAI'],
  [{ ru: 'ЮАР', en: 'South Africa' }, 'CPT JNB'],
  [{ ru: 'Эфиопия', en: 'Ethiopia' }, 'ADD'],
  [{ ru: 'Мадагаскар', en: 'Madagascar' }, 'TNR'],
  [{ ru: 'Намибия', en: 'Namibia' }, 'WDH'],
  [{ ru: 'Израиль', en: 'Israel' }, 'TLV'],
  [{ ru: 'Иран', en: 'Iran' }, 'THR'],
];

const COUNTRY_BY_CODE = new Map();
for (const destination of Object.values(VISA_DESTINATIONS)) {
  COUNTRY_BY_CODE.set(destination.code, destination.country);
}
for (const [country, codes] of COUNTRY_GROUPS) {
  for (const code of codes.split(' ')) COUNTRY_BY_CODE.set(code, country);
}

const COUNTRY_NAMES = new Set();
for (const country of COUNTRY_BY_CODE.values()) {
  COUNTRY_NAMES.add(country.ru.toLocaleLowerCase('ru'));
  COUNTRY_NAMES.add(country.en.toLocaleLowerCase('en'));
}

export function placeMeta(code, name) {
  const country = COUNTRY_BY_CODE.get(code) || { ru: name, en: name };
  const normalizedName = String(name || '').toLocaleLowerCase('ru');
  return {
    country,
    kind: COUNTRY_NAMES.has(normalizedName) ? 'country' : 'city',
  };
}

export { COUNTRY_BY_CODE };
