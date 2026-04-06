import { useNavigate } from "react-router-dom";
import RegistrationForm from "../user/components/RegistrationForm";
import AuthShell from "./AuthShell";

const EmployeeRegistrationPage = () => {
  const navigate = useNavigate();

  return (
    <AuthShell
      title="Create Account"
      subtitle="Join us to start tracking your tasks."
      contentAlign="start"
    >
      <RegistrationForm onLoginClick={() => navigate("/login")} />
    </AuthShell>
  );
};

export default EmployeeRegistrationPage;
