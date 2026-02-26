import React from 'react';

type AuthTabsProps = {
    activeTab: 'login' | 'signup';
    onSwitch: (tab: 'login' | 'signup') => void;
};

export const AuthTabs: React.FC<AuthTabsProps> = ({ activeTab, onSwitch }) => {
    return (
        <div className="auth-tab-container">
            <button
                className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => onSwitch('login')}
                type="button"
            >
                Log In
            </button>
            <button
                className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
                onClick={() => onSwitch('signup')}
                type="button"
            >
                Sign Up
            </button>
        </div>
    );
};
