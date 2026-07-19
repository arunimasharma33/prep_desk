export default function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="9" fill="var(--ink)" />
      <path
        d="M9 16.5l4.5 4.5L23 10.5"
        stroke="var(--teal)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
