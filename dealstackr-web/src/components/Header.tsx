import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-[var(--background)]/80 backdrop-blur-xl border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow">
              <span className="text-xl">💰</span>
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">DealStackr</h1>
              <p className="text-[10px] text-gray-500 -mt-1">Stack Your Savings</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
            <Link 
              href="/" 
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Offers
            </Link>
            <Link 
              href="/admin" 
              className="text-sm px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
            >
              Admin
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
