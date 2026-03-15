import { useState, useCallback, useRef } from "react";

// ─── TOKENS ──────────────────────────────────────────────────────────────
const T = {
  bg:"#0b0d11",card:"#13161e",cardHi:"#191d28",border:"#1c2030",borderHi:"#2a3050",
  text:"#dfe2ec",muted:"#5c6484",dim:"#363d58",
  accent:"#5b7fff",accentDim:"rgba(91,127,255,0.12)",
  green:"#2dd4a0",greenDim:"rgba(45,212,160,0.12)",
  orange:"#f0933a",orangeDim:"rgba(240,147,58,0.12)",
  purple:"#9580ff",purpleDim:"rgba(149,128,255,0.10)",
  pink:"#e870a0",red:"#ff5c6a",yellow:"#fbbf24",yellowDim:"rgba(251,191,36,0.12)",
  empty:"rgba(255,255,255,0.03)",emptyBorder:"rgba(255,255,255,0.12)",
  promptGray:"#3a3f55",drop:"rgba(91,127,255,0.25)",
};
const MONO=`'IBM Plex Mono','JetBrains Mono',monospace`;
const SANS=`'Outfit','DM Sans',sans-serif`;

// ─── SHAPES ──────────────────────────────────────────────────────────────
const shapeR={
  triangle:(sz,f,c,sc)=>(<svg width={sz} height={sz} viewBox="0 0 40 40"><polygon points="20,4 38,36 2,36" fill={f?c:"none"} stroke={f?"none":sc} strokeWidth="2" strokeDasharray={f?"":"4,3"}/></svg>),
  circle:(sz,f,c,sc)=>(<svg width={sz} height={sz} viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill={f?c:"none"} stroke={f?"none":sc} strokeWidth="2" strokeDasharray={f?"":"4,3"}/></svg>),
  diamond:(sz,f,c,sc)=>(<svg width={sz} height={sz} viewBox="0 0 40 40"><polygon points="20,3 37,20 20,37 3,20" fill={f?c:"none"} stroke={f?"none":sc} strokeWidth="2" strokeDasharray={f?"":"4,3"}/></svg>),
  star:(sz,f,c,sc)=>{const p=[];for(let i=0;i<5;i++){const a1=-(Math.PI/2)+(2*Math.PI*i/5),a2=a1+Math.PI/5;p.push(`${20+17*Math.cos(a1)},${20+17*Math.sin(a1)}`);p.push(`${20+8*Math.cos(a2)},${20+8*Math.sin(a2)}`);}return (<svg width={sz} height={sz} viewBox="0 0 40 40"><polygon points={p.join(" ")} fill={f?c:"none"} stroke={f?"none":sc} strokeWidth="2" strokeDasharray={f?"":"4,3"}/></svg>);},
  hexagon:(sz,f,c,sc)=>{const p=[];for(let i=0;i<6;i++){const a=(Math.PI/6)+(2*Math.PI*i/6);p.push(`${20+17*Math.cos(a)},${20+17*Math.sin(a)}`);}return (<svg width={sz} height={sz} viewBox="0 0 40 40"><polygon points={p.join(" ")} fill={f?c:"none"} stroke={f?"none":sc} strokeWidth="2" strokeDasharray={f?"":"4,3"}/></svg>);},
  square:(sz,f,c,sc)=>(<svg width={sz} height={sz} viewBox="0 0 40 40"><rect x="5" y="5" width="30" height="30" rx="3" fill={f?c:"none"} stroke={f?"none":sc} strokeWidth="2" strokeDasharray={f?"":"4,3"}/></svg>),
  pentagon:(sz,f,c,sc)=>{const p=[];for(let i=0;i<5;i++){const a=-Math.PI/2+(2*Math.PI*i/5);p.push(`${20+17*Math.cos(a)},${20+17*Math.sin(a)}`);}return (<svg width={sz} height={sz} viewBox="0 0 40 40"><polygon points={p.join(" ")} fill={f?c:"none"} stroke={f?"none":sc} strokeWidth="2" strokeDasharray={f?"":"4,3"}/></svg>);},
  cross:(sz,f,c,sc)=>(<svg width={sz} height={sz} viewBox="0 0 40 40"><path d="M15,5H25V15H35V25H25V35H15V25H5V15H15Z" fill={f?c:"none"} stroke={f?"none":sc} strokeWidth="2" strokeDasharray={f?"":"4,3"}/></svg>),
};
const SHAPE_LIST=Object.keys(shapeR);
const rs=(n,sz,f,c,sc)=>(shapeR[n]||shapeR.circle)(sz,f,c,sc||T.emptyBorder);
const dc=o=>JSON.parse(JSON.stringify(o));
const uid=()=>"id-"+Date.now()+"-"+Math.random().toString(36).slice(2,6);

// ─── PROMPT VERSIONING ───────────────────────────────────────────────────
// Each prompt is { text, version, updatedAt }
function mkPrompt(text, ver=1) {
  return { text: text||"", version: ver, updatedAt: new Date().toISOString().slice(0,10) };
}

// ─── DEFAULT SLOTS ───────────────────────────────────────────────────────
function defaultSlots() {
  return {
    promote: [
      {id:"positioning",label:"Позиционирование продукта",shape:"triangle",prompt:mkPrompt("Сгенерировать позиционирование на основе MVP-отчёта и ответов на стратегические вопросы. Включить: целевую аудиторию, УТП, ключевые преимущества, формулировку ценности."),children:[]},
      {id:"portfolio",label:"Портфолио и опыт",shape:"circle",prompt:mkPrompt("Создать презентацию релевантного опыта для заказчика. Структура: описание проекта, задача, решение, результат, технологии."),children:[]},
      {id:"kp-check",label:"Чек-лист для КП",shape:"diamond",prompt:mkPrompt("Сформировать список вопросов менеджера для сбора информации под коммерческое предложение. Группы: бюджет, сроки, технические требования, интеграции."),children:[]},
      {id:"channels",label:"Каналы привлечения",shape:"star",prompt:mkPrompt("Составить карту каналов привлечения клиентов с метриками и приоритетами"),children:[
        {id:"ch-email",label:"Рассылки",shape:"circle",prompt:mkPrompt("Стратегия email-маркетинга: сегменты, цепочки, частота, метрики"),children:[]},
        {id:"ch-social",label:"Соцсети",shape:"triangle",prompt:mkPrompt("SMM-стратегия: платформы, контент-план, KPI"),children:[]},
        {id:"ch-cold",label:"Холодные звонки",shape:"diamond",prompt:mkPrompt("Скрипты холодных звонков с обработкой возражений"),children:[]},
        {id:"ch-ads",label:"Реклама",shape:"star",prompt:mkPrompt("Рекламная стратегия: каналы, бюджет, таргетинг, креативы"),children:[]},
      ]},
      {id:"cold-tpl",label:"Скрипты и письма",shape:"hexagon",prompt:mkPrompt("Серия холодных писем для целевого сегмента с A/B вариантами. 3-5 писем в цепочке."),children:[]},
      {id:"competitors",label:"Конкурентный анализ",shape:"pentagon",prompt:mkPrompt("Конкурентный анализ: цена, функциональность, позиционирование, слабые места. Таблица сравнения."),children:[]},
      {id:"media-data",label:"Медиа-данные",shape:"square",prompt:mkPrompt("Подготовить маркетинговые материалы: логотипы, описания, скриншоты, ключевые факты"),children:[
        {id:"mk-logo",label:"Логотипы",shape:"circle",prompt:mkPrompt("Пакет логотипов и гайдлайн по использованию"),children:[]},
        {id:"mk-screens",label:"Скриншоты",shape:"square",prompt:mkPrompt("Набор скриншотов продукта для маркетинга"),children:[]},
        {id:"mk-texts",label:"Описания",shape:"triangle",prompt:mkPrompt("Маркетинговые описания продукта разной длины: 50, 150, 500 слов"),children:[]},
      ]},
    ],
    dev: [
      {id:"ui-modules",label:"Модули интерфейса",shape:"hexagon",prompt:mkPrompt("Спецификация переиспользуемого модуля: пропсы, состояния, события, зависимости"),children:[
        {id:"mod-kanban",label:"Канбан-доска",shape:"square",prompt:mkPrompt("Канбан: колонки, карточки, drag-n-drop, фильтры, WIP-лимиты"),children:[]},
        {id:"mod-dash",label:"Панель метрик",shape:"circle",prompt:mkPrompt("Дашборд: виджеты, источники данных, обновление в реальном времени"),children:[]},
        {id:"mod-tables",label:"Таблицы и списки",shape:"diamond",prompt:mkPrompt("Таблицы: сортировка, фильтры, пагинация, экспорт, inline-редактирование"),children:[]},
      ]},
      {id:"ui-principles",label:"Правила стилей",shape:"triangle",prompt:mkPrompt("Стандарты: типографика, цветовая палитра, отступы, компоненты, адаптив"),children:[]},
      {id:"architecture",label:"Архитектура и стек",shape:"diamond",prompt:mkPrompt("Стек: React/Next.js, БД, API-стандарты, деплой, CI/CD, мониторинг"),children:[]},
      {id:"owner-panel",label:"Панель владельца",shape:"star",prompt:mkPrompt("Панель управления: ключевые метрики, статусы задач, контроль доступа, уведомления"),children:[]},
      {id:"data-map",label:"Карта данных",shape:"circle",prompt:mkPrompt("Карта сущностей, связей между данными, поиск дубликатов, потоки данных"),children:[]},
      {id:"lessons",label:"База ошибок и решений",shape:"square",prompt:mkPrompt("Документировать: контекст → ошибка → причина → решение → превентивная мера"),children:[]},
    ],
  };
}

