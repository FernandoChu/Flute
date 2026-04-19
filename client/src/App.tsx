import { useEffect } from "react";
import { Route, Switch } from "wouter";
import LoginPage from "./pages/LoginPage";
import LibraryPage from "./pages/LibraryPage";
import ReaderPage from "./pages/ReaderPage";
import SettingsPage from "./pages/SettingsPage";
import VocabularyPage from "./pages/VocabularyPage";
import ReviewPage from "./pages/ReviewPage";
import ProtectedRoute from "./components/ProtectedRoute";
import NavBar from "./components/NavBar";
import { useAuth } from "./hooks/useAuth";
import { useReaderSettings } from "./hooks/useReaderSettings";

export default function App() {
  const { isLoggedIn } = useAuth();
  const { settings } = useReaderSettings();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  return (
    <div className="min-h-screen" style={{ background: "var(--paper)", color: "var(--ink)" }}>
      {isLoggedIn && <NavBar />}
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/">
          <ProtectedRoute>
            <LibraryPage />
          </ProtectedRoute>
        </Route>
        <Route path="/vocabulary">
          <ProtectedRoute>
            <VocabularyPage />
          </ProtectedRoute>
        </Route>
        <Route path="/review">
          <ProtectedRoute>
            <ReviewPage />
          </ProtectedRoute>
        </Route>
        <Route path="/settings">
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/reader/:lessonId">
          {(params) => (
            <ProtectedRoute>
              <ReaderPage key={params.lessonId} lessonId={params.lessonId} />
            </ProtectedRoute>
          )}
        </Route>
        <Route>
          <div className="flex items-center justify-center min-h-screen">
            <h1 className="display" style={{ fontSize: 28 }}>
              404 — Not Found
            </h1>
          </div>
        </Route>
      </Switch>
    </div>
  );
}
