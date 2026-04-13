import { Route, Switch } from "wouter";
import LoginPage from "./pages/LoginPage";
import LibraryPage from "./pages/LibraryPage";
import ReaderPage from "./pages/ReaderPage";
import SettingsPage from "./pages/SettingsPage";
import ProtectedRoute from "./components/ProtectedRoute";
import NavBar from "./components/NavBar";
import { useAuth } from "./hooks/useAuth";

export default function App() {
  const { isLoggedIn } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {isLoggedIn && <NavBar />}
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/">
          <ProtectedRoute>
            <LibraryPage />
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
              <ReaderPage lessonId={params.lessonId} />
            </ProtectedRoute>
          )}
        </Route>
        <Route>
          <div className="flex items-center justify-center min-h-screen">
            <h1 className="text-2xl">404 — Not Found</h1>
          </div>
        </Route>
      </Switch>
    </div>
  );
}
