"use client";

import { createContext, useContext, useState, ReactNode } from "react";
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
