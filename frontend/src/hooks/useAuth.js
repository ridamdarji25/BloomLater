import apiClient from '@/lib/apiClient';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import toast from 'react-hot-toast';

export function useAuth() {
  const { user, accessToken, isAuthenticated, setAuth, logout: storeLogout } = useAuthStore();

  return { user, accessToken, isAuthenticated };
}

export function useRegister() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.post('/auth/register', data);
      return res.data.data;
    },
    onSuccess: ({ user, accessToken }) => {
      setAuth(user, accessToken);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success(`Welcome, ${user.displayName}!`);
      navigate('/vault');
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || 'Registration failed';
      toast.error(msg);
    },
  });
}

export function useLogin() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.post('/auth/login', data);
      return res.data.data;
    },
    onSuccess: ({ user, accessToken }) => {
      setAuth(user, accessToken);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success(`Welcome back, ${user.displayName}!`);
      navigate('/vault');
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || 'Login failed';
      toast.error(msg);
    },
  });
}

export function useLogout() {
  const navigate = useNavigate();
  const { logout: storeLogout } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout');
    },
    onSettled: () => {
      storeLogout();
      queryClient.clear();
      navigate('/');
      toast.success('Logged out');
    },
  });
}

export function useMe() {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/me');
      return res.data.data.user;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 min
  });
}
