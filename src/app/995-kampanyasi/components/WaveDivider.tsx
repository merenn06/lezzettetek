type WaveDividerProps = {
  /** Üstteki bölümün arka plan rengi (SVG fill) */
  topColor: string;
  /** Alttaki bölümün arka plan rengi — wave şeklinin rengi */
  waveColor: string;
  flip?: boolean;
  className?: string;
};

export default function WaveDivider({
  topColor,
  waveColor,
  flip = false,
  className = '',
}: WaveDividerProps) {
  return (
    <div
      className={`relative w-full leading-[0] ${className}`}
      style={{ backgroundColor: topColor }}
      aria-hidden
    >
      <svg
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        className={`block w-full h-10 sm:h-14 md:h-16 ${flip ? 'rotate-180' : ''}`}
      >
        <path
          fill={waveColor}
          d="M0,32 C240,80 480,0 720,40 C960,80 1200,16 1440,48 L1440,80 L0,80 Z"
        />
      </svg>
    </div>
  );
}
