import { Link } from "@/i18n/navigation";

type JudiLogoProps = {
  /** Omit link on marketing / login surfaces */
  href?: "/dashboard" | "/field" | null;
  /** Compact mark + wordmark for chrome */
  size?: "sm" | "md" | "lg";
  /**
   * `surface` — pages / cards (follows light & dark tokens)
   * `chrome` — fixed dark brand rails (sidebar / field header)
   */
  tone?: "surface" | "chrome";
  className?: string;
  /** Hide wordmark (icon rail) */
  markOnly?: boolean;
};

export function JudiLogo({
  href = "/dashboard",
  size = "md",
  tone = "surface",
  className = "",
  markOnly = false,
}: JudiLogoProps) {
  const mark = size === "sm" ? 28 : size === "lg" ? 48 : 36;
  const textClass =
    size === "sm"
      ? "text-base font-semibold"
      : size === "lg"
        ? "text-2xl font-semibold tracking-tight"
        : "text-lg font-semibold tracking-tight";
  const labelClass =
    tone === "chrome" ? "text-white" : "text-judi-950 dark:text-judi-50";
  const subClass =
    tone === "chrome" ? "text-judi-200" : "text-judi-700 dark:text-judi-200";
  const shellClass = `inline-flex min-h-touch items-center gap-2.5 rounded-lg ${className}`;
  const markFill = tone === "chrome" ? "#3b8a79" : "#275850";
  const markDot = tone === "chrome" ? "#b7ddd0" : "#86c4b3";

  const content = (
    <>
      <svg
        width={mark}
        height={mark}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="shrink-0"
      >
        <rect
          width="40"
          height="40"
          rx="10"
          className={tone === "chrome" ? undefined : "dark:fill-judi-500"}
          fill={markFill}
        />
        <path
          d="M12 11h10.5c4.4 0 7.5 2.9 7.5 7.1 0 4.3-3.1 7.2-7.5 7.2H17.2V29H12V11zm5.2 4.2v6.1h5c1.9 0 3.1-1.1 3.1-3 0-1.9-1.2-3.1-3.1-3.1h-5z"
          fill="white"
        />
        <circle
          cx="29.5"
          cy="29.5"
          r="3.2"
          className={tone === "chrome" ? undefined : "dark:fill-judi-200"}
          fill={markDot}
        />
      </svg>
      {markOnly ? null : (
        <span className={`judi-wordmark flex flex-col leading-none ${labelClass}`}>
          <span className={textClass}>Judi</span>
          <span
            className={`mt-0.5 text-[10px] font-medium uppercase tracking-wider ${
              size === "lg" ? "text-xs" : ""
            } ${subClass}`}
          >
            Group
          </span>
        </span>
      )}
    </>
  );

  if (!href) {
    return (
      <div className={shellClass} aria-label="Judi">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`${shellClass} focus-visible:outline-offset-2`}
      aria-label="Judi"
    >
      {content}
    </Link>
  );
}
