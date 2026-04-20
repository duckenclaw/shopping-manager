import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { useMe } from './api/hooks';
import ItemsPage from './pages/ItemsPage';
import PlacePage from './pages/PlacePage';
import AddItemPage from './pages/AddItemPage';
import PlacesPage from './pages/PlacesPage';
import DraftsPage from './pages/DraftsPage';
import DraftPage from './pages/DraftPage';

export default function App() {
  const me = useMe();

  if (me.isLoading) {
    return <div className="page"><p className="muted">Загрузка…</p></div>;
  }

  if (me.isError || !me.data) {
    return (
      <div className="page">
        <div className="card card--error">
          Открой приложение из Telegram.
        </div>
      </div>
    );
  }

  if (!me.data.hasAccess) {
    return (
      <div className="page">
        <div className="card">
          {me.data.user.photoUrl ? (
            <img className="avatar" src={me.data.user.photoUrl} alt="" />
          ) : (
            <div className="avatar avatar--fallback">
              {(me.data.user.firstName[0] ?? '?').toUpperCase()}
            </div>
          )}
          <h1 className="name">
            {me.data.user.username ? `@${me.data.user.username}` : me.data.user.firstName}
          </h1>
          <p className="status deny">У тебя нет доступа</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<ItemsPage />} />
          <Route path="/add-item" element={<AddItemPage />} />
          <Route path="/place/:id" element={<PlacePage />} />
          <Route path="/places" element={<PlacesPage />} />
          <Route path="/drafts" element={<DraftsPage />} />
          <Route path="/drafts/:id" element={<DraftPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
