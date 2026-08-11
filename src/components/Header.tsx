import Link from "next/link";
import { Menu } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-background/90 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link
          href="/"
          className="text-2xl font-extrabold text-accent flex items-center gap-2"
          aria-label="زبدینو - صفحه اصلی"
        >
          <span aria-hidden="true">🎧</span>
          <span>زبدینو</span>
        </Link>

        <nav className="hidden md:flex gap-8 text-gray-300 font-medium">
          <Link href="/books" className="hover:text-accent transition">
            کتاب‌ها
          </Link>
          <Link href="/about" className="hover:text-accent transition">
            درباره زبدینو
          </Link>
          <a
            href="https://github.com/AmirMotefaker/KetabCast"
            target="_blank"
            rel="noreferrer"
            className="hover:text-accent transition"
          >
            GitHub
          </a>
        </nav>

        <button className="md:hidden text-gray-300" aria-label="منو">
          <Menu size={24} />
        </button>
      </div>
    </header>
  );
}
