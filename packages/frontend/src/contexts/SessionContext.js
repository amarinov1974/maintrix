import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Session Context
 * Manages user session state
 */
import { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authAPI } from '../api/auth';
const SessionContext = createContext(undefined);
export function SessionProvider({ children }) {
    const queryClient = useQueryClient();
    const { data, isLoading } = useQuery({
        queryKey: ['session'],
        queryFn: authAPI.getSession,
        retry: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
    const logoutMutation = useMutation({
        mutationFn: authAPI.logout,
        onSuccess: () => {
            queryClient.setQueryData(['session'], null);
            window.location.href = '/';
        },
    });
    const session = data?.session ?? null;
    return (_jsx(SessionContext.Provider, { value: {
            session,
            isLoading,
            logout: () => logoutMutation.mutate(),
        }, children: children }));
}
export function useSession() {
    const context = useContext(SessionContext);
    if (context === undefined) {
        throw new Error('useSession must be used within SessionProvider');
    }
    return context;
}
