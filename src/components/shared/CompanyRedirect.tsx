import { Navigate, useParams } from "react-router-dom";

export function CompanyRedirect() {
  const { id } = useParams();
  return <Navigate to={`/portfolio/${id}`} replace />;
}