// ─── TEMPLATES ────────────────────────────────────────────────────────────
const initTemplates=[
  {id:"tpl-universal",name:"Универсальный",icon:"◆",desc:"Полный набор кармашков для любого проекта",slots:defaultSlots(),
    principles:[
      {id:"pr-react",title:"React + адаптив",prompt:mkPrompt("Все проекты строим на React. Mobile-first, адаптив под все устройства. Брейкпоинты: 320, 768, 1024, 1440.")},
      {id:"pr-kanban",title:"Канбан в каждом проекте",prompt:mkPrompt("Каждый проект включает канбан. Колонки: Бэклог → В работе → На проверке → Готово. WIP-лимит: 3.")},
    ]},
  {id:"tpl-website",name:"Сайт",icon:"◎",desc:"Кармашки и принципы под разработку сайта",slots:{
    promote:[
      {id:"positioning",label:"Позиционирование сайта",shape:"triangle",prompt:mkPrompt("Позиционирование: ЦА, УТП, ключевые сообщения, тон коммуникации"),children:[]},
      {id:"portfolio",label:"Примеры сайтов",shape:"circle",prompt:mkPrompt("Референсы аналогичных сайтов с комментариями по UX/UI"),children:[]},
      {id:"competitors",label:"Конкурентный анализ",shape:"pentagon",prompt:mkPrompt("Анализ сайтов конкурентов: UX, контент, SEO, скорость загрузки"),children:[]},
      {id:"media-data",label:"Медиа-данные",shape:"square",prompt:mkPrompt("Контент для наполнения сайта"),children:[
        {id:"mk-logo",label:"Логотипы",shape:"circle",prompt:mkPrompt("Логотипы, фавиконки, OG-изображения"),children:[]},
        {id:"mk-texts",label:"Тексты страниц",shape:"triangle",prompt:mkPrompt("SEO-тексты для каждой страницы сайта"),children:[]},
        {id:"mk-photo",label:"Фотоматериалы",shape:"diamond",prompt:mkPrompt("Фотографии, иллюстрации, графика для сайта"),children:[]},
      ]},
    ],
    dev:[
      {id:"ui-principles",label:"Правила стилей",shape:"triangle",prompt:mkPrompt("Дизайн-система сайта: шрифты, цвета, сетка, компоненты"),children:[]},
      {id:"architecture",label:"Архитектура и стек",shape:"diamond",prompt:mkPrompt("Next.js, App Router, серверные компоненты, хостинг, CMS"),children:[]},
      {id:"seo",label:"SEO-чеклист",shape:"hexagon",prompt:mkPrompt("Мета-теги, OG, структурированные данные, robots.txt, sitemap"),children:[]},
      {id:"perf",label:"Производительность",shape:"star",prompt:mkPrompt("Core Web Vitals, оптимизация изображений, lazy loading, кеш"),children:[]},
      {id:"lessons",label:"База ошибок",shape:"square",prompt:mkPrompt("Типичные ошибки при разработке сайтов"),children:[]},
    ]},
    principles:[
      {id:"pr-nextjs",title:"Next.js + SSR",prompt:mkPrompt("Next.js, App Router, серверные компоненты. ISR для страниц каталога. Edge runtime для API.")},
      {id:"pr-adapt",title:"Адаптив",prompt:mkPrompt("Mobile-first. Брейкпоинты: 320, 768, 1024, 1440. Тестируем на реальных устройствах.")},
      {id:"pr-seo",title:"SEO по умолчанию",prompt:mkPrompt("Каждая страница: title, description, OG, canonical, structured data. Автогенерация sitemap.")},
    ]},
  {id:"tpl-pwa",name:"Приложение",icon:"▦",desc:"Мобильное приложение или PWA",slots:{
    promote:[
      {id:"positioning",label:"Позиционирование приложения",shape:"triangle",prompt:mkPrompt("ЦА, сценарии использования, ключевые экраны"),children:[]},
      {id:"portfolio",label:"Примеры приложений",shape:"circle",prompt:mkPrompt("Референсы аналогичных приложений"),children:[]},
      {id:"channels",label:"Каналы дистрибуции",shape:"star",prompt:mkPrompt("App Store, Google Play, PWA, QR, deep links"),children:[]},
    ],
    dev:[
      {id:"ui-modules",label:"Модули интерфейса",shape:"hexagon",prompt:mkPrompt("Библиотека мобильных компонентов"),children:[
        {id:"mod-nav",label:"Навигация",shape:"triangle",prompt:mkPrompt("Bottom tabs, drawer, stack navigator"),children:[]},
        {id:"mod-forms",label:"Формы ввода",shape:"square",prompt:mkPrompt("Валидация, маски, клавиатура, автозаполнение"),children:[]},
      ]},
      {id:"ui-principles",label:"Правила стилей",shape:"triangle",prompt:mkPrompt("Touch-first: 44px мин. касание, жесты, haptic feedback"),children:[]},
      {id:"architecture",label:"Архитектура",shape:"diamond",prompt:mkPrompt("PWA manifest, service worker, офлайн-first, фоновая синхронизация"),children:[]},
      {id:"data-map",label:"Карта данных",shape:"circle",prompt:mkPrompt("IndexedDB, синхронизация офлайн/онлайн, конфликты"),children:[]},
      {id:"lessons",label:"База ошибок",shape:"square",prompt:mkPrompt("Типичные ошибки PWA"),children:[]},
    ]},
    principles:[
      {id:"pr-pwa",title:"PWA-стандарт",prompt:mkPrompt("Manifest, service worker, офлайн-first. Иконки, splash, theme-color.")},
      {id:"pr-touch",title:"Touch-first",prompt:mkPrompt("44px мин. касание, swipe-жесты, haptic feedback, pull-to-refresh.")},
    ]},
];

