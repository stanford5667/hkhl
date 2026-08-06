export function SectionDivider() {
  return (
    <div className="relative w-full py-1">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />
      </div>
      <div className="relative flex justify-center">
        <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
      </div>
    </div>
  );
}
