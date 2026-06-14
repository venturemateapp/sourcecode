import { useState } from 'react';
import { graphqlRequest } from '../lib/api';
import { decodeToken, setToken, setStoredUser, clearAuth } from '../lib/auth';
import type { User } from '../types/venturemate';

interface LoginResponse {
  login: {
    token: string;
    user: User;
  };
}

const LOGIN_MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        firstName
        surname
        email
        picture
        onboarded
        status
      }
    }
  }
`;

const REQUEST_PASSWORD_RESET_MUTATION = `
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email)
  }
`;

const RESET_PASSWORD_MUTATION = `
  mutation ResetPassword($email: String!, $otp: String!, $newPassword: String!, $confirmPassword: String!) {
    resetPassword(email: $email, otp: $otp, newPassword: $newPassword, confirmPassword: $confirmPassword)
  }
`;

export function useAuthApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string): Promise<User | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await graphqlRequest<LoginResponse>(LOGIN_MUTATION, { email, password });
      const { token, user } = data.login;
      setToken(token);
      setStoredUser(user);

      const decoded = decodeToken(token);
      if (decoded?.onboarded) {
        localStorage.setItem('venturemate_onboarding_completed', 'true');
      }

      return user;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const requestPasswordReset = async (email: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await graphqlRequest<{ requestPasswordReset: boolean }>(
        REQUEST_PASSWORD_RESET_MUTATION,
        { email },
      );
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to request password reset';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (
    email: string,
    otp: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await graphqlRequest<{ resetPassword: boolean }>(RESET_PASSWORD_MUTATION, {
        email,
        otp,
        newPassword,
        confirmPassword,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reset password';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearAuth();
  };

  return { login, requestPasswordReset, resetPassword, logout, loading, error };
}
