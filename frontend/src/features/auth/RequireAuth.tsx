import { useLocation, Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectCurrentUser, homePathFor } from "./authSlice";

interface RequireAuthProps {
  // When set, a signed-in user whose role isn't listed is sent to their own
  // home instead of seeing the page. This is only a UX guard - the API
  // enforces the same rule server-side - but without it a CLIENT could open
  // the fleet dashboard and watch every request come back 403.
  allowedRoles?: string[];
}

export const RequireAuth = ({ allowedRoles }: RequireAuthProps) => {
  const user = useSelector(selectCurrentUser);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={homePathFor(user.role)} replace />;
  }
  return <Outlet />;
};
