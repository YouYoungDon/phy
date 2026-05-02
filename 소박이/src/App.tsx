import AppLayout from "./components/common/AppLayout";
import LoadingScreen from "./components/common/LoadingScreen";
import HomePage from "./app/page";
import { useAuth } from "./hooks/useAuth";

function App() {
  const { loading, error } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <AppLayout>
      {error ? <p style={{ padding: 24, color: "#b33951" }}>{error}</p> : <HomePage />}
    </AppLayout>
  );
}

export default App;
