import { NavLink } from 'react-router-dom';

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" end className={({ isActive }) => `bottom-nav__item${isActive ? ' is-active' : ''}`}>
        <IconList />
        <span>Список</span>
      </NavLink>
      <NavLink to="/add-item" className={({ isActive }) => `bottom-nav__item${isActive ? ' is-active' : ''}`}>
        <IconPlus />
        <span>Добавить</span>
      </NavLink>
    </nav>
  );
}

function IconList() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="3.5" cy="6" r="1.2" fill="currentColor" /><circle cx="3.5" cy="12" r="1.2" fill="currentColor" /><circle cx="3.5" cy="18" r="1.2" fill="currentColor" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
