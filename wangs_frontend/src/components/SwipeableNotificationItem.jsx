import React, { useState, useRef, useEffect } from 'react';
import { Store, Sparkles, ArrowRight, Trash2, Check, Tag, Clock } from 'lucide-react';

function formatRelativeTime(isoString) {
  if (!isoString) return '';
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    if (diffMs < 0 || isNaN(diffMs)) return 'Recently';
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function SwipeableNotificationItem({
  notif,
  isRead,
  isSelectMode,
  isSelected,
  onToggleSelect,
  onLongPress,
  onClick,
  onDelete,
}) {
  const [translateX, setTranslateX] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const cardRef = useRef(null);
  const deleteBgRef = useRef(null);
  const currentXRef = useRef(0);
  const rafIdRef = useRef(null);
  const isDraggingRef = useRef(false);
  const initialOffsetRef = useRef(0);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalSwipeRef = useRef(null);
  const isMouseDownRef = useRef(false);
  const longPressTimerRef = useRef(null);
  const isLongPressTriggeredRef = useRef(false);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  const snapTo = (val) => {
    currentXRef.current = val;
    setTranslateX(val);
    if (cardRef.current) {
      cardRef.current.style.transition = 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1)';
      cardRef.current.style.transform = `translate3d(${val}px, 0, 0)`;
      cardRef.current.style.webkitTransform = `translate3d(${val}px, 0, 0)`;
    }
    if (deleteBgRef.current) {
      deleteBgRef.current.style.opacity = val < -2 ? '1' : '0';
      deleteBgRef.current.style.pointerEvents = val < -2 ? 'auto' : 'none';
    }
  };

  // When entering select mode, reset any swipe offset smoothly
  useEffect(() => {
    if (isSelectMode) {
      snapTo(0);
    }
  }, [isSelectMode]);

  const handleStart = (clientX, clientY) => {
    if (isSelectMode || isDeleting) return;

    startXRef.current = clientX;
    startYRef.current = clientY;
    initialOffsetRef.current = currentXRef.current;
    isHorizontalSwipeRef.current = null;
    isLongPressTriggeredRef.current = false;
    isDraggingRef.current = false;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(40); } catch {}
      }
      snapTo(0);
      onLongPress(notif.id);
    }, 450);
  };

  const handleMove = (clientX, clientY) => {
    if (isSelectMode || isDeleting) return;

    const deltaX = clientX - startXRef.current;
    const deltaY = clientY - startYRef.current;

    // Cancel long-press if moved beyond small jitter threshold
    if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    if (isLongPressTriggeredRef.current) return;

    // Detect horizontal swipe intent once
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(deltaX) > 7 || Math.abs(deltaY) > 7) {
        isHorizontalSwipeRef.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    if (isHorizontalSwipeRef.current) {
      isDraggingRef.current = true;
      let newX = 0;
      if (initialOffsetRef.current < 0) {
        newX = Math.min(0, Math.max(-180, initialOffsetRef.current + deltaX));
      } else {
        newX = Math.max(-180, Math.min(0, deltaX));
      }

      currentXRef.current = newX;

      // 120Hz high refresh rate animation frame: direct GPU transform, 0 React re-renders!
      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
          if (cardRef.current) {
            cardRef.current.style.transition = 'none';
            cardRef.current.style.willChange = 'transform';
            cardRef.current.style.transform = `translate3d(${currentXRef.current}px, 0, 0)`;
            cardRef.current.style.webkitTransform = `translate3d(${currentXRef.current}px, 0, 0)`;
          }
          if (deleteBgRef.current) {
            deleteBgRef.current.style.opacity = currentXRef.current < -2 ? '1' : '0';
            deleteBgRef.current.style.pointerEvents = currentXRef.current < -2 ? 'auto' : 'none';
          }
          rafIdRef.current = null;
        });
      }
    }
  };

  const handleEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (cardRef.current) {
      cardRef.current.style.willChange = 'auto';
    }

    if (isSelectMode || isDeleting) return;

    if (isLongPressTriggeredRef.current) {
      return;
    }

    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      const finalX = currentXRef.current;
      if (finalX <= -130) {
        // Swiped far left: auto-delete with full exit slide
        triggerDelete();
      } else if (finalX <= -45) {
        // Swiped moderately: snap open to reveal delete button (-80px)
        snapTo(-80);
      } else {
        // Snap back closed
        snapTo(0);
      }
    }
  };

  const triggerDelete = () => {
    setIsDeleting(true);
    currentXRef.current = -360;
    setTranslateX(-360);
    if (deleteBgRef.current) {
      deleteBgRef.current.style.opacity = '1';
      deleteBgRef.current.style.pointerEvents = 'auto';
    }
    if (cardRef.current) {
      cardRef.current.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)';
      cardRef.current.style.transform = 'translate3d(-360px, 0, 0)';
      cardRef.current.style.webkitTransform = 'translate3d(-360px, 0, 0)';
    }
    setTimeout(() => {
      onDelete(notif.id);
    }, 220);
  };

  const handleCardClick = (e) => {
    if (isLongPressTriggeredRef.current) {
      e.stopPropagation();
      isLongPressTriggeredRef.current = false;
      return;
    }

    if (isSelectMode) {
      e.stopPropagation();
      onToggleSelect(notif.id);
      return;
    }

    // If card was swiped open, a tap simply snaps it closed
    if (currentXRef.current < -5) {
      e.stopPropagation();
      snapTo(0);
      return;
    }

    onClick(notif);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl transition-all duration-200 select-none ${
        isDeleting ? 'max-h-0 opacity-0 mb-0 py-0 scale-95' : 'max-h-48 mb-1.5'
      }`}
    >
      {/* Background Action: Delete Button revealed only on left swipe */}
      <div
        ref={deleteBgRef}
        style={{ opacity: 0, pointerEvents: 'none' }}
        className="absolute inset-0 bg-red-600 rounded-xl flex items-center justify-end pr-5 text-white cursor-pointer active:bg-red-700 transition-opacity duration-150 z-0"
        onClick={(e) => {
          e.stopPropagation();
          triggerDelete();
        }}
        title="Delete notification"
      >
        <div className="flex items-center gap-1.5 font-bold text-xs select-none">
          <Trash2 size={16} />
          <span>Delete</span>
        </div>
      </div>

      {/* Foreground Content Card - 100% solid opaque background, GPU accelerated */}
      <div
        ref={cardRef}
        onClick={handleCardClick}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) handleStart(t.clientX, t.clientY);
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          if (t) handleMove(t.clientX, t.clientY);
        }}
        onTouchEnd={handleEnd}
        onTouchCancel={handleEnd}
        onMouseDown={(e) => {
          isMouseDownRef.current = true;
          handleStart(e.clientX, e.clientY);
        }}
        onMouseMove={(e) => {
          if (!isMouseDownRef.current) return;
          handleMove(e.clientX, e.clientY);
        }}
        onMouseUp={() => {
          if (isMouseDownRef.current) {
            isMouseDownRef.current = false;
            handleEnd();
          }
        }}
        onMouseLeave={() => {
          if (isMouseDownRef.current) {
            isMouseDownRef.current = false;
            handleEnd();
          }
        }}
        style={{
          transform: `translate3d(${translateX}px, 0, 0)`,
          WebkitTransform: `translate3d(${translateX}px, 0, 0)`,
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transition: 'transform 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={`relative z-10 p-3 rounded-xl border transition-colors cursor-pointer flex items-start gap-3 touch-pan-y ${
          isSelected
            ? 'bg-[#fef3c7] border-amber-400 shadow-xs'
            : isRead
            ? 'bg-white hover:bg-stone-50 border-stone-200/80 shadow-2xs'
            : 'bg-[#fffaf5] hover:bg-[#fcf4ec] border-[#edd6c8] shadow-2xs'
        }`}
      >
        {/* Selection Checkbox (Active in Select Mode) */}
        {isSelectMode && (
          <div
            className="pt-0.5 shrink-0 transition-transform active:scale-90"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(notif.id);
            }}
          >
            {isSelected ? (
              <div className="w-5 h-5 rounded-md bg-[#9b4100] text-white flex items-center justify-center shadow-xs">
                <Check size={14} className="stroke-[3]" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-md border-2 border-stone-300 bg-white" />
            )}
          </div>
        )}

        {/* Notification Icon */}
        <div className="w-9 h-9 rounded-xl bg-[#faf2ed] border border-[#dec0b3]/40 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
          {notif.type === 'NEW_SELLER' ? (
            <Store size={18} className="text-[#9b4100]" />
          ) : (
            <Sparkles size={18} className="text-amber-600" />
          )}
        </div>

        {/* Text & Metadata */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  notif.type === 'NEW_SELLER'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {notif.type === 'NEW_SELLER' ? 'New Artisan Seller' : 'Batch Release'}
              </span>
              {notif.created_at && (
                <span className="text-[9.5px] text-stone-400 font-medium">
                  {formatRelativeTime(notif.created_at)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {!isRead && !isSelectMode && (
                <span className="w-2 h-2 rounded-full bg-[#9b4100] shrink-0" />
              )}
              {/* Desktop quick-delete button */}
              {!isSelectMode && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerDelete();
                  }}
                  className="p-1 rounded-md text-stone-300 hover:text-red-600 hover:bg-stone-100 transition-colors"
                  title="Delete notification"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>

          <p className="font-serif font-bold text-xs text-stone-900 leading-snug">
            {notif.title}
          </p>
          <p className="text-[11px] text-stone-600 leading-relaxed line-clamp-2">
            {notif.message}
          </p>

          {/* Coupon Code Pill if provided */}
          {notif.coupon_code && (
            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-amber-100/80 text-amber-900 border border-amber-300/80 px-2 py-0.5 rounded-md">
                <Tag size={10} className="text-amber-800" />
                <span>Use Code: {notif.coupon_code}</span>
              </span>
            </div>
          )}

          {!isSelectMode && (
            <div className="flex items-center gap-1 pt-1 text-[11px] font-bold text-[#9b4100] hover:text-[#783000]">
              <span>{notif.type === 'NEW_SELLER' ? 'Explore Kitchen Storefront' : (notif.cta_text || 'Shop Batch Collection')}</span>
              <ArrowRight size={12} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
