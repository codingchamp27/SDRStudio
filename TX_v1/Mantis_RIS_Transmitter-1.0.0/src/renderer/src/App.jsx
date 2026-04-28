import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { DataProvider } from "./components/Context/DataContext";
import DashboardPage from "./pages/dashboard";
import Layout from "./components/Layout/Layout";
import { Toaster } from "react-hot-toast";
import LoginForm from "./components/login/loginForm/loginForm";
import ConfigurePage from "./pages/ConfigurePage";

const router = createBrowserRouter([

  { path: '/', element: <LoginForm /> },
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/configure', element: <ConfigurePage /> },
    ]
  }

]);

const App = () => {
  return (
    <DataProvider>
      <Toaster position="top-center" />
      <RouterProvider router={router} />
    </DataProvider>
  );
};

export default App;
