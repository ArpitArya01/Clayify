function Line({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      {children}
    </svg>
  );
}

export function BrandIcon() {
  return (
    <Line>
      <path d="M5 8h14v11H5z" />
      <path d="M8 8V5h8v3M9 13h6M9 16h4" />
    </Line>
  );
}

export function UploadIcon() {
  return (
    <Line>
      <path d="M12 3v12M7 8l5-5 5 5" />
      <path d="M5 21h14" />
    </Line>
  );
}

export function CameraIcon() {
  return (
    <Line>
      <path d="M4 8h3l2-2h6l2 2h3v11H4z" />
      <circle cx="12" cy="13.5" r="3.2" />
    </Line>
  );
}

export function DownloadIcon() {
  return (
    <Line>
      <path d="M12 3v12M7 11l5 5 5-5" />
      <path d="M5 21h14" />
    </Line>
  );
}

export function ShareIcon() {
  return (
    <Line>
      <path d="M18 8a3 3 0 1 0-2.83-4M6 12a3 3 0 1 0 0 4m9-1.17a3 3 0 1 0 0-5.66M8.6 13.5l6.8 3.8M8.6 10.5l6.8-3.8" />
    </Line>
  );
}

export function ResetIcon() {
  return (
    <Line>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </Line>
  );
}

export function SwitchCameraIcon() {
  return (
    <Line>
      <path d="M17 2l4 4-4 4" />
      <path d="M21 6H8a5 5 0 0 0-5 5" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M3 18h13a5 5 0 0 0 5-5" />
    </Line>
  );
}
