
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="text-center py-20 px-4">
      <h1 className="text-8xl font-bold text-accent mb-6">۴۰۴</h1>
      <p className="text-2xl text-gray-400 mb-10">صفحه‌ای که دنبالش بودید پیدا نشد.</p>
      <Link href="/" className="bg-accent text-white px-8 py-4 rounded-full font-bold hover:bg-purple-600 transition inline-block">
        بازگشت به خانه
      </Link>
    </div>
  );
}
