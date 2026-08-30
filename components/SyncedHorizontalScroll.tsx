"use client";

import { useEffect, useRef, useState, type ReactNode, type UIEvent } from "react";

type FloatingBar = { visible: boolean; left: number; width: number };
export default function SyncedHorizontalScroll({ children, className = "" }: { children: ReactNode; className?: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [bar, setBar] = useState<FloatingBar>({ visible: false, left: 0, width: 0 });
  const syncing = useRef(false);
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;
    const update = () => {
      const rect = wrapper.getBoundingClientRect();
      setContentWidth(content.scrollWidth);
      setBar({ visible: rect.top < window.innerHeight && rect.bottom > 18 && content.scrollWidth > content.clientWidth + 1, left: Math.max(0, rect.left), width: Math.min(rect.width, window.innerWidth - Math.max(0, rect.left)) });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(wrapper);
    observer.observe(content);
    if (content.firstElementChild) observer.observe(content.firstElementChild);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); };
  }, [children]);
  function sync(source: "floating" | "content", event: UIEvent<HTMLDivElement>) {
    if (syncing.current) return;
    const target = source === "floating" ? contentRef.current : floatingRef.current;
    if (!target) return;
    syncing.current = true;
    target.scrollLeft = event.currentTarget.scrollLeft;
    requestAnimationFrame(() => { syncing.current = false; });
  }
  return <div ref={wrapperRef} className={className}>
    <div ref={contentRef} onScroll={(event) => sync("content", event)} className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>
    {bar.visible && <div ref={floatingRef} onScroll={(event) => sync("floating", event)} className="fixed bottom-0 z-50 overflow-x-auto overflow-y-hidden border-y border-slate-400 bg-slate-100 print:hidden" style={{ left: bar.left, width: bar.width }} aria-label="Floating horizontal table scrollbar"><div style={{ width: contentWidth, height: 1 }} /></div>}
  </div>;
}