"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import LoginModal from "@features/auth/LoginModal";

interface LoginModalContextType {
    isModalOpen: boolean;
    openLoginModal: () => void;
    closeLoginModal: () => void;
}

const LoginModalContext = createContext<LoginModalContextType | undefined>(undefined);

export function LoginModalProvider({ children }: { children: ReactNode }) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openLoginModal = () => setIsModalOpen(true);
    const closeLoginModal = () => setIsModalOpen(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.location.search.includes('login=true')) {
            setIsModalOpen(true);
            const url = new URL(window.location.href);
            url.searchParams.delete('login');
            window.history.replaceState({}, '', url.pathname + url.search);
        }
    }, []);

    return (
        <LoginModalContext.Provider value={{ isModalOpen, openLoginModal, closeLoginModal }}>
            {children}
            <LoginModal isOpen={isModalOpen} onClose={closeLoginModal} />
        </LoginModalContext.Provider>
    );
}

export const useLoginModal = () => {
    const context = useContext(LoginModalContext);
    if (context === undefined) {
        throw new Error("useLoginModal must be used within a LoginModalProvider");
    }
    return context;
};
