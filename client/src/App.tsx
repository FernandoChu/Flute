import { Route, Switch } from "wouter";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
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
            <HomePage />
          </ProtectedRoute>
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
