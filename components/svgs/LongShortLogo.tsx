export function LongShortLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 96 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0 27V21H24V27H0Z" fill="black" />
      <path
        d="M30 48V38.4H36V48H30ZM36 38.4V28.8H42V38.4H36ZM42 28.8V19.2H48V28.8H42ZM48 19.2V9.6H54V19.2H48ZM54 9.6V0H60V9.6H54Z"
        fill="black"
      />
      <path d="M66 27V21H78V9H84V21H96V27H84V39H78V27H66Z" fill="black" />
    </svg>
  );
}
