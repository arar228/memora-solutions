import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import AttentionSculpture from './AttentionSculpture';
import './AttentionJourney.css';

const COPY = {
  ru: {
    title: 'Управляем вниманием пользователя с помощью грамотного дизайна',
    scroll: 'Прокрутите', invitation: 'Создадим такой опыт для вашего продукта?', contact: 'Обсудить мой проект',
    skip: 'Перейти к обсуждению проекта',
    loading: 'Подготавливаем пространство…', fallback: '3D-сцена недоступна в этом браузере. Обсудить проект можно по ссылке ниже.',
    description: 'Прокрутка ведёт через объёмный туннель. Движение курсора меняет ракурс. В конце — приглашение обсудить проект.',
  },
  en: {
    title: 'Guiding user attention through thoughtful design',
    scroll: 'Scroll to explore', invitation: 'Shall we create an experience for your product?', contact: 'Discuss my project',
    skip: 'Go to the project discussion',
    loading: 'Preparing the space…', fallback: 'The 3D scene is unavailable in this browser. Use the link below to discuss your project.',
    description: 'Scroll to travel through a three-dimensional tunnel. Move your pointer to change the view. A project invitation awaits at the end.',
  },
};

export default function AttentionLabPage() {
  const { i18n } = useTranslation();
  const c = COPY[i18n.resolvedLanguage?.startsWith('ru') ? 'ru' : 'en'];
  const reduced = Boolean(useReducedMotion());
  const [arrived, setArrived] = useState(false);
  const [failed, setFailed] = useState(false);
  const trackRef = useRef(null);

  return <div className="attention-lab attention-journey">
    <section className="tunnel-track" ref={trackRef} aria-labelledby="lab-title" data-arrived={arrived || failed} data-failed={failed}>
      <div className="tunnel-stage">
        <AttentionSculpture trackRef={trackRef} reduced={reduced} onArrive={setArrived} onUnavailable={setFailed} copy={c} />
        <Link className="tunnel-skip" to="/?labGoal=act#contact">{c.skip}</Link>
        <div className="tunnel-intro"><h1 id="lab-title">{c.title}</h1></div>
        <span className="tunnel-scroll" aria-hidden="true">{c.scroll}<ArrowDown size={22} /></span>
        <div className="tunnel-invitation" hidden={!(arrived || failed)}>
          <h2>{c.invitation}</h2>
          <Link className="tunnel-contact" to="/?labGoal=act#contact">{c.contact}<ArrowUpRight size={22} aria-hidden="true" /></Link>
        </div>
        <div className="tunnel-progress" aria-hidden="true"><i /></div>
      </div>
    </section>
  </div>;
}
