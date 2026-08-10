import { Headphones, Menu, Search } from "lucide-react";
import Link from "next/link";
import { GithubIcon } from "./Icons";

export const Header = () => (
  <header className="fixed top-0 w-full z-50 backdrop-blur-md bg-black/30 border-b border-white/10">
    <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2 text-xl font-bold text-violet-400">
        <Headphones size={24} /><span>کتاب‌کست</span>
      </Link>
      <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
        <Link href="/#episodes" className="hover:text-violet-400 transition-colors">اپیزودها</Link>
        <Link href="/#about" className="hover:text-violet-400 transition-colors">درباره پروژه</Link>
        <a href="https://github.com/AmirMotefaker/KetabCast" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-violet-400 transition-colors">
          <GithubIcon size={16} /> GitHub
        </a>
      </nav>
      <div className="flex md:hidden items-center gap-4 text-gray-300"><Search size={20} /><Menu size={24} /></div>
    </div>
  </header>
);