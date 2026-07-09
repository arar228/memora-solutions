import { useEffect, useRef } from 'react';

// Embed a self-locating Travelpayouts widget (tpemd.com/content). These scripts
// render at their own <script> position via document.currentScript, which is
// null for a dynamically inserted OR async script — so nothing renders if we
// appendChild an async script. Fix: host the script NON-async inside a srcdoc
// iframe, where it is parsed from HTML and runs synchronously so currentScript
// resolves. Then auto-size the (same-origin) iframe to its content.
// `base target="_blank"` opens result links in the top window.
export default function WidgetEmbed({ src, initialHeight = 460 }) {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.setAttribute('scrolling', 'no');
        iframe.setAttribute('title', 'hotels');
        iframe.style.cssText = `width:100%;border:0;height:${initialHeight}px;display:block;`;
        el.appendChild(iframe);
        const doc = iframe.contentDocument;
        doc.open();
        doc.write(
            '<!doctype html><html><head><meta charset="utf-8">' +
            '<meta name="viewport" content="width=device-width,initial-scale=1">' +
            '<base target="_blank">' +
            '<style>body{margin:0;background:transparent;font-family:system-ui,-apple-system,sans-serif}</style>' +
            '</head><body><script charset="utf-8" src="' + src + '"></' + 'script></body></html>'
        );
        doc.close();

        // Auto-fit to content height (srcdoc is same-origin, so scrollHeight is readable).
        let tries = 0;
        let timer;
        const fit = () => {
            try {
                const h = doc.body && doc.body.scrollHeight;
                if (h && h > 60) iframe.style.height = (h + 8) + 'px';
            } catch { /* ignore cross-origin subframe */ }
            if (++tries < 24) timer = setTimeout(fit, 400);
        };
        timer = setTimeout(fit, 700);

        return () => { clearTimeout(timer); el.innerHTML = ''; };
    }, [src, initialHeight]);
    return <div ref={ref} className="radar3-widget" style={{ minHeight: 120 }} />;
}
