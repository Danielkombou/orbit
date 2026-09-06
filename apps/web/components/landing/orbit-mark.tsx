export function OrbitMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle
        cx="20"
        cy="20"
        r="8.5"
        stroke="currentColor"
        strokeWidth="2.25"
      />
      <ellipse
        cx="20"
        cy="20"
        rx="17"
        ry="6.5"
        stroke="currentColor"
        strokeWidth="2"
        transform="rotate(-32 20 20)"
      />
    </svg>
  );
}
