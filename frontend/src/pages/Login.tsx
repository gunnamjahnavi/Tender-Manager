import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function Login({ setToken, setUser }: { setToken: (token: string) => void, setUser: (user: any) => void }) {
  const [email, setEmail] = useState('creator@lt.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        navigate('/');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Login failed. Ensure server is running.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-[var(--color-primary-dark)]">
          L&T Tender Management
        </h2>
        <p className="mt-2 text-center text-sm text-[#666]">
          Sign in to your organizational portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700">Email address</label>
              <div className="mt-1">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)]"
              >
                Sign in
              </button>
            </div>
            
            <div className="mt-4 border-t pt-4">
              <p className="text-sm text-gray-500 mb-2">Test Accounts:</p>
              <div className="text-xs space-y-1 text-gray-600 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setEmail('creator@lt.com')} className="text-left hover:text-[var(--color-primary)]">creator@lt.com (Creator)</button>
                <button type="button" onClick={() => setEmail('azad@lt.com')} className="text-left hover:text-[var(--color-primary)]">azad@lt.com (HOD Azad)</button>
                <button type="button" onClick={() => setEmail('anurag@lt.com')} className="text-left hover:text-[var(--color-primary)]">anurag@lt.com (HOD Anurag)</button>
                <button type="button" onClick={() => setEmail('slead@lt.com')} className="text-left hover:text-[var(--color-primary)]">slead@lt.com (Senior Lead)</button>
                <button type="button" onClick={() => setEmail('member1@lt.com')} className="text-left hover:text-[var(--color-primary)]">member1@lt.com (Member 1)</button>
                <button type="button" onClick={() => setEmail('viewer@lt.com')} className="text-left hover:text-[var(--color-primary)]">viewer@lt.com (Viewer)</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
