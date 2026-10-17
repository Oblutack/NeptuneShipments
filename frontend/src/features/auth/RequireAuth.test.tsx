import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import authReducer, { setCredentials, homePathFor } from "./authSlice";
import { RequireAuth } from "./RequireAuth";
import type { User } from "../api/apiSlice";

const renderAt = (path: string, user: User | null) => {
  const store = configureStore({ reducer: { auth: authReducer } });
  if (user) store.dispatch(setCredentials({ user, token: "t" }));
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<div>login page</div>} />
          <Route element={<RequireAuth />}>
            <Route path="/portal" element={<div>portal page</div>} />
          </Route>
          <Route element={<RequireAuth allowedRoles={["ADMIN"]} />}>
            <Route path="/dashboard" element={<div>dashboard page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
};

const admin: User = { id: "1", email: "a@x.com", full_name: "A", role: "ADMIN" };
const client: User = { id: "2", email: "c@x.com", full_name: "C", role: "CLIENT" };

describe("RequireAuth", () => {
  it("sends an anonymous visitor to the login page", () => {
    renderAt("/dashboard", null);
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("lets an admin into the dashboard", () => {
    renderAt("/dashboard", admin);
    expect(screen.getByText("dashboard page")).toBeInTheDocument();
  });

  it("sends a client who opens the dashboard to the portal instead", () => {
    renderAt("/dashboard", client);
    expect(screen.getByText("portal page")).toBeInTheDocument();
    expect(screen.queryByText("dashboard page")).not.toBeInTheDocument();
  });

  it("lets a client into the portal", () => {
    renderAt("/portal", client);
    expect(screen.getByText("portal page")).toBeInTheDocument();
  });
});

describe("homePathFor", () => {
  it("routes clients to the portal and everyone else to the dashboard", () => {
    expect(homePathFor("CLIENT")).toBe("/portal");
    expect(homePathFor("ADMIN")).toBe("/dashboard");
  });
});
