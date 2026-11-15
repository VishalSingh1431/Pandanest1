import React from 'react';
import { Star, StarHalf } from 'lucide-react';

/**
 * Universal, clean StarRating component with precise full, half, and empty star fills.
 * - Full star: solid warm amber (#f59e0b)
 * - Half star: split half amber (#f59e0b) over light neutral (#f1f5f9 / #cbd5e1)
 * - Empty star: clean light slate border (#cbd5e1) with soft fill (#f1f5f9)
 */
export function StarRating({ rating = 0, size = 14, gap = 2, totalReviews, showCount = false }) {
  const numRating = Number(rating) || 0;
  const isUnrated = !numRating || numRating <= 0;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: `${gap}px` }}>
      {[1, 2, 3, 4, 5].map((starIndex) => {
        if (isUnrated) {
          return (
            <Star
              key={starIndex}
              size={size}
              color="#cbd5e1"
              fill="#f8fafc"
              strokeWidth={1.75}
            />
          );
        }

        const diff = numRating - (starIndex - 1);

        if (diff >= 0.75) {
          // Full Star
          return (
            <Star
              key={starIndex}
              size={size}
              color="#f59e0b"
              fill="#f59e0b"
              strokeWidth={1.5}
            />
          );
        } else if (diff >= 0.25) {
          // Precise Half Star
          return (
            <div
              key={starIndex}
              style={{
                position: 'relative',
                width: size,
                height: size,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Star
                size={size}
                color="#cbd5e1"
                fill="#f1f5f9"
                strokeWidth={1.5}
              />
              <StarHalf
                size={size}
                color="#f59e0b"
                fill="#f59e0b"
                strokeWidth={1.5}
                style={{ position: 'absolute', top: 0, left: 0 }}
              />
            </div>
          );
        } else {
          // Empty Star
          return (
            <Star
              key={starIndex}
              size={size}
              color="#cbd5e1"
              fill="#f1f5f9"
              strokeWidth={1.5}
            />
          );
        }
      })}

      {showCount && totalReviews !== undefined && (
        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', marginLeft: '3px' }}>
          ({totalReviews})
        </span>
      )}
    </div>
  );
}

