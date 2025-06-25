import React, { useState, useEffect, FormEvent } from "react";
import useAuthStore from "../store/useAuthStore";
//import uuid from "uuid";
import { useNavigate } from "react-router-dom";

function LoginForm() {
  const [password, setPassword] = useState<string>();
  const [username, setUsername] = useState<string>();
  const { login, token, setToken } = useAuthStore((state) => state);
  const [hasError, setHasError] = useState<boolean>(false);

  // routers
  const navigate = useNavigate();

  const doLogin = async (username: string, password: string) => {
    const response = fetch(`/api/login`, {
      body: JSON.stringify({ username, password }),
      method: "POST",
    });
    return (await response).json();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username || !password) {
      return;
    }
    try {
      const response = await doLogin(username, password);
      console.log(response);
      if (response && response.token) {
        // Load the user
        setToken(response.token);
      } else {
        setHasError(true);
      }
    } catch (e) {
      console.log("Error", e);
    }
  };

  useEffect(() => {
    const load = async (token: string, username: string) => {
      const queryStrings = new URLSearchParams();
      queryStrings.set("username", username);
      const response = await fetch(
        `/api/protected/user` + "?" + queryStrings.toString(),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.status == 200) {
        // AuthInfos
        const authInfos = {
          user: await response.json(),
          token,
          isAuthenticated: true,
        };
        login(authInfos);
        navigate("/");
      } else {
        new Error(`username ${username} not found!`);
      }
    };
    if (token && username) {
      load(token, username);
    }
  }, [token, username]);

  return (
    <div className="bg-gray-100 flex items-center w-full justify-center h-screen">
      <div>
        <section>
          <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
              Welcome Back
            </h2>
            <form onSubmit={handleSubmit}>
              {hasError && (
                <p className="mb-4" style={{ color: "red" }}>
                  Wrong username or password!
                </p>
              )}
              <div className="mb-4">
                <label
                  htmlFor="username"
                  className="block text-gray-700 text-sm font-semibold mb-2"
                >
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input w-full px-4 py-2 border rounded-lg text-gray-700 focus:outline-none focus:border-blue-500"
                  placeholder="Enter your username"
                />
              </div>
              <div className="mb-6">
                <label
                  htmlFor="password"
                  className="block text-gray-700 text-sm font-semibold mb-2"
                >
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input w-full px-4 py-2 border rounded-lg text-gray-700 focus:outline-none focus:border-blue-500"
                  placeholder="Enter your password"
                />
              </div>
              <button
                type="submit"
                className="afromemo-btn w-full bg-blue-500 text-white py-2 rounded-lg font-semibold hover:bg-blue-600 transition duration-300"
              >
                Login
              </button>
            </form>
            <div className="text-center mt-4">
              <a
                href="#"
                className="invisible text-sm text-blue-500 hover:underline"
              >
                Forgot Password?
              </a>
            </div>
            <div className="text-center mt-2">
              <span className="invisible text-sm text-gray-600">
                Don't have an account?
              </span>
              <a
                href="#"
                className="invisible text-sm text-blue-500 hover:underline"
              >
                Sign Up
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
export default LoginForm;