// ─── HELPERS ──────────────────────────────────────────────────────────────
function initData(slots){const d={};for(const s of slots){d[s.id]=0;if(s.children?.length)Object.assign(d,initData(s.children));}return d;}
function countSlots(slots,data){let t=0,f=0;for(const s of slots){t++;if((data[s.id]||0)>0)f++;if(s.children?.length){const r=countSlots(s.children,data);t+=r.t;f+=r.f;}}return{t,f};}
function flatSlots(slots){let r=[];for(const s of slots){r.push(s);if(s.children?.length)r=r.concat(flatSlots(s.children));}return r;}
function makeVersions(count,label){if(!count)return[];const vs=[];const bd=new Date(2025,2,10);for(let i=0;i<count;i++){const d=new Date(bd);d.setDate(d.getDate()-i*45);vs.push({v:`v${count-i}.0`,date:d.toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit",year:"2-digit"}),filename:`${label}_v${count-i}.pdf`});}return vs;}

// Find a slot's template prompt version for comparison
function findTplSlotPrompt(tplSlots, slotId) {
  for (const s of tplSlots) {
    if (s.id === slotId) return s.prompt;
    if (s.children?.length) {
      const found = findTplSlotPrompt(s.children, slotId);
      if (found) return found;
    }
  }
  return null;
}

// ─── INLINE PROMPT EDITOR ────────────────────────────────────────────────
function PromptEditor({ prompt, onSave, onClose, tplPrompt, onAcceptTpl, label }) {
  const [text, setText] = useState(prompt?.text || "");
  const hasTplUpdate = tplPrompt && tplPrompt.version > (prompt?.version || 0) && tplPrompt.text !== (prompt?.text || "");

  return (
    <div style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",marginTop:6,
      zIndex:300,background:"#1a1e2e",border:`1px solid ${T.borderHi}`,borderRadius:8,padding:"10px 12px",
      width:280,boxShadow:"0 8px 28px rgba(0,0,0,0.6)",whiteSpace:"normal"}}
      onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
        <span style={{color:T.pink,fontSize:8,fontFamily:MONO,fontWeight:700}}>⚡ ПРОМПТ — {label}</span>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <span style={{fontSize:8,fontFamily:MONO,color:T.dim}}>v{prompt?.version||1}</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.dim,cursor:"pointer",fontSize:12,padding:0}}>✕</button>
        </div>
      </div>

      {/* Template update notification */}
      {hasTplUpdate && (
        <div style={{marginBottom:8,padding:"6px 8px",background:T.yellowDim,borderRadius:5,border:`1px solid ${T.yellow}33`}}>
          <div style={{fontSize:8,fontFamily:MONO,color:T.yellow,fontWeight:700,marginBottom:3}}>
            ⚠ В шаблоне обновлён промпт (v{tplPrompt.version})
          </div>
          <div style={{fontSize:9,fontFamily:SANS,color:T.muted,lineHeight:1.4,marginBottom:4,maxHeight:60,overflow:"auto"}}>
            {tplPrompt.text}
          </div>
          <button onClick={()=>{setText(tplPrompt.text);onAcceptTpl();}}
            style={{padding:"3px 8px",borderRadius:3,border:"none",background:T.yellow,color:"#000",
              fontFamily:MONO,fontSize:8,fontWeight:700,cursor:"pointer"}}>
            Принять версию из шаблона
          </button>
        </div>
      )}

      <textarea value={text} onChange={e=>setText(e.target.value)} rows={5}
        style={{width:"100%",padding:"6px 8px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:5,
          color:T.text,fontFamily:SANS,fontSize:10,lineHeight:1.5,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
      <div style={{display:"flex",gap:4,justifyContent:"flex-end",marginTop:6}}>
        <button onClick={onClose} style={{padding:"3px 8px",borderRadius:3,border:`1px solid ${T.border}`,background:"none",color:T.dim,fontFamily:MONO,fontSize:8,cursor:"pointer"}}>Отмена</button>
        <button onClick={()=>onSave(text)} style={{padding:"3px 8px",borderRadius:3,border:"none",background:T.accent,color:"#fff",fontFamily:MONO,fontSize:8,fontWeight:700,cursor:"pointer"}}>Сохранить</button>
      </div>
    </div>
  );
}

// ─── SLOT CHIP ───────────────────────────────────────────────────────────
function SlotChip({slot,count,color,onDrop,onDownload,globalPrompt,setGlobalPrompt,allData,tplSlots,onPromptSave,onAcceptTplPrompt,depth=0}) {
  const filled=count>0;
  const [hover,setHover]=useState(false);
  const [dragOver,setDragOver]=useState(false);
  const [childOpen,setChildOpen]=useState(false);
  const fileRef=useRef(null);
  const hasKids=slot.children?.length>0;
  const myOpen=globalPrompt===slot.id;
  const editing=globalPrompt===slot.id+"-edit";

  // Check if template has a newer prompt
  const tplPrompt = tplSlots ? findTplSlotPrompt(tplSlots, slot.id) : null;
  const hasTplUpdate = tplPrompt && slot.prompt && tplPrompt.version > slot.prompt.version && tplPrompt.text !== slot.prompt.text;

  return (
    <div style={{display:"inline-flex",flexDirection:"column",alignItems:"center",position:"relative"}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}
        onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>

        {/* shape */}
        <div
          onDragOver={e=>{e.preventDefault();e.stopPropagation();setDragOver(true);}}
          onDragLeave={e=>{e.preventDefault();setDragOver(false);}}
          onDrop={e=>{e.preventDefault();e.stopPropagation();setDragOver(false);if(e.dataTransfer.files[0])onDrop(slot.id,e.dataTransfer.files[0]);}}
          onClick={()=>{if(filled)onDownload(slot.id);else fileRef.current?.click();}}
          style={{cursor:"pointer",width:42,height:42,display:"flex",alignItems:"center",justifyContent:"center",
            borderRadius:8,background:dragOver?T.drop:"transparent",transition:"all 0.2s",
            transform:hover?"scale(1.12)":"scale(1)",filter:hover&&filled?`drop-shadow(0 0 8px ${color}55)`:"none",position:"relative"}}>
          {rs(slot.shape,38,filled,color,T.emptyBorder)}
          {count>1&&<div style={{position:"absolute",top:-3,right:-3,background:color,color:"#000",fontSize:8,fontWeight:800,fontFamily:MONO,width:15,height:15,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 6px ${color}66`}}>{count}</div>}
          {hover&&<span style={{position:"absolute",fontSize:14,opacity:0.5,pointerEvents:"none"}}>{filled?"↓":"+"}</span>}
          <input ref={fileRef} type="file" style={{display:"none"}} onChange={e=>{if(e.target.files[0])onDrop(slot.id,e.target.files[0]);e.target.value="";}}/>
        </div>

        {/* label */}
        <span style={{fontSize:9,fontFamily:SANS,color:filled?T.muted:T.dim,textAlign:"center",lineHeight:1.25,width:80,wordWrap:"break-word"}}>
          {slot.label}
        </span>

        {/* controls */}
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          {slot.prompt&&(
            <div style={{position:"relative",display:"flex",alignItems:"center"}}>
              <div onClick={e=>{e.stopPropagation();setGlobalPrompt(myOpen||editing?null:slot.id);}}
                style={{width:9,height:9,borderRadius:5,background:myOpen||editing?T.accent:T.promptGray,cursor:"pointer",transition:"all 0.15s"}} title="Промпт"/>
              {hasTplUpdate&&<div style={{position:"absolute",top:-2,right:-2,width:5,height:5,borderRadius:3,background:T.yellow,boxShadow:`0 0 4px ${T.yellow}`}} title="Есть обновление из шаблона"/>}
            </div>
          )}
          {hasKids&&(
            <button onClick={e=>{e.stopPropagation();setChildOpen(!childOpen);}}
              style={{background:childOpen?`${color}22`:"rgba(255,255,255,0.04)",border:`1px solid ${childOpen?color+"44":T.emptyBorder}`,
                borderRadius:4,padding:"1px 5px",fontSize:8,fontFamily:MONO,color:childOpen?color:T.dim,cursor:"pointer",display:"flex",alignItems:"center",gap:2}}>
              <span style={{transform:childOpen?"rotate(90deg)":"rotate(0)",transition:"transform 0.15s",display:"inline-block"}}>▶</span>
              <span>{slot.children.length}</span>
            </button>
          )}
        </div>
      </div>

      {/* View prompt (click gray dot) */}
      {myOpen&&!editing&&(
        <div style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",marginTop:6,
          zIndex:300,background:"#1a1e2e",border:`1px solid ${T.borderHi}`,borderRadius:7,padding:"8px 11px",
          width:240,boxShadow:"0 8px 28px rgba(0,0,0,0.6)",whiteSpace:"normal"}}
          onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
            <span style={{color:T.pink,fontSize:8,fontFamily:MONO,fontWeight:700}}>⚡ ПРОМПТ</span>
            <span style={{fontSize:8,fontFamily:MONO,color:T.dim}}>v{slot.prompt.version} · {slot.prompt.updatedAt}</span>
          </div>
          <div style={{fontSize:10,fontFamily:SANS,color:T.muted,lineHeight:1.5,marginBottom:6}}>{slot.prompt.text}</div>
          {hasTplUpdate&&(
            <div style={{padding:"4px 6px",background:T.yellowDim,borderRadius:4,marginBottom:6,fontSize:8,fontFamily:MONO,color:T.yellow}}>
              ⚠ Шаблон обновлён до v{tplPrompt.version}
            </div>
          )}
          <div style={{display:"flex",gap:4}}>
            <button onClick={()=>setGlobalPrompt(slot.id+"-edit")}
              style={{padding:"3px 8px",borderRadius:3,border:`1px solid ${T.border}`,background:"none",color:T.accent,fontFamily:MONO,fontSize:8,cursor:"pointer"}}>
              ✎ Редактировать
            </button>
            <button onClick={()=>setGlobalPrompt(null)} style={{padding:"3px 8px",borderRadius:3,border:`1px solid ${T.border}`,background:"none",color:T.dim,fontFamily:MONO,fontSize:8,cursor:"pointer"}}>Закрыть</button>
          </div>
        </div>
      )}

      {/* Edit prompt */}
      {editing&&(
        <PromptEditor
          prompt={slot.prompt}
          label={slot.label}
          tplPrompt={tplPrompt}
          onSave={text=>{onPromptSave(slot.id,text);setGlobalPrompt(null);}}
          onClose={()=>setGlobalPrompt(null)}
          onAcceptTpl={()=>onAcceptTplPrompt(slot.id)}
        />
      )}

      {/* sub-slots */}
      {hasKids&&childOpen&&(
        <div style={{marginTop:6,padding:"8px 6px",background:`${color}06`,borderRadius:7,border:`1px solid ${color}18`,
          display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
          {slot.children.map(ch=>(
            <SlotChip key={ch.id} slot={ch} count={allData[ch.id]||0} color={color}
              onDrop={onDrop} onDownload={onDownload} globalPrompt={globalPrompt} setGlobalPrompt={setGlobalPrompt}
              allData={allData} tplSlots={tplSlots} onPromptSave={onPromptSave} onAcceptTplPrompt={onAcceptTplPrompt} depth={depth+1}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PRINCIPLE CHIP ──────────────────────────────────────────────────────
function PrincipleChip({pr,onView,onUpload,onDownload,onEditPrompt,active,tplPr}) {
  const fileRef=useRef(null);
  const hasFile=!!pr.prompt?.text;
  const hasTplUpdate=tplPr&&tplPr.prompt&&pr.prompt&&tplPr.prompt.version>pr.prompt.version&&tplPr.prompt.text!==pr.prompt.text;
  return(
    <div style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:4,
      background:active?T.purpleDim:T.purpleDim,border:`1px solid ${active?T.purple+"44":T.purple+"22"}`,cursor:"pointer",transition:"all 0.15s",position:"relative"}}>
      <div style={{width:7,height:7,borderRadius:4,background:hasFile?T.purple:T.emptyBorder}}/>
      <span style={{fontSize:9,fontFamily:MONO,color:T.purple,fontWeight:600}} onClick={onView}>{pr.title}</span>
      {hasFile&&<span onClick={e=>{e.stopPropagation();onDownload();}} style={{fontSize:8,color:T.purple,opacity:0.5,cursor:"pointer"}} title="Скачать">↓</span>}
      {!hasFile&&<><span onClick={e=>{e.stopPropagation();fileRef.current?.click();}} style={{fontSize:8,color:T.purple,opacity:0.5,cursor:"pointer"}} title="Загрузить">+</span>
        <input ref={fileRef} type="file" style={{display:"none"}} onChange={e=>{if(e.target.files[0])onUpload(e.target.files[0]);e.target.value="";}}/></>}
      <span onClick={e=>{e.stopPropagation();onEditPrompt();}} style={{fontSize:8,color:T.purple,opacity:0.4,cursor:"pointer"}} title="Редактировать промпт">✎</span>
      {hasTplUpdate&&<div style={{position:"absolute",top:-2,right:-2,width:5,height:5,borderRadius:3,background:T.yellow,boxShadow:`0 0 4px ${T.yellow}`}} title="Обновление из шаблона"/>}
    </div>
  );
}

// ─── VERSION PANEL ───────────────────────────────────────────────────────
function VersionPanel({project,allSlots,section,color}) {
  const flat=flatSlots(allSlots);
  const filled=flat.filter(s=>(project.data[section][s.id]||0)>0);
  if(!filled.length) return (<div style={{fontSize:10,color:T.dim,fontFamily:MONO,padding:"4px 0"}}>Нет документов</div>);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:4}}>
      {filled.map(s=>{
        const count=project.data[section][s.id];
        const versions=makeVersions(count,s.label);
        return(
          <div key={s.id} style={{background:`${color}08`,borderRadius:5,padding:"6px 8px"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
              <div style={{width:12,height:12}}>{rs(s.shape,12,true,color)}</div>
              <span style={{fontSize:10,fontFamily:SANS,color:T.text,fontWeight:500}}>{s.label}</span>
              <span style={{fontSize:9,fontFamily:MONO,color:T.dim}}>{count} {count===1?"версия":count<5?"версии":"версий"}</span>
            </div>
            {versions.map((v,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"3px 6px 3px 20px",borderRadius:3,
                background:i===0?`${color}12`:"transparent",marginBottom:1}}>
                <span style={{fontSize:10,fontFamily:MONO,color:i===0?color:T.dim,fontWeight:i===0?700:400,width:30}}>{v.v}</span>
                <span style={{fontSize:10,fontFamily:MONO,color:T.dim,width:62}}>{v.date}</span>
                <span style={{fontSize:9,fontFamily:SANS,color:T.dim,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.filename}</span>
                <button style={{background:"none",border:`1px solid ${i===0?color+"44":T.border}`,borderRadius:3,padding:"2px 7px",
                  fontSize:9,fontFamily:MONO,color:i===0?color:T.dim,cursor:"pointer"}} title="Скачать версию">↓</button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── PROJECT ROW ─────────────────────────────────────────────────────────
function ProjectRow({project,templates,expanded,onToggle,onDataChange,showToast,onEditProject,onUpdateProjectPrompt,onAcceptTplPrompt,onUpdatePrinciplePrompt,onAcceptTplPrinciplePrompt}) {
  const tpl=templates.find(t=>t.id===project.templateId)||templates[0];
  const [globalPrompt,setGlobalPrompt]=useState(null);
  const [detailsOpen,setDetailsOpen]=useState(false);
  const [principleView,setPrincipleView]=useState(null);
  const [editingPrPrompt,setEditingPrPrompt]=useState(null);

  const allP=project.customSlots?.promote||tpl.slots.promote;
  const allD=project.customSlots?.dev||tpl.slots.dev;
  const principles=project.customPrinciples||tpl.principles||[];
  const ps=countSlots(allP,project.data.promote),ds=countSlots(allD,project.data.dev);
  const total=ps.t+ds.t,filled=ps.f+ds.f,pct=total>0?Math.round(filled/total*100):0;

  // Count how many slots/principles have template updates
  const countUpdates=()=>{
    let n=0;
    const check=(slots,tplSlots)=>{
      for(const s of slots){
        const tp=findTplSlotPrompt(tplSlots,s.id);
        if(tp&&s.prompt&&tp.version>s.prompt.version&&tp.text!==s.prompt.text)n++;
        if(s.children?.length)check(s.children,tplSlots);
      }
    };
    check(allP,tpl.slots.promote);check(allD,tpl.slots.dev);
    for(const pr of principles){const tplPr=(tpl.principles||[]).find(p=>p.id===pr.id);if(tplPr&&tplPr.prompt&&pr.prompt&&tplPr.prompt.version>pr.prompt.version&&tplPr.prompt.text!==pr.prompt.text)n++;}
    return n;
  };
  const updateCount=countUpdates();

  const handleDrop=section=>(slotId,file)=>{onDataChange(project.id,section,slotId,1);showToast(`📎 ${file.name} → ${slotId}`);};
  const handleDownload=section=>slotId=>showToast(`↓ Скачивание ${slotId}...`);

  const mini=(slots,data,c)=>slots.map(s=>{const f=(data[s.id]||0)>0;return (<div key={s.id} style={{width:11,height:11,opacity:f?1:0.15}}>{rs(s.shape,11,f,c,T.emptyBorder)}</div>);});

  return(
    <div style={{background:T.card,border:`1px solid ${expanded?T.borderHi:T.border}`,borderRadius:10,marginBottom:6,overflow:"hidden"}}
      onClick={()=>{if(globalPrompt&&!globalPrompt.endsWith("-edit"))setGlobalPrompt(null);}}>
      <div onClick={onToggle} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",cursor:"pointer"}}
        onMouseEnter={e=>e.currentTarget.style.background=T.cardHi} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        <span style={{color:project.status==="active"?T.green:T.dim,fontSize:7}}>●</span>
        <span style={{fontFamily:MONO,fontSize:12,fontWeight:700,color:T.text,letterSpacing:1,minWidth:80}}>{project.name}</span>
        <span style={{fontSize:8,fontFamily:MONO,color:T.dim,padding:"1px 5px",background:T.accentDim,borderRadius:3}}>{tpl.icon} {tpl.name}</span>
        {updateCount>0&&<span style={{fontSize:8,fontFamily:MONO,padding:"1px 5px",borderRadius:3,background:T.yellowDim,color:T.yellow,border:`1px solid ${T.yellow}33`}}>⚠ {updateCount}</span>}
        {!expanded&&<div style={{display:"flex",gap:2,alignItems:"center",flex:1,justifyContent:"flex-end"}}>
          {mini(allP,project.data.promote,T.green)}
          <div style={{width:1,height:9,background:T.dim,margin:"0 1px"}}/>
          {mini(allD,project.data.dev,T.orange)}
        </div>}
        <div style={{display:"flex",alignItems:"center",gap:4,minWidth:48}}>
          <div style={{width:32,height:3,background:T.empty,borderRadius:2,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${pct}%`,background:pct===100?T.green:T.accent,borderRadius:2}}/>
          </div>
          <span style={{fontSize:9,fontFamily:MONO,color:T.dim}}>{pct}%</span>
        </div>
        <span style={{fontSize:9,color:T.dim,transform:expanded?"rotate(180deg)":"rotate(0)",transition:"transform 0.2s"}}>▼</span>
      </div>

      {expanded&&(
        <div style={{padding:"2px 14px 14px"}}>
          {/* Principles */}
          {principles.length>0&&(
            <div style={{marginBottom:10}}>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}>
                <span style={{fontSize:8,fontFamily:MONO,color:T.purple,fontWeight:700,letterSpacing:1,marginRight:4}}>ПРИНЦИПЫ:</span>
                {principles.map(pr=>{
                  const tplPr=(tpl.principles||[]).find(p=>p.id===pr.id);
                  return <PrincipleChip key={pr.id} pr={pr} active={principleView===pr.id}
                    tplPr={tplPr}
                    onView={()=>setPrincipleView(principleView===pr.id?null:pr.id)}
                    onUpload={f=>showToast(`📎 Принцип «${pr.title}» загружен: ${f.name}`)}
                    onDownload={()=>showToast(`↓ Скачивание «${pr.title}»...`)}
                    onEditPrompt={()=>setEditingPrPrompt(editingPrPrompt===pr.id?null:pr.id)}/>;
                })}
              </div>
              {/* Principle content view */}
              {principleView&&principles.find(p=>p.id===principleView)?.prompt?.text&&(
                <div style={{marginTop:6,padding:"8px 10px",background:T.purpleDim,borderRadius:6,border:`1px solid ${T.purple}22`,
                  fontSize:10,fontFamily:SANS,color:T.muted,lineHeight:1.6}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontFamily:MONO,fontSize:8,color:T.purple,fontWeight:700}}>📄 {principles.find(p=>p.id===principleView).title}</span>
                    <span style={{fontSize:8,fontFamily:MONO,color:T.dim}}>v{principles.find(p=>p.id===principleView).prompt.version}</span>
                  </div>
                  {principles.find(p=>p.id===principleView).prompt.text}
                </div>
              )}
              {/* Principle prompt editor */}
              {editingPrPrompt&&(()=>{
                const pr=principles.find(p=>p.id===editingPrPrompt);
                const tplPr=(tpl.principles||[]).find(p=>p.id===editingPrPrompt);
                if(!pr)return null;
                return(
                  <div style={{marginTop:6,position:"relative"}}>
                    <PromptEditor
                      prompt={pr.prompt}
                      label={pr.title}
                      tplPrompt={tplPr?.prompt}
                      onSave={text=>{onUpdatePrinciplePrompt(project.id,pr.id,text);setEditingPrPrompt(null);}}
                      onClose={()=>setEditingPrPrompt(null)}
                      onAcceptTpl={()=>{onAcceptTplPrinciplePrompt(project.id,pr.id);setEditingPrPrompt(null);}}
                    />
                  </div>
                );
              })()}
            </div>
          )}

          {/* Promote */}
          <div style={{marginBottom:10}}>
            <div style={{fontSize:9,fontFamily:MONO,color:T.green,fontWeight:700,letterSpacing:2,marginBottom:6}}>▲ ПРОДВИЖЕНИЕ</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
              {allP.map(s=><SlotChip key={s.id} slot={s} count={project.data.promote[s.id]||0} color={T.green}
                onDrop={handleDrop("promote")} onDownload={handleDownload("promote")}
                globalPrompt={globalPrompt} setGlobalPrompt={setGlobalPrompt} allData={project.data.promote}
                tplSlots={tpl.slots.promote}
                onPromptSave={(sid,text)=>onUpdateProjectPrompt(project.id,"promote",sid,text)}
                onAcceptTplPrompt={sid=>onAcceptTplPrompt(project.id,"promote",sid)}/>)}
            </div>
          </div>

          {/* Dev */}
          <div style={{marginBottom:10}}>
            <div style={{fontSize:9,fontFamily:MONO,color:T.orange,fontWeight:700,letterSpacing:2,marginBottom:6}}>■ РАЗРАБОТКА</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
              {allD.map(s=><SlotChip key={s.id} slot={s} count={project.data.dev[s.id]||0} color={T.orange}
                onDrop={handleDrop("dev")} onDownload={handleDownload("dev")}
                globalPrompt={globalPrompt} setGlobalPrompt={setGlobalPrompt} allData={project.data.dev}
                tplSlots={tpl.slots.dev}
                onPromptSave={(sid,text)=>onUpdateProjectPrompt(project.id,"dev",sid,text)}
                onAcceptTplPrompt={sid=>onAcceptTplPrompt(project.id,"dev",sid)}/>)}
            </div>
          </div>

          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <button onClick={()=>setDetailsOpen(!detailsOpen)} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:4,padding:"4px 10px",fontSize:9,fontFamily:MONO,color:T.dim,cursor:"pointer"}}>
              {detailsOpen?"Скрыть":"Даты и версии"} {detailsOpen?"▲":"▼"}</button>
            <button onClick={()=>onEditProject(project.id)} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:4,padding:"4px 10px",fontSize:9,fontFamily:MONO,color:T.muted,cursor:"pointer"}}>⚙ Редактировать проект</button>
          </div>

          {detailsOpen&&(
            <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:8}}>
              <div><div style={{fontSize:9,fontFamily:MONO,color:T.green,fontWeight:700,marginBottom:4}}>▲ ПРОДВИЖЕНИЕ</div>
                <VersionPanel project={project} allSlots={allP} section="promote" color={T.green}/></div>
              <div><div style={{fontSize:9,fontFamily:MONO,color:T.orange,fontWeight:700,marginBottom:4}}>■ РАЗРАБОТКА</div>
                <VersionPanel project={project} allSlots={allD} section="dev" color={T.orange}/></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SLOT EDITOR ─────────────────────────────────────────────────────────
function SlotListEditor({slots,setSlots,color,sectionLabel}) {
  const [newLabel,setNewLabel]=useState("");
  const [newShape,setNewShape]=useState("circle");
  const [newPrompt,setNewPrompt]=useState("");
  const [editingIdx,setEditingIdx]=useState(null);
  const [editText,setEditText]=useState("");

  const add=()=>{if(!newLabel.trim())return;setSlots([...slots,{id:uid(),label:newLabel.trim(),shape:newShape,prompt:mkPrompt(newPrompt.trim()),children:[]}]);setNewLabel("");setNewPrompt("");};
  const remove=i=>{const n=[...slots];n.splice(i,1);setSlots(n);};
  const saveEdit=(i)=>{const n=dc(slots);n[i].prompt={...n[i].prompt,text:editText,version:(n[i].prompt.version||1)+1,updatedAt:new Date().toISOString().slice(0,10)};setSlots(n);setEditingIdx(null);};

  return(
    <div>
      <div style={{fontSize:9,fontFamily:MONO,color,fontWeight:700,letterSpacing:1,marginBottom:6}}>{sectionLabel}</div>
      {slots.map((s,i)=>(
        <div key={s.id}>
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"5px 8px",marginBottom:2,background:T.bg,borderRadius:4,border:`1px solid ${T.border}`}}>
            <div style={{width:14,height:14}}>{rs(s.shape,14,true,color)}</div>
            <span style={{flex:1,fontSize:10,fontFamily:SANS,color:T.text}}>{s.label}</span>
            {s.children?.length>0&&<span style={{fontSize:8,fontFamily:MONO,color:T.dim}}>+{s.children.length}</span>}
            <span style={{fontSize:8,fontFamily:MONO,color:T.dim}}>v{s.prompt?.version||1}</span>
            <button onClick={()=>{setEditingIdx(editingIdx===i?null:i);setEditText(s.prompt?.text||"");}} style={{background:"none",border:"none",color:T.accent,cursor:"pointer",fontSize:9,padding:"0 2px"}} title="Редактировать промпт">✎</button>
            <button onClick={()=>remove(i)} style={{background:"none",border:"none",color:T.red,cursor:"pointer",fontSize:11,padding:"0 3px"}}>✕</button>
          </div>
          {editingIdx===i&&(
            <div style={{padding:"6px 8px 8px 26px",marginBottom:4}}>
              <div style={{fontSize:8,fontFamily:MONO,color:T.pink,marginBottom:3}}>⚡ Промпт для «{s.label}»</div>
              <textarea value={editText} onChange={e=>setEditText(e.target.value)} rows={3}
                style={{width:"100%",padding:"5px 7px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:4,color:T.text,fontFamily:SANS,fontSize:10,lineHeight:1.5,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
              <div style={{display:"flex",gap:3,marginTop:4}}>
                <button onClick={()=>setEditingIdx(null)} style={{padding:"2px 7px",borderRadius:3,border:`1px solid ${T.border}`,background:"none",color:T.dim,fontFamily:MONO,fontSize:8,cursor:"pointer"}}>Отмена</button>
                <button onClick={()=>saveEdit(i)} style={{padding:"2px 7px",borderRadius:3,border:"none",background:T.accent,color:"#fff",fontFamily:MONO,fontSize:8,fontWeight:700,cursor:"pointer"}}>Сохранить (v{(s.prompt?.version||1)+1})</button>
              </div>
            </div>
          )}
        </div>
      ))}
      <div style={{display:"flex",gap:3,marginTop:6,flexWrap:"wrap"}}>
        <input value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="Название"
          style={{flex:1,minWidth:80,padding:"5px 7px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:4,color:T.text,fontFamily:SANS,fontSize:10,outline:"none"}}/>
        <select value={newShape} onChange={e=>setNewShape(e.target.value)}
          style={{padding:"5px 3px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:4,color:T.text,fontFamily:MONO,fontSize:9}}>
          {SHAPE_LIST.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <input value={newPrompt} onChange={e=>setNewPrompt(e.target.value)} placeholder="Промпт"
          style={{flex:2,minWidth:100,padding:"5px 7px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:4,color:T.text,fontFamily:SANS,fontSize:10,outline:"none"}}/>
        <button onClick={add} style={{padding:"5px 10px",borderRadius:4,border:"none",background:T.accent,color:"#fff",fontFamily:MONO,fontSize:9,fontWeight:700,cursor:"pointer"}}>+</button>
      </div>
    </div>
  );
}

// ─── TEMPLATE EDITOR MODAL ───────────────────────────────────────────────
function TemplateEditorModal({template,onClose,onSave,isNew}) {
  const [t,setT]=useState(()=>dc(template));
  const [newPr,setNewPr]=useState("");const [newPrContent,setNewPrContent]=useState("");
  const [editPrIdx,setEditPrIdx]=useState(null);const [editPrText,setEditPrText]=useState("");

  const setPromote=v=>setT({...t,slots:{...t.slots,promote:v}});
  const setDev=v=>setT({...t,slots:{...t.slots,dev:v}});
  const addPr=()=>{if(!newPr.trim())return;setT({...t,principles:[...(t.principles||[]),{id:uid(),title:newPr.trim(),prompt:mkPrompt(newPrContent.trim())}]});setNewPr("");setNewPrContent("");};
  const removePr=i=>{const n=dc(t);n.principles.splice(i,1);setT(n);};
  const savePrEdit=i=>{const n=dc(t);n.principles[i].prompt={...n.principles[i].prompt,text:editPrText,version:(n.principles[i].prompt.version||1)+1,updatedAt:new Date().toISOString().slice(0,10)};setT(n);setEditPrIdx(null);};

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",overflow:"auto"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:`1px solid ${T.borderHi}`,borderRadius:12,padding:20,width:520,maxWidth:"94vw",maxHeight:"88vh",overflow:"auto",boxShadow:"0 16px 48px rgba(0,0,0,0.6)"}}>
        <div style={{fontFamily:MONO,fontSize:13,fontWeight:700,color:T.text,marginBottom:12,letterSpacing:1}}>{isNew?"+ НОВЫЙ ШАБЛОН":"⚙ РЕДАКТОР ШАБЛОНА"}</div>
        <div style={{display:"flex",gap:6,marginBottom:10}}>
          <input value={t.name} onChange={e=>setT({...t,name:e.target.value})} placeholder="Название"
            style={{flex:1,padding:"6px 8px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:4,color:T.text,fontFamily:SANS,fontSize:12,outline:"none"}}/>
          <input value={t.icon} onChange={e=>setT({...t,icon:e.target.value})} placeholder="◆"
            style={{width:40,padding:"6px 8px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:4,color:T.text,fontFamily:MONO,fontSize:14,textAlign:"center",outline:"none"}}/>
        </div>
        <input value={t.desc} onChange={e=>setT({...t,desc:e.target.value})} placeholder="Описание"
          style={{width:"100%",padding:"6px 8px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:4,color:T.text,fontFamily:SANS,fontSize:11,outline:"none",marginBottom:12,boxSizing:"border-box"}}/>

        <SlotListEditor slots={t.slots.promote} setSlots={setPromote} color={T.green} sectionLabel="▲ ПРОДВИЖЕНИЕ"/>
        <div style={{height:10}}/>
        <SlotListEditor slots={t.slots.dev} setSlots={setDev} color={T.orange} sectionLabel="■ РАЗРАБОТКА"/>

        <div style={{marginTop:12}}>
          <div style={{fontSize:9,fontFamily:MONO,color:T.purple,fontWeight:700,letterSpacing:1,marginBottom:6}}>ПРИНЦИПЫ (файлы с правилами)</div>
          {(t.principles||[]).map((p,i)=>(
            <div key={p.id}>
              <div style={{display:"flex",alignItems:"center",gap:4,padding:"4px 7px",marginBottom:2,background:T.purpleDim,borderRadius:4}}>
                <div style={{width:7,height:7,borderRadius:4,background:p.prompt?.text?T.purple:T.emptyBorder}}/>
                <span style={{flex:1,fontSize:10,fontFamily:MONO,color:T.purple}}>{p.title}</span>
                <span style={{fontSize:8,fontFamily:MONO,color:T.dim}}>v{p.prompt?.version||1}</span>
                <button onClick={()=>{setEditPrIdx(editPrIdx===i?null:i);setEditPrText(p.prompt?.text||"");}} style={{background:"none",border:"none",color:T.accent,cursor:"pointer",fontSize:9}}>✎</button>
                <button onClick={()=>removePr(i)} style={{background:"none",border:"none",color:T.red,cursor:"pointer",fontSize:10}}>✕</button>
              </div>
              {editPrIdx===i&&(
                <div style={{padding:"6px 8px 8px 22px",marginBottom:4}}>
                  <div style={{fontSize:8,fontFamily:MONO,color:T.pink,marginBottom:3}}>⚡ Промпт принципа «{p.title}»</div>
                  <textarea value={editPrText} onChange={e=>setEditPrText(e.target.value)} rows={3}
                    style={{width:"100%",padding:"5px 7px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:4,color:T.text,fontFamily:SANS,fontSize:10,lineHeight:1.5,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
                  <div style={{display:"flex",gap:3,marginTop:4}}>
                    <button onClick={()=>setEditPrIdx(null)} style={{padding:"2px 7px",borderRadius:3,border:`1px solid ${T.border}`,background:"none",color:T.dim,fontFamily:MONO,fontSize:8,cursor:"pointer"}}>Отмена</button>
                    <button onClick={()=>savePrEdit(i)} style={{padding:"2px 7px",borderRadius:3,border:"none",background:T.accent,color:"#fff",fontFamily:MONO,fontSize:8,fontWeight:700,cursor:"pointer"}}>Сохранить (v{(p.prompt?.version||1)+1})</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div style={{display:"flex",gap:3,marginTop:6,flexWrap:"wrap"}}>
            <input value={newPr} onChange={e=>setNewPr(e.target.value)} placeholder="Название"
              style={{flex:1,minWidth:100,padding:"5px 7px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:4,color:T.text,fontFamily:SANS,fontSize:10,outline:"none"}}/>
            <input value={newPrContent} onChange={e=>setNewPrContent(e.target.value)} placeholder="Промпт / содержание"
              style={{flex:2,minWidth:120,padding:"5px 7px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:4,color:T.text,fontFamily:SANS,fontSize:10,outline:"none"}}/>
            <button onClick={addPr} style={{padding:"5px 10px",borderRadius:4,border:"none",background:T.purple,color:"#fff",fontFamily:MONO,fontSize:9,fontWeight:700,cursor:"pointer"}}>+</button>
          </div>
        </div>

        <div style={{display:"flex",gap:6,justifyContent:"flex-end",marginTop:16}}>
          <button onClick={onClose} style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${T.border}`,background:"none",color:T.muted,fontFamily:MONO,fontSize:10,cursor:"pointer"}}>Отмена</button>
          <button onClick={()=>onSave(t)} style={{padding:"6px 14px",borderRadius:6,border:"none",background:T.accent,color:"#fff",fontFamily:MONO,fontSize:10,fontWeight:700,cursor:"pointer"}}>{isNew?"Создать":"Сохранить"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── PROJECT EDITOR MODAL ────────────────────────────────────────────────
function ProjectEditorModal({project,template,onClose,onSave}) {
  const [name,setName]=useState(project.name);
  const [promote,setPromote]=useState(()=>dc(project.customSlots?.promote||template.slots.promote));
  const [dev,setDev]=useState(()=>dc(project.customSlots?.dev||template.slots.dev));
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",overflow:"auto"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:`1px solid ${T.borderHi}`,borderRadius:12,padding:20,width:520,maxWidth:"94vw",maxHeight:"88vh",overflow:"auto",boxShadow:"0 16px 48px rgba(0,0,0,0.6)"}}>
        <div style={{fontFamily:MONO,fontSize:13,fontWeight:700,color:T.text,marginBottom:12,letterSpacing:1}}>⚙ РЕДАКТОР ПРОЕКТА</div>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Название"
          style={{width:"100%",padding:"7px 9px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:5,color:T.text,fontFamily:SANS,fontSize:12,outline:"none",marginBottom:12,boxSizing:"border-box"}}/>
        <SlotListEditor slots={promote} setSlots={setPromote} color={T.green} sectionLabel="▲ ПРОДВИЖЕНИЕ"/>
        <div style={{height:10}}/>
        <SlotListEditor slots={dev} setSlots={setDev} color={T.orange} sectionLabel="■ РАЗРАБОТКА"/>
        <div style={{display:"flex",gap:6,justifyContent:"flex-end",marginTop:16}}>
          <button onClick={onClose} style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${T.border}`,background:"none",color:T.muted,fontFamily:MONO,fontSize:10,cursor:"pointer"}}>Отмена</button>
          <button onClick={()=>onSave({...project,name,customSlots:{promote,dev}})} style={{padding:"6px 14px",borderRadius:6,border:"none",background:T.accent,color:"#fff",fontFamily:MONO,fontSize:10,fontWeight:700,cursor:"pointer"}}>Сохранить</button>
        </div>
      </div>
    </div>
  );
}

// ─── NEW PROJECT MODAL ───────────────────────────────────────────────────
function NewProjectModal({templates,onClose,onCreate}) {
  const [name,setName]=useState("");const [sel,setSel]=useState(templates[0].id);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,border:`1px solid ${T.borderHi}`,borderRadius:12,padding:22,width:400,maxWidth:"92vw",boxShadow:"0 16px 48px rgba(0,0,0,0.6)"}}>
        <div style={{fontFamily:MONO,fontSize:13,fontWeight:700,color:T.text,marginBottom:14,letterSpacing:1}}>+ НОВЫЙ ПРОЕКТ</div>
        <div style={{marginBottom:10}}><label style={{fontSize:9,fontFamily:MONO,color:T.muted,display:"block",marginBottom:3}}>Название</label>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Мой проект" autoFocus
            style={{width:"100%",padding:"7px 9px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:5,color:T.text,fontFamily:SANS,fontSize:12,outline:"none",boxSizing:"border-box"}}/></div>
        <div style={{marginBottom:14}}><label style={{fontSize:9,fontFamily:MONO,color:T.muted,display:"block",marginBottom:4}}>Шаблон</label>
          {templates.map(tpl=>(
            <div key={tpl.id} onClick={()=>setSel(tpl.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:6,marginBottom:3,
              background:sel===tpl.id?T.accentDim:T.bg,border:`1px solid ${sel===tpl.id?T.accent+"44":T.border}`,cursor:"pointer"}}>
              <span style={{fontSize:16}}>{tpl.icon}</span>
              <div style={{flex:1}}><div style={{fontFamily:MONO,fontSize:10,fontWeight:700,color:T.text}}>{tpl.name}</div>
                <div style={{fontSize:9,color:T.dim,fontFamily:SANS}}>{tpl.desc}</div></div>
              {tpl.principles?.length>0&&<div style={{display:"flex",gap:2}}>{tpl.principles.map(p=><span key={p.id} style={{fontSize:7,fontFamily:MONO,padding:"1px 4px",borderRadius:2,background:T.purpleDim,color:T.purple}}>{p.title}</span>)}</div>}
            </div>
          ))}</div>
        <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${T.border}`,background:"none",color:T.muted,fontFamily:MONO,fontSize:10,cursor:"pointer"}}>Отмена</button>
          <button onClick={()=>{if(name.trim())onCreate(name.trim(),sel);}} disabled={!name.trim()}
            style={{padding:"6px 14px",borderRadius:6,border:"none",background:name.trim()?T.accent:T.dim,color:"#fff",fontFamily:MONO,fontSize:10,fontWeight:700,cursor:name.trim()?"pointer":"default",opacity:name.trim()?1:0.4}}>Создать</button>
        </div>
      </div>
    </div>
  );
}

function Toast({msg,vis}){return (<div style={{position:"fixed",bottom:20,left:"50%",transform:`translateX(-50%) translateY(${vis?0:20}px)`,opacity:vis?1:0,background:T.accent,color:"#fff",padding:"7px 16px",borderRadius:7,fontSize:11,fontFamily:SANS,fontWeight:600,boxShadow:"0 4px 20px rgba(0,0,0,0.4)",transition:"all 0.3s",pointerEvents:"none",zIndex:999}}>{msg}</div>);}

// ─── MAIN ────────────────────────────────────────────────────────────────
export default function App() {
  const [templates,setTemplates]=useState(initTemplates);
  const [projects,setProjects]=useState([
    {id:"p1",name:"ДОМАТРИКС",status:"active",templateId:"tpl-universal",
      data:{promote:{positioning:2,portfolio:1,"kp-check":0,channels:1,"ch-email":1,"ch-social":0,"ch-cold":1,"ch-ads":0,"cold-tpl":2,competitors:1,"media-data":0,"mk-logo":0,"mk-screens":0,"mk-texts":0},
            dev:{"ui-modules":1,"mod-kanban":1,"mod-dash":0,"mod-tables":1,"ui-principles":1,architecture:1,"owner-panel":0,"data-map":0,lessons:1}}},
    {id:"p2",name:"Новая Ливадия",status:"active",templateId:"tpl-universal",
      data:{promote:{positioning:3,portfolio:1,"kp-check":1,channels:1,"ch-email":1,"ch-social":1,"ch-cold":0,"ch-ads":1,"cold-tpl":1,competitors:2,"media-data":1,"mk-logo":1,"mk-screens":1,"mk-texts":0},
            dev:{"ui-modules":1,"mod-kanban":1,"mod-dash":1,"mod-tables":1,"ui-principles":1,architecture:1,"owner-panel":1,"data-map":0,lessons:1}}},
    {id:"p3",name:"ИЗИДЖОБ",status:"active",templateId:"tpl-website",
      data:{promote:{positioning:1,portfolio:0,competitors:0,"media-data":0,"mk-logo":0,"mk-texts":0,"mk-photo":0},
            dev:{"ui-principles":0,architecture:1,seo:0,perf:0,lessons:0}}},
  ]);
  const [expandedId,setExpandedId]=useState("p1");
  const [showNew,setShowNew]=useState(false);
  const [editTpl,setEditTpl]=useState(null);
  const [newTpl,setNewTpl]=useState(false);
  const [editProjId,setEditProjId]=useState(null);
  const [toast,setToast]=useState({msg:"",vis:false});
  const [tab,setTab]=useState("projects");

  const showToast=useCallback(m=>{setToast({msg:m,vis:true});setTimeout(()=>setToast(p=>({...p,vis:false})),2200);},[]);
  const onDataChange=useCallback((pid,sec,sid,d)=>{setProjects(p=>p.map(pr=>pr.id!==pid?pr:{...pr,data:{...pr.data,[sec]:{...pr.data[sec],[sid]:Math.max(0,(pr.data[sec][sid]||0)+d)}}}));},[]);

  const createProject=useCallback((name,tplId)=>{
    const tpl=templates.find(t=>t.id===tplId)||templates[0];
    const np={id:uid(),name,status:"active",templateId:tplId,
      customSlots:dc(tpl.slots),customPrinciples:dc(tpl.principles||[]),
      data:{promote:initData(tpl.slots.promote),dev:initData(tpl.slots.dev)}};
    setProjects(p=>[...p,np]);setExpandedId(np.id);setShowNew(false);
    showToast(`✓ «${name}» создан из «${tpl.name}»`);
  },[templates,showToast]);

  const saveTpl=useCallback((t,isNew)=>{
    if(isNew){setTemplates(p=>[...p,{...t,id:uid()}]);setNewTpl(false);}
    else{setTemplates(p=>p.map(x=>x.id===t.id?t:x));setEditTpl(null);}
    showToast(`✓ Шаблон «${t.name}» сохранён`);
  },[showToast]);

  const saveProject=useCallback(u=>{setProjects(p=>p.map(pr=>pr.id!==u.id?pr:u));setEditProjId(null);showToast(`✓ «${u.name}» обновлён`);},[showToast]);

  // Update a slot prompt in a project
  const updateProjectPrompt=useCallback((projId,section,slotId,text)=>{
    setProjects(prev=>prev.map(p=>{
      if(p.id!==projId)return p;
      const slots=dc(p.customSlots||{promote:[],dev:[]});
      const update=(list)=>{for(const s of list){if(s.id===slotId){s.prompt={text,version:(s.prompt?.version||1)+1,updatedAt:new Date().toISOString().slice(0,10)};return true;}if(s.children?.length&&update(s.children))return true;}return false;};
      update(slots[section]);
      return{...p,customSlots:slots};
    }));
    showToast("✓ Промпт обновлён");
  },[showToast]);

  // Accept template prompt version for a slot
  const acceptTplPrompt=useCallback((projId,section,slotId)=>{
    setProjects(prev=>prev.map(p=>{
      if(p.id!==projId)return p;
      const tpl=templates.find(t=>t.id===p.templateId);if(!tpl)return p;
      const tplPrompt=findTplSlotPrompt(tpl.slots[section],slotId);if(!tplPrompt)return p;
      const slots=dc(p.customSlots||{promote:[],dev:[]});
      const update=(list)=>{for(const s of list){if(s.id===slotId){s.prompt={...tplPrompt};return true;}if(s.children?.length&&update(s.children))return true;}return false;};
      update(slots[section]);
      return{...p,customSlots:slots};
    }));
    showToast("✓ Промпт обновлён из шаблона");
  },[templates,showToast]);

  // Update principle prompt in project
  const updatePrinciplePrompt=useCallback((projId,prId,text)=>{
    setProjects(prev=>prev.map(p=>{
      if(p.id!==projId)return p;
      const prs=dc(p.customPrinciples||[]);
      const pr=prs.find(x=>x.id===prId);
      if(pr){pr.prompt={text,version:(pr.prompt?.version||1)+1,updatedAt:new Date().toISOString().slice(0,10)};}
      return{...p,customPrinciples:prs};
    }));
    showToast("✓ Промпт принципа обновлён");
  },[showToast]);

  const acceptTplPrinciplePrompt=useCallback((projId,prId)=>{
    setProjects(prev=>prev.map(p=>{
      if(p.id!==projId)return p;
      const tpl=templates.find(t=>t.id===p.templateId);if(!tpl)return p;
      const tplPr=(tpl.principles||[]).find(x=>x.id===prId);if(!tplPr)return p;
      const prs=dc(p.customPrinciples||[]);
      const pr=prs.find(x=>x.id===prId);
      if(pr){pr.prompt={...tplPr.prompt};}
      return{...p,customPrinciples:prs};
    }));
    showToast("✓ Принцип обновлён из шаблона");
  },[templates,showToast]);

  const editProject=projects.find(p=>p.id===editProjId);
  const editProjectTpl=editProject?(templates.find(t=>t.id===editProject.templateId)||templates[0]):null;

  return(
    <div style={{minHeight:"100vh",background:T.bg,padding:"20px 12px",fontFamily:SANS}}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Outfit:wght@400;500;700&display=swap" rel="stylesheet"/>
      <div style={{maxWidth:720,margin:"0 auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
          <span style={{fontFamily:MONO,fontSize:16,fontWeight:700,color:T.text,letterSpacing:3}}>PRODUCT DEV OS</span>
          <span style={{fontSize:9,fontFamily:MONO,color:T.dim,padding:"2px 5px",background:T.card,borderRadius:3,border:`1px solid ${T.border}`}}>v4</span>
        </div>
        <div style={{color:T.dim,fontSize:10,fontFamily:MONO,marginBottom:12}}>{projects.length} проектов · {templates.length} шаблонов</div>

        <div style={{display:"flex",gap:4,marginBottom:10}}>
          {[{id:"projects",l:"Проекты"},{id:"templates",l:"Шаблоны"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"5px 12px",borderRadius:5,border:`1px solid ${tab===t.id?T.accent+"44":T.border}`,
              background:tab===t.id?T.accentDim:"none",color:tab===t.id?T.accent:T.dim,fontFamily:MONO,fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:1}}>{t.l}</button>
          ))}
          <div style={{flex:1}}/>
          {tab==="projects"&&<button onClick={()=>setShowNew(true)} style={{padding:"5px 12px",borderRadius:5,border:"none",background:T.accent,color:"#fff",fontFamily:MONO,fontSize:10,fontWeight:700,cursor:"pointer"}}>+ проект</button>}
          {tab==="templates"&&<button onClick={()=>setNewTpl(true)} style={{padding:"5px 12px",borderRadius:5,border:"none",background:T.purple,color:"#fff",fontFamily:MONO,fontSize:10,fontWeight:700,cursor:"pointer"}}>+ шаблон</button>}
        </div>

        <div style={{display:"flex",flexWrap:"wrap",gap:10,padding:"5px 10px",background:T.card,borderRadius:6,border:`1px solid ${T.border}`,marginBottom:10,alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:10,height:10}}>{rs("circle",10,true,T.accent)}</div><span style={{fontSize:8,color:T.dim,fontFamily:SANS}}>есть</span></div>
          <div style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:10,height:10}}>{rs("circle",10,false,"none",T.emptyBorder)}</div><span style={{fontSize:8,color:T.dim,fontFamily:SANS}}>пусто</span></div>
          <div style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:6,height:6,borderRadius:3,background:T.promptGray}}/><span style={{fontSize:8,color:T.dim,fontFamily:SANS}}>промпт (клик = чтение, ✎ = редактирование)</span></div>
          <div style={{display:"flex",alignItems:"center",gap:3}}><div style={{width:5,height:5,borderRadius:3,background:T.yellow}}/><span style={{fontSize:8,color:T.dim,fontFamily:SANS}}>обновление из шаблона</span></div>
        </div>

        {tab==="projects"&&projects.map(p=>(
          <ProjectRow key={p.id} project={p} templates={templates} expanded={expandedId===p.id}
            onToggle={()=>setExpandedId(expandedId===p.id?null:p.id)}
            onDataChange={onDataChange} showToast={showToast} onEditProject={id=>setEditProjId(id)}
            onUpdateProjectPrompt={updateProjectPrompt} onAcceptTplPrompt={acceptTplPrompt}
            onUpdatePrinciplePrompt={updatePrinciplePrompt} onAcceptTplPrinciplePrompt={acceptTplPrinciplePrompt}/>
        ))}

        {tab==="templates"&&<div style={{display:"flex",flexDirection:"column",gap:6}}>
          {templates.map(tpl=>(
            <div key={tpl.id} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:"12px 14px"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:18}}>{tpl.icon}</span>
                <div style={{flex:1}}><div style={{fontFamily:MONO,fontSize:11,fontWeight:700,color:T.text}}>{tpl.name}</div>
                  <div style={{fontSize:9,color:T.dim,fontFamily:SANS}}>{tpl.desc}</div></div>
                <div style={{display:"flex",gap:2,alignItems:"center"}}>
                  {tpl.slots.promote.map(s=><div key={s.id} style={{width:9,height:9}}>{rs(s.shape,9,true,T.green)}</div>)}
                  <div style={{width:1,height:7,background:T.dim,margin:"0 1px"}}/>
                  {tpl.slots.dev.map(s=><div key={s.id} style={{width:9,height:9}}>{rs(s.shape,9,true,T.orange)}</div>)}
                </div>
                <button onClick={()=>setEditTpl(tpl)} style={{padding:"3px 8px",borderRadius:3,border:`1px solid ${T.border}`,background:"none",color:T.muted,fontFamily:MONO,fontSize:8,cursor:"pointer"}}>⚙ редактировать</button>
              </div>
              {tpl.principles?.length>0&&<div style={{display:"flex",gap:3,marginTop:6,flexWrap:"wrap"}}>
                {tpl.principles.map(p=><span key={p.id} style={{fontSize:8,fontFamily:MONO,padding:"1px 5px",borderRadius:2,background:T.purpleDim,color:T.purple}}>v{p.prompt?.version||1} {p.title}</span>)}
              </div>}
            </div>
          ))}
        </div>}
      </div>

      {showNew&&<NewProjectModal templates={templates} onClose={()=>setShowNew(false)} onCreate={createProject}/>}
      {editTpl&&<TemplateEditorModal template={editTpl} onClose={()=>setEditTpl(null)} onSave={t=>saveTpl(t,false)} isNew={false}/>}
      {newTpl&&<TemplateEditorModal template={{id:"",name:"",icon:"◆",desc:"",slots:{promote:[],dev:[]},principles:[]}} onClose={()=>setNewTpl(false)} onSave={t=>saveTpl(t,true)} isNew={true}/>}
      {editProjId&&editProject&&editProjectTpl&&<ProjectEditorModal project={editProject} template={editProjectTpl} onClose={()=>setEditProjId(null)} onSave={saveProject}/>}
      <Toast msg={toast.msg} vis={toast.vis}/>
    </div>
  );
}
