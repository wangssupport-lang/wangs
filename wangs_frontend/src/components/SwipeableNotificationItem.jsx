import React, { useState, useRef, useEffect } from 'react';
import { Store, Sparkles, ArrowRight, Trash2, Check } from 'lucide-react';

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
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalSwipeRef = useRef(null);
  const isMouseDownRef = useRef(false);
  const longPressTimerRef = useRef(null);
  const isLongPressTriggeredRef = useRef(false);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  // When entering select mode, reset any swipe offset
  useEffect(() => {
    if (isSelectMode) {
      setTranslateX(0);
      setIsSwiping(false);
    }
  }, [isSelectMode]);

  const handleStart = (clientX, clientY) => {
    if (isSelectMode || isDeleting) return;

    startXRef.current = clientX;
    startYRef.current = clientY;
    isHorizontalSwipeRef.current = null;
    isLongPressTriggeredRef.current = false;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(40); } catch {}
      }
      setTranslateX(0);
      setIsSwiping(false);
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
      setIsSwiping(true);
      if (deltaX < 0) {
        // Swiping left to reveal delete
        const newX = Math.max(-180, Math.min(0, deltaX));
        setTranslateX(newX);
      } else if (translateX < 0) {
        // Swiping right to close
        const newX = Math.min(0, -80 + deltaX);
        setTranslateX(newX);
      }
    }
  };

  const handleEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isSelectMode || isDeleting) return;

    if (isLongPressTriggeredRef.current) {
      return;
    }

    if (isSwiping) {
      setIsSwiping(false);
      if (translateX <= -130) {
        // Swiped far left: auto-delete with full exit slide
        triggerDelete();
      } else if (translateX <= -45) {
        // Swiped moderately: snap open to reveal delete button (-80px)
        setTranslateX(-80);
      } else {
        // Snap back closed
        setTranslateX(0);
      }
    }
  };

  const triggerDelete = () => {
    setIsDeleting(true);
    setTranslateX(-360);
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
    if (translateX < 0) {
      e.stopPropagation();
      setTranslateX(0);
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
      {/* Background Action: Delete Button revealed on left swipe */}
      <div
        className="absolute inset-0 bg-red-600 rounded-xl flex items-center justify-end pr-5 text-white cursor-pointer active:bg-red-700 transition-colors z-0"
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

      {/* Foreground Content Card */}
      <div
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
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        className={`relative z-10 p-3 rounded-xl border transition-colors cursor-pointer flex items-start gap-3 touch-pan-y ${
          isSelected
            ? 'bg-amber-100/90 border-amber-400 shadow-xs'
            : isRead
            ? 'bg-white hover:bg-stone-50/80 border-stone-200/70'
            : 'bg-amber-50/60 hover:bg-amber-50 border-amber-200/70 shadow-2xs'
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
            <span
              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                notif.type === 'NEW_SELLER'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {notif.type === 'NEW_SELLER' ? 'New Artisan Seller' : 'Batch Release'}
            </span>
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

          {!isSelectMode && (
            <div className="flex items-center gap-1 pt-1 text-[11px] font-bold text-[#9b4100] hover:text-[#783000]">
              <span>Explore Kitchen Storefront</span>
              <ArrowRight size={12} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
