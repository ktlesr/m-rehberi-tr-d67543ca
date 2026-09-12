import { format } from 'date-fns';
import { BookOpen, House, Info, Mail, Newspaper } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home', icon: House },
  { to: '/posts', label: 'Posts', icon: Newspaper },
  { to: '/contact', label: 'Contact', icon: Mail },
  { to: '/about', label: 'About', icon: Info },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <nav className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-3">
          <span className="flex items-center gap-2 font-semibold">
            <BookOpen className="h-5 w-5 text-emerald-700" aria-hidden />
            Readwell
          </span>
          <ul className="flex gap-4 text-sm">
            {links.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-1 ${isActive ? 'font-medium text-emerald-700' : 'text-stone-600 hover:text-stone-900'}`
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-stone-200 py-4 text-center text-xs text-stone-500">
        © {format(new Date(), 'yyyy')} Readwell
      </footer>
    </div>
  );
}
