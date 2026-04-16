import { MainLayout } from "../Layouts";
import LogoutButton from "../components/LogoutButton";

export default function Dashboard() {
  return (
    <MainLayout>
      <div className="pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-6">Dashboard</h1>
          <LogoutButton />
        </div>
      </div>
    </MainLayout>
  );
}
